"use client";

import { useState, useEffect } from "react";
import { Play, Download, Edit2, Filter, X, Clock, Flame, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// --- Types ---
interface Clip {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  createdAt: string;
  score: number;
}

export default function ClipsGalleryPage() {
  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchClips() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoading(false); return; }

        const { data, error } = await supabase
          .from('clips')
          .select(`
            id,
            title,
            video_url,
            start_time,
            end_time,
            score,
            created_at,
            videos (original_url)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const formatted = data.map((c: Record<string, unknown>) => {
            // Duration calculation
            const startTime = (c.start_time as number) || 0;
            const endTime = (c.end_time as number) || 0;
            const durationSecs = Math.max(0, Math.round(endTime - startTime));
            const mins = Math.floor(durationSecs / 60);
            const secs = durationSecs % 60;
            const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            // Extract thumbnail from parent video if youtube
            const videos = c.videos as { original_url?: string } | null;
            let thumbnailUrl = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=600&h=1066";
            const ytMatch = videos?.original_url?.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch && ytMatch[1]) {
              thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
            }

            return {
              id: c.id as string,
              title: c.title as string,
              thumbnailUrl,
              videoUrl: (c.video_url as string) || "",
              duration: durationStr,
              createdAt: new Date(c.created_at as string).toLocaleDateString('tr-TR'),
              score: Math.round((c.score as number) || 0),
            };
          });
          setClips(formatted);
        }
      } catch (error) {
        console.error("Klipler yüklenemedi:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchClips();
  }, [supabase]);

  // Close modal when hitting ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveClip(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#27272a] bg-[#18181b]/50 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#27272a]/50">
          <Film className="h-10 w-10 text-[#a1a1aa]" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">Henüz klip oluşturulmadı</h2>
        <p className="mt-2 mb-8 max-w-sm text-sm text-[#71717a]">
          Yapay zeka analizini tamamladığında viral klipleriniz burada premium bir galeri olarak sergilenecektir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Tüm Klipler
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Yapay zekâ tarafından oluşturulan ve render edilen viral videolarınız.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272a]">
            <Clock className="h-4 w-4 text-[#a1a1aa]" />
            Tarihe Göre
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272a]">
            <Flame className="h-4 w-4 text-[#a1a1aa]" />
            Popülerliğe Göre
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#27272a] bg-[#18181b] text-[#a1a1aa] transition-colors hover:bg-[#27272a] hover:text-white">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Masonry Grid (CSS Grid implementation for simplicity) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#27272a] bg-[#18181b] transition-all hover:border-[#3f3f46] hover:shadow-lg"
          >
            {/* 9:16 Thumbnail Container */}
            <div 
              className="relative aspect-[9/16] w-full cursor-pointer bg-zinc-900 overflow-hidden"
              onClick={() => setActiveClip(clip)}
            >
              <img
                src={clip.thumbnailUrl}
                alt={clip.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
              />
              
              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white transition-transform duration-300 group-hover:scale-110">
                  <Play className="h-6 w-6 ml-1" fill="currentColor" />
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {clip.duration}
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-1 text-xs font-bold text-zinc-950 backdrop-blur-sm shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                <Flame className="h-3 w-3" />
                {clip.score}
              </div>
            </div>

            {/* Content & Actions */}
            <div className="flex flex-col p-4">
              <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-white leading-tight">
                {clip.title}
              </h3>
              <p className="mt-2 text-xs text-[#71717a]">{clip.createdAt}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button 
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-[#10b981] py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-[#059669]"
                  onClick={(e) => { e.stopPropagation(); alert('İndiriliyor...'); }}
                >
                  <Download className="h-3.5 w-3.5" /> İndir
                </button>
                <button 
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[#3f3f46] bg-transparent py-2 text-xs font-medium text-white transition-colors hover:bg-[#27272a]"
                  onClick={(e) => { e.stopPropagation(); alert('Düzenleyiciye geçiliyor...'); }}
                >
                  <Edit2 className="h-3.5 w-3.5" /> Düzenle
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Preview Modal */}
      {activeClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[90vh] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl bg-[#09090b] border border-[#27272a] shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#27272a] p-4 bg-[#18181b]">
              <h3 className="text-sm font-semibold text-white truncate pr-4">
                {activeClip.title}
              </h3>
              <button 
                onClick={() => setActiveClip(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#27272a] text-[#a1a1aa] transition-colors hover:bg-[#3f3f46] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative w-full aspect-[9/16] bg-black">
              <video 
                src={activeClip.videoUrl} 
                controls 
                autoPlay 
                className="h-full w-full object-contain"
                poster={activeClip.thumbnailUrl}
              />
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#18181b] border-t border-[#27272a]">
              <button className="flex items-center justify-center gap-2 rounded-xl bg-[#10b981] py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#059669]">
                <Download className="h-4 w-4" /> Mp4 İndir
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-[#3f3f46] bg-transparent py-3 text-sm font-medium text-white transition-colors hover:bg-[#27272a]">
                <Edit2 className="h-4 w-4" /> Düzenle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
