
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotClockOutModal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display overflow-hidden relative h-screen w-full flex items-center justify-center">
      {/* Blurred Background Mockup */}
      <div aria-hidden="true" className="absolute inset-0 w-full h-full flex flex-col bg-gray-200 dark:bg-background-dark filter blur-[8px] opacity-40 transform scale-105 pointer-events-none select-none">
          <div className="h-16 w-full flex justify-between items-center px-6 border-b border-black/5">
              <div className="w-8 h-8 rounded-full bg-primary/20"></div>
              <div className="w-24 h-4 bg-black/10 rounded-full"></div>
              <div className="w-8 h-8 rounded-full bg-black/5"></div>
          </div>
          <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 w-full bg-white rounded-3xl shadow-sm"></div>
              ))}
          </div>
      </div>

      <div className="absolute inset-0 bg-stone-900/40 dark:bg-black/80 backdrop-blur-md z-10"></div>
      
      <div className="relative z-20 w-full max-w-[360px] mx-6 animate-appear">
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-soft ring-1 ring-white/40 overflow-hidden">
          <div className="flex flex-col items-center text-center px-8 pt-12 pb-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full scale-[1.8] animate-pulse"></div>
              <div className="relative flex items-center justify-center w-24 h-24 bg-background-light dark:bg-zinc-800 rounded-full text-primary shadow-inner-light border border-primary/20">
                <span className="material-symbols-outlined text-[48px] icon-filled">history_toggle_off</span>
              </div>
              <div className="absolute -top-1 -right-1 w-10 h-10 bg-critical rounded-full flex items-center justify-center shadow-lg border-[4px] border-white dark:border-surface-dark">
                <span className="material-symbols-outlined text-white text-[20px] font-black">priority_high</span>
              </div>
            </div>

            <h1 className="text-text-main dark:text-white text-3xl font-black leading-tight mb-4 tracking-tighter uppercase">
              ¿Olvidaste fichar?
            </h1>
            <p className="text-gray-500 dark:text-gray-300 text-sm font-bold leading-relaxed mb-10">
              Tienes una jornada abierta desde hace más de <span className="text-primary font-black bg-primary/10 px-2 py-1 rounded-lg">12 horas</span>.
            </p>

            <div className="w-full flex flex-col gap-4">
              <button 
                onClick={() => navigate('/employee-main')} 
                className="w-full h-16 bg-critical text-white font-black text-lg uppercase tracking-widest rounded-3xl shadow-2xl shadow-critical/30 active:scale-95 transition-transform"
              >
                Cerrar jornada
              </button>
              <button className="w-full py-2 flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-widest gap-2 hover:text-primary transition-colors">
                <span>Avisar al gerente</span>
                <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
              </button>
            </div>
          </div>
          
          <div className="h-3 w-full bg-gradient-to-r from-primary via-critical to-primary"></div>
        </div>
      </div>
    </div>
  );
};

export default ForgotClockOutModal;
