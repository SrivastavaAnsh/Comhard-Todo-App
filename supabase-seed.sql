-- =============================================================================
-- Comhard TaskFlow — Seed Sample Tasks in Supabase PostgreSQL
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Grab the first authenticated user from auth.users
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  -- 2. Validate that a user exists
  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No users found in auth.users! Please sign up first at /auth.html, then run this script to attach tasks to your account.';
    RETURN;
  END IF;

  -- Ensure user is confirmed so they can sign in immediately
  UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;

  RAISE NOTICE '✅ Seeding tasks for user_id: %', v_user_id;

  -- 3. Insert or update the 9 sample tasks
  INSERT INTO public.tasks (id, user_id, title, description, status, priority, sla_hours, due_date, created_at, time_spent)
  VALUES
    (
      'TASK-101',
      v_user_id,
      'Implement Row Level Security (RLS) policies on PostgreSQL',
      'Write migration scripts defining tenant-level and user-level RLS policies on the tasks and profiles tables in Supabase.',
      'In Progress',
      'Urgent',
      24,
      '2026-10-28T18:00:00Z',
      '2026-10-22T08:30:00Z',
      '{"todo": 28800, "inProgress": 14400, "done": 0}'::jsonb
    ),
    (
      'TASK-102',
      v_user_id,
      'Design responsive Kanban and Section dashboard layout',
      'Build clean, accessible multi-view task board with draggable columns, collapsible sections, and responsive mobile drawers.',
      'Done',
      'High',
      48,
      '2026-10-25T17:00:00Z',
      '2026-10-18T10:00:00Z',
      '{"todo": 18000, "inProgress": 32400, "done": 7200}'::jsonb
    ),
    (
      'TASK-103',
      v_user_id,
      'Configure Supabase OAuth and email verification templates',
      'Set up magic links, password reset redirects, and transactional email templates with branded styling for user onboarding.',
      'Todo',
      'High',
      48,
      '2026-10-30T17:00:00Z',
      '2026-10-24T11:15:00Z',
      '{"todo": 7200, "inProgress": 0, "done": 0}'::jsonb
    ),
    (
      'TASK-104',
      v_user_id,
      'Audit cumulative status duration calculation algorithm',
      'Verify that elapsed timestamps correctly accumulate across multiple status toggles without drifting on page reloads.',
      'In Progress',
      'Medium',
      72,
      '2026-10-29T12:00:00Z',
      '2026-10-23T14:00:00Z',
      '{"todo": 14400, "inProgress": 9000, "done": 0}'::jsonb
    ),
    (
      'TASK-105',
      v_user_id,
      'Set up automated test suite for search and multi-filter criteria',
      'Write unit tests to validate combined query, status, priority, and sidebar category filtering behavior and edge cases.',
      'Todo',
      'Medium',
      72,
      '2026-11-02T18:00:00Z',
      '2026-10-25T09:00:00Z',
      '{"todo": 3600, "inProgress": 0, "done": 0}'::jsonb
    ),
    (
      'TASK-106',
      v_user_id,
      'Optimize asset bundling and font loading performance',
      'Preload Google Fonts, minify stylesheet distribution, and eliminate layout shifts to achieve sub-second LCP scores.',
      'Done',
      'Low',
      120,
      '2026-10-24T18:00:00Z',
      '2026-10-19T13:45:00Z',
      '{"todo": 7200, "inProgress": 18000, "done": 3600}'::jsonb
    ),
    (
      'TASK-107',
      v_user_id,
      'Draft API documentation for task metrics and time analytics',
      'Document endpoints and data structures for calculating average time spent in Todo, In Progress, and Done statuses.',
      'Todo',
      'Low',
      120,
      '2026-11-05T17:00:00Z',
      '2026-10-26T16:20:00Z',
      '{"todo": 1800, "inProgress": 0, "done": 0}'::jsonb
    ),
    (
      'TASK-108',
      v_user_id,
      'Fix mobile sidebar drawer transition and touch gestures',
      'Prevent background scrolling when sidebar opens on mobile viewports and ensure swipe gestures smoothly dismiss the overlay.',
      'In Progress',
      'Urgent',
      24,
      '2026-10-28T12:00:00Z',
      '2026-10-26T10:10:00Z',
      '{"todo": 10800, "inProgress": 12600, "done": 0}'::jsonb
    ),
    (
      'TASK-109',
      v_user_id,
      'Implement keyboard navigation shortcuts for view switching',
      'Add accessible hotkeys (1-4 for views, / for search, n for new task, Esc for closing modals) with visual tooltip hints.',
      'Todo',
      'Medium',
      72,
      '2026-10-31T18:00:00Z',
      '2026-10-26T15:00:00Z',
      '{"todo": 5400, "inProgress": 0, "done": 0}'::jsonb
    )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    sla_hours = EXCLUDED.sla_hours,
    due_date = EXCLUDED.due_date,
    time_spent = EXCLUDED.time_spent;

  RAISE NOTICE '🎉 Successfully seeded 9 tasks into public.tasks table!';
END $$;
