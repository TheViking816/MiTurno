
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
      console.log("Iniciando carga de locales...");
      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('id, name')
          .order('name', { ascending: true });

        if (fetchError) {
          console.error("Error al cargar locales:", fetchError);
          setError("No se pudieron cargar los locales de la base de datos.");
          return;
        }

        console.log("Locales cargados en Signup:", data);
        if (data && data.length > 0) {
          setLocations(data);
          // Solo establecemos el primer local si no hay uno seleccionado
          setLocationId(data[0].id);
        } else {
          console.warn("La tabla de locales está vacía.");
          setError("No se han encontrado locales configurados en el sistema.");
        }
      } catch (err: any) {
        console.error("Excepción al cargar locales:", err);
        setError("Error de conexión al cargar locales.");
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
              placeholder="Escribe tu nombre"
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
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary text-lg font-bold appearance-none cursor-pointer pr-10"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-text-main dark:text-gray-400">Local</label>
            <div className="relative">
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-primary text-lg font-bold appearance-none cursor-pointer pr-10"
                required
              >
                <option value="" disabled>Selecciona tu local</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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
