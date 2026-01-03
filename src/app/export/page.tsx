"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Folder,
  Search,
  X,
  FileDown,
  BookOpen,
} from "lucide-react";

interface Bookmark {
  id: number;
  url: string;
  title: string;
  folder: string | null;
  browser: string | null;
}

type ExportMode = "all" | "selected";

export default function ExportPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exportMode, setExportMode] = useState<ExportMode>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ fileName: string } | null>(null);
  const [totalBookmarks, setTotalBookmarks] = useState(0);

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all bookmarks for selection (no pagination limit)
      const res = await fetch(`/api/bookmarks?limit=10000`);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      const data = await res.json();
      setBookmarks(data.data);
      setTotalBookmarks(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.url.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBookmark = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredBookmarks.map((b) => b.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      setSuccess(null);

      const body =
        exportMode === "all"
          ? { ids: "all" }
          : { ids: Array.from(selectedIds) };

      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = res.headers.get("Content-Disposition");
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch?.[1] || "bookmarks-export.html";

      // Create blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess({ fileName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const canExport =
    exportMode === "all"
      ? totalBookmarks > 0
      : selectedIds.size > 0;

  const exportCount =
    exportMode === "all" ? totalBookmarks : selectedIds.size;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Export Bookmarks
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Export your bookmarks as an HTML file compatible with all major browsers
          </p>
        </div>

        {/* Export Mode Selection */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Export Options
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setExportMode("all")}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors text-left ${
                exportMode === "all"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe
                  className={`w-5 h-5 ${
                    exportMode === "all"
                      ? "text-blue-600"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      exportMode === "all"
                        ? "text-blue-900 dark:text-blue-100"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    Export All
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {totalBookmarks} bookmark{totalBookmarks !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setExportMode("selected")}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors text-left ${
                exportMode === "selected"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileDown
                  className={`w-5 h-5 ${
                    exportMode === "selected"
                      ? "text-blue-600"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      exportMode === "selected"
                        ? "text-blue-900 dark:text-blue-100"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    Export Selected
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedIds.size} selected
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Bookmark Selection (only when "selected" mode) */}
        {exportMode === "selected" && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Select Bookmarks
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Select all ({filteredBookmarks.length})
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-zinc-600 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bookmark List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {filteredBookmarks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                    <Globe className="w-8 h-8 mb-2" />
                    <p className="text-sm">No bookmarks found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {filteredBookmarks.map((bookmark) => (
                      <li key={bookmark.id}>
                        <label className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(bookmark.id)}
                            onChange={() => toggleBookmark(bookmark.id)}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {bookmark.title}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {bookmark.url}
                            </p>
                          </div>
                          {bookmark.folder && (
                            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                              <Folder className="w-3 h-3" />
                              <span className="hidden sm:inline truncate max-w-[100px]">
                                {bookmark.folder}
                              </span>
                            </span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {selectedIds.size > 0 && (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {selectedIds.size} bookmark{selectedIds.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        {/* Export Button */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <button
            onClick={handleExport}
            disabled={!canExport || exporting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export {exportCount} Bookmark{exportCount !== 1 ? "s" : ""}
              </>
            )}
          </button>

          {/* Progress/Status Messages */}
          {error && (
            <div className="mt-4 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Export successful!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Downloaded: {success.fileName}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Import Instructions */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              How to Import to Your Browser
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Google Chrome
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1">
                <li>Open Chrome and go to <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">chrome://bookmarks</code></li>
                <li>Click the three-dot menu (⋮) in the top-right corner</li>
                <li>Select &quot;Import bookmarks&quot;</li>
                <li>Choose the exported HTML file</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Mozilla Firefox
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1">
                <li>Open Firefox and press <kbd className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">Ctrl+Shift+O</kbd> (or <kbd className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">Cmd+Shift+O</kbd> on Mac)</li>
                <li>Click &quot;Import and Backup&quot; in the toolbar</li>
                <li>Select &quot;Import Bookmarks from HTML...&quot;</li>
                <li>Choose the exported HTML file</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Microsoft Edge
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1">
                <li>Open Edge and go to <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">edge://favorites</code></li>
                <li>Click the three-dot menu (⋯) in the top-right corner</li>
                <li>Select &quot;Import favorites&quot;</li>
                <li>Choose &quot;Favorites or bookmarks HTML file&quot; and select the file</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Safari
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1">
                <li>Open Safari and go to <strong>File</strong> → <strong>Import From</strong></li>
                <li>Select &quot;Bookmarks HTML File...&quot;</li>
                <li>Choose the exported HTML file</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
