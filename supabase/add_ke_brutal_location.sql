begin;

insert into public.locations (id, name, qr_token)
select
  'ba966243-6a19-40bf-89ce-bf2c4712d1e7',
  'Ke Brutal',
  '3609d444-1fa6-4e99-83a8-0a3f35e648b9'
where not exists (
  select 1
  from public.locations
  where lower(trim(name)) = lower('Ke Brutal')
);

do $$
declare
  matching_locations integer;
  locations_without_qr integer;
begin
  select
    count(*),
    count(*) filter (where qr_token is null)
  into matching_locations, locations_without_qr
  from public.locations
  where lower(trim(name)) = lower('Ke Brutal');

  if matching_locations <> 1 then
    raise exception 'Expected exactly one Ke Brutal location, found %', matching_locations;
  end if;

  if locations_without_qr <> 0 then
    raise exception 'Ke Brutal must have a QR token';
  end if;
end
$$;

commit;

select id, name, qr_token
from public.locations
where lower(trim(name)) = lower('Ke Brutal');
