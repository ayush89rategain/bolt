import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ScrapingSession {
  id: string;
  business_type: string;
  location: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  total_records: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  session_id: string;
  name: string;
  description: string | null;
  rating: number | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
}
