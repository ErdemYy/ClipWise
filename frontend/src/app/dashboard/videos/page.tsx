"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Video, 
  Clock, 
  Calendar, 
  ExternalLink,
  Search,
  Filter,
  Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { VideoItem } from "@/types";
import { useAuth } from "@/hooks/use-auth";

export const dynamic = 'force-dynamic';

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const supabase = createClient();
  const { refreshUser } = useAuth();
  const videosRef = useRef<VideoItem[]>([]);

  // Keep ref in sync to prevent effect re-subscriptions
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  useEffect(() => {
    let active = true;
    let userId = "";

    async function fetchVideos(showLoading = true) {
      try {
        if (showLoading) setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
          if (active) setIsLoading(false); 
          return; 
        }
        userId = user.id;

        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && active) {
          const oldList = videosRef.current;
          setVideos(data as VideoItem[]);

          // Check if any video has transitioned to 'completed' from an active state,
          // which indicates we should refresh the user credits in the global context!
          const hadActiveJob = oldList.some(v => v.status === "processing" || v.status === "transcribed" || v.status === "pending");
          const nowAllCompleted = data.every(v => v.status === "completed" || v.status === "failed");
          
          if (hadActiveJob && nowAllCompleted) {
            console.log("A video task just finished. Refreshing credits...");
            refreshUser();
          }
        }
      } catch (error) {
        console.error("Videolar yüklenemedi:", error);
      } finally {
        if (active && showLoading) setIsLoading(false);
      }
    }

    // Initial load
    fetchVideos(true);

    // 1. Supabase Realtime Listener for videos table updates
    const channel = supabase
      .channel('videos-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos' },
        (payload) => {
          console.log('Realtime update detected in videos:', payload);
          fetchVideos(false); // Silent reload
        }
      )
      .subscribe();

    // 2. Smart Conditional Fallback Polling (Every 4 seconds)
    // Runs only if there's at least one active job in our state
    const interval = setInterval(() => {
      const activeJobs = videosRef.current.some(v => 
        v.status === "processing" || 
        v.status === "transcribed" || 
        v.status === "pending"
      );
      if (activeJobs) {
        console.log("Active rendering/transcribing jobs found. Polling database silently...");
        fetchVideos(false);
      }
    }, 4000);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, refreshUser]);

  const filteredVideos = videos.filter(v => 
    v.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.original_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Status Badge Component
  const StatusBadge = ({ status }: { status: string }) => {
    const formatted = status.toUpperCase();
    if (status === "completed") {
      return (
        <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 backdrop-blur-sm">
          TAMAMLANDI
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="rounded-md bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-500/20 backdrop-blur-sm flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          HATA
        </span>
      );
    }
    return (
      <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/20 backdrop-blur-sm flex items-center gap-1.5 animate-pulse">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        İŞLENİYOR
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Videolarım</h1>
          <p className="mt-1 text-[#71717a]">Yüklediğiniz ve işlenen tüm videoların listesi.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
            <input 
              type="text" 
              placeholder="Video ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[200px] rounded-xl border border-[#27272a] bg-[#18181b] pl-10 pr-4 text-sm text-white placeholder:text-[#71717a] focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981] md:w-[300px]"
            />
          </div>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-4 text-sm font-medium text-white hover:bg-[#27272a] transition-colors">
            <Filter className="h-4 w-4" />
            Filtrele
          </button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#27272a] bg-[#09090b] py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18181b] text-[#71717a] mb-4">
            <Video className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-white">Henüz video yok</h3>
          <p className="mt-2 max-w-[300px] text-[#71717a]">
            Dashboard üzerinden ilk videonuzu ekleyerek başlayabilirsiniz.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#10b981] px-6 text-sm font-semibold text-zinc-950 hover:bg-[#10b981]/90 transition-all active:scale-95">
            Video Ekle
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVideos.map((video) => (
            <Link 
              key={video.id} 
              href={`/dashboard/videos/${video.id}`}
              className="group relative overflow-hidden rounded-2xl border border-[#27272a] bg-[#18181b] transition-all hover:border-[#10b981]/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            >
              {/* Thumbnail Placeholder */}
              <div className="aspect-video w-full bg-[#09090b] relative flex items-center justify-center overflow-hidden border-b border-[#27272a]">
                {video.original_url.includes('youtube.com') || video.original_url.includes('youtu.be') ? (
                  <img 
                    src={`https://img.youtube.com/vi/${video.original_url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]}/maxresdefault.jpg`}
                    alt={video.title || "Video"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <Video className="h-10 w-10 text-[#27272a]" />
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-[#10b981] flex items-center justify-center text-zinc-950 scale-75 group-hover:scale-100 transition-transform">
                    <ExternalLink className="h-6 w-6" />
                  </div>
                </div>

                <div className="absolute bottom-2 right-2">
                  <StatusBadge status={video.status} />
                </div>
              </div>

              <div className="p-4">
                <h3 className="line-clamp-1 font-semibold text-[#e4e4e7] group-hover:text-[#10b981] transition-colors">
                  {video.title || "İsimsiz Video"}
                </h3>
                
                <div className="mt-3 flex items-center justify-between text-xs text-[#71717a]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{Math.floor((video.duration_seconds || 0) / 60)}:{(video.duration_seconds || 0) % 60}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(video.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
