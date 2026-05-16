/**
 * ClipWise — Shared TypeScript Type Definitions
 */

// =====================================================
// User
// =====================================================

export type SubscriptionStatus = "free" | "starter" | "pro" | "enterprise" | "cancelled";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: SubscriptionStatus;
  credits_remaining: number;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// =====================================================
// Video
// =====================================================

export type VideoStatus = "pending" | "processing" | "completed" | "failed";

export interface Video {
  id: string;
  user_id: string;
  title: string | null;
  original_url: string;
  processed_url: string | null;
  status: VideoStatus;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  per_page: number;
}

// =====================================================
// Clip
// =====================================================

export interface Clip {
  id: string;
  video_id: string;
  title: string;
  start_time: number;
  end_time: number;
  transcript: string | null;
  video_url: string | null;
  score: number | null;
  created_at: string;
}

export interface ClipListResponse {
  clips: Clip[];
  total: number;
  video_id: string;
}

// =====================================================
// API
// =====================================================

export interface ApiError {
  success: false;
  message: string;
  detail?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
