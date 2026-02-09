"use client";

import { useState } from "react";
import { X, Loader2, ExternalLink, RefreshCw, ImageOff } from "lucide-react";
import { getFaviconUrl } from "@/src/lib/url";
import { FAVICON_SIZE_LARGE } from "@/src/lib/constants";
import type { BookmarkData } from "@/src/types/bookmark";

export default function PreviewModal({
  bookmark,
  onClose,
  onRefresh,
  refreshing,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const thumbnailUrl = bookmark.thumbnailUrl;
  const fallbackUrl = getFaviconUrl(bookmark.url, FAVICON_SIZE_LARGE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="preview-modal-title" className="w-full max-w-4xl rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h3 id="preview-modal-title" className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {bookmark.title}
            </h3>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              <span className="truncate">{bookmark.url}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Refresh preview"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Preview Image */}
        <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
            </div>
          )}

          {!thumbnailUrl && !imageLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
              {fallbackUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fallbackUrl}
                    alt=""
                    className="h-24 w-24 rounded-lg bg-white p-2 dark:bg-zinc-700"
                  />
                  <p className="text-center text-zinc-500 dark:text-zinc-400">
                    No preview available
                  </p>
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Generate Preview
                  </button>
                </>
              ) : (
                <>
                  <ImageOff className="h-16 w-16 text-zinc-400" aria-hidden="true" />
                  <p className="text-center text-zinc-500 dark:text-zinc-400">
                    No preview available
                  </p>
                </>
              )}
            </div>
          ) : thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageError ? fallbackUrl || "" : thumbnailUrl}
              alt={`Preview of ${bookmark.title}`}
              className={`h-full w-full ${
                imageError ? "object-contain p-8" : "object-contain"
              } ${imageLoading ? "opacity-0" : "opacity-100"}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {bookmark.thumbnailUrl ? "Preview generated via Microlink" : "Click refresh to generate preview"}
          </p>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            Visit Site
          </a>
        </div>
      </div>
    </div>
  );
}
