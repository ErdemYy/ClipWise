/**
 * ClipWise — Supabase Browser Client
 *
 * Creates a Supabase client for use in Client Components (browser context).
 * Uses the public anon key — RLS policies protect data access.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
