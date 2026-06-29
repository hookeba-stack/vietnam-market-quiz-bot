// Supabase Client Initialization
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Create a single supabase client for interaction with your database
// We only initialize if credentials are provided to prevent server startup errors on local environments without .env
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("Supabase credentials missing. Supabase client is not initialized.");
}

export { supabase };
