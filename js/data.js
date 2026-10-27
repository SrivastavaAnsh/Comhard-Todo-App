/**
 * Initial sample task dataset for Comhard TaskFlow.
 * Realistic sample tasks with unique IDs, titles, descriptions,
 * status ('Todo', 'In Progress', 'Done'), priority, creation date, due date,
 * auto-calculated SLA, and accumulated time spent in each status.
 */

export const INITIAL_TASKS = [
  {
    id: "TASK-101",
    title: "Implement Row Level Security (RLS) policies on PostgreSQL",
    description: "Write migration scripts defining tenant-level and user-level RLS policies on the tasks and profiles tables in Supabase.",
    status: "In Progress",
    priority: "Urgent",
    createdAt: "2026-10-22T08:30:00Z",
    dueDate: "2026-10-28T18:00:00Z",
    slaHours: 12,
    timeSpent: {
      todo: 28800,       // 8 hours
      inProgress: 14400, // 4 hours
      done: 0
    }
  },
  {
    id: "TASK-102",
    title: "Design responsive Kanban and Section dashboard layout",
    description: "Build clean, accessible multi-view task board with draggable columns, collapsible sections, and responsive mobile drawers.",
    status: "Done",
    priority: "High",
    createdAt: "2026-10-18T10:00:00Z",
    dueDate: "2026-10-25T17:00:00Z",
    slaHours: 16,
    timeSpent: {
      todo: 18000,       // 5 hours
      inProgress: 32400, // 9 hours
      done: 0            // 0 hours
    }
  },
  {
    id: "TASK-103",
    title: "Configure Supabase OAuth and email verification templates",
    description: "Set up magic links, password reset redirects, and transactional email templates with branded styling for user onboarding.",
    status: "Todo",
    priority: "High",
    createdAt: "2026-10-24T11:15:00Z",
    dueDate: "2026-10-30T17:00:00Z",
    slaHours: 2,
    timeSpent: {
      todo: 7200,        // 2 hours in backlog refinement
      inProgress: 0,
      done: 0
    }
  },
  {
    id: "TASK-104",
    title: "Audit cumulative status duration calculation algorithm",
    description: "Verify that elapsed timestamps correctly accumulate across multiple status toggles without drifting on page reloads.",
    status: "In Progress",
    priority: "Medium",
    createdAt: "2026-10-23T14:00:00Z",
    dueDate: "2026-10-29T12:00:00Z",
    slaHours: 7,
    timeSpent: {
      todo: 14400,       // 4 hours
      inProgress: 9000,  // 2h 30m
      done: 0
    }
  },
  {
    id: "TASK-105",
    title: "Set up automated test suite for search and multi-filter criteria",
    description: "Write unit tests to validate combined query, status, priority, and sidebar category filtering behavior and edge cases.",
    status: "Todo",
    priority: "Medium",
    createdAt: "2026-10-25T09:00:00Z",
    dueDate: "2026-11-02T18:00:00Z",
    slaHours: 1,
    timeSpent: {
      todo: 3600,        // 1 hour
      inProgress: 0,
      done: 0
    }
  },
  {
    id: "TASK-106",
    title: "Optimize asset bundling and font loading performance",
    description: "Preload Google Fonts, minify stylesheet distribution, and eliminate layout shifts to achieve sub-second LCP scores.",
    status: "Done",
    priority: "Low",
    createdAt: "2026-10-19T13:45:00Z",
    dueDate: "2026-10-24T18:00:00Z",
    slaHours: 7,
    timeSpent: {
      todo: 7200,        // 2 hours
      inProgress: 18000, // 5 hours
      done: 0            // 0 hours
    }
  },
  {
    id: "TASK-107",
    title: "Draft API documentation for task metrics and time analytics",
    description: "Document endpoints and data structures for calculating average time spent in Todo, In Progress, and Done statuses.",
    status: "Todo",
    priority: "Low",
    createdAt: "2026-10-26T16:20:00Z",
    dueDate: "2026-11-05T17:00:00Z",
    slaHours: 120,
    timeSpent: {
      todo: 1800,        // 30 min
      inProgress: 0,
      done: 0
    }
  },
  {
    id: "TASK-108",
    title: "Fix mobile sidebar drawer transition and touch gestures",
    description: "Prevent background scrolling when sidebar opens on mobile viewports and ensure swipe gestures smoothly dismiss the overlay.",
    status: "In Progress",
    priority: "Urgent",
    createdAt: "2026-10-26T10:10:00Z",
    dueDate: "2026-10-28T12:00:00Z",
    slaHours: 24,
    timeSpent: {
      todo: 10800,       // 3 hours
      inProgress: 12600, // 3h 30m
      done: 0
    }
  },
  {
    id: "TASK-109",
    title: "Implement keyboard navigation shortcuts for view switching",
    description: "Add accessible hotkeys (1-4 for views, / for search, n for new task, Esc for closing modals) with visual tooltip hints.",
    status: "Todo",
    priority: "Medium",
    createdAt: "2026-10-26T15:00:00Z",
    dueDate: "2026-10-31T18:00:00Z",
    slaHours: 72,
    timeSpent: {
      todo: 5400,        // 1h 30m
      inProgress: 0,
      done: 0
    }
  }
];
