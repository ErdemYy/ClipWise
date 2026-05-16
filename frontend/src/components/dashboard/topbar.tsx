/**
 * ClipAI — Dashboard Topbar
 *
 * Sticky 64px topbar with frosted glass effect (backdrop-blur-md).
 * Includes Logo (mobile), CommandMenu style Search, Help, Notifications, and UserNav.
 */

"use client";

import { Search, Menu, HelpCircle, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Notifications } from "./notifications";
import { UserNav } from "./user-nav";
import { createClient } from "@/lib/supabase/client";

export function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "Kullanıcı",
    email: "",
    plan: "Free Plan",
    avatar_url: "",
  });
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Kullanıcı";
          const avatarUrl = user.user_metadata?.avatar_url || "";
          
          // Fetch subscription status
          const { data: userRow } = await supabase
            .from("users")
            .select("subscription_status")
            .eq("id", user.id)
            .single();
            
          let plan = "Free Plan";
          if (userRow && userRow.subscription_status) {
            const status = userRow.subscription_status;
            plan = status.charAt(0).toUpperCase() + status.slice(1) + " Plan";
          }
          
          setUserData({
            name: fullName,
            email: user.email || "",
            plan: plan,
            avatar_url: avatarUrl,
          });
        }
      } catch (error) {
        console.error("Kullanıcı bilgileri alınamadı:", error);
      }
    }
    fetchUser();
  }, [supabase]);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-6">
      
      {/* Left — Logo & Mobile Menu */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717a] transition-colors hover:bg-[#27272a] hover:text-white lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo (Visible on mobile or when sidebar is collapsed) */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#10b981] to-[#059669]">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-base font-bold text-white">
            Clip<span className="text-[#10b981]">Wise</span>
          </span>
        </Link>
      </div>

      {/* Center — CommandMenu Style Search Bar */}
      <div className="hidden flex-1 items-center justify-center px-6 lg:flex">
        <button className="flex w-full max-w-md items-center justify-between rounded-xl border border-[#27272a] bg-[#18181b]/50 px-3 py-1.5 text-sm text-[#71717a] shadow-sm transition-colors hover:border-[#3f3f46] hover:bg-[#27272a]/50">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>Video veya ayar ara...</span>
          </div>
          <kbd className="hidden h-5 items-center gap-1 rounded border border-[#3f3f46] bg-[#27272a] px-1.5 font-mono text-[10px] font-medium text-[#a1a1aa] opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right — Actions (Help, Notifications, User) */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Help Icon */}
        <button
          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-[#71717a] transition-colors hover:bg-[#27272a] hover:text-white"
          title="Yardım Merkezi"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications Popover */}
        <Notifications />

        {/* User Profile Dropdown */}
        <div className="ml-1 pl-1 border-l border-[#27272a]">
          <UserNav user={userData} />
        </div>
      </div>
    </header>
  );
}
