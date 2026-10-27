# Comhard TaskFlow — Stage 2

A modern, full-stack personal task management dashboard built with **HTML, Vanilla CSS, and JavaScript ES modules**, powered by **Supabase** for authentication and persistent PostgreSQL storage.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Supabase Configuration (Required for cloud sync)

1. Create a free project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env`:
   ```bash
   cp .env.example .env
   ```
3. Fill in your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-anon-key-here
   ```
4. Run the schema in Supabase SQL Editor → New Query:
   ```bash
   # Copy and run the contents of:
   supabase-schema.sql
   ```
5. Enable **Realtime** on the `tasks` table in Supabase Dashboard → Database → Replication

> **Without `.env`:** The app runs in offline/localStorage mode — all features work, tasks are just local.

---

## 📁 Project Structure

```
Comhard Todo App/
├── index.html           # Main dashboard (Stage 2: with auth guard)
├── auth.html            # Authentication page (sign in / sign up)
├── supabase-schema.sql  # PostgreSQL schema + RLS policy
├── .env.example         # Template env file (copy to .env)
├── .gitignore           # Excludes .env, node_modules, dist
│
├── css/
│   ├── main.css         # Design system, tokens, resets, shared components
│   ├── sidebar.css      # Sidebar navigation styles
│   ├── dashboard.css    # Dashboard header, search, filter toolbar
│   ├── views.css        # List, Grid, Kanban, Section view styles
│   ├── modals.css       # Modal dialogs and toast notifications
│   └── auth.css         # Authentication page styles
│
└── js/
    ├── app.js           # Main app controller (wires everything)
    ├── auth-page.js     # Auth page controller
    ├── auth.js          # Supabase Auth wrapper (sign in/up/out, magic link)
    ├── supabase.js      # Supabase client singleton
    ├── db.js            # Task CRUD over Supabase (with RLS)
    ├── state.js         # Reactive state store (localStorage + Supabase sync)
    ├── filters.js       # Filtering, sorting, SLA calculation
    ├── views.js         # View renderers (List, Grid, Kanban, Section)
    ├── icons.js         # Inline SVG icon library
    └── data.js          # Sample tasks (used when no DB tasks exist)
```

---

## ✅ Stage 2 Features

### Authentication
- **Email + Password** — sign up, sign in with confirmation email support
- **Magic Link** — passwordless email login (one click)
- **Password Reset** — email-based reset flow
- **Session persistence** — stays logged in across page refreshes
- **Auth guard** — session checked on app load; sidebar reflects user info

### Persistent Storage
- Tasks stored in **Supabase PostgreSQL** per user account
- **Row Level Security (RLS)** — users can only access their own tasks
- **First-login seeding** — existing localStorage tasks auto-uploaded to Supabase on first sign-in
- **localStorage cache** — serves as offline fallback if Supabase is unavailable

### Real-time
- **Supabase Realtime** subscriptions — changes reflect live across browser tabs
- INSERT, UPDATE, DELETE events handled without page refresh

### All Stage 1 Features (preserved)
- **4 Views:** List, Grid, Kanban, Section
- **Kanban drag-and-drop** with real status updates
- **Horizontal scrolling** in Kanban view
- **Task detail modal** with status transition buttons
- **Add Task modal** with SLA auto-calculation
- **Filters:** status, priority, search, sort, sort-order
- **Section grouping** by status or priority
- **Dark/Light mode** toggle (true black, no blue tints)
- **Keyboard shortcuts:** `/` search, `N` new task, `1-4` views, `Esc` close
- **Toast notifications** for all actions
- **SLA chips** and due date indicators

---

## 🔒 Security Notes

- Only the **Supabase anon (publishable) key** is used in browser code
- The **service-role key** is never used or exposed client-side
- **RLS** enforces server-side data isolation between users
- `.env` is excluded from Git via `.gitignore`

---

## 🗄️ Database Schema

```sql
create table public.tasks (
  id          text        primary key,     -- "TASK-101"
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text        default '',
  status      text        default 'Todo'   check (status in ('Todo','In Progress','Done')),
  priority    text        default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  sla_hours   integer     default 72,
  due_date    timestamptz,
  created_at  timestamptz default now(),
  time_spent  jsonb       default '{"todo":0,"inProgress":0,"done":0}'
);
```

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
