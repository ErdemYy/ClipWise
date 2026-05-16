/**
 * ClipWise — Login Page
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Ambient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-brand">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">ClipWise</span>
          </Link>
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-brand text-white border-0 hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
