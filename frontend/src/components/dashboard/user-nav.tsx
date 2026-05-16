"use client";

import { useState, useRef, useEffect } from "react";
import { User, CreditCard, History, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserNavProps {
  user: {
    name: string;
    email: string;
    plan: string;
    avatar_url?: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#27272a]"
        aria-label="Profil Menüsü"
        aria-expanded={isOpen}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] text-sm font-semibold text-white shadow-sm overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="hidden text-left md:block">
          <p className="text-sm font-medium text-white leading-none">{user.name}</p>
          <p className="text-[11px] font-semibold text-[#10b981] leading-none mt-1">{user.plan}</p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[#27272a] bg-[#18181b] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          
          {/* Header */}
          <div className="border-b border-[#27272a] px-4 py-3">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-[#71717a] truncate mt-0.5">{user.email}</p>
          </div>

          {/* Links */}
          <div className="p-1.5">
            <button 
              onClick={() => { setIsOpen(false); router.push("/dashboard/settings"); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] transition-colors hover:bg-[#27272a] hover:text-white"
            >
              <User className="h-4 w-4 text-[#a1a1aa]" />
              Profil Ayarları
            </button>
            <button 
              onClick={() => { setIsOpen(false); router.push("/dashboard/settings?tab=billing"); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] transition-colors hover:bg-[#27272a] hover:text-white"
            >
              <CreditCard className="h-4 w-4 text-[#a1a1aa]" />
              Faturalandırma
            </button>
            <button 
              onClick={() => { setIsOpen(false); router.push("/dashboard/settings?tab=billing"); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#e4e4e7] transition-colors hover:bg-[#27272a] hover:text-white"
            >
              <History className="h-4 w-4 text-[#a1a1aa]" />
              Kredi Geçmişi
            </button>
          </div>

          {/* Footer (Logout) */}
          <div className="border-t border-[#27272a] p-1.5">
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Oturumu Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
