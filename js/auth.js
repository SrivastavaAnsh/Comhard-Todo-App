/**
 * Comhard TaskFlow - Authentication Module
 * Wraps Supabase Auth: email/password sign-up, sign-in, magic link, sign-out.
 * Exposes the current session and a subscription for auth state changes.
 */

import { supabase } from "./supabase.js";

function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please add your credentials to .env.");
  }
}

// ---- Auth Operations ----

/**
 * Sign up with email + password.
 * Supabase sends a confirmation email automatically.
 */
export async function signUpWithEmail(email, password) {
  ensureSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign in with email + password.
 */
export async function signInWithEmail(email, password) {
  ensureSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Send a magic link (passwordless email login).
 */
export async function signInWithMagicLink(email) {
  ensureSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

/**
 * Sign the current user out and clear session.
 */
export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current active session (null if not logged in).
 */
export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

/**
 * Get the current authenticated user object (null if not logged in).
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session ? session.user : null;
}

/**
 * Subscribe to auth state changes.
 * Callback receives (event, session).
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email) {
  ensureSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth.html?mode=reset`,
  });
  if (error) throw error;
}

/**
 * Update the user's password (called after redirect from reset email).
 */
export async function updatePassword(newPassword) {
  ensureSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
