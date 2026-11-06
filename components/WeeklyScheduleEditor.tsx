import React, { useState } from 'react';
import { WEEK_DAYS, type WeeklySchedule } from '../services/weeklySchedule';
import { supabaseService } from '../services/supabaseService';

export default function WeeklyScheduleEditor({ employee, locations, onSaved }: {
  employee: { id: string; name: string; weekly_schedule?: WeeklySchedule | null };
  locations: { id: string; name: string }[];
  onSaved: (schedule: WeeklySchedule | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(employee.weekly_schedule || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await supabaseService.saveWeeklySchedule(employee.id, schedule);
      onSaved(schedule);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el calendario.');
    } finally { setBusy(false); }
  };
  return <div className="mt-2 space-y-2">
    <p className="text-xs font-black">Calendario semanal</p>
    {!editing ? <>
      <p className="text-xs text-gray-500">{employee.weekly_schedule
        ? WEEK_DAYS.map((day, i) => `${day}: ${locations.find(loc => loc.id === employee.weekly_schedule?.[i])?.name || 'Libre'}`).join(' · ')
        : 'Sin calendario fijo. Puede fichar en sus locales asignados.'}</p>
      <button type="button" className="text-xs font-bold text-primary" onClick={() => { setSchedule(employee.weekly_schedule || null); setError(''); setEditing(true); }}>Editar calendario</button>
    </> : <>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={schedule !== null} disabled={busy} onChange={e => setSchedule(e.target.checked ? Array(7).fill(null) : null)} />Usar calendario fijo</label>
      {schedule && WEEK_DAYS.map((day, i) => <label key={day} className="flex items-center justify-between gap-2 text-xs">
        {day}<select aria-label={`${day} de ${employee.name}`} disabled={busy} className="rounded-xl bg-gray-50 dark:bg-black/20 p-2 max-w-[65%]" value={schedule[i] || ''} onChange={e => setSchedule(prev => prev!.map((id, j) => j === i ? e.target.value || null : id))}>
          <option value="">Libre</option>{locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
        </select>
      </label>)}
      <div className="flex gap-4"><button type="button" disabled={busy} className="text-xs font-bold text-primary" onClick={save}>{busy ? 'Guardando...' : 'Guardar calendario'}</button><button type="button" disabled={busy} className="text-xs" onClick={() => setEditing(false)}>Cancelar</button></div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </>}
  </div>;
}
