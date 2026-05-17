"use client";

import { useState } from "react";
import { User as UserIcon, CreditCard, History, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const { user, fullName, avatarUrl, creditsRemaining, signOut } = useAuth();
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const activeName = fullName || user?.email?.split("@")[0] || "Misafir";
  const activeEmail = user?.email || "";
  const initial = activeName ? activeName.charAt(0).toUpperCase() : "U";

  // Calculate plan dynamically based on credits
  const activePlan = creditsRemaining > 60 ? "Pro Plan" : (creditsRemaining > 0 ? "Starter Plan" : "Free Plan");

  const handleLogout = async () => {
    try {
      await signOut();
      setToastMessage({ type: "success", text: "Oturum başarıyla kapatıldı" });
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (err: any) {
      setToastMessage({ type: "error", text: err?.message || "Oturum kapatılamadı" });
      setTimeout(() => setToastMessage(null), 3000);
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
        <DropdownMenuTrigger
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#27272a] cursor-pointer outline-none select-none"
          aria-label="Profil Menüsü"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] text-sm font-semibold text-white shadow-sm overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={activeName} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-white leading-none">{activeName}</p>
            <p className="text-[11px] font-semibold text-[#10b981] leading-none mt-1">{activePlan}</p>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 bg-[#18181b] border border-[#27272a] text-white">
          <div className="border-b border-[#27272a] px-4 py-3">
            <p className="text-sm font-medium text-white">{activeName}</p>
            <p className="text-xs text-[#71717a] truncate mt-0.5">{activeEmail}</p>
          </div>
          
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
