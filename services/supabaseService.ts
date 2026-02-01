
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jskngeempmmrtgohijhy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impza25nZWVtcG1tcnRnb2hpamh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Njg5MTIsImV4cCI6MjA4NDQ0NDkxMn0.JT5f0d3FW5XkyazU1Hu-Cazk2AS5JRaZEmrXjG0ei2o';
const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    if (error) return [];
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
    const { error: deleteError } = await supabase
      .from('employee_locations')
      .delete()
      .eq('employee_id', userId);
    if (deleteError) throw deleteError;

    if (locationIds.length > 0) {
      const rows = locationIds.map((locationId) => ({
        employee_id: userId,
        location_id: locationId
      }));
      const { error: insertError } = await supabase
        .from('employee_locations')
        .insert(rows);
      if (insertError) throw insertError;
    }

    const primaryLocation = locationIds[0] || null;
    const { error: updateError } = await supabase
      .from('employees')
      .update({ location_id: primaryLocation })
      .eq('id', userId);
    if (updateError) throw updateError;
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
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      return existingSession;
    }

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

  clockOut: async (userId: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ clock_out: new Date().toISOString(), status: 'closed' })
      .eq('user_id', userId)
      .is('clock_out', null);
    if (error) throw error;
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
