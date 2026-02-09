"use client";

import { useState } from "react";
import { X, Loader2, FolderInput } from "lucide-react";

export default function BulkMoveModal({
  count,
  folders,
  onClose,
  onMove,
  loading,
}: {
  count: number;
  folders: string[];
  onClose: () => void;
  onMove: (folder: string) => void;
  loading: boolean;
}) {
  const [selectedFolder, setSelectedFolder] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [useNewFolder, setUseNewFolder] = useState(false);

  const handleMove = () => {
    const folder = useNewFolder ? newFolder.trim() : selectedFolder;
    onMove(folder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="bulk-move-modal-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <FolderInput className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 id="bulk-move-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Move {count} Bookmark{count !== 1 ? "s" : ""}
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

        <div className="space-y-4">
          <div>
            <label htmlFor="bulk-move-folder" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select existing folder
            </label>
            <select
              id="bulk-move-folder"
              value={selectedFolder}
              onChange={(e) => {
                setSelectedFolder(e.target.value);
                setUseNewFolder(false);
              }}
              disabled={useNewFolder}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">No folder (root)</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-500">or</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          </div>

          <div>
            <label htmlFor="bulk-move-new-folder" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Create new folder
            </label>
            <input
              id="bulk-move-new-folder"
              type="text"
              value={newFolder}
              onChange={(e) => {
                setNewFolder(e.target.value);
                setUseNewFolder(e.target.value.length > 0);
              }}
              placeholder="e.g., Work/Projects"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
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
            onClick={handleMove}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderInput className="h-4 w-4" />
            )}
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
