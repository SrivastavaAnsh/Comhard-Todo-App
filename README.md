# Comhard TaskFlow — Stage 1 To-Do Web App Foundation

A modern, responsive, high-performance personal To-Do and task management dashboard built with **HTML5, Vanilla CSS, and Vanilla JavaScript (ES Modules)**.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Start the Local Development Server
From the project root directory, run:

```bash
npm run dev
```

Alternatively, you can run:
```bash
npm start
```
or with Python if Node is not running:
```bash
python3 -m http.server 5173
```

Open your browser and navigate to:
**`http://localhost:5173`**

---

## 📁 Project Structure

```
Comhard Todo App/
├── index.html            # Semantic HTML5 dashboard layout, modals, and container
├── package.json          # Project scripts and Vite dev server dependency
├── css/
│   ├── main.css          # Design system, CSS variables, dark/light themes, typography, buttons, badges
│   ├── sidebar.css       # Sidebar navigation, category counters, branding, and mobile drawer
│   ├── dashboard.css     # Top navbar, search bar with hotkey hint, view switcher, filter controls
│   ├── views.css         # List, Grid, Kanban, and Section layouts, task cards, and empty state
│   └── modals.css        # Glassmorphic modal overlays, Add Task form, Task Detail view, Toasts
├── js/
│   ├── app.js            # Main application controller, DOM binding, hotkeys, modals, toasts
│   ├── data.js           # Realistic initial sample tasks dataset (9 real engineering tasks)
│   ├── state.js          # Central reactive state store, localStorage sync, mutations
│   ├── filters.js        # Search query matching, multi-criteria filtering, sorting, duration formatting
│   ├── views.js          # View renderers for List, Grid, Kanban, Section, and Empty State
│   └── icons.js          # Lightweight SVG icon provider modeled after Lucide icons
└── README.md             # Project documentation and architectural overview
```

---

## ⚡ What Works in Stage 1

### 1. Dashboard UI & Layout
- **Sidebar Navigation:**
  - Status filters: **All Tasks**, **To Do**, **Ongoing**, **Done**.
  - Dynamic count badges that update in real time based on task status.
  - **Settings & Roadmap** button opening workspace preferences and architecture roadmap.
  - Fully responsive mobile drawer with overlay and backdrop blur.
- **Top Header:**
  - Dynamic page title and real-time task counter (e.g. `Showing 8 of 9 tasks`).
  - Search bar with instant real-time filtering across titles, descriptions, and IDs, with keyboard shortcut (`/`) and clear button (`×`).
  - **Theme Toggle:** High-contrast Dark mode and clean Light mode.
  - **+ Add Task:** Primary action button with hotkey (`N` or `C`).

### 2. Multi-View System (Single Source of Truth)
Switch seamlessly between all 4 views without data duplication or loss of state:
- **List View:** Compact, scannable table with status toggle, task ID, title, priority badge, due date, accumulated time chip, and quick actions.
- **Grid View:** Responsive card grid with accumulated time progress bar and mini breakdown.
- **Kanban Board:** Three status columns (**To Do**, **Ongoing**, **Done**) with drag & drop support, card counter badges, and column quick-add buttons.
- **Section View:** Group tasks into collapsible/expandable accordion sections by either **Status** or **Priority**.

### 3. Realistic Sample Task Model
Each task contains:
- `id`: Unique identifier (e.g., `TASK-101`)
- `title`: Realistic software engineering task title
- `description`: Detailed task specification
- `status`: `Todo`, `Ongoing`, or `Done`
- `priority`: `Low`, `Medium`, `High`, or `Urgent`
- `createdAt`: ISO 8601 timestamp
- `dueDate`: ISO 8601 timestamp with relative badges (`Due today`, `Due tomorrow`, `Overdue by X days`, `Due in X days`)
- `timeSpent`: `{ todo: number, ongoing: number, done: number }` (stored in seconds and formatted into human-readable duration `Xh Ym`).

### 4. Advanced Search, Filtering, and Sorting
- **Real-time Search:** Matches task title, description, and task ID.
- **Combined Filtering:** Simultaneously filter by Sidebar category, Status dropdown, Priority dropdown, and Search query.
- **Clear Filters:** Automatically activates when filters or searches are applied; resets to default view with 1 click.
- **Sorting:** Sort ascending or descending by Due Date, Priority, Creation Date, Title, or Accumulated Time Spent.
- **Empty States:** Friendly empty state with "Clear All Filters" and "Create New Task" actions when zero tasks match.

### 5. Interactive Modals & Actions
- **Add Task Modal:** Creates tasks with title, description, priority, status, due date, and initial tracked time.
- **Task Detail Inspection Modal:** Displays deep-dive accumulated time spent stats cards (Todo, Ongoing, Done, Total), percentage breakdown, and progress bar, plus instant status transitions.
- **Status Advancement:** One-click cycling between Todo ➔ Ongoing ➔ Done directly from rows or cards.
- **Kanban Drag & Drop:** HTML5 drag & drop to move tasks between columns.
- **Keyboard Shortcuts:**
  - `/` : Focus search bar
  - `1`, `2`, `3`, `4` : Switch to List, Grid, Kanban, and Section views
  - `N` or `C` : Open Add Task modal
  - `Esc` : Close modals or mobile drawer

---

## 🔮 What Remains for Stage 2 & Beyond

As outlined in the specification:
1. **Supabase Authentication:**
   - User signup, email/password login, magic links, email verification, forgot password, and session handling.
2. **PostgreSQL Persistence & Row Level Security (RLS):**
   - Database schema for tasks, users, and status logs.
   - User-isolated queries via Supabase RLS policies.
3. **Cumulative Status Duration Engine:**
   - Tracking exact live transition timestamps and accumulated duration across server reloads and repeated status flips.
4. **Time-Spent & SLA Analytics:**
   - Average time-spent dashboards for Todo, Ongoing, and Done (including in-progress tasks).
