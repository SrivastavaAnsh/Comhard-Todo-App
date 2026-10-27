/**
 * Filter, search, and sorting logic for Comhard TaskFlow.
 */

const PRIORITY_WEIGHTS = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

export function filterAndSortTasks(tasks, state) {
  const {
    sidebarFilter,
    statusFilter,
    priorityFilter,
    searchQuery,
    sortBy,
    sortOrder
  } = state;

  const normalizedQuery = (searchQuery || "").trim().toLowerCase();

  // 1. Filter
  const filtered = tasks.filter(task => {
    // Sidebar Filter: 'all', 'todo', 'inprogress', 'done'
    if (sidebarFilter && sidebarFilter !== "all") {
      const sf = sidebarFilter.toLowerCase();
      const ts = (task.status || "").toLowerCase();
      if (sf === "inprogress" || sf === "ongoing") {
        if (ts !== "in progress" && ts !== "ongoing") return false;
      } else if (ts !== sf) {
        return false;
      }
    }

    // Status Dropdown Filter: 'all', 'Todo', 'In Progress', 'Done'
    if (statusFilter && statusFilter !== "all") {
      const sf = statusFilter.toLowerCase();
      const ts = (task.status || "").toLowerCase();
      if (sf === "in progress" || sf === "ongoing") {
        if (ts !== "in progress" && ts !== "ongoing") return false;
      } else if (ts !== sf) {
        return false;
      }
    }

    // Priority Dropdown Filter: 'all', 'Low', 'Medium', 'High', 'Urgent'
    if (priorityFilter && priorityFilter !== "all") {
      if (task.priority.toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }
    }

    // Search Query (title, description, or id)
    if (normalizedQuery) {
      const matchTitle = (task.title || "").toLowerCase().includes(normalizedQuery);
      const matchDesc = (task.description || "").toLowerCase().includes(normalizedQuery);
      const matchId = (task.id || "").toLowerCase().includes(normalizedQuery);
      if (!matchTitle && !matchDesc && !matchId) {
        return false;
      }
    }

    return true;
  });

  // 2. Sort
  filtered.sort((a, b) => {
    let comp = 0;

    switch (sortBy) {
      case "priority": {
        const weightA = PRIORITY_WEIGHTS[a.priority] || 0;
        const weightB = PRIORITY_WEIGHTS[b.priority] || 0;
        comp = weightA - weightB; // Low -> Urgent
        break;
      }
      case "createdAt": {
        const timeA = new Date(a.createdAt).getTime() || 0;
        const timeB = new Date(b.createdAt).getTime() || 0;
        comp = timeA - timeB; // Oldest -> Newest
        break;
      }
      case "title": {
        comp = a.title.localeCompare(b.title); // A -> Z
        break;
      }
      case "timeSpent": {
        const totalA = getTotalTime(a.timeSpent);
        const totalB = getTotalTime(b.timeSpent);
        comp = totalA - totalB; // Least -> Most
        break;
      }
      case "dueDate":
      default: {
        const timeA = new Date(a.dueDate).getTime() || 0;
        const timeB = new Date(b.dueDate).getTime() || 0;
        comp = timeA - timeB; // Soonest -> Furthest
        break;
      }
    }

    return sortOrder === "desc" ? -comp : comp;
  });

  return filtered;
}

export function getTotalTime(timeSpent) {
  if (!timeSpent) return 0;
  const inProgressTime = (timeSpent.inProgress !== undefined) ? timeSpent.inProgress : (timeSpent.ongoing || 0);
  return (timeSpent.todo || 0) + inProgressTime + (timeSpent.done || 0);
}

export function calculateSla(priority, dueDate = null) {
  const slaTargetHours = {
    Urgent: 24,
    High: 48,
    Medium: 72,
    Low: 120
  };
  const targetHours = slaTargetHours[priority] || 72;
  const now = Date.now();
  const deadlineTime = now + targetHours * 3600 * 1000;
  const deadlineDate = new Date(deadlineTime);

  let status = "compliant";
  let statusText = "Within standard SLA target";
  const days = Math.round(targetHours / 24);
  const targetSummary = `${targetHours}h (${days} ${days === 1 ? 'day' : 'days'})`;

  if (dueDate) {
    const dueTime = new Date(dueDate).getTime();
    if (!isNaN(dueTime)) {
      const diffHours = (dueTime - now) / (3600 * 1000);
      if (diffHours < 0) {
        status = "breached";
        statusText = "Due date has already passed";
      } else if (diffHours < targetHours) {
        status = "tight";
        statusText = `Accelerated (${Math.round(diffHours)}h remaining)`;
      } else {
        status = "compliant";
        statusText = `On track (${Math.round(diffHours)}h remaining)`;
      }
    }
  }

  return {
    targetHours,
    deadlineDate: deadlineDate.toISOString(),
    formattedTarget: targetSummary,
    formattedDeadline: formatDate(deadlineDate.toISOString()),
    status,
    statusText
  };
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0h";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "0h";
}

export function formatDate(isoString) {
  if (!isoString) return "No date";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function getRelativeDueBadge(isoString, status) {
  if (!isoString) return { label: "No due date", type: "neutral" };
  if (status === "Done") return { label: "Completed", type: "done" };

  const target = new Date(isoString).getTime();
  const now = Date.now();
  const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      label: daysAgo === 1 ? "Overdue by 1 day" : `Overdue by ${daysAgo} days`,
      type: "overdue"
    };
  } else if (diffDays === 0) {
    return { label: "Due today", type: "urgent" };
  } else if (diffDays === 1) {
    return { label: "Due tomorrow", type: "warning" };
  } else {
    return { label: `Due in ${diffDays} days`, type: "normal" };
  }
}

export function hasActiveFilters(state) {
  return (
    (state.searchQuery && state.searchQuery.trim().length > 0) ||
    state.statusFilter !== "all" ||
    state.priorityFilter !== "all" ||
    state.sidebarFilter !== "all"
  );
}

export function getActiveFilterCount(state) {
  let count = 0;
  if (state.searchQuery && state.searchQuery.trim().length > 0) count++;
  if (state.statusFilter !== "all") count++;
  if (state.priorityFilter !== "all") count++;
  if (state.sidebarFilter !== "all") count++;
  return count;
}
