"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Scissors, 
  Play, 
  Download, 
  Share2, 
  Search, 
  Filter,
  Loader2,
  X,
  Clock,
  Calendar
} from "lucide-react";
import { Clip } from "@/types";
import { ClipCard } from "@/components/shared/clip-card";

export const dynamic = 'force-dynamic';

export default function ClipsGalleryPage() {
  const [activeClip, setActiveClip] = useState<any | null>(null);
  const [clips, setClips] = useState<any[]>([]);
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Kliplerim</h1>
          <p className="mt-1 text-[#71717a]">Yapay zeka tarafından oluşturulan viral klip kütüphaneniz.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
            <input 
              type="text" 
              placeholder="Klip ara..."
              className="h-10 w-[200px] rounded-xl border border-[#27272a] bg-[#18181b] pl-10 pr-4 text-sm text-white placeholder:text-[#71717a] focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981] md:w-[300px]"
            />
          </div>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-4 text-sm font-medium text-white hover:bg-[#27272a] transition-colors">
            <Filter className="h-4 w-4" />
            Filtrele
          </button>
        </div>
      </div>

      {clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#27272a] bg-[#09090b] py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18181b] text-[#71717a] mb-4">
            <Scissors className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-white">Henüz klip oluşturulmamış</h3>
          <p className="mt-2 max-w-[300px] text-[#71717a]">
            Videolarınızı yükledikten sonra yapay zeka onları burada kliplere dönüştürecektir.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#10b981] px-6 text-sm font-semibold text-zinc-950 hover:bg-[#10b981]/90 transition-all active:scale-95">
            Video Yükle
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clips.map((clip) => (
            <div key={clip.id} onClick={() => setActiveClip(clip)} className="cursor-pointer">
              <ClipCard clip={clip} />
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Overlay */}
      {activeClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <button 
            onClick={() => setActiveClip(null)}
            className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#18181b] text-white hover:bg-[#27272a] transition-colors shadow-2xl"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#27272a] bg-[#09090b] shadow-2xl">
            <div className="flex flex-1 flex-col md:flex-row">
              {/* Video Player */}
              <div className="flex-[2] bg-black flex items-center justify-center relative group">
                <video 
                  src={activeClip.videoUrl} 
                  controls 
                  autoPlay
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Sidebar Info */}
              <div className="flex-1 border-l border-[#27272a] p-8 overflow-y-auto">
                <div className="flex items-center gap-2 text-[#10b981] font-semibold text-sm mb-4">
                  <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                  AI Viral Score: {activeClip.score}
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{activeClip.title}</h2>
                <p className="text-sm text-[#71717a] mb-8">
                  Bu klip yapay zeka tarafından viral potansiyeli en yüksek olan anlar seçilerek oluşturulmuştur.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm py-3 border-b border-[#27272a]">
                    <span className="text-[#71717a]">Süre</span>
                    <span className="text-white font-medium">{activeClip.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm py-3 border-b border-[#27272a]">
                    <span className="text-[#71717a]">Oluşturulma</span>
                    <span className="text-white font-medium">{activeClip.createdAt}</span>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4">
                  <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#10b981] font-bold text-zinc-950 hover:bg-[#10b981]/90 transition-all active:scale-95 shadow-lg shadow-[#10b981]/20">
                    <Download className="h-5 w-5" />
                    İndir
                  </button>
                  <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] font-bold text-white hover:bg-[#27272a] transition-all">
                    <Share2 className="h-5 w-5" />
                    Paylaş
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
