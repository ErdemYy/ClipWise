"use client";

import { useState, useEffect, useRef } from "react";
import { Link as LinkIcon, Sparkles, Video, Scissors, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Real DB Data states
  const [videoCount, setVideoCount] = useState<number | null>(null);
  const [clipCount, setClipCount] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ title: string, original_url: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const supabase = createClient();
  const { creditsRemaining, refreshUser } = useAuth();
  const isProcessingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch total videos count
        const { count: vCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true });
        if (active) setVideoCount(vCount ?? 0);

        // Fetch total clips count
        const { count: cCount } = await supabase
          .from('clips')
          .select('*', { count: 'exact', head: true });
        if (active) setClipCount(cCount ?? 0);

        // Fetch active processing/transcribing/pending video
        const { data: activeData } = await supabase
          .from('videos')
          .select('title, original_url, status')
          .in('status', ['processing', 'transcribed', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (active && activeData) {
          setActiveVideo({ 
            title: activeData.title || "Yeni Video İşleniyor...", 
            original_url: activeData.original_url 
          });
          setIsProcessing(true);
        } else if (active) {
          // If no active jobs, disable the card
          setIsProcessing(false);
          setActiveVideo(null);
        }
      } catch (error) {
        console.error('Dashboard verisi yüklenemedi:', error);
      }
    }
    
    fetchDashboardData();

    // 1. Supabase Realtime Listener for videos table updates
    const channel = supabase
      .channel('dashboard-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos' },
        (payload) => {
          console.log('Dashboard: Realtime update detected:', payload);
          fetchDashboardData();
          refreshUser(); // Sync credits instantly
        }
      )
      .subscribe();

    // 2. Fallback Polling every 5 seconds if a job is active
    const interval = setInterval(() => {
      if (isProcessingRef.current) {
        console.log("Dashboard active job polling...");
        fetchDashboardData();
      }
    }, 5000);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, refreshUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mock insertion for UI feedback, backend handles the real Celery task
      const { error } = await supabase.from('videos').insert({
        user_id: user.id,
        original_url: url,
        title: "Yeni Video İşleniyor...",
        status: 'processing'
      });

      if (error) throw error;
      
      setActiveVideo({ title: "Yeni Video İşleniyor...", original_url: url });
      setUrl("");
      showToast('success', 'Video kuyruğa eklendi! Yapay zekâ analiz ediyor...');
      refreshUser(); // Update credit meter state immediately
    } catch (error) {
      console.error(error);
      showToast('error', 'Video işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setIsProcessing(false);
    }
  };

  const QUICK_STATS = [
    { label: "Toplam İşlenen", value: videoCount !== null ? videoCount.toString() : "-", icon: Video },
    { label: "Oluşturulan Klipler", value: clipCount !== null ? clipCount.toString() : "-", icon: Scissors },
    { label: "Kalan Kredi", value: `${creditsRemaining} dk`, icon: Zap, highlight: true },
  ];

  return (
    <div className="space-y-12 pb-10 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all animate-in slide-in-from-top-2 ${
          toastMessage.type === 'success' ? 'bg-[#10b981] text-zinc-950' : 'bg-red-500 text-white'
        }`}>
          {toastMessage.text}
        </div>
      )}
      
      {/* Top Section: Hero & Stats */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Yeni Proje Başlat
          </h1>
          <p className="text-[#a1a1aa] max-w-md">
            YouTube linkini yapıştır, yapay zekâ viral klipleri hazırlasın.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {QUICK_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={cn(
                  "flex items-center gap-4 rounded-xl border bg-[#18181b] px-4 py-3 shadow-sm select-none",
                  stat.highlight ? "border-[#10b981]/30 bg-[#10b981]/5" : "border-[#27272a]"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  stat.highlight ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#27272a] text-[#a1a1aa]"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#71717a]">{stat.label}</p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Input Section */}
      <div className="mx-auto max-w-4xl space-y-6">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
            <LinkIcon className="h-7 w-7 text-[#10b981]" />
          </div>
          
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isProcessing}
            placeholder="https://www.youtube.com/watch?v=..."
            className="block w-full rounded-2xl border border-[#27272a] bg-[#18181b] py-6 pl-16 pr-48 text-lg text-white placeholder-[#71717a] transition-all duration-300 focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981] group-hover:border-[#3f3f46] disabled:opacity-50 disabled:cursor-not-allowed"
            required
          />

          <button
            type="submit"
            disabled={isProcessing || !url}
            className="absolute inset-y-2 right-2 flex items-center gap-2 rounded-xl bg-[#10b981] px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-[#059669] hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Başlatılıyor...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Klipleri Oluştur
              </>
            )}
          </button>
        </form>

        {/* Active Processing Card */}
        {isProcessing && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="rounded-2xl border border-[#10b981]/30 bg-[#18181b] p-6 shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)] relative overflow-hidden">
              {/* Background pulse effect */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[#10b981]/20">
                <div className="h-full bg-[#10b981] w-1/3 animate-[pulse_2s_ease-in-out_infinite]" />
              </div>

              <div className="flex items-center gap-5">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#10b981]/10">
                  <div className="absolute inset-0 rounded-full border-2 border-[#10b981] border-t-transparent animate-spin" />
                  <Sparkles className="h-6 w-6 text-[#10b981] animate-pulse" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-medium text-white line-clamp-1">
                    {activeVideo?.title || url || "Video Analiz Ediliyor..."}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-[#10b981]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                    </span>
                    Yapay zekâ videoyu izliyor ve en iyi anları seçiyor...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
