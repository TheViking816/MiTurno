import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseService';

export const BottomNavAdmin: React.FC = () => {
    const location = useLocation();
    const isAdminPath = ['/admin', '/incidences', '/employees', '/sessions', '/settings', '/export'].includes(location.pathname);

    if (!isAdminPath) return null;

    const navItems = [
        { path: '/admin', icon: 'dashboard', label: 'Panel' },
        { path: '/sessions', icon: 'schedule', label: 'Fichajes' },
        { path: '/employees', icon: 'group', label: 'Equipo' },
        { path: '/settings', icon: 'settings', label: 'Ajustes' },
    ];

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
            console.error('Error al cerrar sesión:', error);
            await supabase.auth.clearSession();
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1A1A1A] border-t border-gray-100 dark:border-gray-800 pb-safe pt-2 px-6 h-20 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-[100]">
            <div className="flex justify-between items-center max-w-md mx-auto h-full pb-4">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex flex-col items-center gap-1 w-16 transition-colors ${location.pathname === item.path ? 'text-primary' : 'text-gray-400'}`}
                    >
                        <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                    </Link>
                ))}
                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 w-16 text-red-500"
                >
                    <span className="material-symbols-outlined text-[28px]">logout</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight">Salir</span>
                </button>
            </div>
        </nav>
    );
};

export const BottomNavEmployee: React.FC = () => {
    const location = useLocation();
    const isEmployeePath = ['/employee-main', '/history', '/profile', '/'].includes(location.pathname) && !['/admin', '/incidences', '/employees', '/settings', '/export'].includes(location.pathname);

    if (!isEmployeePath) return null;

    const navItems = [
        { path: '/employee-main', icon: 'qr_code_scanner', label: 'Fichar' },
        { path: '/history', icon: 'history', label: 'Historial' },
        { path: '/profile', icon: 'person', label: 'Perfil' },
    ];

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
            console.error('Error al cerrar sesión:', error);
            await supabase.auth.clearSession();
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-[#1A1A1A] border-t border-stone-200 dark:border-stone-800 px-6 py-2 pb-8 flex justify-between items-center z-[100] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            {navItems.map((item) => (
                <Link
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center gap-1 transition-colors px-4 py-2 rounded-2xl ${location.pathname === item.path ? 'text-primary bg-primary/5' : 'text-stone-400'}`}
                >
                    <span className="material-symbols-outlined text-[26px]">{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                </Link>
            ))}
            <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-1 transition-colors px-4 py-2 rounded-2xl text-red-500"
            >
                <span className="material-symbols-outlined text-[26px]">logout</span>
                <span className="text-[10px] font-bold uppercase tracking-tight">Salir</span>
            </button>
        </nav>
    );
};
