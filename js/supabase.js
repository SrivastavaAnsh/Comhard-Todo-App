/**
 * Supabase client singleton for Comhard TaskFlow.
 * Uses Vite environment variables — never exposes secret keys.
 */

import { createClient } from "@supabase/supabase-js";


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL loaded:", Boolean(supabaseUrl));
console.log("Supabase key loaded:", Boolean(supabaseAnonKey));

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Create a .env file based on .env.example and restart the dev server."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // handles magic link redirects
  },
});
