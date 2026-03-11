with wrong_closures as (
  select
    s.id,
    (
      (
        date(timezone('Europe/Madrid', s.clock_in)) + 1
      )::timestamp
      + settings.afternoon_auto_close_time
    ) at time zone 'Europe/Madrid' as corrected_clock_out
  from public.sessions s
  join public.employees e on e.id = s.user_id
  cross join (
    select afternoon_auto_close_time
    from public.app_settings
    where id = 1
  ) settings
  where coalesce(e.shift_type, 'morning') = 'afternoon'
    and s.status = 'closed'
    and s.notes = 'Cierre automatico por horario configurado'
    and s.clock_out is not null
    and s.clock_out <= s.clock_in
)
update public.sessions s
set clock_out = wrong_closures.corrected_clock_out
from wrong_closures
where s.id = wrong_closures.id;
