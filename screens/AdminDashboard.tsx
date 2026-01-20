import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';

type EmployeeRow = {
  id: string;
  name: string | null;
};

type ActiveSession = {
  id: string;
  user_id: string;
  clock_in: string;
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [showActiveList, setShowActiveList] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const timeNow = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const employeeMap = useMemo(() => new Map(employees.map((emp) => [emp.id, emp])), [employees]);

  const fetchLocations = async () => {
    try {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('selected_location_id')
        .eq('id', 1)
        .maybeSingle();
      const { data: locationsData, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      setLocations(locationsData || []);
      const selected = settings?.selected_location_id || locationsData?.[0]?.id || '';
      setSelectedLocationId(selected);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocationError('No se pudieron cargar los locales.');
    }
  };

  const fetchStats = async (locationId: string) => {
    if (!locationId) {
      setStats({ active: 0, total: 0 });
      setEmployees([]);
      setActiveSessions([]);
      return;
    }
    setLoading(true);
    try {
      const [{ data: employeesData, error: empError }, { data: activeData, error: activeError }] =
        await Promise.all([
          supabase.from('employees').select('id, name').eq('location_id', locationId),
          supabase
            .from('sessions')
            .select('id, user_id, clock_in')
            .eq('status', 'open')
            .eq('location_id', locationId)
        ]);

      if (empError) console.error('Error totalCount:', empError);
      if (activeError) console.error('Error activeCount:', activeError);

      const totalCount = employeesData?.length || 0;
      const activeCount = activeData?.length || 0;

      setEmployees(employeesData || []);
      setActiveSessions(activeData || []);
      setStats({ active: activeCount, total: totalCount });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!selectedLocationId) return;
    fetchStats(selectedLocationId);

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchStats(selectedLocationId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchStats(selectedLocationId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLocationId]);

  const handleLocationSelect = async (nextId: string) => {
    setSelectedLocationId(nextId);
    setSavingLocation(true);
    setLocationError(null);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 1, selected_location_id: nextId || null }, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      console.error('Error saving location:', error);
      setLocationError('No se pudo guardar el local.');
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col pb-32 bg-background-light dark:bg-background-dark max-w-md mx-auto">
      <header className="sticky top-0 z-30 bg-white dark:bg-background-dark px-6 pt-8 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[13px] font-bold text-primary uppercase tracking-widest mb-1">{today} · {timeNow}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Panel Gestion</h1>
          </div>
          <button onClick={() => navigate('/employee-main')} className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-surface-dark border border-gray-200 shadow-sm">
            <span className="material-symbols-outlined">qr_code_scanner</span>
          </button>
        </div>
      </header>

      <div className="px-6 py-4">
        <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 p-4 shadow-card">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Local activo</p>
          {locationError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
              {locationError}
            </div>
          )}
          <select
            value={selectedLocationId}
            onChange={(e) => handleLocationSelect(e.target.value)}
            disabled={savingLocation}
            className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-black/20 border-none font-black"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-6 py-4 grid grid-cols-2 gap-4">
        <button
          onClick={() => setShowActiveList((prev) => !prev)}
          className="flex flex-col items-center justify-center py-6 bg-white dark:bg-surface-dark rounded-3xl border-2 border-green-500 shadow-sm text-left"
        >
          <span className="text-4xl font-black text-green-600">{loading ? '...' : stats.active}</span>
          <span className="text-[10px] font-bold uppercase text-gray-400 mt-1">En Turno</span>
        </button>
        <button
          onClick={() => setShowRoster((prev) => !prev)}
          className="flex flex-col items-center justify-center py-6 bg-white dark:bg-surface-dark rounded-3xl border border-gray-200 shadow-sm"
        >
          <span className="text-4xl font-black text-text-main dark:text-white">{loading ? '...' : stats.total}</span>
          <span className="text-[10px] font-bold uppercase text-gray-400 mt-1">Plantilla</span>
        </button>
      </div>

      {showActiveList && (
        <div className="px-6 pb-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 p-4 shadow-card space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Activos ahora</p>
            {activeSessions.length === 0 ? (
              <p className="text-sm font-bold text-gray-400">No hay personal en turno.</p>
            ) : (
              activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <span className="font-black">
                    {employeeMap.get(session.user_id)?.name || 'Sin nombre'}
                  </span>
                  <span className="text-xs font-bold text-gray-400">
                    {new Date(session.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showRoster && (
        <div className="px-6 pb-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 p-4 shadow-card space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plantilla</p>
            {employees.length === 0 ? (
              <p className="text-sm font-bold text-gray-400">No hay empleados asignados.</p>
            ) : (
              employees.map((emp) => (
                <div key={emp.id} className="font-black">
                  {emp.name || 'Sin nombre'}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="px-6">
        <h2 className="text-xl font-extrabold mb-4">Acciones Rapidas</h2>
        <div className="grid grid-cols-1 gap-3">
          <button onClick={() => navigate('/sessions')} className="p-6 bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 flex items-center gap-4 shadow-card">
            <span className="material-symbols-outlined text-primary text-3xl">schedule</span>
            <div className="text-left">
              <p className="font-black">Editar Fichajes</p>
              <p className="text-xs text-gray-400 font-bold uppercase">Corregir horarios</p>
            </div>
          </button>
          <button onClick={() => navigate('/employees')} className="p-6 bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 flex items-center gap-4 shadow-card">
            <span className="material-symbols-outlined text-primary text-3xl">group</span>
            <div className="text-left">
              <p className="font-black">Gestionar Equipo</p>
              <p className="text-xs text-gray-400 font-bold uppercase">Ver altas y bajas</p>
            </div>
          </button>
          <button onClick={() => navigate('/export')} className="p-6 bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 flex items-center gap-4 shadow-card">
            <span className="material-symbols-outlined text-primary text-3xl">download</span>
            <div className="text-left">
              <p className="font-black">Exportar Horas</p>
              <p className="text-xs text-gray-400 font-bold uppercase">Generar Excel/PDF</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
