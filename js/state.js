import { INITIAL_TASKS } from "./data.js";

const STORAGE_KEY = "comhard_tasks_v1";
const THEME_KEY = "comhard_theme_v1";
const VIEW_KEY = "comhard_active_view_v1";

class StateStore {
  constructor() {
    const hasStorage = typeof localStorage !== "undefined";
    this.tasks = this.loadTasks();
    this.theme = (hasStorage && localStorage.getItem(THEME_KEY)) || "dark";
    this.currentView = (hasStorage && localStorage.getItem(VIEW_KEY)) || "list";
    this.sidebarFilter = "all"; // 'all' | 'todo' | 'inprogress' | 'done'
    this.statusFilter = "all";  // 'all' | 'Todo' | 'In Progress' | 'Done'
    this.priorityFilter = "all";// 'all' | 'Low' | 'Medium' | 'High' | 'Urgent'
    this.searchQuery = "";
    this.sortBy = "dueDate";    // 'dueDate' | 'createdAt' | 'priority' | 'title' | 'timeSpent'
    this.sortOrder = "asc";     // 'asc' | 'desc'
    this.sectionGroupBy = "status"; // 'status' | 'priority'
    this.collapsedSections = new Set();
    this.subscribers = [];
  }

  loadTasks() {
    if (typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Migrate any legacy 'Ongoing' status to 'In Progress'
            return parsed.map(t => {
              const status = t.status === "Ongoing" ? "In Progress" : t.status;
              const inProgTime = (t.timeSpent?.inProgress !== undefined) 
                ? t.timeSpent.inProgress 
                : (t.timeSpent?.ongoing || 0);
              
              const defaultSla = t.priority === "Urgent" ? 24 : (t.priority === "High" ? 48 : (t.priority === "Medium" ? 72 : 120));

              return {
                ...t,
                status,
                slaHours: t.slaHours || defaultSla,
                timeSpent: {
                  todo: t.timeSpent?.todo || 0,
                  inProgress: inProgTime,
                  done: t.timeSpent?.done || 0
                }
              };
            });
          }
        }
      } catch (e) {
        console.warn("Failed to load tasks from localStorage, falling back to default sample tasks", e);
      }
    }
    // Deep clone to prevent mutations
    const defaults = JSON.parse(JSON.stringify(INITIAL_TASKS));
    this.saveTasks(defaults);
    return defaults;
  }

  saveTasks(tasks) {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (e) {
        console.error("Failed to save tasks to localStorage", e);
      }
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(fn => fn !== callback);
    };
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this);
      } catch (err) {
        console.error("Error in state subscriber:", err);
      }
    }
  }

  // --- Task Operations ---

  addTask(taskData) {
    const nextNum = this.tasks.reduce((max, t) => {
      const match = t.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 100;
      return Math.max(max, num);
    }, 100) + 1;

    const defaultSla = taskData.priority === "Urgent" ? 24 : (taskData.priority === "High" ? 48 : (taskData.priority === "Medium" ? 72 : 120));

    const newTask = {
      id: `TASK-${nextNum}`,
      title: taskData.title.trim(),
      description: (taskData.description || "").trim(),
      status: taskData.status === "Ongoing" ? "In Progress" : (taskData.status || "Todo"),
      priority: taskData.priority || "Medium",
      slaHours: taskData.slaHours || defaultSla,
      createdAt: new Date().toISOString(),
      dueDate: taskData.dueDate || new Date(Date.now() + 86400000 * 3).toISOString(),
      timeSpent: taskData.timeSpent || {
        todo: taskData.status === "Todo" ? 1800 : 0,
        inProgress: (taskData.status === "In Progress" || taskData.status === "Ongoing") ? 3600 : 0,
        done: taskData.status === "Done" ? 1800 : 0
      }
    };

    this.tasks = [newTask, ...this.tasks];
    this.saveTasks(this.tasks);
    this.notify();
    return newTask;
  }

  updateTask(taskId, updates) {
    this.tasks = this.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, ...updates };
      }
      return t;
    });
    this.saveTasks(this.tasks);
    this.notify();
  }

  updateTaskStatus(taskId, newStatus) {
    const canonicalStatus = newStatus === "Ongoing" ? "In Progress" : newStatus;
    this.tasks = this.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: canonicalStatus };
      }
      return t;
    });
    this.saveTasks(this.tasks);
    this.notify();
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveTasks(this.tasks);
    this.notify();
  }

  resetToDefaultTasks() {
    this.tasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
    this.saveTasks(this.tasks);
    this.clearFilters();
    this.notify();
  }

  // --- View & Filter Operations ---

  setView(view) {
    if (["list", "grid", "kanban", "section"].includes(view)) {
      this.currentView = view;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(VIEW_KEY, view);
      }
      this.notify();
    }
  }

  setSidebarFilter(filter) {
    this.sidebarFilter = filter; // 'all' | 'todo' | 'ongoing' | 'done'
    this.notify();
  }

  setStatusFilter(status) {
    this.statusFilter = status;
    this.notify();
  }

  setPriorityFilter(priority) {
    this.priorityFilter = priority;
    this.notify();
  }

  setSearchQuery(query) {
    this.searchQuery = query;
    this.notify();
  }

  setSorting(sortBy, sortOrder = null) {
    this.sortBy = sortBy;
    if (sortOrder) {
      this.sortOrder = sortOrder;
    }
    this.notify();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    this.notify();
  }

  setSectionGroupBy(group) {
    this.sectionGroupBy = group;
    this.notify();
  }

  toggleSectionCollapse(sectionId) {
    if (this.collapsedSections.has(sectionId)) {
      this.collapsedSections.delete(sectionId);
    } else {
      this.collapsedSections.add(sectionId);
    }
    this.notify();
  }

  clearFilters() {
    this.searchQuery = "";
    this.statusFilter = "all";
    this.priorityFilter = "all";
    this.sidebarFilter = "all";
    this.notify();
  }

  setTheme(theme) {
    this.theme = theme;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(THEME_KEY, theme);
    }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    this.notify();
  }

  toggleTheme() {
    const nextTheme = this.theme === "dark" ? "light" : "dark";
    this.setTheme(nextTheme);
  }

  // --- Task Count Helpers ---

  getCounts() {
    const all = this.tasks.length;
    const todo = this.tasks.filter(t => t.status === "Todo").length;
    const inProgress = this.tasks.filter(t => t.status === "In Progress" || t.status === "Ongoing").length;
    const done = this.tasks.filter(t => t.status === "Done").length;
    return { all, todo, inProgress, ongoing: inProgress, done };
  }
}

export const store = new StateStore();
