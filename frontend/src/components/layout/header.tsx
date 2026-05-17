/**
 * ClipWise — Header Component
 *
 * Top navigation bar with brand, navigation links, and user menu.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scissors,
  LayoutDashboard,
  Video,
  LogOut,
  User as UserIcon,
  CreditCard,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [plan, setPlan] = useState("Free Plan");
  const [userName, setUserName] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const toast = {
    success: (text: string) => {
      setToastMessage({ type: "success", text });
      setTimeout(() => setToastMessage(null), 3000);
    },
    error: (text: string) => {
      setToastMessage({ type: "error", text });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  useEffect(() => {
    async function loadUserData() {
      if (user) {
        try {
          const email = user.email || "";
          const name = user.user_metadata?.full_name || email.split("@")[0] || "Kullanıcı";
          setUserName(name);

          // Fetch subscription tier
          const { data: userRow } = await supabase
            .from("users")
            .select("subscription_status")
            .eq("id", user.id)
            .single();

          if (userRow?.subscription_status) {
            const status = userRow.subscription_status;
            setPlan(status.charAt(0).toUpperCase() + status.slice(1) + " Plan");
          } else {
            setPlan("Free Plan");
          }
        } catch (err) {
          console.error("Failed to load user plan in Header:", err);
        }
      }
    }
    loadUserData();
  }, [user, supabase]);

  const initials = userName
    ? userName.slice(0, 2).toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : "CW");

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Oturum başarıyla kapatıldı");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Oturum kapatılırken bir hata oluştu.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass">
      {toastMessage && (
        <div className={cn(
          "fixed top-4 right-4 z-55 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all animate-in slide-in-from-top-2",
          toastMessage.type === "success" ? "bg-[#10b981] text-zinc-950" : "bg-red-500 text-white"
        )}>
          {toastMessage.text}
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand transition-transform duration-300 group-hover:scale-110">
            <Scissors className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">
            ClipWise
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {isAuthenticated && (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/videos">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <Video className="h-4 w-4" />
                  Videos
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer outline-none"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#18181b] border border-[#27272a] text-white">
                <div className="px-3 py-2 border-b border-[#27272a]">
                  <p className="text-sm font-medium text-white truncate">{userName || user?.email}</p>
                  <p className="text-xs text-[#10b981] font-semibold mt-0.5">{plan}</p>
                </div>
                <DropdownMenuSeparator className="bg-[#27272a]" />
                                <div className="p-1">
                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a] hover:text-white transition-colors cursor-pointer outline-none"
                  >
                    <UserIcon className="h-4 w-4 text-[#a1a1aa]" />
                    Profil Ayarları
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings?tab=billing")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a] hover:text-white transition-colors cursor-pointer outline-none"
                  >
                    <CreditCard className="h-4 w-4 text-[#a1a1aa]" />
                    Faturalandırma
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings?tab=billing")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a] hover:text-white transition-colors cursor-pointer outline-none"
                  >
                    <History className="h-4 w-4 text-[#a1a1aa]" />
                    Kredi Geçmişi
                  </DropdownMenuItem>
                </div>
                
                <DropdownMenuSeparator className="bg-[#27272a]" />
                
                <div className="p-1">
                  <DropdownMenuItem
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer outline-none"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Oturumu Kapat
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="gradient-brand text-white border-0 hover:opacity-90 transition-opacity">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
