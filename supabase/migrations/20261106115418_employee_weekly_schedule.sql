-- NULL preserves flexible assignments for existing employees.
alter table public.employees add column if not exists weekly_schedule jsonb;

create or replace function public.validate_employee_weekly_schedule()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare day_location jsonb;
begin
  if new.weekly_schedule is null then return new; end if;
  if jsonb_typeof(new.weekly_schedule) <> 'array' then
    raise exception 'El calendario debe contener siete días.';
  end if;
  if jsonb_array_length(new.weekly_schedule) <> 7 then
    raise exception 'El calendario debe contener siete días.';
  end if;
  for day_location in select value from jsonb_array_elements(new.weekly_schedule) loop
    if day_location <> 'null'::jsonb then
      if jsonb_typeof(day_location) <> 'string' then
        raise exception 'Cada día debe contener un local asignado o ser libre.';
      end if;
      if not exists (select 1 from public.employee_locations el
        where el.employee_id = new.id and el.location_id::text = (day_location #>> '{}')) then
        raise exception 'El calendario contiene un local no asignado al trabajador.';
      end if;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists validate_employee_weekly_schedule on public.employees;
create trigger validate_employee_weekly_schedule before insert or update of weekly_schedule
  on public.employees for each row execute function public.validate_employee_weekly_schedule();

create or replace function public.validate_scheduled_clock_in()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare schedule jsonb; expected_location text; day_index integer;
begin
  -- Historical/manual closed sessions are independent of today's recurring calendar.
  if new.clock_out is not null or new.status <> 'open' then return new; end if;
  select e.weekly_schedule into schedule from public.employees e where e.id = new.user_id;
  if schedule is null then return new; end if;
  day_index := extract(isodow from timezone('Europe/Madrid', new.clock_in))::integer - 1;
  expected_location := schedule ->> day_index;
  if expected_location is null then raise exception 'Hoy tienes día libre según tu calendario.'; end if;
  if new.location_id is null or new.location_id::text <> expected_location then
    raise exception 'Este local no corresponde a tu calendario de hoy.';
  end if;
  return new;
end $$;

drop trigger if exists validate_scheduled_clock_in on public.sessions;
create trigger validate_scheduled_clock_in before insert on public.sessions
  for each row execute function public.validate_scheduled_clock_in();

-- Trigger functions do not need direct API calls. Existing table RLS remains in force.
revoke execute on function public.validate_employee_weekly_schedule() from public, anon, authenticated;
revoke execute on function public.validate_scheduled_clock_in() from public, anon, authenticated;
