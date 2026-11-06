-- Run after the employee_weekly_schedule migration, using the project owner's SQL editor.
begin;
do $$
declare employee_id uuid; soul_id uuid; ke_id uuid; matches integer;
begin
  select count(*) into matches from public.employees
    where lower(trim(name)) = 'lilly' or lower(trim(name)) like 'lilly %';
  if matches <> 1 then
    raise exception 'Se esperaba una única trabajadora Lilly; encontradas: %. Comprueba su nombre de registro.', matches;
  end if;
  select id into strict employee_id from public.employees
    where lower(trim(name)) = 'lilly' or lower(trim(name)) like 'lilly %';
  select id into strict soul_id from public.locations where lower(trim(name)) = 'brutal soul';
  select id into strict ke_id from public.locations where lower(trim(name)) = 'ke brutal';
  insert into public.employee_locations (employee_id, location_id)
    values (employee_id, soul_id), (employee_id, ke_id) on conflict do nothing;
  update public.employees set location_id = soul_id,
    weekly_schedule = jsonb_build_array(null, soul_id, soul_id, ke_id, ke_id, ke_id, null)
    where id = employee_id;
end $$;
commit;

select e.id, e.name, e.weekly_schedule, array_agg(l.name order by l.name) as locales
from public.employees e
join public.employee_locations el on el.employee_id = e.id
join public.locations l on l.id = el.location_id
where lower(trim(e.name)) = 'lilly' or lower(trim(e.name)) like 'lilly %'
group by e.id, e.name, e.weekly_schedule;
