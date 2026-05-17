/**
 * ClipWise — useAuth Hook & Context Provider
 *
 * Client-side global context for managing authentication and profile state.
 * Listens to Supabase auth state changes and keeps user, credits, and profile data in sync.
 */

"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextType {
  user: SupabaseUser | null;
  loading: boolean;
  error: string | null;
  creditsRemaining: number;
  fullName: string;
  avatarUrl: string;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [fullName, setFullName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const supabase = createClient();

  const loadProfileData = useCallback(async (authUser: SupabaseUser) => {
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("full_name, avatar_url, credits_remaining")
        .eq("id", authUser.id)
        .single();

      if (userRow) {
        setFullName(userRow.full_name || authUser.user_metadata?.full_name || "");
        setAvatarUrl(userRow.avatar_url || authUser.user_metadata?.avatar_url || "");
        setCreditsRemaining(userRow.credits_remaining ?? 0);
      } else {
        setFullName(authUser.user_metadata?.full_name || "");
        setAvatarUrl(authUser.user_metadata?.avatar_url || "");
        setCreditsRemaining(10); // default fallback
      }
    } catch (err) {
      console.warn("Failed to load user DB profile in AuthProvider:", err);
      // Fallback to auth metadata
      setFullName(authUser.user_metadata?.full_name || "");
      setAvatarUrl(authUser.user_metadata?.avatar_url || "");
    }
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentAuthUser = session?.user ?? null;
      setUser(currentAuthUser);

      if (currentAuthUser) {
        await loadProfileData(currentAuthUser);
      } else {
        setFullName("");
        setAvatarUrl("");
        setCreditsRemaining(0);
      }
    } catch (err) {
      console.error("Error refreshing user state:", err);
    }
  }, [supabase, loadProfileData]);

  useEffect(() => {
    let active = true;

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        const currentAuthUser = session?.user ?? null;
        setUser(currentAuthUser);

        if (currentAuthUser) {
          await loadProfileData(currentAuthUser);
        }
        setLoading(false);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Auth error");
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      const currentAuthUser = session?.user ?? null;
      setUser(currentAuthUser);

      if (currentAuthUser) {
        await loadProfileData(currentAuthUser);
      } else {
        setFullName("");
        setAvatarUrl("");
        setCreditsRemaining(0);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfileData]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setUser(null);
      setFullName("");
      setAvatarUrl("");
      setCreditsRemaining(0);
      setLoading(false);
    }
  }, [supabase]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    creditsRemaining,
    fullName,
    avatarUrl,
    refreshUser,
    signOut,
    getAccessToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider. Wrap your layout in <AuthProvider>.");
  }
  return context;
}
