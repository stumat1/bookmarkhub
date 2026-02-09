"use client";

import { useState } from "react";
import { Loader2, Eye, ImageOff } from "lucide-react";
import { getFaviconUrl } from "@/src/lib/url";
import { FAVICON_SIZE_LARGE } from "@/src/lib/constants";
import type { BookmarkData } from "@/src/types/bookmark";

export default function ThumbnailPreview({
  bookmark,
  onOpenModal,
}: {
  bookmark: BookmarkData;
  onOpenModal: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const thumbnailUrl = bookmark.thumbnailUrl;
  const fallbackUrl = getFaviconUrl(bookmark.url, FAVICON_SIZE_LARGE);

  if (!thumbnailUrl && !fallbackUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800" role="img" aria-label="No preview available">
        <ImageOff className="h-8 w-8 text-zinc-400" aria-hidden="true" />
      </div>
    );
  }

  return (
    <button
      onClick={onOpenModal}
      aria-label={`Preview ${bookmark.title}`}
      className="group relative h-full w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
    >
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageError || !thumbnailUrl ? fallbackUrl || "" : thumbnailUrl}
        alt={`Preview of ${bookmark.title}`}
        className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${
          imageLoading ? "opacity-0" : "opacity-100"
        } ${imageError || !thumbnailUrl ? "object-contain p-4" : ""}`}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
        <Eye className="h-6 w-6 text-white" aria-hidden="true" />
      </div>
    </button>
  );
}
