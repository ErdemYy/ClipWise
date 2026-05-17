"use client";

import { useState, useEffect } from "react";
import { User as UserIcon, CreditCard, History, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface UserNavProps {
  user?: {
    name: string;
    email: string;
    plan: string;
    avatar_url?: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    plan: string;
    avatar_url?: string;
  } | null>(null);

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

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const email = authUser.email || "";
          const name = authUser.user_metadata?.full_name || email.split("@")[0] || "Kullanıcı";
          const avatar_url = authUser.user_metadata?.avatar_url || "";
          
          // Fetch subscription tier from database
          const { data: userRow } = await supabase
            .from("users")
            .select("subscription_status")
            .eq("id", authUser.id)
            .single();

          let plan = "Free Plan";
          if (userRow?.subscription_status) {
            const status = userRow.subscription_status;
            plan = status.charAt(0).toUpperCase() + status.slice(1) + " Plan";
          }

          setUserData({
            name,
            email,
            plan,
            avatar_url
          });
        }
      } catch (err) {
        console.error("Failed to load user in UserNav:", err);
      }
    }
    loadUser();
  }, [supabase]);

  // Combine loaded state with prop fallback to ensure reliability
  const activeUser = userData || user || { name: "Kullanıcı", email: "", plan: "Free Plan" };
  const initial = activeUser.name ? activeUser.name.charAt(0).toUpperCase() : "U";

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`Hata: ${error.message}`);
        return;
      }
      toast.success("Oturum başarıyla kapatıldı");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Oturum kapatılırken bir hata oluştu.");
    }
  };

  return (
    <>
      {toastMessage && (
        <div className={cn(
          "fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all animate-in slide-in-from-top-2",
          toastMessage.type === "success" ? "bg-[#10b981] text-zinc-950" : "bg-red-500 text-white"
        )}>
          {toastMessage.text}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#27272a] cursor-pointer outline-none"
            aria-label="Profil Menüsü"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] text-sm font-semibold text-white shadow-sm overflow-hidden">
              {activeUser.avatar_url ? (
                <img src={activeUser.avatar_url} alt={activeUser.name} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-white leading-none">{activeUser.name}</p>
              <p className="text-[11px] font-semibold text-[#10b981] leading-none mt-1">{activeUser.plan}</p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 bg-[#18181b] border border-[#27272a] text-white">
          <DropdownMenuLabel className="border-b border-[#27272a] px-4 py-3">
            <p className="text-sm font-medium text-white">{activeUser.name}</p>
            <p className="text-xs text-[#71717a] truncate mt-0.5">{activeUser.email}</p>
          </DropdownMenuLabel>
          
          <div className="p-1">
            <DropdownMenuItem asChild>
              <Link 
                href="/dashboard/settings" 
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a] hover:text-white transition-colors cursor-pointer outline-none"
              >
                <UserIcon className="h-4 w-4 text-[#a1a1aa]" />
                Profil Ayarları
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link 
                href="/dashboard/settings?tab=billing" 
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a] hover:text-white transition-colors cursor-pointer outline-none"
              >
                <CreditCard className="h-4 w-4 text-[#a1a1aa]" />
                Faturalandırma
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link 
                href="/dashboard/settings?tab=billing" 
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a] hover:text-white transition-colors cursor-pointer outline-none"
              >
                <History className="h-4 w-4 text-[#a1a1aa]" />
                Kredi Geçmişi
              </Link>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="bg-[#27272a]" />

          <div className="p-1">
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer outline-none"
            >
              <LogOut className="h-4 w-4" />
              Oturumu Kapat
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
