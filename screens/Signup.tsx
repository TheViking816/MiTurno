
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import logoUrl from '../assets/logo.png';

const ROLES = [
  'Jefe de cocina',
  'Cocinero',
  'Camarero',
  'Encargado de turno',
  'Otros'
];

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[2]); // Default: Camarero
  const [locations, setLocations] = useState<any[]>([]);
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .order('name', { ascending: true });
      setLocations(data || []);
      if (data && data.length > 0) {
        setLocationId(data[0].id);
      }
    };
    fetchLocations();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('employees')
          .insert([{ 
            id: data.user.id, 
            name: name, 
            role: role,
            location_id: locationId || null
          }]);
        
        if (profileError) throw profileError;
        
        alert("¡Registro exitoso! Ya puedes iniciar sesión.");
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark max-w-md mx-auto">
      <div className="w-full space-y-8 animate-appear">
        <div className="text-center">
          <img
            src={logoUrl}
            alt="TurnQR"
            className="h-16 mx-auto mb-4 opacity-50 grayscale"
          />
          <h1 className="text-4xl font-black tracking-tighter text-text-main dark:text-white">Únete a TurnQR</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Nuevo registro de empleado</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Nombre Completo</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary text-lg font-bold"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Email Personal</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary text-lg font-bold"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Puesto / Rol</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary text-lg font-bold appearance-none cursor-pointer"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Local</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary text-lg font-bold appearance-none cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Contraseña</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary text-lg font-bold"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-2xl text-red-600 text-sm font-bold border border-red-100">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-primary text-white rounded-3xl font-black text-lg shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <button 
          onClick={() => navigate('/login')}
          className="w-full text-center text-gray-400 text-sm font-bold uppercase tracking-widest"
        >
          Ya tengo cuenta · Volver
        </button>
      </div>
    </div>
  );
};

export default Signup;
