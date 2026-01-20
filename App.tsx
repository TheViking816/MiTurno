
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BottomNavAdmin, BottomNavEmployee } from './components/Navigation';
import { supabase } from './services/supabaseService';

// Screens
import Login from './screens/Login';
import Signup from './screens/Signup';
import EmployeeMainAction from './screens/EmployeeMainAction';
import ClockConfirm from './screens/ClockConfirm';
import History from './screens/History';
import AdminDashboard from './screens/AdminDashboard';
import Incidences from './screens/Incidences';
import EmployeeManagement from './screens/EmployeeManagement';
import Settings from './screens/Settings';
import ExportHours from './screens/ExportHours';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Email exacto proporcionado para acceso de gestión
  const ADMIN_EMAIL = 'brutal.soul.25@gmail.com';

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        setIsAdmin(session.user.email === ADMIN_EMAIL);
      }
      setInitialized(true);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setIsAdmin(session.user.email === ADMIN_EMAIL);
      } else {
        setSession(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!initialized) return null;

  return (
    <Router>
      <QrParamSync />
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display overflow-x-hidden text-text-main dark:text-white">
        {!session ? (
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <>
            <Routes>
              {/* Redirección inicial basada en el email de admin */}
              <Route path="/" element={isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/employee-main" replace />} />
              
              {/* Rutas de Empleado */}
              <Route path="/employee-main" element={<EmployeeMainAction />} />
              <Route path="/clock-confirm" element={<ClockConfirm />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={
                <div className="p-8 max-w-md mx-auto animate-appear">
                  <h1 className="text-3xl font-black mb-2">Mi Perfil</h1>
                  <p className="text-primary font-bold uppercase tracking-widest text-[10px] mb-8">Información de cuenta</p>
                  
                  <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-card border border-gray-100 dark:border-gray-800 mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Email Conectado</p>
                    <p className="font-black text-lg break-all">{session.user.email}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className={`size-2 rounded-full ${isAdmin ? 'bg-primary' : 'bg-action-green'}`}></span>
                      <p className="text-[10px] font-black text-primary uppercase">{isAdmin ? 'Administrador' : 'Empleado'}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button onClick={() => window.location.hash = '/admin'} className="w-full p-6 bg-primary/10 text-primary rounded-3xl font-black text-left flex justify-between items-center mb-4 transition-transform active:scale-95">
                      Ir al Panel de Gestión <span className="material-symbols-outlined font-black">admin_panel_settings</span>
                    </button>
                  )}
                  
                  <button onClick={() => supabase.auth.signOut()} className="w-full p-6 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-3xl font-black text-left flex justify-between items-center transition-transform active:scale-95">
                    Cerrar Sesión <span className="material-symbols-outlined font-black">logout</span>
                  </button>
                </div>
              } />
              
              {/* Rutas de Administrador */}
              <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/employee-main" replace />} />
              <Route path="/incidences" element={isAdmin ? <Incidences /> : <Navigate to="/admin" replace />} />
              <Route path="/employees" element={isAdmin ? <EmployeeManagement /> : <Navigate to="/admin" replace />} />
              <Route path="/settings" element={isAdmin ? <Settings /> : <Navigate to="/admin" replace />} />
              <Route path="/export" element={isAdmin ? <ExportHours /> : <Navigate to="/admin" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {isAdmin ? <BottomNavAdmin /> : <BottomNavEmployee />}
          </>
        )}
      </div>
    </Router>
  );
};

const QrParamSync: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('point');
    if (token) {
      sessionStorage.setItem('turnqr_point', token);
      return;
    }

    const hashMatch = window.location.hash.match(/point=([^&]+)/);
    if (hashMatch?.[1]) {
      sessionStorage.setItem('turnqr_point', decodeURIComponent(hashMatch[1]));
    }
  }, [location.search]);

  return null;
};

export default App;
