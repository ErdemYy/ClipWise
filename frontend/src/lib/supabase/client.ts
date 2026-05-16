/**
 * ClipWise — Supabase Browser Client
 *
 * Creates a Supabase client for use in Client Components (browser context).
 * Uses the public anon key — RLS policies protect data access.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // CRITICAL: During build time or if env vars are missing, 
  // DO NOT call createBrowserClient as it will throw.
  if (!url || !key) {
    console.warn("Supabase env variables are missing! Returning mock client for build.");
    return {
      auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
      from: () => ({ select: () => ({ order: () => ({}) }), eq: () => ({ single: () => ({}) }) })
    } as any;
  }

  return createBrowserClient(url, key);
}
