/**
 * Supabase client singleton for Comhard TaskFlow.
 * Uses Vite environment variables — never exposes secret keys.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "https://your-project-id.supabase.co" &&
  supabaseAnonKey !== "your-publishable-anon-key-here"
);

console.log("Supabase URL loaded:", Boolean(supabaseUrl));
console.log("Supabase key loaded:", Boolean(supabaseAnonKey));
console.log("Supabase active:", isSupabaseConfigured);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase credentials not configured in .env. Running in offline/localStorage mode."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
