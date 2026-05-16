/**
 * ClipWise — Clip Card Component
 *
 * Displays an AI-generated clip with score, timestamps, and transcript preview.
 */

import { Clock, Sparkles, FileText, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Clip } from "@/types";

interface ClipCardProps {
  clip: Clip;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getScoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-orange-500";
}

export function ClipCard({ clip }: ClipCardProps) {
  const duration = clip.end_time - clip.start_time;

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute inset-x-0 top-0 h-0.5 gradient-brand opacity-0 transition-opacity group-hover:opacity-100" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold truncate">{clip.title}</h4>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(clip.start_time)} — {formatTime(clip.end_time)}
              </span>
              <span className="text-border">•</span>
              <span>{duration.toFixed(1)}s</span>
            </div>
          </div>

          {clip.score !== null && (
            <div className="flex flex-col items-center shrink-0">
              <div className={`text-lg font-bold ${getScoreColor(clip.score)}`}>
                {clip.score.toFixed(0)}
              </div>
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Sparkles className="h-2.5 w-2.5" />
                score
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {clip.transcript && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {clip.transcript}
            </p>
          </div>
        )}

        {clip.video_url && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Play className="h-3.5 w-3.5" />
            Watch Clip
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
