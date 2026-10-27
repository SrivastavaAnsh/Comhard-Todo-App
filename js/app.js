/**
 * Comhard TaskFlow - Main Application Controller
 * Handles DOM wiring, event delegation, drag & drop, modals, SLA calculation, and hotkeys.
 * Stage 2: Supabase authentication + persistent task storage.
 */

import { store } from "./state.js";
import {
  filterAndSortTasks,
  formatDate,
  formatDuration,
  getTotalTime,
  hasActiveFilters,
  getActiveFilterCount,
  calculateSla
} from "./filters.js";
import {
  renderListView,
  renderGridView,
  renderKanbanView,
  renderSectionView,
  renderPriorityBadge,
  renderStatusBadge,
  renderDueDate,
  renderTimeSpentBar,
  renderSlaChip
} from "./views.js";
import { getIcon } from "./icons.js";

// Supabase imports — gracefully degraded if env vars are missing
import * as sb from "./supabase.js";
import * as _authModule from "./auth.js";
import * as _dbModule from "./db.js";

const _supabaseEnabled = sb.isSupabaseConfigured ?? Boolean(sb.supabase);

class App {
  constructor() {
    this.initElements();
    this.initTheme();
    this.bindEvents();
    this.bindDragAndDrop();
    this.bindHotkeys();
    this._realtimeUnsub = null;

    // Subscribe to store updates to auto-render
    this.unsubscribe = store.subscribe(() => this.render());

    // Initial render with localStorage data
    this.render();

    // Async: check Supabase session and sync
    this.initSupabase();
  }

  initElements() {
    // Topbar & sidebar
    this.sidebar = document.getElementById("sidebar");
    this.sidebarOverlay = document.getElementById("sidebar-overlay");
    this.menuToggleBtn = document.getElementById("mobile-menu-btn");
    this.themeToggleBtn = document.getElementById("theme-toggle-btn");

    // Nav elements
    this.navItems = document.querySelectorAll(".nav-item[data-filter]");
    this.countAll = document.getElementById("count-all");
    this.countTodo = document.getElementById("count-todo");
    this.countInProgress = document.getElementById("count-inprogress");
    this.countDone = document.getElementById("count-done");

    // Main header elements
    this.pageTitle = document.getElementById("page-title");
    this.taskCountBadge = document.getElementById("task-count-badge");
    this.searchInput = document.getElementById("search-input");
    this.searchClearBtn = document.getElementById("search-clear-btn");
    this.openAddModalBtn = document.getElementById("btn-add-task");

    // Filter controls
    this.viewButtons = document.querySelectorAll(".view-btn[data-view]");
    this.statusFilterSelect = document.getElementById("filter-status");
    this.priorityFilterSelect = document.getElementById("filter-priority");
    this.sortSelect = document.getElementById("sort-select");
    this.sortOrderBtn = document.getElementById("btn-sort-order");
    this.clearFiltersBtn = document.getElementById("btn-clear-filters");
    this.filterBadge = document.getElementById("active-filter-badge");

    // Content container
    this.viewContainer = document.getElementById("view-container");

    // Modals
    this.modalOverlay = document.getElementById("modal-overlay");
    this.addTaskModal = document.getElementById("modal-add-task");
    this.detailModal = document.getElementById("modal-task-detail");
    this.settingsModal = document.getElementById("modal-settings");
    this.addTaskForm = document.getElementById("form-add-task");

    // Toast
    this.toastContainer = document.getElementById("toast-container");
  }

  initTheme() {
    document.documentElement.setAttribute("data-theme", store.theme);
    this.updateThemeButtonIcon();
  }

  // --- Supabase Auth + DB Integration ---

  async initSupabase() {
    if (!_supabaseEnabled) {
      this.updateUserUI(null);
      return;
    }

    // Listen for auth state changes
    _authModule.onAuthStateChange(async (event, session) => {
      const user = session ? session.user : null;
      store.setUser(user);
      this.updateUserUI(user);

      if (event === "SIGNED_IN" && user) {
        await this.syncTasksFromSupabase(user);
        this.subscribeToRealtime();
      } else if (event === "SIGNED_OUT") {
        this.unsubscribeRealtime();
        // Don't clear tasks — keep localStorage version for offline use
      }
    });

    // Check existing session
    try {
      const session = await _authModule.getSession();
      const user = session ? session.user : null;
      store.setUser(user);
      this.updateUserUI(user);

      if (user) {
        await this.syncTasksFromSupabase(user);
        this.subscribeToRealtime();
      }
    } catch (err) {
      console.warn("Could not get Supabase session:", err.message);
      this.updateUserUI(null);
    }
  }

  async syncTasksFromSupabase(user) {
    if (!_dbModule || !user) return;
    store.setSyncing(true);
    try {
      const remoteTasks = await _dbModule.fetchTasks();
      if (remoteTasks.length > 0) {
        store.setTasksFromRemote(remoteTasks);
      } else {
        // First login: seed Supabase with existing localStorage tasks
        await _dbModule.upsertTasks(store.tasks, user.id);
      }
    } catch (err) {
      console.error("Failed to sync tasks from Supabase:", err.message);
      this.showToast("Could not sync tasks — using local data", "info");
    } finally {
      store.setSyncing(false);
    }
  }

  subscribeToRealtime() {
    if (!_dbModule) return;
    this.unsubscribeRealtime();
    this._realtimeUnsub = _dbModule.subscribeToTasks(
      (newTask) => {
        // INSERT: add if not already present
        if (!store.tasks.find(t => t.id === newTask.id)) {
          store.tasks = [newTask, ...store.tasks];
          store.saveTasks(store.tasks);
          store.notify();
        }
      },
      (updatedTask) => {
        // UPDATE: patch in place
        store.tasks = store.tasks.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t);
        store.saveTasks(store.tasks);
        store.notify();
      },
      (deletedId) => {
        // DELETE
        store.tasks = store.tasks.filter(t => t.id !== deletedId);
        store.saveTasks(store.tasks);
        store.notify();
      }
    );
  }

  unsubscribeRealtime() {
    if (this._realtimeUnsub) {
      this._realtimeUnsub();
      this._realtimeUnsub = null;
    }
  }

  updateUserUI(user) {
    const avatarEl = document.getElementById("user-avatar-initials");
    const nameEl = document.getElementById("user-display-name");
    const emailEl = document.getElementById("user-display-email");
    const subtitleEl = document.getElementById("sidebar-subtitle");

    if (user) {
      const email = user.email || "";
      const initials = email.substring(0, 2).toUpperCase();
      if (avatarEl) avatarEl.textContent = initials;
      if (nameEl) nameEl.textContent = email.split("@")[0] || "User";
      if (emailEl) emailEl.textContent = email;
      if (subtitleEl) subtitleEl.textContent = "Synced Workspace";
    } else {
      if (avatarEl) avatarEl.textContent = "?";
      if (nameEl) nameEl.textContent = _supabaseEnabled ? "Not signed in" : "Local Workspace";
      if (emailEl) emailEl.textContent = _supabaseEnabled ? "Sign in to sync tasks" : "localStorage mode";
      if (subtitleEl) subtitleEl.textContent = _supabaseEnabled ? "Sign in to sync" : "Offline Mode";
    }

    const signOutBtn = document.getElementById("btn-sign-out");
    if (signOutBtn) {
      if (user) {
        signOutBtn.title = "Sign out";
      } else if (_supabaseEnabled) {
        signOutBtn.title = "Sign in / Sign up";
      } else {
        signOutBtn.title = "Supabase not connected — Click for settings";
      }
    }

    const topbarAuthBtn = document.getElementById("topbar-auth-btn");
    const topbarAuthText = document.getElementById("topbar-auth-text");
    if (topbarAuthBtn && topbarAuthText) {
      if (user) {
        topbarAuthText.textContent = user.email ? user.email.split("@")[0] : "Account";
        topbarAuthBtn.title = "Signed in as " + (user.email || "user");
      } else {
        topbarAuthText.textContent = "Sign In";
        topbarAuthBtn.title = "Sign In or Create Account";
      }
    }
  }

  updateThemeButtonIcon() {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.innerHTML = store.theme === "dark" 
        ? `${getIcon("sun")} <span class="btn-text">Light Mode</span>`
        : `${getIcon("moon")} <span class="btn-text">Dark Mode</span>`;
    }
  }

  // --- Rendering Pipeline ---
  render() {
    // 1. Update counts in sidebar
    const counts = store.getCounts();
    if (this.countAll) this.countAll.textContent = counts.all;
    if (this.countTodo) this.countTodo.textContent = counts.todo;
    if (this.countInProgress) this.countInProgress.textContent = counts.inProgress;
    if (this.countDone) this.countDone.textContent = counts.done;

    // 2. Update active nav in sidebar
    this.navItems.forEach(item => {
      const filter = item.getAttribute("data-filter");
      item.classList.toggle("active", filter === store.sidebarFilter);
    });

    // 3. Update view buttons
    this.viewButtons.forEach(btn => {
      const v = btn.getAttribute("data-view");
      btn.classList.toggle("active", v === store.currentView);
    });

    // 4. Update filter select values
    if (this.statusFilterSelect) this.statusFilterSelect.value = store.statusFilter;
    if (this.priorityFilterSelect) this.priorityFilterSelect.value = store.priorityFilter;
    if (this.sortSelect) this.sortSelect.value = store.sortBy;
    if (this.sortOrderBtn) {
      this.sortOrderBtn.setAttribute("title", store.sortOrder === "asc" ? "Ascending order" : "Descending order");
      this.sortOrderBtn.innerHTML = store.sortOrder === "asc" 
        ? `${getIcon("sort")} <span class="sort-text">ASC</span>`
        : `${getIcon("sort")} <span class="sort-text">DESC</span>`;
    }

    // 5. Update Clear Filters visibility & badge
    const filterCount = getActiveFilterCount(store);
    const hasFilters = hasActiveFilters(store);
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.classList.toggle("is-active", hasFilters);
    }
    if (this.filterBadge) {
      this.filterBadge.textContent = filterCount;
      this.filterBadge.style.display = filterCount > 0 ? "inline-flex" : "none";
    }
    if (this.searchClearBtn) {
      this.searchClearBtn.style.display = store.searchQuery ? "flex" : "none";
    }

    // 6. Filter & sort tasks
    const filteredTasks = filterAndSortTasks(store.tasks, store);

    // 7. Update Page Title and Stats
    const titleMap = {
      all: "All Tasks",
      todo: "To-Do Tasks",
      inprogress: "In Progress Tasks",
      ongoing: "In Progress Tasks",
      done: "Completed Tasks"
    };
    if (this.pageTitle) {
      this.pageTitle.textContent = titleMap[store.sidebarFilter] || "All Tasks";
    }
    if (this.taskCountBadge) {
      this.taskCountBadge.textContent = `Showing ${filteredTasks.length} of ${store.tasks.length} tasks`;
    }

    // 8. Render current view HTML
    let viewHtml = "";
    switch (store.currentView) {
      case "grid":
        viewHtml = renderGridView(filteredTasks);
        break;
      case "kanban":
        viewHtml = renderKanbanView(filteredTasks);
        break;
      case "section":
        viewHtml = renderSectionView(filteredTasks, store);
        break;
      case "list":
      default:
        viewHtml = renderListView(filteredTasks);
        break;
    }

    if (this.viewContainer) {
      this.viewContainer.innerHTML = viewHtml;
    }

    // Re-bind dynamic icons and kanban drag & drop after DOM insertion
    this.bindKanbanDraggables();
  }

  // --- Events Binding ---
  bindEvents() {
    // Mobile menu toggle
    this.menuToggleBtn?.addEventListener("click", () => this.toggleMobileSidebar(true));
    this.sidebarOverlay?.addEventListener("click", () => this.toggleMobileSidebar(false));

    // Theme toggle
    this.themeToggleBtn?.addEventListener("click", () => {
      store.toggleTheme();
      this.updateThemeButtonIcon();
      this.showToast(`Switched to ${store.theme} mode`);
    });

    // Sidebar navigation
    this.navItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const filter = item.getAttribute("data-filter");
        store.setSidebarFilter(filter);
        this.toggleMobileSidebar(false);
      });
    });

    // View selector buttons
    this.viewButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        store.setView(view);
      });
    });

    // Search bar input & clear
    this.searchInput?.addEventListener("input", (e) => {
      store.setSearchQuery(e.target.value);
    });

    this.searchClearBtn?.addEventListener("click", () => {
      if (this.searchInput) this.searchInput.value = "";
      store.setSearchQuery("");
      this.searchInput?.focus();
    });

    // Filter selects
    this.statusFilterSelect?.addEventListener("change", (e) => {
      store.setStatusFilter(e.target.value);
    });

    this.priorityFilterSelect?.addEventListener("change", (e) => {
      store.setPriorityFilter(e.target.value);
    });

    this.sortSelect?.addEventListener("change", (e) => {
      store.setSorting(e.target.value);
    });

    this.sortOrderBtn?.addEventListener("click", () => {
      store.toggleSortOrder();
    });

    this.clearFiltersBtn?.addEventListener("click", () => {
      this.clearAllFilters();
    });

    // Add Task Button
    this.openAddModalBtn?.addEventListener("click", () => {
      this.openAddTaskModal();
    });

    // Auto-update SLA in Add Task Modal
    document.getElementById("add-task-priority")?.addEventListener("change", () => {
      this.updateModalSlaPreview();
    });
    document.getElementById("add-task-due")?.addEventListener("input", () => {
      this.updateModalSlaPreview();
    });
    document.getElementById("add-task-sla")?.addEventListener("input", () => {
      const slaInput = document.getElementById("add-task-sla");
      if (slaInput) slaInput.dataset.manual = "true";
    });

    // Add Task Form Submit
    this.addTaskForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleAddTaskSubmit();
    });

    // Settings Button in sidebar
    document.getElementById("btn-open-settings")?.addEventListener("click", () => {
      this.openSettingsModal();
      this.toggleMobileSidebar(false);
    });

    // Sign Out
    document.getElementById("btn-sign-out")?.addEventListener("click", async () => {
      if (!_supabaseEnabled) {
        this.showToast("Replace the placeholder values in .env with your real Supabase keys to connect", "warning");
        this.openSettingsModal();
        return;
      }
      if (!store.currentUser) {
        window.location.href = "/auth.html";
        return;
      }
      try {
        await _authModule.signOut();
        this.showToast("Signed out successfully");
        setTimeout(() => { window.location.href = "/auth.html"; }, 800);
      } catch (err) {
        this.showToast("Sign out failed: " + err.message, "danger");
      }
    });

    // Global Action Delegation on container
    this.viewContainer?.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;

      const action = actionEl.getAttribute("data-action");
      const taskId = actionEl.getAttribute("data-task-id");

      if (action === "open-detail" && taskId) {
        this.openTaskDetailModal(taskId);
      } else if (action === "cycle-status" && taskId) {
        e.stopPropagation();
        this.cycleTaskStatus(taskId);
      } else if (action === "delete-task" && taskId) {
        e.stopPropagation();
        this.confirmDeleteTask(taskId);
      } else if (action === "toggle-section") {
        const sectionId = actionEl.getAttribute("data-section-id");
        if (sectionId) store.toggleSectionCollapse(sectionId);
      } else if (action === "set-group-by") {
        const groupVal = actionEl.getAttribute("data-value");
        if (groupVal) store.setSectionGroupBy(groupVal);
      } else if (action === "quick-add") {
        const status = actionEl.getAttribute("data-status");
        const groupField = actionEl.getAttribute("data-group-field");
        const groupValue = actionEl.getAttribute("data-group-value");
        this.openAddTaskModal({ status, groupField, groupValue });
      } else if (action === "clear-filters") {
        this.clearAllFilters();
      } else if (action === "open-add-modal") {
        this.openAddTaskModal();
      }
    });

    // Modal Close Actions
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => this.closeAllModals());
    });

    this.modalOverlay?.addEventListener("click", (e) => {
      if (e.target === this.modalOverlay) {
        this.closeAllModals();
      }
    });
  }

  // --- Keyboard Shortcuts ---
  bindHotkeys() {
    window.addEventListener("keydown", (e) => {
      const isInputActive = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);

      if (e.key === "Escape") {
        this.closeAllModals();
        this.toggleMobileSidebar(false);
        return;
      }

      if (isInputActive) return;

      if (e.key === "/") {
        e.preventDefault();
        this.searchInput?.focus();
      } else if (e.key === "c" || e.key === "n" || e.key === "C" || e.key === "N") {
        e.preventDefault();
        this.openAddTaskModal();
      } else if (e.key === "1") {
        store.setView("list");
      } else if (e.key === "2") {
        store.setView("grid");
      } else if (e.key === "3") {
        store.setView("kanban");
      } else if (e.key === "4") {
        store.setView("section");
      }
    });
  }

  // --- Kanban Drag & Drop ---
  bindDragAndDrop() {
    this.draggedTaskId = null;
  }

  bindKanbanDraggables() {
    if (store.currentView !== "kanban") return;

    const cards = document.querySelectorAll(".kanban-card");
    const columns = document.querySelectorAll(".kanban-cards-wrapper");

    cards.forEach(card => {
      card.addEventListener("dragstart", (e) => {
        this.draggedTaskId = card.getAttribute("data-task-id");
        card.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", this.draggedTaskId);
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        this.draggedTaskId = null;
        columns.forEach(col => col.classList.remove("drag-over"));
      });
    });

    columns.forEach(col => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        col.classList.add("drag-over");
      });

      col.addEventListener("dragleave", (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove("drag-over");
        }
      });

      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        const taskId = e.dataTransfer.getData("text/plain") || this.draggedTaskId;
        const targetStatus = col.getAttribute("data-status");

        if (taskId && targetStatus) {
          const task = store.tasks.find(t => t.id === taskId);
          if (task && task.status !== targetStatus) {
            store.updateTaskStatus(taskId, targetStatus);
            // Persist to Supabase
            if (_dbModule && store.currentUser) {
              try {
                await _dbModule.updateTask(taskId, { status: targetStatus });
              } catch (err) {
                console.error("Failed to sync kanban status to Supabase:", err.message);
              }
            }
            this.showToast(`Moved ${taskId} to ${targetStatus}`);
          }
        }
      });
    });
  }

  // --- Status & Task Actions ---
  async cycleTaskStatus(taskId) {
    const task = store.tasks.find(t => t.id === taskId);
    if (!task) return;

    let nextStatus = "Todo";
    if (task.status === "Todo") nextStatus = "In Progress";
    else if (task.status === "In Progress" || task.status === "Ongoing") nextStatus = "Done";
    else if (task.status === "Done") nextStatus = "Todo";

    store.updateTaskStatus(taskId, nextStatus);

    // Persist to Supabase
    if (_dbModule && store.currentUser) {
      try {
        await _dbModule.updateTask(taskId, { status: nextStatus });
      } catch (err) {
        console.error("Failed to update task status in Supabase:", err.message);
      }
    }

    this.showToast(`Updated ${task.id} status to ${nextStatus}`);
  }

  async confirmDeleteTask(taskId) {
    if (confirm(`Are you sure you want to delete task ${taskId}?`)) {
      store.deleteTask(taskId);
      this.closeAllModals();

      // Persist to Supabase
      if (_dbModule && store.currentUser) {
        try {
          await _dbModule.deleteTask(taskId);
        } catch (err) {
          console.error("Failed to delete task from Supabase:", err.message);
        }
      }

      this.showToast(`Task ${taskId} removed`, "danger");
    }
  }

  clearAllFilters() {
    if (this.searchInput) this.searchInput.value = "";
    store.clearFilters();
    this.showToast("Filters reset to default view");
  }

  toggleMobileSidebar(open) {
    this.sidebar?.classList.toggle("open", open);
    this.sidebarOverlay?.classList.toggle("active", open);
  }

  // --- Modals Management ---
  openAddTaskModal(prefill = {}) {
    if (!this.addTaskModal) return;

    // Reset form
    this.addTaskForm?.reset();

    const slaInput = document.getElementById("add-task-sla");
    if (slaInput) slaInput.dataset.manual = "false";

    // Default due date: 3 days from today in YYYY-MM-DD
    const dueDefault = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];
    const dueDateInput = document.getElementById("add-task-due");
    if (dueDateInput) dueDateInput.value = dueDefault;

    // Prefill status or priority if provided from column / section
    if (prefill.status) {
      const statusSelect = document.getElementById("add-task-status");
      const normalizedPrefill = (prefill.status === "Ongoing") ? "In Progress" : prefill.status;
      if (statusSelect) statusSelect.value = normalizedPrefill;
    }
    if (prefill.groupField === "status" && prefill.groupValue) {
      const statusSelect = document.getElementById("add-task-status");
      const normalizedGroup = (prefill.groupValue === "Ongoing") ? "In Progress" : prefill.groupValue;
      if (statusSelect) statusSelect.value = normalizedGroup;
    }
    if (prefill.groupField === "priority" && prefill.groupValue) {
      const prioritySelect = document.getElementById("add-task-priority");
      if (prioritySelect) prioritySelect.value = prefill.groupValue;
    }

    // Auto-calculate SLA initial preview
    this.updateModalSlaPreview();

    this.modalOverlay?.classList.add("active");
    this.addTaskModal.classList.add("active");
    document.getElementById("add-task-title")?.focus();
  }

  updateModalSlaPreview() {
    const priority = document.getElementById("add-task-priority")?.value || "Medium";
    const dueDate = document.getElementById("add-task-due")?.value || null;
    const sla = calculateSla(priority, dueDate);

    const slaInput = document.getElementById("add-task-sla");
    if (slaInput && (!slaInput.dataset.manual || slaInput.dataset.manual === "false")) {
      slaInput.value = sla.targetHours;
    }

    const deadlineText = document.getElementById("sla-deadline-text");
    if (deadlineText) deadlineText.textContent = sla.formattedDeadline;

    const statusText = document.getElementById("sla-status-text");
    if (statusText) {
      statusText.textContent = `✓ ${sla.statusText} (${sla.formattedTarget})`;
      statusText.className = `sla-calc-status status-${sla.status}`;
    }
  }

  async handleAddTaskSubmit() {
    const title = document.getElementById("add-task-title")?.value;
    const description = document.getElementById("add-task-desc")?.value;
    const priority = document.getElementById("add-task-priority")?.value;
    const status = document.getElementById("add-task-status")?.value;
    const dueDate = document.getElementById("add-task-due")?.value;
    const slaHours = parseInt(document.getElementById("add-task-sla")?.value || "72", 10);
    const todoHours = parseFloat(document.getElementById("add-time-todo")?.value || "0");
    const inProgressHours = parseFloat(document.getElementById("add-time-inprogress")?.value || "0");
    const doneHours = parseFloat(document.getElementById("add-time-done")?.value || "0");

    if (!title || !title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    const newTask = store.addTask({
      title,
      description,
      priority,
      status: status === "Ongoing" ? "In Progress" : status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      slaHours: isNaN(slaHours) ? 72 : slaHours,
      timeSpent: {
        todo: Math.round(todoHours * 3600),
        inProgress: Math.round(inProgressHours * 3600),
        done: Math.round(doneHours * 3600)
      }
    });

    // Persist to Supabase if connected
    if (_dbModule && store.currentUser) {
      try {
        await _dbModule.createTask(newTask, store.currentUser.id);
      } catch (err) {
        console.error("Failed to save task to Supabase:", err.message);
        this.showToast("Task saved locally only — sync failed", "info");
      }
    }

    this.closeAllModals();
    this.showToast(`Task ${newTask.id} created successfully!`, "success");
  }

  openTaskDetailModal(taskId) {
    const task = store.tasks.find(t => t.id === taskId);
    if (!task || !this.detailModal) return;

    const totalSeconds = getTotalTime(task.timeSpent);
    const todoSeconds = task.timeSpent?.todo || 0;
    const inProgressSeconds = (task.timeSpent?.inProgress !== undefined) 
      ? task.timeSpent.inProgress 
      : (task.timeSpent?.ongoing || 0);
    const doneSeconds = task.timeSpent?.done || 0;

    const pTodo = totalSeconds > 0 ? Math.round((todoSeconds / totalSeconds) * 100) : 0;
    const pInProgress = totalSeconds > 0 ? Math.round((inProgressSeconds / totalSeconds) * 100) : 0;
    const pDone = (doneSeconds > 0 && totalSeconds > 0) ? Math.max(0, 100 - pTodo - pInProgress) : 0;

    const isTodoActive = task.status === 'Todo';
    const isProgActive = task.status === 'In Progress' || task.status === 'Ongoing';
    const isDoneActive = task.status === 'Done';

    this.detailModal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="detail-header-left">
            <span class="task-id-pill">${task.id}</span>
            ${renderPriorityBadge(task.priority)}
            ${renderStatusBadge(task.status)}
            ${task.slaHours ? renderSlaChip(task.slaHours) : ''}
          </div>
          <button class="btn-icon" data-close-modal title="Close">
            ${getIcon('x')}
          </button>
        </div>

        <div class="modal-body">
          <h2 class="detail-task-title">${escapeHtml(task.title)}</h2>
          <p class="detail-task-desc">${escapeHtml(task.description || "No description provided.")}</p>

          <!-- Current Active Status Highlight Banner -->
          <div class="detail-active-status-banner">
            <span class="status-banner-label">Current Active Status:</span>
            <div class="status-banner-badge-wrap">
              ${renderStatusBadge(task.status)}
            </div>
          </div>

          <!-- SLA Details Section -->
          <div class="detail-sla-card">
            <div class="detail-sla-row">
              <div class="detail-sla-item">
                <span class="sla-label">SLA Target Duration</span>
                <span class="sla-val font-semibold">${task.slaHours || 72} hours</span>
              </div>
              <div class="detail-sla-item">
                <span class="sla-label">Due Date Target</span>
                <span class="sla-val">${formatDate(task.dueDate)}</span>
              </div>
              <div class="detail-sla-item">
                <span class="sla-label">Resolution Status</span>
                <span class="sla-val ${task.status === 'Done' ? 'sla-done-text' : 'sla-active-text'}">
                  ${task.status === 'Done' ? '✓ Completed' : 'In Service'}
                </span>
              </div>
            </div>
          </div>

          <div class="detail-card-section">
            <h4 class="section-subheading">${getIcon("clock")} Accumulated Time Spent in Each Status</h4>
            <div class="detail-time-grid">
              <div class="time-stat-box time-box-todo ${isTodoActive ? 'active-stat-box' : ''}">
                <span class="time-stat-label">To-Do Status</span>
                <span class="time-stat-val">${formatDuration(todoSeconds)}</span>
                <span class="time-stat-pct">${pTodo}% of total</span>
              </div>
              <div class="time-stat-box time-box-inprogress ${isProgActive ? 'active-stat-box' : ''}">
                <span class="time-stat-label">In Progress Status</span>
                <span class="time-stat-val">${formatDuration(inProgressSeconds)}</span>
                <span class="time-stat-pct">${pInProgress}% of total</span>
              </div>
              <div class="time-stat-box time-box-done ${isDoneActive ? 'active-stat-box' : ''}">
                <span class="time-stat-label">Done Status</span>
                <span class="time-stat-val">${formatDuration(doneSeconds)}</span>
                <span class="time-stat-pct">${pDone}% of total</span>
              </div>
              <div class="time-stat-box time-box-total">
                <span class="time-stat-label">Total Tracked</span>
                <span class="time-stat-val font-semibold">${formatDuration(totalSeconds)}</span>
                <span class="time-stat-pct">100%</span>
              </div>
            </div>
            <div class="detail-time-bar-wrapper">
              ${renderTimeSpentBar(task.timeSpent)}
            </div>
          </div>

          <div class="detail-meta-grid">
            <div class="meta-item">
              <span class="meta-label">Due Date</span>
              <div class="meta-value-row">
                ${renderDueDate(task.dueDate, task.status)}
                <span class="meta-date-text">(${formatDate(task.dueDate)})</span>
              </div>
            </div>
            <div class="meta-item">
              <span class="meta-label">Created Date</span>
              <div class="meta-value-row">
                <span class="meta-date-text">${formatDate(task.createdAt)}</span>
              </div>
            </div>
          </div>

          <div class="detail-quick-status">
            <div class="quick-status-header">
              <label class="meta-label">Quick Status Transition</label>
              <span class="quick-status-hint">Click below to transition status</span>
            </div>
            <div class="status-btn-group">
              <button class="status-choice-btn ${isTodoActive ? 'is-selected active-todo' : ''}" data-detail-status="Todo">
                <span class="choice-icon">${getIcon('circle')}</span>
                <span class="choice-text">To-Do</span>
                ${isTodoActive ? '<span class="status-selected-pill">✓ Current</span>' : ''}
              </button>
              <button class="status-choice-btn ${isProgActive ? 'is-selected active-inprogress' : ''}" data-detail-status="In Progress">
                <span class="choice-icon">${getIcon('clock')}</span>
                <span class="choice-text">In Progress</span>
                ${isProgActive ? '<span class="status-selected-pill">✓ Current</span>' : ''}
              </button>
              <button class="status-choice-btn ${isDoneActive ? 'is-selected active-done' : ''}" data-detail-status="Done">
                <span class="choice-icon">${getIcon('checkCircle')}</span>
                <span class="choice-text">Done</span>
                ${isDoneActive ? '<span class="status-selected-pill">✓ Current</span>' : ''}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-danger-outline" id="detail-delete-btn" data-task-id="${task.id}">
            ${getIcon('trash')} Delete Task
          </button>
          <button class="btn-primary" data-close-modal>
            Done
          </button>
        </div>
      </div>
    `;

    // Bind detail modal inner events
    this.detailModal.querySelectorAll("[data-close-modal]").forEach(b => {
      b.addEventListener("click", () => this.closeAllModals());
    });

    this.detailModal.querySelectorAll("[data-detail-status]").forEach(b => {
      b.addEventListener("click", async (e) => {
        const nextStatus = b.getAttribute("data-detail-status");
        if (nextStatus) {
          store.updateTaskStatus(task.id, nextStatus);
          // Persist to Supabase
          if (_dbModule && store.currentUser) {
            try {
              await _dbModule.updateTask(task.id, { status: nextStatus });
            } catch (err) {
              console.error("Failed to update task status in Supabase:", err.message);
            }
          }
          this.showToast(`Updated status to ${nextStatus}`);
          this.openTaskDetailModal(task.id); // re-render detail
        }
      });
    });

    this.detailModal.querySelector("#detail-delete-btn")?.addEventListener("click", () => {
      this.confirmDeleteTask(task.id);
    });

    this.modalOverlay?.classList.add("active");
    this.detailModal.classList.add("active");
  }

  openSettingsModal() {
    if (!this.settingsModal) return;

    this.settingsModal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="detail-header-left">
            <span class="settings-title-icon">${getIcon('settings')}</span>
            <h3 class="modal-title">Preferences & Workspace</h3>
          </div>
          <button class="btn-icon" data-close-modal title="Close">
            ${getIcon('x')}
          </button>
        </div>

        <div class="modal-body">
          <div class="settings-section">
            <h4 class="section-subheading">Appearance</h4>
            <div class="settings-row">
              <div class="settings-desc">
                <strong>Color Theme</strong>
                <p>Toggle between True Black Dark mode and Crisp Monochrome Light mode (zero blue tints).</p>
              </div>
              <button class="btn-secondary" id="settings-theme-btn">
                ${store.theme === 'dark' ? getIcon('sun') + ' Light' : getIcon('moon') + ' Dark'}
              </button>
            </div>
          </div>

          <div class="settings-section">
            <h4 class="section-subheading">Sample Data Management</h4>
            <div class="settings-row">
              <div class="settings-desc">
                <strong>Reset to Default Tasks</strong>
                <p>Restores the original realistic tasks with In Progress status and SLA hours.</p>
              </div>
              <button class="btn-secondary" id="settings-reset-tasks-btn">
                ${getIcon('refresh')} Reset Tasks
              </button>
            </div>
          </div>

          <div class="settings-section">
            <h4 class="section-subheading">Stage 2 — Supabase Status</h4>
            ${_supabaseEnabled ? `
              <div class="settings-row">
                <div class="settings-desc">
                  <strong>${store.currentUser ? '✅ Connected & Syncing' : '⚠️ Not Signed In'}</strong>
                  <p>${store.currentUser 
                    ? `Signed in as <strong>${escapeHtml(store.currentUser.email || '')}</strong>. Tasks persist in Supabase PostgreSQL with RLS.`
                    : 'Sign in to enable cloud sync, multi-device support, and persistent task storage.'
                  }</p>
                </div>
                ${store.currentUser 
                  ? `<button class="btn-secondary" id="settings-signout-btn">${getIcon('x')} Sign Out</button>`
                  : `<a href="/auth.html" class="btn-secondary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">${getIcon('checkCircle')} Sign In</a>`
                }
              </div>
            ` : `
              <div class="settings-row">
                <div class="settings-desc">
                  <strong>🔌 Offline Mode (localStorage)</strong>
                  <p>Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> to enable cloud sync.</p>
                </div>
              </div>
            `}
          </div>

          <div class="settings-section">
            <h4 class="section-subheading">Architecture</h4>
            <ul class="roadmap-list">
              <li>
                <span class="badge badge-status-done">✓ Done</span>
                <strong>Supabase Auth:</strong> Email/password, magic link, password reset, session tokens.
              </li>
              <li>
                <span class="badge badge-status-done">✓ Done</span>
                <strong>PostgreSQL Persistence:</strong> Row Level Security (RLS) — each user sees only their tasks.
              </li>
              <li>
                <span class="badge badge-status-done">✓ Done</span>
                <strong>Real-time Subscriptions:</strong> Live task updates across tabs via Supabase Realtime.
              </li>
              <li>
                <span class="badge badge-status-inprogress">Next</span>
                <strong>Live SLA Tracking:</strong> Real-time elapsed duration stopwatch and status history logs.
              </li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" data-close-modal>Close</button>
        </div>
      </div>
    `;

    this.settingsModal.querySelectorAll("[data-close-modal]").forEach(b => {
      b.addEventListener("click", () => this.closeAllModals());
    });

    this.settingsModal.querySelector("#settings-theme-btn")?.addEventListener("click", () => {
      store.toggleTheme();
      this.updateThemeButtonIcon();
      this.openSettingsModal(); // refresh
    });

    this.settingsModal.querySelector("#settings-reset-tasks-btn")?.addEventListener("click", () => {
      if (confirm("Reset all tasks back to the default sample dataset?")) {
        store.resetToDefaultTasks();
        this.closeAllModals();
        this.showToast("Tasks reset to default sample dataset", "success");
      }
    });

    this.settingsModal.querySelector("#settings-signout-btn")?.addEventListener("click", async () => {
      if (_authModule) {
        try {
          await _authModule.signOut();
          this.closeAllModals();
          this.showToast("Signed out successfully");
          setTimeout(() => { window.location.href = "/auth.html"; }, 800);
        } catch (err) {
          this.showToast("Sign out failed: " + err.message, "danger");
        }
      }
    });

    this.modalOverlay?.classList.add("active");
    this.settingsModal.classList.add("active");
  }

  closeAllModals() {
    this.modalOverlay?.classList.remove("active");
    this.addTaskModal?.classList.remove("active");
    this.detailModal?.classList.remove("active");
    this.settingsModal?.classList.remove("active");
  }

  // --- Toast Notification ---
  showToast(message, type = "info") {
    if (!this.toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let iconName = "info";
    if (type === "success") iconName = "checkCircle";
    if (type === "danger") iconName = "alertCircle";

    toast.innerHTML = `
      <span class="toast-icon">${getIcon(iconName)}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Helper: safe HTML escaping
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Bootstrap app reliably on load or immediate execution
function bootApp() {
  if (!window.comhardApp) {
    try {
      window.comhardApp = new App();
    } catch (err) {
      console.error("[TaskFlow] Error during App initialization:", err);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
