-- Remove the weekly calendar introduced in the previous change. No employee data is reassigned.
drop trigger if exists validate_employee_weekly_schedule on public.employees;
drop trigger if exists validate_scheduled_clock_in on public.sessions;
drop function if exists public.validate_employee_weekly_schedule();
drop function if exists public.validate_scheduled_clock_in();

alter table public.employee_locations add column if not exists shift_type text
  check (shift_type in ('morning', 'afternoon'));
alter table public.sessions add column if not exists shift_type text
  check (shift_type in ('morning', 'afternoon'));

-- Existing NULL assignments continue to inherit the employee's previous shift.
create policy employee_locations_update_shift on public.employee_locations
  for update to authenticated
  using (employee_id = (select auth.uid()) or (select auth.jwt()->>'email') = 'brutal.soul.25@gmail.com')
  with check (employee_id = (select auth.uid()) or (select auth.jwt()->>'email') = 'brutal.soul.25@gmail.com');

create or replace function public.set_session_location_shift()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  select coalesce(el.shift_type, e.shift_type, 'morning') into new.shift_type
  from public.employees e left join public.employee_locations el
    on el.employee_id = e.id and el.location_id = new.location_id
  where e.id = new.user_id;
  return new;
end $$;
create trigger set_session_location_shift before insert on public.sessions
  for each row execute function public.set_session_location_shift();
revoke execute on function public.set_session_location_shift() from public, anon, authenticated;

-- Preserve the currently deployed closing-hour calculation and existing privileges.
-- New sessions use their captured location shift; existing sessions retain their previous behavior.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.auto_close_open_sessions()'::regprocedure) into definition;
  if position('coalesce(e.shift_type, ''morning'')' in definition) = 0 then
    raise exception 'Unexpected auto-close function. Review before applying.';
  end if;
  execute replace(definition, 'coalesce(e.shift_type, ''morning'')', 'coalesce(s.shift_type, e.shift_type, ''morning'')');
end $$;
