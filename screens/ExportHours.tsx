import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../services/supabaseService';

type Employee = {
  id: string;
  name: string | null;
  role?: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  status?: string | null;
  location_id?: string | null;
};

type SessionWithDuration = SessionRow & {
  durationHours: number;
};

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const getMonthRange = (offsetMonths: number) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);
  return { start, end };
};

const formatHours = (hours: number) => hours.toFixed(2).replace('.', ',');

const ExportHours: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  useEffect(() => {
    const { start, end } = getMonthRange(0);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
  }, []);

  useEffect(() => {
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
          setEmployees([]);
          setSessions([]);
          setLoading(false);
          return;
        }

        const [{ data: employeesData, error: employeesError }, { data: sessionsData, error: sessionsError }] =
          await Promise.all([
            supabase.from('employees').select('id, name, role').eq('location_id', selectedLocation),
            supabase
              .from('sessions')
              .select('id, user_id, clock_in, clock_out, status, location_id')
              .gte('clock_in', rangeStart.toISOString())
              .lte('clock_in', rangeEnd.toISOString())
              .eq('location_id', selectedLocation)
              .order('clock_in', { ascending: true })
          ]);

        if (employeesError) throw employeesError;
        if (sessionsError) throw sessionsError;

        setEmployees(employeesData || []);
        setSessions(sessionsData || []);
      } catch (err: any) {
        console.error('Error fetching export data:', err);
        setError('No se pudo cargar la informacion para exportar.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const rangeBoundaries = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);
    return { start, end };
  }, [startDate, endDate]);

  const employeeMap = useMemo(() => new Map(employees.map((emp) => [emp.id, emp])), [employees]);

  const sessionRows = useMemo<SessionWithDuration[]>(() => {
    if (!rangeBoundaries) return [];
    const { end } = rangeBoundaries;
    const now = new Date();
    return sessions.map((session) => {
      const clockIn = new Date(session.clock_in);
      const rawOut = session.clock_out ? new Date(session.clock_out) : now;
      const effectiveOut = rawOut > end ? end : rawOut;
      const durationMs = Math.max(0, effectiveOut.getTime() - clockIn.getTime());
      const durationHours = durationMs / 36e5;
      return { ...session, durationHours };
    });
  }, [sessions, rangeBoundaries]);

  const totalHours = useMemo(() => sessionRows.reduce((sum, row) => sum + row.durationHours, 0), [sessionRows]);
  const averageHours = useMemo(() => (employees.length ? totalHours / employees.length : 0), [totalHours, employees.length]);

  const handleQuickRange = (offsetMonths: number) => {
    const { start, end } = getMonthRange(offsetMonths);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
  };

  const handleExportPdf = () => {
    if (!rangeBoundaries) return;
    const { start, end } = rangeBoundaries;
    const doc = new jsPDF();
    const rangeLabel = `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`;

    doc.setFontSize(16);
    doc.text('Reporte de horas', 14, 18);
    doc.setFontSize(11);
    doc.text(`Rango: ${rangeLabel}`, 14, 26);
    doc.text(`Total horas: ${formatHours(totalHours)}h`, 14, 33);
    doc.text(`Promedio por empleado: ${formatHours(averageHours)}h`, 14, 40);

    const totalsByEmployee = employees.map((emp) => {
      const total = sessionRows
        .filter((row) => row.user_id === emp.id)
        .reduce((sum, row) => sum + row.durationHours, 0);
      return [
        emp.name || 'Sin nombre',
        emp.role || 'Sin rol',
        `${formatHours(total)}h`
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['Empleado', 'Rol', 'Total horas']],
      body: totalsByEmployee.length ? totalsByEmployee : [['Sin datos', '-', '0,00h']]
    });

    const detailRows = sessionRows.map((row) => {
      const emp = employeeMap.get(row.user_id);
      const clockIn = new Date(row.clock_in);
      const clockOutLabel = row.clock_out
        ? new Date(row.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : 'En curso';
      return [
        emp?.name || 'Sin nombre',
        emp?.role || 'Sin rol',
        clockIn.toLocaleDateString('es-ES'),
        clockIn.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        clockOutLabel,
        `${formatHours(row.durationHours)}h`
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 60,
      head: [['Empleado', 'Rol', 'Fecha', 'Entrada', 'Salida', 'Horas']],
      body: detailRows.length ? detailRows : [['Sin registros', '-', '-', '-', '-', '0,00h']]
    });

    doc.save(`reporte-horas-${startDate}-a-${endDate}.pdf`);
  };

  const isPdfDisabled = loading || !startDate || !endDate;

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#171412] dark:text-[#f5f5f5] font-display h-screen flex flex-col max-w-md mx-auto">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-6 pt-6 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
          <span className="material-symbols-outlined font-bold text-lg">arrow_back</span>
        </button>
        <h2 className="text-xl font-black tracking-tight">Exportacion</h2>
        <div className="w-12"></div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-28 w-full animate-appear">
        <p className="text-gray-400 text-sm font-bold uppercase tracking-tight mb-6">
          Reporte de horas por periodo
        </p>

        <div className="flex gap-3 pb-4 overflow-x-auto">
          <button
            onClick={() => handleQuickRange(0)}
            className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-2xl bg-primary text-white px-6 shadow-xl shadow-primary/20 font-black text-sm uppercase tracking-widest"
          >
            Este mes
          </button>
          <button
            onClick={() => handleQuickRange(-1)}
            className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 px-6 font-bold text-sm"
          >
            Mes pasado
          </button>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Desde</span>
              <label className="flex items-center h-16 w-full rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 px-4 shadow-sm gap-3">
                <span className="material-symbols-outlined text-primary font-bold">calendar_today</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full min-w-0 bg-transparent font-black text-base outline-none"
                />
              </label>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Hasta</span>
              <label className="flex items-center h-16 w-full rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 px-4 shadow-sm gap-3">
                <span className="material-symbols-outlined text-primary font-bold">event</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full min-w-0 bg-transparent font-black text-base outline-none"
                />
              </label>
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
        </div>

        <div className="mb-10">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-stone-900 dark:bg-white p-8 shadow-2xl">
            <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <p className="text-primary text-[10px] font-black uppercase tracking-widest">Resumen del Periodo</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-6xl font-black text-white dark:text-stone-900 tracking-tighter leading-none">
                  {loading ? '...' : formatHours(totalHours)}
                </span>
                <span className="text-xl font-bold text-white/40 dark:text-stone-400">h</span>
              </div>
              <p className="text-white/60 dark:text-stone-500 text-sm font-bold mt-4 uppercase tracking-tighter">
                Promedio: {loading ? '...' : `${formatHours(averageHours)}h`} / empleado
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={isPdfDisabled}
          className="w-full rounded-3xl bg-primary py-6 px-6 text-white shadow-2xl shadow-primary/30 active:scale-95 transition-transform font-black text-lg uppercase tracking-widest disabled:opacity-60"
        >
          {loading ? 'Cargando datos...' : 'Generar PDF'}
        </button>
      </main>
    </div>
  );
};

export default ExportHours;
