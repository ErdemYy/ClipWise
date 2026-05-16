/**
 * ClipWise — useVideos Hook
 *
 * Client-side hook for fetching and managing video data
 * from the backend API.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { Video, VideoListResponse } from "@/types";

interface VideosState {
  videos: Video[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useVideos(page = 1, perPage = 20) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [state, setState] = useState<VideosState>({
    videos: [],
    total: 0,
    loading: true,
    error: null,
  });

  const fetchVideos = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ videos: [], total: 0, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const token = await getAccessToken();
      if (!token) {
        setState({ videos: [], total: 0, loading: false, error: "Not authenticated" });
        return;
      }

      const result = await api.videos.list(token, page, perPage);

      if (result.error) {
        setState({ videos: [], total: 0, loading: false, error: result.error });
        return;
      }

      const data = result.data as VideoListResponse;
      setState({
        videos: data.videos,
        total: data.total,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        videos: [],
        total: 0,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch videos",
      });
    }
  }, [isAuthenticated, getAccessToken, page, perPage]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    ...state,
    refetch: fetchVideos,
  };
}
