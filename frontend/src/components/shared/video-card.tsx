/**
 * ClipWise — Video Card Component
 *
 * Displays a video summary card with status badge, metadata, and actions.
 */

import Link from "next/link";
import {
  Clock,
  Film,
  Loader2,
  CheckCircle2,
  XCircle,
  HardDrive,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Video, VideoStatus } from "@/types";

interface VideoCardProps {
  video: Video;
}

const statusConfig: Record<
  VideoStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: { label: "Pending", variant: "outline", icon: Clock },
  processing: { label: "Processing", variant: "secondary", icon: Loader2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function VideoCard({ video }: VideoCardProps) {
  const config = statusConfig[video.status];
  const StatusIcon = config.icon;

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* Gradient top accent */}
      <div className="absolute inset-x-0 top-0 h-0.5 gradient-brand opacity-0 transition-opacity group-hover:opacity-100" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate">
              {video.title || "Untitled Video"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(video.created_at)}
            </p>
          </div>
          <Badge variant={config.variant} className="ml-3 shrink-0 gap-1.5">
            <StatusIcon
              className={`h-3 w-3 ${video.status === "processing" ? "animate-spin" : ""}`}
            />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {video.duration_seconds && (
            <span className="flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5" />
              {Math.floor(video.duration_seconds / 60)}:{String(Math.floor(video.duration_seconds % 60)).padStart(2, "0")}
            </span>
          )}
          {video.file_size_bytes && (
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              {formatFileSize(video.file_size_bytes)}
            </span>
          )}
        </div>
        {video.error_message && (
          <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
            {video.error_message}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/dashboard/videos/${video.id}`} className="w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
