
export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out?: string;
  status: 'open' | 'closed' | 'flagged';
  notes?: string;
}

export interface Incidence {
  id: string;
  employee_id: string;
  session_id: string;
  type: string;
  description: string;
  created_at: string;
  resolved: boolean;
}
