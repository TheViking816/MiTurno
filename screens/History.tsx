
import React, { useEffect, useState } from 'react';
import { supabase, supabaseService } from '../services/supabaseService';

const History: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await supabaseService.getHistory(user.id);
        setHistory(data);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'En curso';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffHours = (e - s) / (1000 * 60 * 60);
    return diffHours.toFixed(1) + 'h';
  };

  const calculateTotal = () => {
    return history.reduce((acc, curr) => {
      if (!curr.clock_out) return acc;
      const s = new Date(curr.clock_in).getTime();
      const e = new Date(curr.clock_out).getTime();
      return acc + (e - s);
    }, 0) / (1000 * 60 * 60);
  };

  if (loading) return <div className="p-10 text-center font-bold">Cargando historial...</div>;

  return (
    <div className="mx-auto w-full max-w-md flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Mi Actividad</h1>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 animate-appear">
        <div className="bg-stone-900 dark:bg-white p-6 rounded-3xl flex justify-between items-center shadow-xl">
          <div className="flex flex-col">
            <span className="text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest text-[10px]">Total Acumulado</span>
            <span className="text-white dark:text-stone-900 text-4xl font-black tracking-tighter mt-1">
              {calculateTotal().toFixed(1)}<span className="text-lg opacity-50 ml-1">h</span>
            </span>
          </div>
          <div className="size-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">history</span>
          </div>
        </div>

        <div className="flex flex-col bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-card overflow-hidden">
          {history.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-bold">No hay fichajes registrados todavía.</div>
          ) : (
            history.map((item, i) => (
              <div key={i} className="flex items-center px-6 py-5 border-b last:border-0 border-stone-100 dark:border-stone-800">
                <div className="flex-1">
                  <div className="font-extrabold text-lg">
                    {new Date(item.clock_in).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </div>
                  <div className="text-[11px] font-bold text-stone-400 uppercase">
                    {new Date(item.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {item.clock_out && ` - ${new Date(item.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <span className={`text-2xl font-black tracking-tight ${!item.clock_out ? 'text-action-green animate-pulse' : ''}`}>
                    {formatDuration(item.clock_in, item.clock_out)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
