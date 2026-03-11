alter table public.employees
  add column if not exists shift_type text;

update public.employees
set shift_type = 'morning'
where shift_type is null;

alter table public.employees
  alter column shift_type set default 'morning';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_shift_type_check'
  ) then
    alter table public.employees
      add constraint employees_shift_type_check
      check (shift_type in ('morning', 'afternoon'));
  end if;
end $$;

alter table public.app_settings
  add column if not exists auto_close_enabled boolean not null default true,
  add column if not exists morning_auto_close_time time not null default '17:00',
  add column if not exists afternoon_auto_close_time time not null default '01:00';

insert into public.app_settings (
  id,
  auto_close_enabled,
  morning_auto_close_time,
  afternoon_auto_close_time
)
values (1, true, '17:00', '01:00')
on conflict (id) do update
set
  auto_close_enabled = coalesce(public.app_settings.auto_close_enabled, excluded.auto_close_enabled),
  morning_auto_close_time = coalesce(public.app_settings.morning_auto_close_time, excluded.morning_auto_close_time),
  afternoon_auto_close_time = coalesce(public.app_settings.afternoon_auto_close_time, excluded.afternoon_auto_close_time);

create extension if not exists pg_cron;

create or replace function public.auto_close_open_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row public.app_settings%rowtype;
  closed_count integer := 0;
begin
  select *
  into settings_row
  from public.app_settings
  where id = 1;

  if settings_row is null or coalesce(settings_row.auto_close_enabled, true) = false then
    return 0;
  end if;

  with pending as (
    select
      s.id,
      coalesce(e.shift_type, 'morning') as shift_type,
      case
        when coalesce(e.shift_type, 'morning') = 'afternoon' then
          (
            date(timezone('Europe/Madrid', s.clock_in)) + 1
          )::timestamp + settings_row.afternoon_auto_close_time
        else
          (
            date(timezone('Europe/Madrid', s.clock_in))
          )::timestamp + settings_row.morning_auto_close_time
      end as target_close_local
    from public.sessions s
    join public.employees e on e.id = s.user_id
    where s.clock_out is null
      and s.status = 'open'
  ),
  updated as (
    update public.sessions s
    set
      clock_out = pending.target_close_local at time zone 'Europe/Madrid',
      status = 'closed',
      notes = case
        when coalesce(s.notes, '') = '' then 'Cierre automatico por horario configurado'
        when s.notes ilike '%Cierre automatico por horario configurado%' then s.notes
        else s.notes || ' | Cierre automatico por horario configurado'
      end
    from pending
    where s.id = pending.id
      and timezone('Europe/Madrid', now()) >= pending.target_close_local
    returning 1
  )
  select count(*)
  into closed_count
  from updated;

  return closed_count;
end;
$$;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'turnqr_auto_close_open_sessions'
  ) then
    perform cron.unschedule('turnqr_auto_close_open_sessions');
  end if;
exception
  when undefined_table then
    null;
end $$;

select cron.schedule(
  'turnqr_auto_close_open_sessions',
  '* * * * *',
  $$select public.auto_close_open_sessions();$$
);
