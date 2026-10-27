-- =============================================================================
-- Comhard TaskFlow — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- 1. Create the tasks table
create table if not exists public.tasks (
  id          text        primary key,             -- e.g. "TASK-101"
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text        not null default '',
  status      text        not null default 'Todo'
                          check (status in ('Todo', 'In Progress', 'Done')),
  priority    text        not null default 'Medium'
                          check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  sla_hours   integer     not null default 72,
  due_date    timestamptz,
  created_at  timestamptz not null default now(),
  time_spent  jsonb       not null default '{"todo":0,"inProgress":0,"done":0}'::jsonb
);

-- 2. Enable Row Level Security (RLS)
alter table public.tasks enable row level security;

-- 3. Create policy: users can only CRUD their OWN tasks
create policy "Users manage own tasks"
  on public.tasks
  for all
  using      ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 4. Enable Realtime for the tasks table
-- (Go to Supabase Dashboard → Table Editor → tasks → Enable Realtime,
--  OR run the commands below)
begin;
  -- insert only if not already present
  insert into supabase_realtime.subscription (publication, table_name)
  select 'supabase_realtime', 'tasks'
  where not exists (
    select 1 from supabase_realtime.subscription
    where table_name = 'tasks'
  );
commit;

-- Alternatively, enable realtime from the dashboard:
-- Database → Replication → Source → supabase_realtime → Add table → tasks

-- =============================================================================
-- Optional: Create index on user_id for faster queries
-- =============================================================================
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- =============================================================================
-- 5. Auto-confirm users on signup (bypasses email verification delay for local dev)
-- =============================================================================
create or replace function public.auto_confirm_new_user()
returns trigger as $$
begin
  new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_new_user();

-- Auto-confirm any existing users in auth.users
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
