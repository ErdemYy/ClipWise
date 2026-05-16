/**
 * ClipAI — Dashboard Layout
 *
 * Layout with fixed sidebar (desktop) + sticky topbar + main content area.
 * Mobile: bottom nav bar.
 */

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sidebar (desktop only) */}
      <Sidebar />

      {/* Main wrapper — offset by sidebar width on desktop */}
      <div className="lg:pl-60">
        {/* Topbar */}
        <Topbar />

        {/* Page content */}
        <main className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
