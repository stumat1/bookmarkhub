"use client";

import { Trash2, Loader2 } from "lucide-react";

export default function BulkDeleteModal({
  count,
  onClose,
  onDelete,
  loading,
}: {
  count: number;
  onClose: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="bulk-delete-modal-title" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 id="bulk-delete-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Delete {count} Bookmark{count !== 1 ? "s" : ""}
          </h3>
        </div>

        <p className="mb-4 text-zinc-600 dark:text-zinc-400">
          Are you sure you want to delete {count} selected bookmark{count !== 1 ? "s" : ""}? This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
}
