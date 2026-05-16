"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /dashboard/billing now redirects to /dashboard/pricing.
 * This avoids duplicate pages and centralizes billing logic.
 */
export default function BillingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/pricing");
  }, [router]);

  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
    </div>
  );
}
