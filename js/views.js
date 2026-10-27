/**
 * View renderers for Comhard TaskFlow:
 * List, Grid, Kanban, and Section views + Empty States.
 */

import { getIcon } from "./icons.js";
import {
  formatDuration,
  formatDate,
  getRelativeDueBadge,
  getTotalTime
} from "./filters.js";

// Helper: render priority badge
export function renderPriorityBadge(priority) {
  const p = priority.toLowerCase();
  return `<span class="badge badge-priority badge-priority-${p}">
    <span class="badge-dot"></span>
    ${priority}
  </span>`;
}

// Helper: render status badge
export function renderStatusBadge(status) {
  const isProg = status === "In Progress" || status === "Ongoing";
  const s = isProg ? "inprogress" : status.toLowerCase();
  const label = isProg ? "In Progress" : status;
  let iconName = "circle";
  if (isProg) iconName = "clock";
  if (status === "Done") iconName = "checkCircle";

  return `<span class="badge badge-status badge-status-${s}">
    ${getIcon(iconName, "badge-icon")}
    <span>${label}</span>
  </span>`;
}

// Helper: render SLA chip
export function renderSlaChip(slaHours) {
  if (!slaHours) return "";
  return `<span class="sla-chip" title="Service Level Agreement: ${slaHours}h target">
    ${getIcon("clock", "chip-icon")}
    <span>SLA ${slaHours}h</span>
  </span>`;
}

// Helper: render due date badge
export function renderDueDate(isoString, status) {
  const rel = getRelativeDueBadge(isoString, status);
  return `<span class="due-date-chip due-date-${rel.type}" title="Due: ${formatDate(isoString)}">
    ${getIcon("calendar", "chip-icon")}
    <span>${rel.label}</span>
  </span>`;
}

// Helper: render time spent chip
export function renderTimeSpentChip(timeSpent, currentStatus) {
  const total = getTotalTime(timeSpent);
  const formattedTotal = formatDuration(total);
  const isProg = currentStatus === "In Progress" || currentStatus === "Ongoing";
  const currentSeconds = timeSpent 
    ? (isProg ? (timeSpent.inProgress !== undefined ? timeSpent.inProgress : (timeSpent.ongoing || 0)) : (timeSpent[currentStatus.toLowerCase()] || 0)) 
    : 0;
  const formattedCurrent = formatDuration(currentSeconds);
  const statusLabel = isProg ? "In Progress" : currentStatus;

  return `<div class="time-spent-chip" title="Time in ${statusLabel}: ${formattedCurrent} | Total: ${formattedTotal}">
    ${getIcon("clock", "chip-icon")}
    <span class="time-text"><strong>${formattedCurrent}</strong> in ${statusLabel} <span class="time-divider">·</span> ${formattedTotal} tot</span>
  </div>`;
}

// Helper: render time spent visual progress bar
export function renderTimeSpentBar(timeSpent) {
  const todo = (timeSpent && timeSpent.todo) || 0;
  const inProgress = (timeSpent && (timeSpent.inProgress !== undefined ? timeSpent.inProgress : timeSpent.ongoing)) || 0;
  const done = (timeSpent && timeSpent.done) || 0;
  const total = todo + inProgress + done;

  if (total === 0) {
    return `<div class="time-bar" title="No time tracked yet"><span class="time-bar-empty"></span></div>`;
  }

  const pTodo = Math.round((todo / total) * 100);
  const pInProgress = Math.round((inProgress / total) * 100);
  const pDone = done > 0 ? Math.max(0, 100 - pTodo - pInProgress) : 0;

  return `
    <div class="time-bar" title="Todo: ${formatDuration(todo)} (${pTodo}%) | In Progress: ${formatDuration(inProgress)} (${pInProgress}%) | Done: ${formatDuration(done)} (${pDone}%)">
      ${pTodo > 0 ? `<span class="time-bar-seg time-bar-todo" style="width: ${pTodo}%"></span>` : ""}
      ${pInProgress > 0 ? `<span class="time-bar-seg time-bar-inprogress" style="width: ${pInProgress}%"></span>` : ""}
      ${pDone > 0 ? `<span class="time-bar-seg time-bar-done" style="width: ${pDone}%"></span>` : ""}
    </div>
  `;
}

// -------------------------------------------------------------
// 1. LIST VIEW
// -------------------------------------------------------------
export function renderListView(tasks) {
  if (tasks.length === 0) return renderEmptyState();

  const rows = tasks.map(task => {
    const isDone = task.status === "Done";
    const isProg = task.status === "In Progress" || task.status === "Ongoing";
    const statusClass = isDone ? "done" : (isProg ? "inprogress" : "todo");

    return `
      <div class="task-list-row ${isDone ? 'is-done' : ''}" data-task-id="${task.id}">
        <div class="list-col-status">
          <button class="status-toggle-btn status-${statusClass}" 
                  data-action="cycle-status" 
                  data-task-id="${task.id}" 
                  title="Status: ${task.status} (Click to advance)">
            ${isDone ? getIcon('checkCircle') : (isProg ? getIcon('circleDot') : getIcon('circle'))}
          </button>
        </div>

        <div class="list-col-id">
          <span class="task-id-pill">${task.id}</span>
        </div>

        <div class="list-col-main" data-action="open-detail" data-task-id="${task.id}">
          <h4 class="task-title ${isDone ? 'task-title-done' : ''}">${escapeHtml(task.title)}</h4>
          <p class="task-desc-snippet">${escapeHtml(task.description)}</p>
        </div>

        <div class="list-col-meta">
          ${renderPriorityBadge(task.priority)}
          ${renderStatusBadge(task.status)}
          ${renderSlaChip(task.slaHours)}
          ${renderDueDate(task.dueDate, task.status)}
          ${renderTimeSpentChip(task.timeSpent, task.status)}
        </div>

        <div class="list-col-actions">
          <button class="btn-icon" data-action="open-detail" data-task-id="${task.id}" title="View Details">
            ${getIcon('info')}
          </button>
          <button class="btn-icon btn-icon-danger" data-action="delete-task" data-task-id="${task.id}" title="Delete Task">
            ${getIcon('trash')}
          </button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="task-list-container">
      <div class="task-list-header">
        <span class="header-col-status">Status</span>
        <span class="header-col-id">ID</span>
        <span class="header-col-main">Task Title & Details</span>
        <span class="header-col-meta">Priority, SLA & Time</span>
        <span class="header-col-actions">Actions</span>
      </div>
      <div class="task-list-body">
        ${rows}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 2. GRID VIEW
// -------------------------------------------------------------
export function renderGridView(tasks) {
  if (tasks.length === 0) return renderEmptyState();

  const cards = tasks.map(task => {
    const isDone = task.status === "Done";
    const inProgTime = (task.timeSpent?.inProgress !== undefined) 
      ? task.timeSpent.inProgress 
      : (task.timeSpent?.ongoing || 0);

    return `
      <div class="task-card-grid ${isDone ? 'is-done' : ''}" data-task-id="${task.id}">
        <div class="card-grid-header">
          <div class="card-grid-header-left">
            <span class="task-id-pill">${task.id}</span>
            ${renderSlaChip(task.slaHours)}
          </div>
          <div class="card-grid-badges">
            ${renderPriorityBadge(task.priority)}
            ${renderStatusBadge(task.status)}
          </div>
        </div>

        <div class="card-grid-body" data-action="open-detail" data-task-id="${task.id}">
          <h4 class="task-title ${isDone ? 'task-title-done' : ''}">${escapeHtml(task.title)}</h4>
          <p class="task-desc">${escapeHtml(task.description)}</p>
        </div>

        <div class="card-grid-time">
          <div class="time-header">
            <span class="time-label">${getIcon("clock")} Time Spent</span>
            <span class="time-total">${formatDuration(getTotalTime(task.timeSpent))}</span>
          </div>
          ${renderTimeSpentBar(task.timeSpent)}
          <div class="time-breakdown-mini">
            <span class="mini-seg" title="Todo">T: ${formatDuration(task.timeSpent?.todo || 0)}</span>
            <span class="mini-seg" title="In Progress">P: ${formatDuration(inProgTime)}</span>
            <span class="mini-seg" title="Done">D: ${formatDuration(task.timeSpent?.done || 0)}</span>
          </div>
        </div>

        <div class="card-grid-footer">
          ${renderDueDate(task.dueDate, task.status)}
          
          <div class="card-actions">
            <button class="btn-icon" data-action="open-detail" data-task-id="${task.id}" title="Task Details">
              ${getIcon('info')}
            </button>
            <button class="btn-icon" data-action="cycle-status" data-task-id="${task.id}" title="Cycle Status">
              ${getIcon('refresh')}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `<div class="task-grid-container">${cards}</div>`;
}

// -------------------------------------------------------------
// 3. KANBAN VIEW (Horizontal & Vertical Scrolling)
// -------------------------------------------------------------
export function renderKanbanView(tasks) {
  const columns = [
    { key: "Todo", title: "To Do", classKey: "todo" },
    { key: "In Progress", title: "In Progress", classKey: "inprogress" },
    { key: "Done", title: "Done", classKey: "done" }
  ];

  const colHtml = columns.map(col => {
    const colTasks = tasks.filter(t => {
      if (col.key === "In Progress") {
        return t.status === "In Progress" || t.status === "Ongoing";
      }
      return t.status === col.key;
    });

    const cardsHtml = colTasks.length > 0
      ? colTasks.map(task => `
          <div class="kanban-card" 
               draggable="true" 
               data-task-id="${task.id}"
               id="kanban-${task.id}">
            <div class="kanban-card-top">
              <span class="task-id-pill">${task.id}</span>
              <div class="kanban-top-badges">
                ${renderSlaChip(task.slaHours)}
                ${renderPriorityBadge(task.priority)}
              </div>
            </div>

            <div class="kanban-card-body" data-action="open-detail" data-task-id="${task.id}">
              <h4 class="task-title ${task.status === 'Done' ? 'task-title-done' : ''}">${escapeHtml(task.title)}</h4>
              <p class="task-desc-snippet">${escapeHtml(task.description)}</p>
            </div>

            <div class="kanban-card-time">
              ${renderTimeSpentChip(task.timeSpent, task.status)}
            </div>

            <div class="kanban-card-bottom">
              ${renderDueDate(task.dueDate, task.status)}
              
              <div class="kanban-card-actions">
                <button class="btn-icon-xs" data-action="open-detail" data-task-id="${task.id}" title="View Details">
                  ${getIcon('info')}
                </button>
                <button class="btn-icon-xs" data-action="cycle-status" data-task-id="${task.id}" title="Move to Next Column">
                  ${getIcon('chevronRight')}
                </button>
              </div>
            </div>
          </div>
        `).join("")
      : `<div class="kanban-column-empty">
          <p>No tasks in ${col.title}</p>
          <button class="btn-subtle-add" data-action="quick-add" data-status="${col.key}">
            ${getIcon('plus')} Add Task
          </button>
        </div>`;

    return `
      <div class="kanban-column kanban-col-${col.classKey}" data-status="${col.key}">
        <div class="kanban-column-header">
          <div class="kanban-col-title-group">
            <span class="kanban-status-indicator indicator-${col.classKey}"></span>
            <h3 class="kanban-col-title">${col.title}</h3>
            <span class="kanban-col-count">${colTasks.length}</span>
          </div>
          <button class="btn-icon-sm" data-action="quick-add" data-status="${col.key}" title="Add Task to ${col.title}">
            ${getIcon('plus')}
          </button>
        </div>

        <div class="kanban-cards-wrapper" data-status="${col.key}">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join("");

  return `<div class="kanban-board-container">${colHtml}</div>`;
}

// -------------------------------------------------------------
// 4. SECTION VIEW
// -------------------------------------------------------------
export function renderSectionView(tasks, state) {
  if (tasks.length === 0) return renderEmptyState();

  const groupBy = state.sectionGroupBy || "status"; // 'status' | 'priority'
  const collapsed = state.collapsedSections || new Set();

  let groups = [];
  if (groupBy === "status") {
    groups = [
      { id: "In Progress", title: "In Progress", colorClass: "inprogress", icon: "clock" },
      { id: "Todo", title: "To Do", colorClass: "todo", icon: "circle" },
      { id: "Done", title: "Completed", colorClass: "done", icon: "checkCircle" }
    ];
  } else {
    groups = [
      { id: "Urgent", title: "Urgent Priority", colorClass: "urgent", icon: "alertCircle" },
      { id: "High", title: "High Priority", colorClass: "high", icon: "alertCircle" },
      { id: "Medium", title: "Medium Priority", colorClass: "medium", icon: "circleDot" },
      { id: "Low", title: "Low Priority", colorClass: "low", icon: "circle" }
    ];
  }

  const sectionsHtml = groups.map(grp => {
    const groupTasks = tasks.filter(t => {
      if (groupBy === "status") {
        if (grp.id === "In Progress") {
          return t.status === "In Progress" || t.status === "Ongoing";
        }
        return t.status === grp.id;
      }
      return t.priority === grp.id;
    });

    const isCollapsed = collapsed.has(grp.id);

    const taskItems = groupTasks.length > 0
      ? groupTasks.map(task => {
          const isDone = task.status === "Done";
          const isProg = task.status === "In Progress" || task.status === "Ongoing";
          const statusClass = isDone ? "done" : (isProg ? "inprogress" : "todo");

          return `
            <div class="section-task-item" data-task-id="${task.id}">
              <div class="section-item-left">
                <button class="status-toggle-btn status-${statusClass}" 
                        data-action="cycle-status" 
                        data-task-id="${task.id}" 
                        title="Advance Status">
                  ${isDone ? getIcon('checkCircle') : (isProg ? getIcon('circleDot') : getIcon('circle'))}
                </button>
                <span class="task-id-pill">${task.id}</span>
                <div class="section-item-title-wrap" data-action="open-detail" data-task-id="${task.id}">
                  <span class="task-title ${isDone ? 'task-title-done' : ''}">${escapeHtml(task.title)}</span>
                  <span class="section-item-desc">${escapeHtml(task.description)}</span>
                </div>
              </div>

              <div class="section-item-right">
                ${groupBy === "status" ? renderPriorityBadge(task.priority) : renderStatusBadge(task.status)}
                ${renderSlaChip(task.slaHours)}
                ${renderDueDate(task.dueDate, task.status)}
                ${renderTimeSpentChip(task.timeSpent, task.status)}
                <div class="section-item-actions">
                  <button class="btn-icon-xs" data-action="open-detail" data-task-id="${task.id}" title="View">
                    ${getIcon('info')}
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("")
      : `<div class="section-empty-hint">No tasks in this section.</div>`;

    return `
      <div class="accordion-section section-grp-${grp.colorClass} ${isCollapsed ? 'is-collapsed' : ''}" data-section-id="${grp.id}">
        <div class="accordion-header" data-action="toggle-section" data-section-id="${grp.id}">
          <div class="accordion-header-left">
            <span class="accordion-icon chevron-icon">${isCollapsed ? getIcon('chevronRight') : getIcon('chevronDown')}</span>
            <span class="accordion-grp-icon">${getIcon(grp.icon)}</span>
            <h3 class="accordion-title">${grp.title}</h3>
            <span class="section-count-badge">${groupTasks.length}</span>
          </div>

          <div class="accordion-header-right">
            <button class="btn-subtle-add" data-action="quick-add" data-group-field="${groupBy}" data-group-value="${grp.id}">
              ${getIcon('plus')} Add
            </button>
          </div>
        </div>

        <div class="accordion-body ${isCollapsed ? 'collapsed' : ''}">
          <div class="accordion-body-inner">
            ${taskItems}
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="section-view-container">
      <div class="section-view-toolbar">
        <span class="group-label">Group tasks by:</span>
        <div class="section-group-toggle">
          <button class="pill-btn ${groupBy === 'status' ? 'active' : ''}" data-action="set-group-by" data-value="status">
            Status
          </button>
          <button class="pill-btn ${groupBy === 'priority' ? 'active' : ''}" data-action="set-group-by" data-value="priority">
            Priority
          </button>
        </div>
      </div>
      <div class="section-list">
        ${sectionsHtml}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 5. EMPTY STATE
// -------------------------------------------------------------
export function renderEmptyState() {
  return `
    <div class="empty-state-card">
      <div class="empty-state-icon">
        ${getIcon('inbox')}
      </div>
      <h3 class="empty-state-title">No matching tasks found</h3>
      <p class="empty-state-text">
        We couldn't find any tasks matching your active filters or search criteria. Try modifying your filters or start fresh.
      </p>
      <div class="empty-state-actions">
        <button class="btn-secondary" data-action="clear-filters">
          ${getIcon('refresh')} Clear All Filters
        </button>
        <button class="btn-primary" data-action="open-add-modal">
          ${getIcon('plus')} Create New Task
        </button>
      </div>
    </div>
  `;
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
