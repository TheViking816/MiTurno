import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';

type EmployeeRow = {
  id: string;
  name: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  location_id?: string | null;
};

type SessionEdit = SessionRow & {
  clockInLocal: string;
  clockOutLocal: string;
  saving?: boolean;
};

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
};

const AdminSessions: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sessions, setSessions] = useState<SessionEdit[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(now));
  }, []);

  const employeeMap = useMemo(() => new Map(employees.map((emp) => [emp.id, emp])), [employees]);

  const fetchData = async () => {
    if (!startDate || !endDate) return;
    const rangeStart = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T23:59:59.999`);
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeEnd < rangeStart) {
      setError('Rango de fechas invalido.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
        const { data: settings } = await supabase
          .from('app_settings')
          .select('selected_location_id')
          .eq('id', 1)
          .maybeSingle();
        const selectedLocation = settings?.selected_location_id || null;
        setActiveLocationId(selectedLocation);

        if (!selectedLocation) {
          setSessions([]);
          setEmployees([]);
          setLoading(false);
          return;
        }

        const [{ data: employeesData, error: employeesError }, { data: sessionsData, error: sessionsError }] =
          await Promise.all([
            supabase.from('employees').select('id, name').eq('location_id', selectedLocation),
            supabase
              .from('sessions')
              .select('id, user_id, clock_in, clock_out, location_id')
              .gte('clock_in', rangeStart.toISOString())
              .lte('clock_in', rangeEnd.toISOString())
              .eq('location_id', selectedLocation)
              .order('clock_in', { ascending: false })
          ]);

      if (employeesError) throw employeesError;
      if (sessionsError) throw sessionsError;

      setEmployees(employeesData || []);
      const mapped = (sessionsData || []).map((session: SessionRow) => ({
        ...session,
        clockInLocal: toLocalInput(session.clock_in),
        clockOutLocal: toLocalInput(session.clock_out)
      }));
      setSessions(mapped);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('No se pudieron cargar los fichajes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleSave = async (sessionId: string) => {
    setSessions((prev) =>
      prev.map((item) => (item.id === sessionId ? { ...item, saving: true } : item))
    );
    const target = sessions.find((item) => item.id === sessionId);
    if (!target) return;

    try {
      const clockIn = target.clockInLocal ? new Date(target.clockInLocal).toISOString() : null;
      const clockOut = target.clockOutLocal ? new Date(target.clockOutLocal).toISOString() : null;
      const { error } = await supabase
        .from('sessions')
        .update({
          clock_in: clockIn,
          clock_out: clockOut
        })
        .eq('id', sessionId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating session:', err);
      setError('No se pudo guardar el fichaje.');
    } finally {
      setSessions((prev) =>
        prev.map((item) => (item.id === sessionId ? { ...item, saving: false } : item))
      );
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Eliminar este fichaje?')) return;
    setSessions((prev) =>
      prev.map((item) => (item.id === sessionId ? { ...item, saving: true } : item))
    );
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
      setSessions((prev) => prev.filter((item) => item.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('No se pudo eliminar el fichaje.');
    } finally {
      setSessions((prev) =>
        prev.map((item) => (item.id === sessionId ? { ...item, saving: false } : item))
      );
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#171412] dark:text-white font-display min-h-screen pb-32 max-w-md mx-auto">
      <div className="flex items-center px-6 py-6 justify-between sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md z-20">
        <h2 className="text-2xl font-black">Fichajes</h2>
        <button onClick={() => navigate('/admin')} className="flex size-10 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-text-main">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      <div className="px-6 space-y-6 animate-appear">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 shadow-sm font-bold"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 shadow-sm font-bold"
            />
          </div>
        </div>

        {activeLocationId === null && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm font-bold">
            Selecciona un local activo en el panel de administrador.
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4 opacity-50">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold uppercase tracking-widest text-[10px]">Cargando fichajes...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">event_busy</span>
            <p className="text-gray-400 font-bold text-sm uppercase">No hay fichajes en el rango</p>
          </div>
        ) : (
          sessions.map((session) => {
            const employee = employeeMap.get(session.user_id);
            return (
              <div key={session.id} className="bg-white dark:bg-surface-dark p-4 rounded-3xl shadow-card border border-gray-50 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-lg">{employee?.name || 'Sin nombre'}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID {session.user_id.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSave(session.id)}
                      disabled={session.saving}
                      className="text-primary font-black text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      {session.saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={session.saving}
                      className="text-red-500 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Entrada</span>
                    <input
                      type="datetime-local"
                      value={session.clockInLocal}
                      onChange={(e) =>
                        setSessions((prev) =>
                          prev.map((item) => (item.id === session.id ? { ...item, clockInLocal: e.target.value } : item))
                        )
                      }
                      className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 shadow-sm font-bold"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Salida</span>
                    <input
                      type="datetime-local"
                      value={session.clockOutLocal}
                      onChange={(e) =>
                        setSessions((prev) =>
                          prev.map((item) => (item.id === session.id ? { ...item, clockOutLocal: e.target.value } : item))
                        )
                      }
                      className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 shadow-sm font-bold"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminSessions;
