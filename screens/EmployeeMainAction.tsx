import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase, supabaseService } from '../services/supabaseService';
import { WorkSession } from '../types';
import logoUrl from '../assets/logo.png';

type ScanFeedback = {
  title: string;
  detail?: string;
};

const EmployeeMainAction: React.FC = () => {
  const navigate = useNavigate();
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanError, setScanError] = useState<ScanFeedback | null>(null);
  const [scanning, setScanning] = useState(false);
  const [clockActionBusy, setClockActionBusy] = useState(false);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [employeeLocations, setEmployeeLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const userRef = useRef<any>(null);
  const sessionRef = useRef<WorkSession | null>(null);
  const allowedLocationsRef = useRef<string[]>([]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    allowedLocationsRef.current = allowedLocationIds;
  }, [allowedLocationIds]);

  const setScanFeedback = (title: string, detail?: string) => {
    setScanError({ title, detail });
  };

  const getCameraStartErrorMessage = (error: unknown): ScanFeedback => {
    const fallback: ScanFeedback = {
      title: 'No se pudo iniciar la camara.',
      detail: 'Prueba en Chrome o Safari, revisa el permiso de camara y vuelve a intentarlo.'
    };

    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeError = error as { name?: string; message?: string };
    const name = maybeError.name || '';
    const message = (maybeError.message || '').toLowerCase();

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || message.includes('permission')) {
      return {
        title: 'Permiso de camara bloqueado.',
        detail: 'Activa el acceso a la camara en el navegador del movil y vuelve a abrir Fichar.'
      };
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || message.includes('no camera')) {
      return {
        title: 'No se encontro ninguna camara.',
        detail: 'Comprueba que el movil tiene camara disponible y que ninguna app la esta ocupando.'
      };
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        title: 'La camara esta ocupada.',
        detail: 'Cierra otras apps que esten usando la camara y vuelve a intentarlo.'
      };
    }

    if (name === 'NotSupportedError' || message.includes('secure') || message.includes('https')) {
      return {
        title: 'La camara requiere una conexion segura.',
        detail: 'Abre la app desde una URL https y evita navegadores internos de WhatsApp o Instagram.'
      };
    }

    return fallback;
  };

  const runCameraChecks = async (): Promise<ScanFeedback | null> => {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (!window.isSecureContext && !isLocalhost) {
      return {
        title: 'La camara requiere una conexion segura.',
        detail: 'Abre la app desde una URL https y evita navegadores internos de WhatsApp o Instagram.'
      };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        title: 'Este navegador no permite abrir la camara.',
        detail: 'Prueba desde Chrome en Android o Safari en iPhone.'
      };
    }

    if ('permissions' in navigator && navigator.permissions?.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissionStatus.state === 'denied') {
          return {
            title: 'Permiso de camara bloqueado.',
            detail: 'Activa el permiso de camara en los ajustes del navegador y vuelve a intentarlo.'
          };
        }
      } catch {
        // ignore unsupported permission queries
      }
    }

    return null;
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        const { data: profile } = await supabase
          .from('employees')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from('employees').insert([{
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nuevo Empleado',
            role: 'Empleado',
            shift_type: 'morning'
          }]);
        }

        const locations = await supabaseService.getEmployeeLocations(user.id);
        const locationIds = locations.map((loc) => loc.id);
        setAllowedLocationIds(locationIds);
        setEmployeeLocations(locations);
        if (locations.length === 1) {
          setSelectedLocationId(locations[0].id);
        }

        const session = await supabaseService.getCurrentSession(user.id);
        setCurrentSession(session);
      }

      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    let isProcessing = false;

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 240 },
          async (decodedText) => {
            if (cancelled || isProcessing) return;
            isProcessing = true;

            const scannedToken = extractToken(decodedText);

            const { data: location } = await supabase
              .from('locations')
              .select('id')
              .eq('qr_token', scannedToken)
              .maybeSingle();

            if (!location) {
              setScanFeedback('QR incorrecto.', 'Usa el QR oficial del local y comprueba que se vea completo en pantalla o en papel.');
              isProcessing = false;
              return;
            }

            const activeUser = userRef.current;
            if (!activeUser) {
              isProcessing = false;
              return;
            }

            const allowedIds = allowedLocationsRef.current || [];
            if (allowedIds.length > 0 && !allowedIds.includes(location.id)) {
              setScanFeedback('Este QR no corresponde a tus locales asignados.', 'Consulta con administracion si te falta acceso al local correcto.');
              isProcessing = false;
              return;
            }

            if (selectedLocationId && selectedLocationId !== location.id) {
              setScanFeedback('El QR no coincide con el local seleccionado.', 'Cambia el local elegido antes de escanear.');
              isProcessing = false;
              return;
            }

            await stopScanner();
            setScanning(false);

            try {
              const session = await supabaseService.clockIn(activeUser.id, location.id);
              setCurrentSession(session);
              navigate('/clock-confirm', { state: { type: 'IN' } });
            } catch (error) {
              console.error('Error al fichar:', error);
              alert('Error al registrar: Asegurate de tener conexion.');
              isProcessing = false;
            }
          },
          () => { }
        );
      } catch (error) {
        console.error('Error starting scanner:', error);
        const feedback = getCameraStartErrorMessage(error);
        setScanError(feedback);
        setScanning(false);
        await stopScanner();
      }
    };

    const stopScanner = async () => {
      if (!scannerRef.current) return;
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scanning, navigate]);

  const extractToken = (payload: string) => {
    try {
      const url = new URL(payload);
      const token = url.searchParams.get('point');
      if (token) return token;
    } catch {
      // ignore
    }
    const match = payload.match(/point=([^&]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
    return payload;
  };

  const handleClockAction = async () => {
    if (!user || clockActionBusy) return;

    if (currentSession) {
      setClockActionBusy(true);
      try {
        await supabaseService.clockOut(user.id, currentSession.id);
        setCurrentSession(null);
        navigate('/clock-confirm', { state: { type: 'OUT' } });
      } catch (error) {
        console.error('Error al fichar:', error);
        alert('Error al registrar: Asegurate de tener conexion.');
      } finally {
        setClockActionBusy(false);
      }
      return;
    }

    if (employeeLocations.length > 1 && !selectedLocationId) {
      setScanFeedback('Selecciona tu local antes de escanear.');
      return;
    }

    setScanError(null);
    const cameraCheckError = await runCameraChecks();
    if (cameraCheckError) {
      setScanError(cameraCheckError);
      return;
    }

    setScanning(true);
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
        {employeeLocations.length > 1 && !currentSession && (
          <div className="w-full mb-4">
            <div className="bg-white dark:bg-surface-dark px-5 py-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-card">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Local</p>
              <div className="grid grid-cols-2 gap-2">
                {employeeLocations.map((loc) => {
                  const selected = selectedLocationId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedLocationId(loc.id)}
                      className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors ${selected ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-black/20 border-gray-200 text-gray-500'}`}
                    >
                      {loc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {scanError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-center">
            <p className="text-xs font-black uppercase tracking-wider">{scanError.title}</p>
            {scanError.detail && (
              <p className="mt-1 text-[11px] font-bold leading-relaxed text-red-500">{scanError.detail}</p>
            )}
          </div>
        )}
        <button
          onClick={handleClockAction}
          disabled={clockActionBusy}
          className={`relative w-full aspect-square max-w-[280px] text-white rounded-full flex flex-col items-center justify-center gap-4 shadow-2xl transition-all border-[10px] border-white dark:border-zinc-800 ring-4 active:scale-95 ${currentSession ? 'bg-danger ring-danger/30' : 'bg-action-green ring-action-green/30'}`}
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
          <span className="text-xl font-bold tracking-tight text-text-main dark:text-white">Estado: <span className="font-black text-action-green">En linea</span></span>
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

      {scanning && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-xs bg-white rounded-3xl p-4 shadow-2xl">
            <div className="text-center font-black text-sm uppercase tracking-widest text-gray-500 mb-3">Escanear QR</div>
            <div id="qr-reader" className="w-full overflow-hidden rounded-2xl"></div>
            <button
              onClick={() => setScanning(false)}
              className="mt-4 w-full py-3 rounded-2xl bg-gray-100 font-black text-xs uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMainAction;
