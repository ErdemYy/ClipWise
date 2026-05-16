/**
 * ClipWise — Sidebar Component
 *
 * Dashboard sidebar navigation with active state indicators.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Scissors,
  Settings,
  CreditCard,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Videos", href: "/dashboard/videos", icon: Video },
];

const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/50 lg:block">
      <div className="flex h-full flex-col gap-2 px-4 py-6">
        {/* Upgrade Banner */}
        <div className="mb-4 rounded-xl gradient-brand p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold text-sm">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Unlock unlimited clips, priority processing, and advanced AI features.
          </p>
          <button className="mt-3 w-full rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/30">
            View Plans
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    active && "text-primary"
                  )}
                />
                {item.label}
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-3 opacity-50" />

        {/* Secondary Navigation */}
        <nav className="flex flex-col gap-1">
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Credits */}
        <div className="mt-auto rounded-lg border border-border/50 bg-card/50 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Credits</span>
            <span className="text-xs font-bold text-primary">10 left</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-brand transition-all duration-500"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
