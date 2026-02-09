"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  ExternalLink,
  FolderOpen,
  Tag,
  ChevronRight,
  CheckCircle,
  Copy,
  Merge,
} from "lucide-react";
import Favicon from "./Favicon";
import { fetchWithRetry } from "@/src/lib/fetch-with-retry";
import type { BookmarkData, DuplicateGroup, DuplicatesResponse } from "@/src/types/bookmark";

export default function DuplicatesModal({
  onClose,
  onMergeComplete,
}: {
  onClose: () => void;
  onMergeComplete: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicatesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));

  // Fetch duplicates on mount
  useEffect(() => {
    const fetchDuplicates = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithRetry("/api/duplicates");
        if (!res.ok) throw new Error("Failed to fetch duplicates");
        const data = await res.json();
        setDuplicates(data);
        // Expand first group by default if there are any
        if (data.groups.length > 0) {
          setExpandedGroups(new Set([0]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load duplicates");
      } finally {
        setLoading(false);
      }
    };
    fetchDuplicates();
  }, []);

  const toggleGroup = (index: number) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleMerge = async (group: DuplicateGroup, keepIndex: number, mergeTags: boolean) => {
    const keepBookmark = group.bookmarks[keepIndex];
    const deleteIds = group.bookmarks
      .filter((_, i) => i !== keepIndex)
      .map((b) => b.id);

    setMerging(keepBookmark.id);
    try {
      const res = await fetch("/api/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepId: keepBookmark.id,
          deleteIds,
          mergeTags,
        }),
      });

      if (!res.ok) throw new Error("Failed to merge duplicates");

      // Refresh duplicates
      const refreshRes = await fetchWithRetry("/api/duplicates");
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setDuplicates(data);
      }
      onMergeComplete();
    } catch (err) {
      console.error("Error merging duplicates:", err);
    } finally {
      setMerging(null);
    }
  };

  const getTypeLabel = (type: DuplicateGroup["type"]) => {
    switch (type) {
      case "exact_url":
        return { label: "Exact URL", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
      case "similar_url":
        return { label: "Similar URL", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
      case "similar_title":
        return { label: "Similar Title", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="duplicates-modal-title" className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 id="duplicates-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Duplicate Management
              </h3>
              {duplicates && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {duplicates.totalDuplicates} duplicate{duplicates.totalDuplicates !== 1 ? "s" : ""} in {duplicates.totalGroups} group{duplicates.totalGroups !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : !duplicates || duplicates.groups.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 w-fit rounded-full bg-green-100 p-4 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                No duplicates found
              </h4>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Your bookmark collection is clean!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.groups.map((group, groupIndex) => {
                const typeInfo = getTypeLabel(group.type);
                const isExpanded = expandedGroups.has(groupIndex);

                return (
                  <div
                    key={groupIndex}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(groupIndex)}
                      className="flex w-full items-center justify-between p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {group.bookmarks.length} bookmarks
                        </span>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>

                    {/* Group Content */}
                    {isExpanded && (
                      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                          {group.reason}
                        </p>
                        <div className="space-y-2">
                          {group.bookmarks.map((bookmark, bookmarkIndex) => (
                            <div
                              key={bookmark.id}
                              className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                            >
                              <Favicon url={bookmark.url} favicon={bookmark.favicon} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                  {bookmark.title}
                                </p>
                                <a
                                  href={bookmark.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  <span className="truncate">{bookmark.url}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                  {bookmark.folder && (
                                    <span className="flex items-center gap-1">
                                      <FolderOpen className="h-3 w-3" />
                                      {bookmark.folder}
                                    </span>
                                  )}
                                  {bookmark.tags && (
                                    <span className="flex items-center gap-1">
                                      <Tag className="h-3 w-3" />
                                      {bookmark.tags}
                                    </span>
                                  )}
                                  <span>
                                    Added: {new Date(bookmark.createdAt).toLocaleDateString()}
                                  </span>
                                  {bookmarkIndex === 0 && (
                                    <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      Newest
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleMerge(group, bookmarkIndex, true)}
                                  disabled={merging !== null}
                                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                  aria-label="Keep this bookmark and merge tags from others"
                                >
                                  {merging === bookmark.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Merge className="h-3 w-3" />
                                  )}
                                  Keep
                                </button>
                                <button
                                  onClick={() => handleMerge(group, bookmarkIndex, false)}
                                  disabled={merging !== null}
                                  className="flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  aria-label="Keep this bookmark without merging tags"
                                >
                                  Keep Only
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-100 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
