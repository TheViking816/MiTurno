
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Incidences: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white pb-32 min-h-screen max-w-md mx-auto">
      <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center p-4 pb-3 justify-between">
          <h2 className="text-2xl font-black flex-1">Alertas</h2>
        </div>
      </header>

      <main className="w-full flex flex-col gap-6 px-4 pt-4">
        <section className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-10 border border-gray-100 dark:border-gray-800 text-center shadow-card">
          <div className="size-20 bg-action-green/10 text-action-green rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl font-black">check_circle</span>
          </div>
          <h3 className="text-2xl font-black mb-2 tracking-tighter">Todo bajo control</h3>
          <p className="text-gray-400 font-bold text-sm leading-relaxed uppercase tracking-tighter">No hay incidencias críticas registradas en este momento.</p>
        </section>
      </main>
    </div>
  );
};

export default Incidences;
