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

  if (!url || !key) {
    // During build time or if env vars are missing, return a dummy client or handle gracefully
    console.warn("Supabase env variables are missing!");
  }

  return createBrowserClient(
    url || "",
    key || ""
  );
}
