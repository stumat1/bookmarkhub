"use client";

import { useState } from "react";
import { X, Loader2, Tags } from "lucide-react";

export default function BulkTagModal({
  count,
  onClose,
  onAddTags,
  loading,
}: {
  count: number;
  onClose: () => void;
  onAddTags: (tags: string) => void;
  loading: boolean;
}) {
  const [tags, setTags] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="bulk-tag-modal-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Tags className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 id="bulk-tag-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Add Tags to {count} Bookmark{count !== 1 ? "s" : ""}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor="bulk-tag-input" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tags (comma-separated)
          </label>
          <input
            id="bulk-tag-input"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., important, work, reference"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            These tags will be added to existing tags on each bookmark
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onAddTags(tags)}
            disabled={loading || !tags.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Tags className="h-4 w-4" />
            )}
            Add Tags
          </button>
        </div>
      </div>
    </div>
  );
}
