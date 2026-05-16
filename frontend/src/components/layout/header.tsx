/**
 * ClipWise — Header Component
 *
 * Top navigation bar with brand, navigation links, and user menu.
 */

"use client";

import Link from "next/link";
import {
  Scissors,
  LayoutDashboard,
  Video,
  LogOut,
  User,
  CreditCard,
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

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "CW";

  return (
    <header className="sticky top-0 z-50 w-full glass">
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
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Free Plan</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
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
