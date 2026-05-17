"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Sparkles, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// --- Types ---
type PackageId = "starter" | "pro" | "agency";

interface PricingPlan {
  id: PackageId;
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Başlangıç",
    price: 15,
    credits: 60,
    description: "Yeni başlayan içerik üreticileri için temel paket.",
    features: [
      "60 Dakika Video İşleme",
      "1080p Yüksek Kalite Çıktı",
      "Standart Altyazı Stilleri",
      "Email Desteği",
    ],
  },
  {
    id: "pro",
    name: "Profesyonel",
    price: 30,
    credits: 150,
    description: "Düzenli içerik üreten profesyoneller için ideal.",
    isPopular: true,
    features: [
      "150 Dakika Video İşleme",
      "1080p Yüksek Kalite Çıktı",
      "MrBeast Tarzı Dinamik Altyazılar",
      "Akıllı Yapay Zekâ Seçimi",
      "Öncelikli İşleme Sırası",
    ],
  },
  {
    id: "agency",
    name: "Ajans",
    price: 75,
    credits: 500,
    description: "Yüksek hacimli üretim yapan ajanslar ve ekipler için.",
    features: [
      "500 Dakika Video İşleme",
      "4K Desteği (Yakında)",
      "Özel Marka Logosu Ekleme",
      "Gelişmiş Analitik",
      "7/24 Öncelikli Canlı Destek",
    ],
  },
];

export const dynamic = 'force-dynamic';

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PackageId | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };
  
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function loadCredits(user: any) {
      if (!user || !active) return;
      try {
        const { data: userRow } = await supabase
          .from("users")
          .select("credits_remaining")
          .eq("id", user.id)
          .single();
          
        if (active && userRow) {
          setCreditsRemaining(userRow.credits_remaining || 0);
        }
      } catch (err) {
        console.warn("Credits loading error in pricing page:", err);
      } finally {
        if (active) setIsLoadingCredits(false);
      }
    }

    async function initSession() {
      // 1. Get session immediately if available
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadCredits(session.user);
      }

      // 2. Listen to state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
        if (currentSession?.user) {
          await loadCredits(currentSession.user);
        } else {
          if (active) setIsLoadingCredits(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    initSession();

    return () => {
      active = false;
    };
  }, [supabase]);

  const handlePurchase = async (planId: PackageId) => {
    try {
      setLoadingPlan(planId);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Try local URL first
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/create-checkout-session`;
      let response;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ package_id: planId }),
        });
      } catch (localErr) {
        console.warn("Local backend offline. Retrying with production backend...");
        // Fall back to production backend
        url = `https://clipwise-api-production.up.railway.app/api/payments/create-checkout-session`;
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ package_id: planId }),
        });
      }

      if (!response.ok) {
        throw new Error("Ödeme oturumu oluşturulamadı.");
      }

      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Geçersiz yanıt alındı.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      showToast('error', 'Ödeme sistemine bağlanırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoadingPlan(null);
    }
  };

  // Dinamik kredi hesaplaması (Progress bar için baz alınan maksimum değer)
  const totalCredits = creditsRemaining > 60 ? 150 : 60;
  const creditPercentage = Math.min(100, Math.max(0, (creditsRemaining / totalCredits) * 100));

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-300 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all animate-in slide-in-from-top-2 ${
          toastMessage.type === 'success' ? 'bg-[#10b981] text-zinc-950' : 'bg-red-500 text-white'
        }`}>
          {toastMessage.text}
        </div>
      )}
      
      {/* Dynamic Header & Credits Banner */}
      <section className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2">
            Paketler & Krediler <Zap className="h-6 w-6 text-[#10b981]" />
          </h1>
          <p className="mt-2 text-sm text-[#a1a1aa] max-w-lg">
            İçerik üretim hızınızı artırmak için size en uygun paketi seçin. Aylık bağlayıcı abonelik yok, sadece kullandıkça ödeyin.
          </p>
        </div>
        
        <div className="rounded-xl bg-[#09090b] border border-[#27272a] p-4 min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#e4e4e7]">Kalan Krediniz</span>
            {isLoadingCredits ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#10b981]" />
            ) : (
              <span className="font-bold text-white text-lg">{creditsRemaining} <span className="text-xs text-[#71717a] font-normal">dk</span></span>
            )}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-[#27272a] rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#10b981] to-[#059669] h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${creditPercentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 pt-4">
        {PRICING_PLANS.map((plan) => {
          const isPopular = plan.isPopular;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col justify-between rounded-2xl border bg-[#18181b] p-8 transition-all hover:scale-[1.02] duration-200",
                isPopular
                  ? "border-[#10b981]/50 shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)] ring-2 ring-[#10b981]/20"
                  : "border-[#27272a] hover:border-[#3f3f46]"
              )}
            >
              {isPopular && (
                <div className="absolute -top-4 left-0 right-0 mx-auto w-max rounded-full bg-[#10b981] px-4 py-1 text-xs font-bold text-zinc-950 shadow-md flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> En Popüler
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-white tracking-tight">
                  ${plan.price}
                  <span className="ml-1 text-base font-medium text-[#71717a]">/tek seferlik</span>
                </div>
                <p className="mt-3 text-sm text-[#a1a1aa] leading-relaxed min-h-[40px]">{plan.description}</p>
                
                <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#09090b] border border-[#27272a] p-3 text-sm">
                  <Zap className="h-4 w-4 text-[#10b981]" />
                  <span className="font-semibold text-white">{plan.credits}</span> 
                  <span className="text-[#a1a1aa]">Dakika Kredi</span>
                </div>

                <div className="mt-8 border-t border-[#27272a] pt-6">
                  <span className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">Paket İçeriği</span>
                  <ul className="mt-4 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-[#10b981]/10 p-0.5">
                          <Check className="h-3.5 w-3.5 text-[#10b981]" />
                        </div>
                        <span className="text-sm text-[#e4e4e7]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => handlePurchase(plan.id)}
                disabled={loadingPlan !== null}
                className={cn(
                  "mt-10 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#09090b]",
                  isPopular
                    ? "bg-[#10b981] text-zinc-950 hover:bg-[#059669] hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] focus:ring-[#10b981]"
                    : "bg-[#27272a] text-white hover:bg-[#3f3f46] focus:ring-[#27272a]",
                  loadingPlan === plan.id && "opacity-70 cursor-not-allowed"
                )}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    Şimdi Satın Al
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </section>

    </div>
  );
}
