/**
 * ClipWise — useAuth Hook
 *
 * Client-side hook for managing authentication state.
 * Listens to Supabase auth state changes and provides
 * user data, loading state, and auth actions.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthState {
  user: SupabaseUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setState({
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState({
          user: null,
          loading: false,
          error: err instanceof Error ? err.message : "Auth error",
        });
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        loading: false,
        error: null,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signOut,
    getAccessToken,
    isAuthenticated: !!state.user,
  };
}
