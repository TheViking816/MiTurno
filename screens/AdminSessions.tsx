import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, supabaseService } from '../services/supabaseService';

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

  // Manual Session State
  const [showManual, setShowManual] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [manualIn, setManualIn] = useState('');
  const [manualOut, setManualOut] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(now));

    // Default manual times to today
    const nowLocal = toLocalInput(new Date().toISOString());
    setManualIn(nowLocal);
    setManualOut(nowLocal);
  }, []);

  const employeeMap = useMemo(() => new Map(employees.map((emp) => [emp.id, emp])), [employees]);

  // Filter sessions by selected employee
  const filteredSessions = useMemo(() => {
    if (!selectedEmployeeId) return sessions;
    return sessions.filter((session) => session.user_id === selectedEmployeeId);
  }, [sessions, selectedEmployeeId]);

  // Format hours helper
  const formatHours = (hours: number) => hours.toFixed(2).replace('.', ',');

  // PDF export function
  const handleExportPdf = () => {
    if (!startDate || !endDate) return;
    const rangeStart = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T23:59:59.999`);
    const doc = new jsPDF();
    const rangeLabel = `${rangeStart.toLocaleDateString('es-ES')} - ${rangeEnd.toLocaleDateString('es-ES')}`;

    // Title and range
    doc.setFontSize(16);
    doc.text('Registro de Fichajes', 14, 18);
    doc.setFontSize(11);
    doc.text(`Rango: ${rangeLabel}`, 14, 26);

    // If filtering by employee, show employee name
    if (selectedEmployeeId) {
      const emp = employeeMap.get(selectedEmployeeId);
      doc.text(`Empleado: ${emp?.name || 'Sin nombre'}`, 14, 33);
    }

    // Calculate total hours
    const now = new Date();
    const totalHours = filteredSessions.reduce((sum, session) => {
      const clockIn = new Date(session.clock_in);
      const rawOut = session.clock_out ? new Date(session.clock_out) : now;
      const effectiveOut = rawOut > rangeEnd ? rangeEnd : rawOut;
      const durationMs = Math.max(0, effectiveOut.getTime() - clockIn.getTime());
      return sum + durationMs / 36e5;
    }, 0);

    doc.text(`Total horas: ${formatHours(totalHours)}h`, 14, selectedEmployeeId ? 40 : 33);

    // Detail table
    const detailRows = filteredSessions.map((session) => {
      const emp = employeeMap.get(session.user_id);
      const clockIn = new Date(session.clock_in);
      const rawOut = session.clock_out ? new Date(session.clock_out) : now;
      const effectiveOut = rawOut > rangeEnd ? rangeEnd : rawOut;
      const durationMs = Math.max(0, effectiveOut.getTime() - clockIn.getTime());
      const durationHours = durationMs / 36e5;
      const clockOutLabel = session.clock_out
        ? new Date(session.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : 'En curso';
      return [
        emp?.name || 'Sin nombre',
        clockIn.toLocaleDateString('es-ES'),
        clockIn.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        clockOutLabel,
        `${formatHours(durationHours)}h`
      ];
    });

    autoTable(doc, {
      startY: selectedEmployeeId ? 48 : 40,
      head: [['Empleado', 'Fecha', 'Entrada', 'Salida', 'Horas']],
      body: detailRows.length ? detailRows : [['Sin registros', '-', '-', '-', '0,00h']]
    });

    const empName = selectedEmployeeId ? employeeMap.get(selectedEmployeeId)?.name?.replace(/\s+/g, '_') || 'empleado' : 'todos';
    doc.save(`fichajes-${empName}-${startDate}-a-${endDate}.pdf`);
  };

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

      const employeeIds = await supabaseService.getEmployeeIdsByLocation(selectedLocation);
      const [{ data: employeesData, error: employeesError }, { data: sessionsData, error: sessionsError }] =
        await Promise.all([
          employeeIds.length
            ? supabase.from('employees').select('id, name').in('id', employeeIds)
            : Promise.resolve({ data: [] as EmployeeRow[], error: null }),
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

  const handleManualSave = async () => {
    if (!manualUserId || !manualIn || !manualOut) {
      setError('Por favor rellena todos los campos para el fichaje manual.');
      return;
    }
    if (!activeLocationId) return;

    setManualSaving(true);
    setError(null);
    try {
      const clockIn = new Date(manualIn).toISOString();
      const clockOut = new Date(manualOut).toISOString();

      const newSession = await supabaseService.addManualSession({
        user_id: manualUserId,
        clock_in: clockIn,
        clock_out: clockOut,
        location_id: activeLocationId
      });

      // Add to list if it matches range (optimistic add)
      const mapped = {
        ...newSession,
        clockInLocal: toLocalInput(newSession.clock_in),
        clockOutLocal: toLocalInput(newSession.clock_out)
      };
      setSessions(prev => [mapped, ...prev]);
      setShowManual(false);
      setManualUserId('');
    } catch (err) {
      console.error('Error saving manual session:', err);
      setError('No se pudo guardar el fichaje manual.');
    } finally {
      setManualSaving(false);
    }
  };

  const handleSave = async (sessionId: string) => {
    setSessions((prev) =>
      prev.map((item) => (item.id === sessionId ? { ...item, saving: true } : item))
    );
    const target = sessions.find((item) => item.id === sessionId);
    if (!target) return;

    try {
      const clockIn = target.clockInLocal ? new Date(target.clockInLocal).toISOString() : null;
      const clockOut = target.clockOutLocal ? new Date(target.clockOutLocal).toISOString() : null;
      const status = clockOut ? 'closed' : 'open';
      const { error } = await supabase
        .from('sessions')
        .update({
          clock_in: clockIn,
          clock_out: clockOut,
          status
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowManual(!showManual)}
            className={`flex size-10 items-center justify-center rounded-full border shadow-sm transition-colors ${showManual ? 'bg-primary text-white border-primary' : 'bg-white text-text-main border-gray-100'}`}
          >
            <span className="material-symbols-outlined">{showManual ? 'close' : 'add'}</span>
          </button>
          <button onClick={() => navigate('/admin')} className="flex size-10 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-text-main">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6 animate-appear">
        {showManual && (
          <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-xl border-2 border-primary/20 space-y-4 animate-in fade-in zoom-in duration-300">
            <h3 className="text-lg font-black flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person_add</span>
              Fichaje Manual
            </h3>

            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Seleccionar Empleado</span>
                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 font-bold"
                >
                  <option value="">Selecciona un empleado...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Hora de Entrada</span>
                <input
                  type="datetime-local"
                  value={manualIn}
                  onChange={(e) => setManualIn(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 font-bold"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Hora de Salida</span>
                <input
                  type="datetime-local"
                  value={manualOut}
                  onChange={(e) => setManualOut(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 font-bold"
                />
              </div>

              <button
                onClick={handleManualSave}
                disabled={manualSaving}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {manualSaving ? 'Guardando...' : 'Crear Fichaje'}
              </button>
            </div>
          </div>
        )}

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

        {/* Employee filter */}
        <div className="flex flex-col mt-4">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Filtrar por Trabajador</span>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 shadow-sm font-bold"
          >
            <option value="">Todos los empleados</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* PDF Export button */}
        <button
          onClick={handleExportPdf}
          disabled={loading || !startDate || !endDate}
          className="w-full h-14 mt-4 bg-stone-800 dark:bg-stone-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
          {loading ? 'Cargando...' : 'Descargar PDF'}
        </button>

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
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">event_busy</span>
            <p className="text-gray-400 font-bold text-sm uppercase">No hay fichajes en el rango</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
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
