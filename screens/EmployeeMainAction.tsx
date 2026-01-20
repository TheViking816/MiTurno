
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, supabaseService } from '../services/supabaseService';
import { WorkSession } from '../types';
import logoUrl from '../assets/logo.png';

const EmployeeMainAction: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrValid, setQrValid] = useState(false);
  const [qrMessage, setQrMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(location.search);
      const urlToken = params.get('point');
      if (urlToken) {
        sessionStorage.setItem('turnqr_point', urlToken);
      }
      const storedToken = sessionStorage.getItem('turnqr_point');
      const tokenToCheck = urlToken || storedToken;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Fail-safe: Asegurar que el usuario existe en la tabla employees
        const { data: profile } = await supabase
          .from('employees')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from('employees').insert([{
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nuevo Empleado',
            role: 'Empleado'
          }]);
        }

        const session = await supabaseService.getCurrentSession(user.id);
        setCurrentSession(session);
      }

      try {
        const { data: settings } = await supabase
          .from('app_settings')
          .select('qr_token')
          .eq('id', 1)
          .maybeSingle();
        const requiredToken = settings?.qr_token || null;
        if (!requiredToken) {
          setQrValid(false);
          setQrMessage('QR no configurado. Contacta con el administrador.');
        } else if (tokenToCheck && tokenToCheck === requiredToken) {
          setQrValid(true);
          setQrMessage(null);
        } else {
          setQrValid(false);
          setQrMessage('Debes escanear el QR del local para fichar.');
        }
      } catch (error) {
        console.error('Error checking QR token:', error);
        setQrValid(false);
        setQrMessage('No se pudo validar el QR.');
      }

      setLoading(false);
    };
    init();
  }, [location.search]);

  const handleClockAction = async () => {
    if (!user) return;
    if (!qrValid) {
      alert('Debes escanear el QR del local para fichar.');
      return;
    }
    try {
      if (currentSession) {
        await supabaseService.clockOut(currentSession.id);
        setCurrentSession(null);
        navigate('/clock-confirm', { state: { type: 'OUT' } });
      } else {
        const session = await supabaseService.clockIn(user.id);
        setCurrentSession(session);
        navigate('/clock-confirm', { state: { type: 'IN' } });
      }
    } catch (error) {
      console.error("Error al fichar:", error);
      alert("Error al registrar: Asegúrate de tener conexión.");
    }
  };

  if (loading) return null;

  return (
    <div className="relative flex h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark p-6 pb-24 overflow-hidden">
      <header className="flex flex-col items-center justify-center pt-8 z-10">
        <img
          src={logoUrl}
          alt="TurnQR"
          className="h-12 mb-4 object-contain"
        />
        <span className={`text-lg font-black tracking-widest ${currentSession ? 'text-action-green' : 'text-danger'}`}>
          {currentSession ? 'JORNADA ACTIVA' : 'FUERA DE TURNO'}
        </span>
        <div className={`h-1.5 w-16 mt-2 rounded-full shadow-sm ${currentSession ? 'bg-action-green' : 'bg-red-500'}`}></div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center z-10">
        {qrMessage && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center">
            {qrMessage}
          </div>
        )}
        <button
          onClick={handleClockAction}
          disabled={!qrValid}
          className={`relative w-full aspect-square max-w-[280px] text-white rounded-full flex flex-col items-center justify-center gap-4 shadow-2xl transition-all border-[10px] border-white dark:border-zinc-800 ring-4 ${qrValid ? 'active:scale-95' : 'opacity-60 cursor-not-allowed'} ${currentSession ? 'bg-danger ring-danger/30' : 'bg-action-green ring-action-green/30'}`}
        >
          <span className="material-symbols-outlined text-[90px] font-light">
            {currentSession ? 'logout' : 'qr_code_scanner'}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold uppercase tracking-tight">Fichar</span>
            <span className="text-2xl font-extrabold uppercase tracking-tight -mt-1">
              {currentSession ? 'Salida' : 'Entrada'}
            </span>
          </div>
        </button>
      </main>

      <footer className="pb-10 flex flex-col items-center gap-4 z-10">
        <div className="bg-white dark:bg-zinc-900 px-8 py-4 rounded-full border border-gray-100 dark:border-zinc-800 shadow-card">
          <span className="text-xl font-bold tracking-tight text-text-main dark:text-white">Estado: <span className="font-black text-action-green">En línea</span></span>
        </div>
        <div className="flex items-center gap-3 mt-2 cursor-pointer p-2 bg-white/50 dark:bg-black/20 rounded-2xl" onClick={() => navigate('/profile')}>
          <div className="size-10 rounded-full overflow-hidden border-2 border-primary/20 bg-gray-100 flex items-center justify-center">
             <span className="material-symbols-outlined text-gray-500">person</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-text-main dark:text-white truncate max-w-[150px]">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Ver Perfil</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EmployeeMainAction;
