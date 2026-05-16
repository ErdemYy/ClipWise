"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: "success" | "processing" | "warning";
  title: string;
  message: string;
  time: string;
  link: string;
  unread: boolean;
}

export function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Build notifications from recent video statuses
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch recent videos to generate notifications
        const { data: recentVideos } = await supabase
          .from("videos")
          .select("id, title, status, original_url, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5);

        // Fetch credits for warning
        const { data: userRow } = await supabase
          .from("users")
          .select("credits_remaining")
          .eq("id", user.id)
          .single();

        const notifs: Notification[] = [];

        if (recentVideos) {
          recentVideos.forEach((v) => {
            const title = v.title || v.original_url;
            const timeDiff = getRelativeTime(v.updated_at);

            if (v.status === "completed" || v.status === "transcribed") {
              notifs.push({
                id: v.id,
                type: "success",
                title: "Videonuz Hazır!",
                message: `${title} başarıyla kliplere ayrıldı.`,
                time: timeDiff,
                link: `/dashboard/clips?video=${v.id}`,
                unread: isRecent(v.updated_at, 60),
              });
            } else if (v.status === "processing" || v.status === "pending") {
              notifs.push({
                id: v.id,
                type: "processing",
                title: "İşlemde",
                message: `Yapay zekâ "${title}" videosunu analiz ediyor.`,
                time: timeDiff,
                link: "/dashboard/videos",
                unread: true,
              });
            } else if (v.status === "failed") {
              notifs.push({
                id: v.id,
                type: "warning",
                title: "İşlem Başarısız",
                message: `${title} işlenirken bir hata oluştu.`,
                time: timeDiff,
                link: "/dashboard/videos",
                unread: isRecent(v.updated_at, 120),
              });
            }
          });
        }

        // Low credit warning
        if (userRow && userRow.credits_remaining <= 5) {
          notifs.push({
            id: "credit-warning",
            type: "warning",
            title: "Kredi Uyarısı",
            message: `Krediniz tükenmek üzere (${userRow.credits_remaining} dk kaldı). Paketlere göz atın.`,
            time: "Şimdi",
            link: "/dashboard/pricing",
            unread: true,
          });
        }

        setNotifications(notifs);
      } catch (error) {
        console.error("Bildirimler yüklenemedi:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchNotifications();
  }, [supabase]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-[#10b981]" />;
      case "processing": return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <Bell className="h-5 w-5 text-[#71717a]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#71717a] transition-colors hover:bg-[#27272a] hover:text-white"
        aria-label="Bildirimler"
      >
        <Bell className="h-[18px] w-[18px]" />
        {/* Unread Ping Dot */}
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981] ring-2 ring-[#09090b]"></span>
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[#27272a] bg-[#18181b] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="flex items-center justify-between border-b border-[#27272a] p-4">
            <h3 className="font-semibold text-white">Bildirimler</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#10b981]/10 px-2 py-0.5 text-xs font-medium text-[#10b981]">
                {unreadCount} yeni
              </span>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#10b981]" />
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-[#27272a]">
                {notifications.map((notification) => (
                  <Link 
                    key={notification.id} 
                    href={notification.link}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-start gap-3 p-4 transition-colors hover:bg-[#27272a]/50",
                      notification.unread ? "bg-[#27272a]/20" : ""
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={cn("text-sm font-medium", notification.unread ? "text-white" : "text-[#e4e4e7]")}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-[#71717a] line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-[#52525b] mt-2">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.unread && (
                      <ExternalLink className="h-3 w-3 text-[#3f3f46] shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#71717a]">
                Yeni bildiriminiz yok.
              </div>
            )}
          </div>

          {unreadCount > 0 && (
            <div className="border-t border-[#27272a] p-2">
              <button
                onClick={markAllAsRead}
                className="w-full rounded-lg px-3 py-2 text-xs font-medium text-[#a1a1aa] transition-colors hover:bg-[#27272a] hover:text-white"
              >
                Tümünü Okundu İşaretle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: Calculate relative time
function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gün önce`;
}

// Helper: Check if a date is within N minutes
function isRecent(dateStr: string, minutesAgo: number): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  return (now.getTime() - date.getTime()) < minutesAgo * 60000;
}
