
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import logoUrl from '../assets/logo.png';

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Verificar si hay una sesión activa (que debería haberla si vienen del enlace de recuperación)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Si no hay sesión, puede ser que el enlace sea inválido o haya expirado
                // Pero esperamos un poco por si Supabase está procesando el hash
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (!retrySession) {
                        setError('No hay una sesión activa. El enlace de recuperación puede haber expirado o ser inválido.');
                    }
                }, 1500);
            }
        };
        checkSession();
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError('No pudimos actualizar la contraseña. El enlace puede haber expirado.');
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            setTimeout(() => navigate('/login'), 3000);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark max-w-md mx-auto text-center">
                <div className="p-8 bg-white dark:bg-surface-dark rounded-3xl shadow-card border border-gray-100 dark:border-gray-800">
                    <span className="material-symbols-outlined text-action-green text-6xl mb-4">check_circle</span>
                    <h2 className="text-2xl font-black mb-2">¡Contraseña actualizada!</h2>
                    <p className="text-gray-400 font-medium mb-6">Tu contraseña ha sido cambiada correctamente. Te redirigimos al login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark max-w-md mx-auto">
            <div className="w-full space-y-8 animate-appear">
                <div className="text-center">
                    <img
                        src={logoUrl}
                        alt="TurnQR Logo"
                        className="h-24 mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-2xl font-black">Nueva Contraseña</h1>
                    <p className="text-gray-400 text-sm font-medium mt-2">Introduce tu nueva clave de acceso</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary focus:border-primary text-lg font-bold text-text-main dark:text-white"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary focus:border-primary text-lg font-bold text-text-main dark:text-white"
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
                        {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
