do $$
declare
  target_employee_id uuid;
  brutal_soul_id uuid;
  stella_brutal_id uuid;
begin
  select e.id
  into target_employee_id
  from public.employees e
  where lower(e.name) like '%monica%'
     or lower(e.name) like '%mónica%'
  limit 1;

  if target_employee_id is null then
    raise exception 'No employee found matching Monica';
  end if;

  if (
    select count(*)
    from public.employees e
    where lower(e.name) like '%monica%'
       or lower(e.name) like '%mónica%'
  ) > 1 then
    raise exception 'Multiple employees found matching Monica';
  end if;

  select l.id
  into brutal_soul_id
  from public.locations l
  where lower(l.name) = 'brutal soul';

  if brutal_soul_id is null then
    raise exception 'Location not found: Brutal Soul';
  end if;

  select l.id
  into stella_brutal_id
  from public.locations l
  where lower(l.name) = 'stella brutal';

  if stella_brutal_id is null then
    raise exception 'Location not found: Stella Brutal';
  end if;

  insert into public.employee_locations (employee_id, location_id)
  values
    (target_employee_id, brutal_soul_id),
    (target_employee_id, stella_brutal_id)
  on conflict do nothing;

  update public.employees
  set location_id = brutal_soul_id
  where id = target_employee_id;
end $$;

select
  e.id as employee_id,
  e.name as employee_name,
  l.name as assigned_location
from public.employees e
join public.employee_locations el on el.employee_id = e.id
join public.locations l on l.id = el.location_id
where e.id = (
  select id
  from public.employees
  where lower(name) like '%monica%'
     or lower(name) like '%mónica%'
  limit 1
)
order by l.name;
