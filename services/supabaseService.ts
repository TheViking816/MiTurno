
import { createClient } from '@supabase/supabase-js';
import { validateScheduledEntry, type WeeklySchedule } from './weeklySchedule';

const SUPABASE_URL = 'https://jskngeempmmrtgohijhy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impza25nZWVtcG1tcnRnb2hpamh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Njg5MTIsImV4cCI6MjA4NDQ0NDkxMn0.JT5f0d3FW5XkyazU1Hu-Cazk2AS5JRaZEmrXjG0ei2o';
const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type EmployeeShiftType = 'morning' | 'afternoon';
export type AppSettingsRow = {
  id: number;
  business_name: string | null;
  opening_time: string | null;
  morning_auto_close_time: string | null;
  afternoon_auto_close_time: string | null;
  auto_close_enabled: boolean | null;
};

export const clearAuthStorage = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const supabaseService = {
  getCurrentEmployee: async (userId: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  getEmployeeLocations: async (userId: string) => {
    const { data, error } = await supabase
      .from('employee_locations')
      .select('location_id, locations(name)')
      .eq('employee_id', userId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.location_id,
      name: row.locations?.name || ''
    }));
  },

  getEmployeeLocationIds: async (userId: string) => {
    const { data, error } = await supabase
      .from('employee_locations')
      .select('location_id')
      .eq('employee_id', userId);
    if (error) return [] as string[];
    return (data || []).map((row: any) => row.location_id).filter(Boolean);
  },

  setEmployeeLocations: async (userId: string, locationIds: string[]) => {
    const ids = [...new Set(locationIds)];
    if (!ids.length) throw new Error('El trabajador debe tener al menos un local.');
    const { data: employee, error: employeeError } = await supabase.from('employees').select('*').eq('id', userId).single();
    if (employeeError) throw employeeError;
    if (employee.weekly_schedule?.some((id: string | null) => id && !ids.includes(id))) {
      throw new Error('Cambia primero el calendario semanal: todavía contiene ese local.');
    }

    if (ids.length > 0) {
      const rows = ids.map((locationId) => ({
        employee_id: userId,
        location_id: locationId
      }));
      const { error: insertError } = await supabase
        .from('employee_locations')
        .upsert(rows, { onConflict: 'employee_id,location_id', ignoreDuplicates: true });
      if (insertError) throw insertError;
    }

    const primaryLocation = ids[0];
    const { error: updateError } = await supabase
      .from('employees')
      .update({ location_id: primaryLocation })
      .eq('id', userId);
    if (updateError) throw updateError;
    // Remove only obsolete links after the new links and primary location are saved.
    const { error: deleteError } = await supabase.from('employee_locations').delete()
      .eq('employee_id', userId).not('location_id', 'in', `(${ids.join(',')})`);
    if (deleteError) throw deleteError;
  },

  saveWeeklySchedule: async (userId: string, schedule: WeeklySchedule | null) => {
    const { data, error } = await supabase.from('employees').update({ weekly_schedule: schedule })
      .eq('id', userId).select('id').single();
    if (error) throw new Error(error.message.includes('weekly_schedule')
      ? 'El calendario semanal requiere activar la actualización de la base de datos.' : error.message);
    if (!data) throw new Error('No se pudo guardar el calendario.');
  },

  getEmployeeIdsByLocation: async (locationId: string) => {
    const { data, error } = await supabase
      .from('employee_locations')
      .select('employee_id')
      .eq('location_id', locationId);
    if (error) return [] as string[];
    return (data || []).map((row: any) => row.employee_id).filter(Boolean);
  },

  updateEmployeeRole: async (employeeId: string, newRole: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ role: newRole })
      .eq('id', employeeId);
    if (error) throw error;
  },

  updateEmployeeShift: async (employeeId: string, shiftType: EmployeeShiftType) => {
    const { error } = await supabase
      .from('employees')
      .update({ shift_type: shiftType })
      .eq('id', employeeId);
    if (error) throw error;
  },

  getAppSettings: async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('id, business_name, opening_time, morning_auto_close_time, afternoon_auto_close_time, auto_close_enabled')
      .eq('id', 1)
      .maybeSingle<AppSettingsRow>();
    if (error) throw error;
    return data;
  },

  saveAppSettings: async (settings: Partial<AppSettingsRow> & { id: number }) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert(settings, { onConflict: 'id' });
    if (error) throw error;
  },

  getCurrentSession: async (userId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },

  clockIn: async (userId: string, locationId?: string | null) => {
    // Check for an existing open session first to prevent duplicates
    const { data: existingSession, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (existingSession) {
      return existingSession;
    }

    if (!locationId) throw new Error('Escanea el QR de tu local para fichar.');
    const locations = await supabaseService.getEmployeeLocations(userId);
    if (!locations.some((location) => location.id === locationId)) throw new Error('No tienes asignado este local. Consulta con administración.');
    const { data: profile, error: profileError } = await supabase.from('employees').select('*').eq('id', userId).single();
    if (profileError) throw profileError;
    validateScheduledEntry(profile.weekly_schedule, locationId);

    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        user_id: userId,
        clock_in: new Date().toISOString(),
        status: 'open',
        location_id: locationId || null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  clockOut: async (userId: string, sessionId?: string) => {
    const targetSessionId = sessionId || (await supabaseService.getCurrentSession(userId))?.id;
    if (!targetSessionId) {
      throw new Error('No hay una jornada abierta para cerrar.');
    }

    const { data, error } = await supabase
      .from('sessions')
      .update({ clock_out: new Date().toISOString(), status: 'closed' })
      .eq('id', targetSessionId)
      .eq('user_id', userId)
      .is('clock_out', null)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error('No se pudo cerrar la jornada. Recarga e inténtalo de nuevo.');
    }
  },

  addManualSession: async (session: { user_id: string, clock_in: string, clock_out: string, location_id: string }) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        ...session,
        status: 'closed'
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getHistory: async (userId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('clock_in', { ascending: false });
    return data || [];
  }
};
