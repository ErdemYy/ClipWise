/**
 * ClipAI — Upload Zone Component
 *
 * Hero upload section with YouTube link input and AI processing button.
 * Features emerald accent focus ring and glowing CTA button.
 */

"use client";

import { useState } from "react";
import { Scissors, Link as LinkIcon, Sparkles, ArrowRight } from "lucide-react";

export function UploadZone() {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    // TODO: dispatch to API
    console.log("Processing:", url);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#27272a] bg-[#18181b] p-6 sm:p-8">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#10b981]/5 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#10b981]/3 blur-[60px]" />

      {/* Header */}
      <div className="relative mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-emerald glow-emerald">
          <Scissors className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Yeni Video Dönüştür
          </h2>
          <p className="text-sm text-[#71717a]">
            YouTube video linkini yapıştır, yapay zekâ klipleri otomatik oluştursun.
          </p>
        </div>
      </div>

      {/* Input Row */}
      <form onSubmit={handleSubmit} className="relative flex flex-col gap-3 sm:flex-row sm:gap-0">
        {/* URL Input */}
        <div className="relative flex-1">
          <LinkIcon className={`absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-200 ${
            isFocused ? "text-[#10b981]" : "text-[#71717a]"
          }`} />
          <input
            type="url"
            placeholder="YouTube Video Linki Yapıştırın"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`h-12 w-full rounded-xl bg-[#09090b] pl-11 pr-4 text-sm text-white placeholder-[#71717a] outline-none transition-all duration-200 sm:rounded-r-none sm:border-r-0 ${
              isFocused
                ? "border border-[#10b981] ring-1 ring-[#10b981]/30"
                : "border border-[#27272a] hover:border-[#3f3f46]"
            }`}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!url.trim()}
          className="group flex h-12 items-center justify-center gap-2.5 rounded-xl bg-[#059669] px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#10b981] disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-l-none glow-emerald-strong"
        >
          <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
          <span className="whitespace-nowrap">Yapay Zekâ ile Kırp</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </form>

      {/* Supported platforms hint */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#71717a]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-[#10b981]" />
          YouTube
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-[#10b981]" />
          Vimeo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-[#10b981]" />
          Direkt MP4 Linki
        </span>
      </div>
    </div>
  );
}
