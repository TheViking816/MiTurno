
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseService } from '../services/supabaseService';

const ROLES = [
  'Jefe de cocina',
  'Cocinero',
  'Camarero',
  'Encargado de turno',
  'Otros'
];

const EmployeeManagement: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*');
    
    if (error) {
      console.error("Error fetching employees:", error);
    } else {
      // Ordenar localmente por nombre
      const sorted = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      setEmployees(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleRoleChange = async (empId: string, newRole: string) => {
    setUpdatingId(empId);
    try {
      await supabaseService.updateEmployeeRole(empId, newRole);
      setEmployees(prev => prev.map(emp => emp.id === empId ? { ...emp, role: newRole } : emp));
    } catch (error) {
      alert("Error al actualizar el puesto");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (empId: string, empName: string) => {
    if (!confirm(`Eliminar a ${empName || 'este usuario'}?`)) return;
    setDeletingId(empId);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', empId);
      if (error) throw error;
      setEmployees(prev => prev.filter(emp => emp.id !== empId));
    } catch (error) {
      alert('Error al eliminar el usuario');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#171412] dark:text-white font-display min-h-screen pb-32 max-w-md mx-auto">
      <div className="flex items-center px-6 py-6 justify-between sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md z-20">
        <h2 className="text-2xl font-black">Equipo</h2>
        <button onClick={() => navigate('/admin')} className="flex size-10 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-text-main">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      <div className="px-6 space-y-6 animate-appear">
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4 opacity-50">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold uppercase tracking-widest text-[10px]">Cargando equipo...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-dashed border-gray-200">
               <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">person_off</span>
               <p className="text-gray-400 font-bold text-sm uppercase">No hay empleados registrados</p>
            </div>
          ) : (
            employees.map((emp) => (
              <div key={emp.id} className="flex flex-col gap-3 bg-white dark:bg-surface-dark p-4 rounded-3xl shadow-card border border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="rounded-full h-14 w-14 bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                    {emp.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg truncate">{emp.name || 'Sin nombre'}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{emp.is_active !== false ? 'Activo' : 'Inactivo'}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${emp.is_active !== false ? 'bg-action-green' : 'bg-gray-300'}`}></div>
                    <button
                      onClick={() => handleDelete(emp.id, emp.name)}
                      disabled={deletingId === emp.id}
                      className="text-red-500 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      {deletingId === emp.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>

                <div className="relative mt-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Puesto Actual</label>
                  <select 
                    value={emp.role || 'Otros'}
                    disabled={updatingId === emp.id}
                    onChange={(e) => handleRoleChange(emp.id, e.target.value)}
                    className="w-full py-2 pl-3 pr-8 bg-gray-50 dark:bg-black/20 border-none rounded-xl text-xs font-black appearance-none cursor-pointer focus:ring-primary dark:text-white"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="absolute right-3 bottom-2 pointer-events-none text-primary">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </div>
                  {updatingId === emp.id && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center rounded-xl">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;
