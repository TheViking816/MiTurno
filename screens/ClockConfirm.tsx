
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ClockConfirm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const type = location.state?.type || 'IN';
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className={`font-display h-screen w-full flex flex-col text-white select-none ${type === 'IN' ? 'bg-semaphore-green' : 'bg-primary'}`}>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-appear">
        <div className="mb-6">
          <span className="material-symbols-outlined text-[120px] font-light block">
            {type === 'IN' ? 'check_circle' : 'logout'}
          </span>
        </div>
        <h1 className="text-6xl sm:text-7xl font-black tracking-tighter mb-4 drop-shadow-sm uppercase">
          {type === 'IN' ? 'Entrada OK' : 'Salida OK'}
        </h1>
        <div className="text-[8rem] sm:text-[10rem] font-black tabular-nums tracking-tighter drop-shadow-md leading-none">
          {time}
        </div>
        <p className="text-2xl font-bold opacity-90 mt-4 uppercase">REGISTRADA</p>
      </main>
      
      <footer className="w-full px-6 mb-8 max-w-md mx-auto">
        <button 
          onClick={() => navigate('/employee-main')} 
          className="w-full bg-white text-current h-20 rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          style={{ color: type === 'IN' ? '#4ADE80' : '#d8834b' }}
        >
          <span className="text-2xl font-extrabold uppercase tracking-wider">Cerrar</span>
        </button>
        <div className="text-center mt-6 text-white/60 font-medium text-sm">
          ID: #{(Math.random() * 10000).toFixed(0)} • {date} • {time}
        </div>
      </footer>
    </div>
  );
};

export default ClockConfirm;
