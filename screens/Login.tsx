
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import logoUrl from '../assets/logo.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError('Credenciales inválidas. Revisa tus datos.');
      setLoading(false);
    }
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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Email corporativo</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary focus:border-primary text-lg font-bold text-text-main dark:text-white"
              placeholder="tu@email.com"
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
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold">
              {error}
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
