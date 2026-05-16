"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClipCard } from "@/components/shared/clip-card";
import type { VideoStatus } from "@/types";

const statusLabel: Record<VideoStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;

  // Placeholder — in production, fetch video + clips from API
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/videos">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Video Detail</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{videoId}</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <h3 className="text-lg font-semibold">Loading video details...</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Supabase credentials to see real data here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
