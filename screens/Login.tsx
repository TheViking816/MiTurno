
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import logoUrl from '../assets/logo.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /iphone|ipad|ipod|android/.test(userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsIos(/iphone|ipad|ipod/.test(userAgent));
    setShowInstall(isMobileDevice && !isStandalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setShowInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choiceResult.outcome === 'accepted') {
      setShowInstall(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError('Credenciales inválidas. Revisa tus datos.');
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setResetMessage(null);

    if (!email) {
      setError('Escribe tu email para enviarte el enlace de recuperación.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError('No pudimos enviar el enlace. Revisa el email e intenta de nuevo.');
      return;
    }

    setResetMessage('Revisa tu email para restablecer la contraseña.');
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark max-w-md mx-auto">
      <div className="w-full space-y-8 animate-appear">
        <div className="text-center">
          <img
            src={logoUrl}
            alt="TurnQR Logo"
            className="h-24 mx-auto mb-4 object-contain"
          />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary focus:border-primary text-lg font-bold text-text-main dark:text-white"
              placeholder=""
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Contraseña</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary focus:border-primary text-lg font-bold text-text-main dark:text-white"
              placeholder=""
              required
            />
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-[10px] font-black uppercase tracking-widest text-primary"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>


          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold">
              {error}
            </div>
          )}

          {resetMessage && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary text-sm font-bold">
              {resetMessage}
            </div>
          )}


          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-text-main dark:bg-white text-white dark:text-text-main rounded-3xl font-black text-lg shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Accediendo...' : 'Entrar'}
          </button>
        </form>

        {showInstall && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full h-16 rounded-3xl border border-primary/30 dark:border-primary/40 bg-primary/10 dark:bg-primary/20 text-primary dark:text-white font-black text-sm tracking-wide shadow-sm active:scale-[0.98] transition-all"
            >
              <span className="block text-lg">Instalar app</span>
            </button>
            {isIos && !deferredPrompt && (
              <p className="text-[11px] text-gray-400 font-medium text-center">
                En iPhone, toca Compartir y luego "Añadir a pantalla de inicio".
              </p>
            )}
          </div>
        )}

        <div className="text-center space-y-4">
          <p className="text-gray-400 text-sm font-medium">
            ¿No tienes cuenta? <button onClick={() => navigate('/signup')} className="text-primary font-black underline underline-offset-4">Regístrate aquí</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
