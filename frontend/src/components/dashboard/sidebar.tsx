/**
 * ClipWise — Dashboard Sidebar
 *
 * Fixed 240px sidebar with navigation, branding, and credit meter.
 * Apple/Linear quality dark UI with Emerald-500 accent.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Video,
  Scissors,
  CreditCard,
  Settings,
  Sparkles,
  Zap,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Videolarım", href: "/dashboard/videos", icon: Video },
  { label: "Klipler", href: "/dashboard/clips", icon: Scissors },
  { label: "Fiyatlandırma", href: "/dashboard/pricing", icon: CreditCard },
  { label: "Ayarlar", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCredits() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userRow } = await supabase
          .from("users")
          .select("credits_remaining")
          .eq("id", user.id)
          .single();

        if (userRow) {
          setCreditsRemaining(userRow.credits_remaining ?? 0);
        }
      } catch (error) {
        console.error("Sidebar: Kredi bilgisi alınamadı.", error);
      }
    }
    fetchCredits();
  }, [supabase]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Calculate credit percentage based on nearest plan tier
  const totalCredits = creditsRemaining !== null
    ? (creditsRemaining > 150 ? 500 : creditsRemaining > 60 ? 150 : creditsRemaining > 10 ? 60 : 10)
    : 10;
  const creditPercent = creditsRemaining !== null
    ? Math.min(100, Math.max(0, (creditsRemaining / totalCredits) * 100))
    : 0;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#27272a] bg-[#18181b] lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[#27272a] px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#10b981] to-[#059669]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Clip<span className="text-[#10b981]">Wise</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#10b981]/10 text-[#10b981]"
                    : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    active ? "text-[#10b981]" : "text-[#71717a] group-hover:text-[#a1a1aa]"
                  }`}
                />
                {item.label}
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Credits Meter */}
        <div className="border-t border-[#27272a] px-4 py-5">
          <div className="rounded-xl bg-[#09090b] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#10b981]" />
              <span className="text-xs font-semibold text-white">Kalan Kredi</span>
            </div>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-[#27272a]">
              <div
                className="h-full rounded-full bg-[#10b981] transition-all duration-700 ease-out"
                style={{ width: `${creditPercent}%` }}
              />
            </div>
            <p className="text-xs text-[#71717a]">
              {creditsRemaining !== null ? (
                <>
                  <span className="font-semibold text-[#10b981]">{creditsRemaining}</span>
                  <span className="text-[#3f3f46]"> / </span>
                  <span>{totalCredits} Dakika</span>
                </>
              ) : (
                <Loader2 className="inline h-3 w-3 animate-spin text-[#10b981]" />
              )}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-[#27272a] bg-[#18181b] lg:hidden">
        {navigation.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 ${
                active ? "text-[#10b981]" : "text-[#71717a]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
