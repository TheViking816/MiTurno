
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
        const handleAuth = async () => {
            // 1. Verificar errores en la URL (algunos vienen en search, otros en hash)
            const params = new URLSearchParams(window.location.search);
            const hash = window.location.hash.split('#').pop() || '';
            const hashParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : hash);

            const errorMsg = params.get('error_description') || hashParams.get('error_description');
            if (errorMsg) {
                setError(errorMsg.replace(/\+/g, ' '));
                setLoading(false);
                return;
            }

            // 2. Intentar capturar tokens manualmente si Supabase no los ve (Común en HashRouter)
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
                const { error: setSessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (!setSessionError) {
                    setLoading(false);
                    return;
                }
            }

            // 3. Tentar obtener sesión normal
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setLoading(false);
                return;
            }

            // 4. Listener para cambios de auth
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'PASSWORD_RECOVERY' || session) {
                    setLoading(false);
                    setError(null);
                }
            });

            return () => subscription.unsubscribe();
        };

        handleAuth();
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        setError(null);

        // Intentamos actualizar la contraseña
        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            console.error('Update Error:', updateError);
            setError(updateError.message || 'Error al actualizar. El enlace puede haber expirado.');
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Cerrar sesión después de cambiar contraseña para forzar nuevo login limpio
            await supabase.auth.signOut();
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
