export const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export type WeeklySchedule = (string | null)[];

export function madridWeekday(date = new Date()): number {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(date);
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day);
}

export function scheduledLocation(schedule: WeeklySchedule | null | undefined, date = new Date()): string | null | undefined {
  return schedule ? schedule[madridWeekday(date)] : undefined;
}

export function validateScheduledEntry(schedule: WeeklySchedule | null | undefined, locationId: string, date = new Date()) {
  const expected = scheduledLocation(schedule, date);
  if (expected === null) throw new Error('Hoy tienes día libre según tu calendario. Consulta con administración si hay un cambio.');
  if (expected !== undefined && expected !== locationId) throw new Error('Este local no corresponde a tu calendario de hoy. Consulta tu asignación o contacta con administración.');
}
