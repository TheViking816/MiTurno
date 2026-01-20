import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { count: totalCount, error: err1 } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true });

        const { count: activeCount, error: err2 } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');

        if (err1) console.error("Error totalCount:", err1);
        if (err2) console.error("Error activeCount:", err2);

        setStats({
          active: activeCount || 0,
          total: totalCount || 0
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col pb-32 bg-background-light dark:bg-background-dark max-w-md mx-auto">
      <header className="sticky top-0 z-30 bg-white dark:bg-background-dark px-6 pt-8 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[13px] font-bold text-primary uppercase tracking-widest mb-1">Empresa • {today}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Panel Gestion</h1>
          </div>
          <button onClick={() => navigate('/employee-main')} className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-surface-dark border border-gray-200 shadow-sm">
            <span className="material-symbols-outlined">qr_code_scanner</span>
          </button>
        </div>
      </header>

      <div className="px-6 py-6 grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center py-6 bg-white dark:bg-surface-dark rounded-3xl border-2 border-green-500 shadow-sm">
          <span className="text-4xl font-black text-green-600">{loading ? '...' : stats.active}</span>
          <span className="text-[10px] font-bold uppercase text-gray-400 mt-1">En Turno</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 bg-white dark:bg-surface-dark rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-4xl font-black text-text-main dark:text-white">{loading ? '...' : stats.total}</span>
          <span className="text-[10px] font-bold uppercase text-gray-400 mt-1">Plantilla</span>
        </div>
      </div>

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
