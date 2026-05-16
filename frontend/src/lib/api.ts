/**
 * ClipWise — Backend API Client
 *
 * Type-safe wrapper around fetch for communicating with the FastAPI backend.
 * Handles authentication headers, error parsing, and response typing.
 */

import type { ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Make an authenticated request to the backend API.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.detail || errorBody.message || `HTTP ${response.status}`;
      return { data: null, error: message };
    }

    const data = await response.json();
    return { data: data as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { data: null, error: message };
  }
}

// =====================================================
// Auth endpoints
// =====================================================

export const api = {
  auth: {
    register: (email: string, password: string, fullName?: string) =>
      request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName }),
      }),

    login: (email: string, password: string) =>
      request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    me: (token: string) => request("/api/auth/me", {}, token),
  },

  // =====================================================
  // Video endpoints
  // =====================================================
  videos: {
    upload: (token: string, originalUrl: string, title?: string) =>
      request(
        "/api/videos/upload",
        {
          method: "POST",
          body: JSON.stringify({ original_url: originalUrl, title }),
        },
        token
      ),

    list: (token: string, page = 1, perPage = 20) =>
      request(`/api/videos?page=${page}&per_page=${perPage}`, {}, token),

    get: (token: string, videoId: string) =>
      request(`/api/videos/${videoId}`, {}, token),
  },

  // =====================================================
  // Clip endpoints
  // =====================================================
  clips: {
    listByVideo: (token: string, videoId: string) =>
      request(`/api/clips/video/${videoId}`, {}, token),

    get: (token: string, clipId: string) =>
      request(`/api/clips/${clipId}/detail`, {}, token),
  },

  // =====================================================
  // System
  // =====================================================
  health: () => request("/api/health"),
};
