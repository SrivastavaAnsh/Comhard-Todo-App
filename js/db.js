/**
 * Comhard TaskFlow - Supabase Database Layer
 * All task CRUD operations against Supabase (tasks table with RLS).
 * Row-Level Security ensures each user only sees their own tasks.
 *
 * Expected table schema (run in Supabase SQL editor):
 *
 *   create table public.tasks (
 *     id          text        primary key,          -- e.g. "TASK-101"
 *     user_id     uuid        not null references auth.users(id) on delete cascade,
 *     title       text        not null,
 *     description text        default '',
 *     status      text        not null default 'Todo',
 *     priority    text        not null default 'Medium',
 *     sla_hours   int         default 72,
 *     due_date    timestamptz,
 *     created_at  timestamptz not null default now(),
 *     time_spent  jsonb       not null default '{"todo":0,"inProgress":0,"done":0}'::jsonb
 *   );
 *
 *   -- Enable RLS
 *   alter table public.tasks enable row level security;
 *
 *   -- Users can only CRUD their own tasks
 *   create policy "Users manage own tasks" on public.tasks
 *     for all
 *     using ( auth.uid() = user_id )
 *     with check ( auth.uid() = user_id );
 */

import { supabase } from "./supabase.js";

// ---- Shape Converters ----

/**
 * Convert a DB row (snake_case) → app task object (camelCase).
 */
function dbRowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    status: row.status,
    priority: row.priority,
    slaHours: row.sla_hours ?? 72,
    createdAt: row.created_at,
    dueDate: row.due_date,
    timeSpent: row.time_spent ?? { todo: 0, inProgress: 0, done: 0 },
  };
}

/**
 * Convert app task object (camelCase) → DB row (snake_case).
 * user_id is injected from the current session.
 */
function taskToDbRow(task, userId) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    sla_hours: task.slaHours ?? 72,
    due_date: task.dueDate || null,
    created_at: task.createdAt,
    time_spent: task.timeSpent ?? { todo: 0, inProgress: 0, done: 0 },
  };
}

// ---- CRUD ----

/** Fetch all tasks for the authenticated user (RLS enforced server-side). */
export async function fetchTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(dbRowToTask);
}

/** Insert a new task. */
export async function createTask(task, userId) {
  const { data, error } = await supabase
    .from("tasks")
    .insert([taskToDbRow(task, userId)])
    .select()
    .single();

  if (error) throw error;
  return dbRowToTask(data);
}

/** Update an existing task (partial update). */
export async function updateTask(taskId, updates) {
  // Map camelCase fields → snake_case DB columns
  const dbUpdates = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.slaHours !== undefined) dbUpdates.sla_hours = updates.slaHours;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent;

  const { data, error } = await supabase
    .from("tasks")
    .update(dbUpdates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return dbRowToTask(data);
}

/** Delete a task by ID. */
export async function deleteTask(taskId) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
}

/**
 * Bulk upsert — used to seed Supabase with existing localStorage tasks
 * when a user logs in for the first time.
 */
export async function upsertTasks(tasks, userId) {
  const rows = tasks.map(t => taskToDbRow(t, userId));
  const { error } = await supabase
    .from("tasks")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
}

/** Subscribe to real-time task changes for the authenticated user. */
export function subscribeToTasks(onInsert, onUpdate, onDelete) {
  const channel = supabase
    .channel("tasks-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tasks" },
      (payload) => onInsert && onInsert(dbRowToTask(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tasks" },
      (payload) => onUpdate && onUpdate(dbRowToTask(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "tasks" },
      (payload) => onDelete && onDelete(payload.old.id)
    )
    .subscribe();

  // Return unsubscribe function
  return () => supabase.removeChannel(channel);
}
