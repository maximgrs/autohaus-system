-- supabase/migrations/20260306_1200_task_locking.sql

-- 1) Add lock fields (additive, safe)
alter table public.tasks
  add column if not exists taken_by_employee_id uuid,
  add column if not exists taken_at timestamptz,
  add column if not exists lock_version integer not null default 0;

create index if not exists tasks_taken_by_employee_id_idx
  on public.tasks (taken_by_employee_id);

create index if not exists tasks_status_taken_idx
  on public.tasks (status, taken_by_employee_id);

-- 2) Increment lock_version on every update (optimistic concurrency)
create or replace function public.tasks_bump_lock_version()
returns trigger
language plpgsql
as $$
begin
  new.lock_version := coalesce(old.lock_version, 0) + 1;
  return new;
end;
$$;

drop trigger if exists trg_tasks_bump_lock_version on public.tasks;

create trigger trg_tasks_bump_lock_version
before update on public.tasks
for each row
execute function public.tasks_bump_lock_version();

-- 3) Atomic "take task" (prevents two devices taking same task)
--    - If task already taken by another employee -> error TASK_ALREADY_TAKEN
create or replace function public.take_task(
  p_task_id uuid,
  p_employee_id uuid
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tasks;
begin
  select * into t
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'TASK_NOT_FOUND' using errcode = 'P0001';
  end if;

  if t.taken_by_employee_id is not null and t.taken_by_employee_id <> p_employee_id then
    raise exception 'TASK_ALREADY_TAKEN' using errcode = 'P0001';
  end if;

  update public.tasks
  set
    taken_by_employee_id = p_employee_id,
    taken_at = coalesce(taken_at, now()),
    status = case when status = 'open' then 'in_progress' else status end
  where id = p_task_id
  returning * into t;

  return t;
end;
$$;

-- 4) Release lock (optional but useful)
create or replace function public.release_task(
  p_task_id uuid,
  p_employee_id uuid
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tasks;
begin
  select * into t
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'TASK_NOT_FOUND' using errcode = 'P0001';
  end if;

  if t.taken_by_employee_id is null then
    return t;
  end if;

  if t.taken_by_employee_id <> p_employee_id then
    raise exception 'TASK_LOCKED' using errcode = 'P0001';
  end if;

  update public.tasks
  set
    taken_by_employee_id = null,
    taken_at = null,
    status = case when status = 'in_progress' then 'open' else status end
  where id = p_task_id
  returning * into t;

  return t;
end;
$$;

-- 5) Status update with lock + optional optimistic concurrency
create or replace function public.set_task_status_locked(
  p_task_id uuid,
  p_employee_id uuid,
  p_new_status text,
  p_expected_lock_version integer default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tasks;
begin
  select * into t
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'TASK_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- If someone else took it -> forbid edits
  if t.taken_by_employee_id is not null and t.taken_by_employee_id <> p_employee_id then
    raise exception 'TASK_LOCKED' using errcode = 'P0001';
  end if;

  -- Optional conflict check (prevents overwriting newer edits)
  if p_expected_lock_version is not null and t.lock_version <> p_expected_lock_version then
    raise exception 'TASK_CONFLICT' using errcode = 'P0001';
  end if;

  update public.tasks
  set status = p_new_status
  where id = p_task_id
  returning * into t;

  return t;
end;
$$;

-- Permissions (adjust if you use a different role)
grant execute on function public.take_task(uuid, uuid) to authenticated;
grant execute on function public.release_task(uuid, uuid) to authenticated;
grant execute on function public.set_task_status_locked(uuid, uuid, text, integer) to authenticated;