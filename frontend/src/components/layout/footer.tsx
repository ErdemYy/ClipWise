/**
 * ClipWise — Footer Component
 */

import { Scissors } from "lucide-react";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-brand">
              <Scissors className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold gradient-text">ClipWise</span>
          </div>

          <nav className="flex items-center gap-6">
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Support
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">
            © {currentYear} ClipWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
