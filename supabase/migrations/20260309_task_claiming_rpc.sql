begin;

drop function if exists public.claim_task(uuid, uuid);
drop function if exists public.release_task(uuid, uuid);
drop function if exists public.complete_task(uuid, uuid);

create function public.claim_task(
  p_task_id uuid,
  p_employee_id uuid
)
returns table (
  task_id uuid,
  status text,
  assigned_employee_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if v_task.status not in ('open', 'blocked', 'overdue', 'in_progress') then
    raise exception 'TASK_NOT_CLAIMABLE';
  end if;

  if v_task.assigned_employee_id is not null
     and v_task.assigned_employee_id <> p_employee_id then
    raise exception 'TASK_ALREADY_ASSIGNED';
  end if;

  update public.tasks
  set
    assigned_employee_id = p_employee_id,
    status = 'in_progress',
    updated_at = now()
  where id = p_task_id
  returning
    id,
    tasks.status,
    tasks.assigned_employee_id,
    tasks.updated_at
  into task_id, status, assigned_employee_id, updated_at;

  return next;
end;
$$;

create function public.release_task(
  p_task_id uuid,
  p_employee_id uuid
)
returns table (
  task_id uuid,
  status text,
  assigned_employee_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if v_task.assigned_employee_id is distinct from p_employee_id then
    raise exception 'TASK_NOT_OWNED_BY_EMPLOYEE';
  end if;

  if v_task.status not in ('in_progress', 'blocked', 'overdue') then
    raise exception 'TASK_NOT_RELEASABLE';
  end if;

  update public.tasks
  set
    assigned_employee_id = null,
    status = 'open',
    updated_at = now()
  where id = p_task_id
  returning
    id,
    tasks.status,
    tasks.assigned_employee_id,
    tasks.updated_at
  into task_id, status, assigned_employee_id, updated_at;

  return next;
end;
$$;

create function public.complete_task(
  p_task_id uuid,
  p_employee_id uuid
)
returns table (
  task_id uuid,
  status text,
  assigned_employee_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if v_task.assigned_employee_id is distinct from p_employee_id then
    raise exception 'TASK_NOT_OWNED_BY_EMPLOYEE';
  end if;

  if v_task.status not in ('in_progress', 'blocked', 'overdue') then
    raise exception 'TASK_NOT_COMPLETABLE';
  end if;

  update public.tasks
  set
    status = 'done',
    updated_at = now()
  where id = p_task_id
  returning
    id,
    tasks.status,
    tasks.assigned_employee_id,
    tasks.updated_at
  into task_id, status, assigned_employee_id, updated_at;

  return next;
end;
$$;

revoke all on function public.claim_task(uuid, uuid) from public;
revoke all on function public.release_task(uuid, uuid) from public;
revoke all on function public.complete_task(uuid, uuid) from public;

grant execute on function public.claim_task(uuid, uuid) to authenticated;
grant execute on function public.release_task(uuid, uuid) to authenticated;
grant execute on function public.complete_task(uuid, uuid) to authenticated;

commit;