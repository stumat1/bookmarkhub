"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  Loader2,
  CheckCircle,
  AlertCircle,
  Folder,
  Tag,
  FileText,
  X,
} from "lucide-react";

interface FormData {
  url: string;
  title: string;
  folder: string;
  tags: string;
  notes: string;
}

function QuickAddForm() {
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<FormData>({
    url: "",
    title: "",
    folder: "",
    tags: "",
    notes: "",
  });
  const [folders, setFolders] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with URL params
  useEffect(() => {
    const url = searchParams.get("url") || "";
    const title = searchParams.get("title") || "";
    setFormData((prev) => ({
      ...prev,
      url: decodeURIComponent(url),
      title: decodeURIComponent(title),
    }));
  }, [searchParams]);

  // Fetch folders and tags for autocomplete
  const fetchMetadata = useCallback(async () => {
    try {
      const [foldersRes, tagsRes] = await Promise.all([
        fetch("/api/folders"),
        fetch("/api/tags"),
      ]);

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setFolders(
          foldersData.folders
            ?.map((f: { folder: string | null }) => f.folder)
            .filter(Boolean) || []
        );
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setAllTags(tagsData.tags?.map((t: { tag: string }) => t.tag) || []);
      }
    } catch {
      // Silently fail - these are optional
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.url.trim()) {
      setError("URL is required");
      return;
    }

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formData.url.trim(),
          title: formData.title.trim(),
          folder: formData.folder.trim() || undefined,
          description: formData.notes.trim() || undefined,
          browser: "Bookmarklet",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save bookmark");
      }

      // If tags were provided, update the bookmark with tags
      if (formData.tags.trim()) {
        await fetch(`/api/bookmarks/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tags: formData.tags.trim(),
          }),
        });
      }

      setSuccess(true);

      // Auto-close window after success (if opened as popup)
      setTimeout(() => {
        if (window.opener) {
          window.close();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bookmark");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = "/bookmarks";
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Quick Add Bookmark
          </h1>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Success State */}
      {success && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-green-200 dark:border-green-800 p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Bookmark Saved!
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            This window will close automatically...
          </p>
          <button
            onClick={handleClose}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Close now
          </button>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          {/* URL Field */}
          <div className="mb-4">
            <label
              htmlFor="url"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              URL *
            </label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://example.com"
              required
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Title Field */}
          <div className="mb-4">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Page title"
              required
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Folder Field */}
          <div className="mb-4">
            <label
              htmlFor="folder"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              <Folder className="w-4 h-4" />
              Folder
            </label>
            <input
              type="text"
              id="folder"
              name="folder"
              value={formData.folder}
              onChange={handleChange}
              list="folder-suggestions"
              placeholder="e.g., Work, Personal"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="folder-suggestions">
              {folders.map((folder) => (
                <option key={folder} value={folder} />
              ))}
            </datalist>
          </div>

          {/* Tags Field */}
          <div className="mb-4">
            <label
              htmlFor="tags"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              list="tag-suggestions"
              placeholder="e.g., important, reference"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="tag-suggestions">
              {allTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Notes Field */}
          <div className="mb-6">
            <label
              htmlFor="notes"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              <FileText className="w-4 h-4" />
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                Save Bookmark
              </>
            )}
          </button>
        </form>
      )}
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  );
}

export default function QuickAddPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md mx-auto">
        <Suspense fallback={<LoadingFallback />}>
          <QuickAddForm />
        </Suspense>
      </div>
    </main>
  );
}
