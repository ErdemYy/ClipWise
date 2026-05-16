/**
 * ClipAI — Video Card Component
 *
 * Individual video card for the dashboard grid.
 * Shows thumbnail, title, processing status, and clip count.
 */

import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Scissors,
  Play,
  MoreHorizontal,
} from "lucide-react";

export type VideoStatus = "processing" | "completed" | "pending" | "failed";

export interface DashboardVideo {
  id: string;
  title: string;
  thumbnail: string;
  status: VideoStatus;
  clipCount: number;
  duration: string;
  createdAt: string;
}

interface VideoCardProps {
  video: DashboardVideo;
}

const statusConfig: Record<
  VideoStatus,
  { label: string; icon: React.ElementType; dotColor: string; textColor: string }
> = {
  processing: {
    label: "İşleniyor",
    icon: Loader2,
    dotColor: "bg-[#10b981]",
    textColor: "text-[#10b981]",
  },
  completed: {
    label: "Tamamlandı",
    icon: CheckCircle2,
    dotColor: "bg-[#10b981]",
    textColor: "text-[#10b981]",
  },
  pending: {
    label: "Bekliyor",
    icon: Clock,
    dotColor: "bg-[#f59e0b]",
    textColor: "text-[#f59e0b]",
  },
  failed: {
    label: "Hata",
    icon: XCircle,
    dotColor: "bg-[#ef4444]",
    textColor: "text-[#ef4444]",
  },
};

export function VideoCard({ video }: VideoCardProps) {
  const config = statusConfig[video.status];
  const StatusIcon = config.icon;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[#27272a] bg-[#18181b] transition-all duration-300 hover:border-[#3f3f46] hover:shadow-lg hover:shadow-black/20">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#09090b]">
        {/* Placeholder thumbnail with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#27272a] to-[#18181b]">
          <div className="flex h-full items-center justify-center">
            <Play className="h-10 w-10 text-[#3f3f46] transition-all duration-300 group-hover:scale-110 group-hover:text-[#71717a]" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {video.duration}
        </div>

        {/* Processing overlay */}
        {video.status === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full bg-[#09090b]/80 px-4 py-2 backdrop-blur-md">
              <Loader2 className="h-4 w-4 animate-spin text-[#10b981]" />
              <span className="text-xs font-medium text-[#10b981]">İşleniyor...</span>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title + More */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white">
            {video.title}
          </h3>
          <button className="shrink-0 rounded-md p-1 text-[#71717a] opacity-0 transition-all hover:bg-[#27272a] hover:text-white group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Status + Clips */}
        <div className="flex items-center justify-between">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`flex h-2 w-2 rounded-full ${config.dotColor} ${
              video.status === "processing" ? "pulse-dot" : ""
            }`} />
            <div className="flex items-center gap-1.5">
              <StatusIcon
                className={`h-3.5 w-3.5 ${config.textColor} ${
                  video.status === "processing" ? "animate-spin" : ""
                }`}
              />
              <span className={`text-xs font-medium ${config.textColor}`}>
                {config.label}
              </span>
            </div>
          </div>

          {/* Clip count */}
          {video.clipCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-[#10b981]/10 px-2 py-1">
              <Scissors className="h-3 w-3 text-[#10b981]" />
              <span className="text-xs font-semibold text-[#10b981]">
                {video.clipCount} Klip
              </span>
            </div>
          )}
        </div>

        {/* Date */}
        <p className="mt-2.5 text-[11px] text-[#71717a]">{video.createdAt}</p>
      </div>
    </div>
  );
}
