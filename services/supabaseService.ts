
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jskngeempmmrtgohijhy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impza25nZWVtcG1tcnRnb2hpamh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Njg5MTIsImV4cCI6MjA4NDQ0NDkxMn0.JT5f0d3FW5XkyazU1Hu-Cazk2AS5JRaZEmrXjG0ei2o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
