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
  reviews: number | null;
  type: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: any | null;
  price_level: string | null;
  thumbnail: string | null;
  place_id: string | null;
  created_at: string;
}

export interface SearchCache {
  id: string;
  user_id: string;
  search_query: string;
  business_type: string;
  location: string;
  session_id: string;
  result_count: number;
  cached_at: string;
  expires_at: string;
  created_at: string;
}
