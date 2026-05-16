"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Video as VideoIcon, Plus, Eye, RefreshCcw, Trash2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// --- Types ---
type VideoStatus = "completed" | "processing" | "failed";
interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  clipCount: number;
  status: string;
  uploadDate: string;
}

export default function VideosPage() {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchVideos() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoading(false); return; }

        const { data, error } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            original_url,
            status,
            created_at,
            clips (count)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const formatted: VideoItem[] = data.map((v: Record<string, unknown>) => {
            // Extract Youtube ID for thumbnail if possible
            const originalUrl = v.original_url as string | null;
            let thumbnailUrl = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=300&h=169";
            const ytMatch = originalUrl?.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch && ytMatch[1]) {
              thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
            }

            const clips = v.clips as Array<{ count: number }> | undefined;

            return {
              id: v.id as string,
              title: (v.title as string) || originalUrl || "İsimsiz Video",
              thumbnailUrl,
              clipCount: clips?.[0]?.count ?? 0,
              status: v.status as string,
              uploadDate: new Date(v.created_at as string).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
            };
          });
          setVideos(formatted);
        }
      } catch (error) {
        console.error("Videolar yüklenemedi:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVideos();
  }, [supabase]);

  const toggleDropdown = (id: string) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#27272a] bg-[#18181b]/50 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#27272a]/50">
          <FolderOpen className="h-10 w-10 text-[#a1a1aa]" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">Henüz video yüklemediniz</h2>
        <p className="mt-2 mb-8 max-w-sm text-sm text-[#71717a]">
          Proje başlatmak için ilk YouTube linkinizi yapıştırın ve yapay zekanın sihrini izleyin.
        </p>
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl bg-[#10b981] px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#059669]"
        >
          <Plus className="h-4 w-4" />
          Şimdi Başla
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Videolarım
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Yüklediğiniz tüm uzun videolar ve analiz durumları.
          </p>
        </div>
        <Link 
          href="/dashboard"
          className="hidden sm:flex items-center gap-2 rounded-xl bg-[#10b981] px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#059669]"
        >
          <Plus className="h-4 w-4" />
          Yeni Video İşle
        </Link>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-2xl border border-[#27272a] bg-[#18181b] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#a1a1aa]">
            <thead className="bg-[#09090b]/50 text-xs uppercase text-[#71717a] border-b border-[#27272a]">
              <tr>
                <th className="px-6 py-4 font-medium">Thumbnail & Video Adı</th>
                <th className="px-6 py-4 font-medium">Yükleme Tarihi</th>
                <th className="px-6 py-4 font-medium">Klip Sayısı</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {videos.map((video) => (
                <tr key={video.id} className="transition-colors hover:bg-[#27272a]/20">
                  {/* Thumbnail & Title */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-black relative">
                        <img 
                          src={video.thumbnailUrl} 
                          alt="" 
                          className="h-full w-full object-cover opacity-80" 
                        />
                        {video.status === "processing" && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-white line-clamp-2 max-w-[300px]">
                        {video.title}
                      </span>
                    </div>
                  </td>
                  
                  {/* Date */}
                  <td className="whitespace-nowrap px-6 py-4">
                    {video.uploadDate}
                  </td>
                  
                  {/* Clip Count */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#27272a] px-2.5 py-1 text-xs font-semibold text-white">
                      <VideoIcon className="h-3 w-3 text-[#a1a1aa]" />
                      {video.clipCount}
                    </span>
                  </td>
                  
                  {/* Status Badges */}
                  <td className="whitespace-nowrap px-6 py-4">
                    {(video.status === "completed" || video.status === "transcribed") && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Tamamlandı
                      </span>
                    )}
                    {(video.status === "processing" || video.status === "pending") && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500 border border-blue-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        İşleniyor
                      </span>
                    )}
                    {video.status === "failed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 border border-red-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                        Başarısız
                      </span>
                    )}
                  </td>
                  
                  {/* Actions Dropdown */}
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button 
                        onClick={() => toggleDropdown(video.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717a] transition-colors hover:bg-[#27272a] hover:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openDropdownId === video.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-[#27272a] bg-[#18181b] p-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <Link href={`/dashboard/clips?video=${video.id}`} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a]">
                              <Eye className="h-4 w-4" /> Klipleri Gör
                            </Link>
                            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#e4e4e7] hover:bg-[#27272a]">
                              <RefreshCcw className="h-4 w-4" /> Yeniden İşle
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4" /> Sil
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
