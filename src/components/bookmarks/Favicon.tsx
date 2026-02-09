"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { getFaviconUrl } from "@/src/lib/url";

export default function Favicon({ url, favicon }: { url: string; favicon: string | null }) {
  const [error, setError] = useState(false);

  const resolvedFaviconUrl = (() => {
    if (favicon && !error) return favicon;
    return getFaviconUrl(url);
  })();

  if (!resolvedFaviconUrl) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800" aria-hidden="true">
        <Bookmark className="h-4 w-4 text-zinc-400" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Favicons from arbitrary domains need onError fallback
    <img
      src={resolvedFaviconUrl}
      alt=""
      className="h-8 w-8 rounded bg-zinc-100 object-contain p-1 dark:bg-zinc-800"
      onError={() => setError(true)}
    />
  );
}
