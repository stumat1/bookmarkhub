"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Bookmark,
} from "lucide-react";

// Re-use the Bookmark type from EditBookmarkModal
import type { Bookmark as BookmarkType } from "./EditBookmarkModal";

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (created: BookmarkType) => void;
}

interface FormErrors {
  title?: string;
  url?: string;
}

type NotificationState = {
  type: "success" | "error";
  message: string;
} | null;

interface DuplicateMatch {
  id: number;
  title: string;
  url: string;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function AddBookmarkModal({
  isOpen,
  onClose,
  onSave,
}: AddBookmarkModalProps) {
  // Form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");

  // Autocomplete data
  const [folders, setFolders] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Auto-fetch state
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [favicon, setFavicon] = useState<string | null>(null);

  // Duplicate detection
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notification, setNotification] = useState<NotificationState>(null);

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl("");
      setTitle("");
      setFolder("");
      setTags("");
      setDescription("");
      setFavicon(null);
      setDuplicateMatch(null);
      setErrors({});
      setNotification(null);
      setFetchingMetadata(false);
      setCheckingDuplicates(false);
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch folders and tags for autocomplete
  useEffect(() => {
    if (!isOpen) return;

    async function fetchMetadata() {
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
        // Silently fail
      }
    }

    fetchMetadata();
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose]
  );

  // Auto-fetch title and favicon when URL changes (on blur)
  const handleUrlBlur = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || !isValidUrl(trimmedUrl)) return;

    // Fetch metadata
    setFetchingMetadata(true);
    try {
      const res = await fetch(
        `/api/fetch-metadata?url=${encodeURIComponent(trimmedUrl)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.title && !title.trim()) {
          setTitle(data.title);
        }
        if (data.favicon) {
          setFavicon(data.favicon);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setFetchingMetadata(false);
    }

    // Check for duplicates
    setCheckingDuplicates(true);
    try {
      const res = await fetch(
        `/api/bookmarks?search=${encodeURIComponent(trimmedUrl)}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        const exactMatch = data.data?.find(
          (b: DuplicateMatch) =>
            b.url === trimmedUrl ||
            b.url === trimmedUrl.replace(/\/$/, "") ||
            b.url + "/" === trimmedUrl
        );
        setDuplicateMatch(exactMatch || null);
      }
    } catch {
      // Silently fail
    } finally {
      setCheckingDuplicates(false);
    }
  }, [url, title]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!url.trim()) {
      newErrors.url = "URL is required";
    } else if (!isValidUrl(url.trim())) {
      newErrors.url = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, url]);

  // Clear notification after delay
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setNotification(null);

    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim(),
          folder: folder.trim() || undefined,
          tags: tags.trim() || undefined,
          description: description.trim() || undefined,
          favicon: favicon || undefined,
          browser: "Manual",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create bookmark");
      }

      setNotification({
        type: "success",
        message: "Bookmark created successfully",
      });

      onSave(data);

      setTimeout(() => onClose(), 1000);
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create bookmark",
      });
    } finally {
      setIsLoading(false);
    }
  }, [url, title, folder, tags, description, favicon, validateForm, onSave, onClose]);

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2
            id="add-modal-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Add Bookmark
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-200"
                : "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateMatch && (
          <div className="mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200 animate-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">
              A bookmark with this URL already exists: &quot;{duplicateMatch.title}&quot;
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* URL */}
          <div>
            <label
              htmlFor="add-url"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={urlInputRef}
                id="add-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setDuplicateMatch(null);
                  if (errors.url)
                    setErrors((prev) => ({ ...prev, url: undefined }));
                }}
                onBlur={handleUrlBlur}
                disabled={isLoading}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.url
                    ? "border-red-500 focus:ring-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="https://example.com"
              />
              {(fetchingMetadata || checkingDuplicates) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                </div>
              )}
            </div>
            {errors.url && (
              <p className="mt-1 text-sm text-red-500">{errors.url}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="add-title"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
              {fetchingMetadata && (
                <span className="ml-2 text-xs text-zinc-400 font-normal">
                  Fetching...
                </span>
              )}
            </label>
            <div className="relative flex items-center gap-2">
              {favicon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={favicon}
                  alt=""
                  className="h-8 w-8 rounded bg-zinc-100 object-contain p-1 dark:bg-zinc-800 flex-shrink-0"
                  onError={() => setFavicon(null)}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                  {url.trim() && isValidUrl(url.trim()) ? (
                    <Globe className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <Bookmark className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
              )}
              <input
                id="add-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title)
                    setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                disabled={isLoading}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.title
                    ? "border-red-500 focus:ring-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                placeholder="Enter bookmark title"
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Folder Path */}
          <div>
            <label
              htmlFor="add-folder"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Folder Path
            </label>
            <input
              id="add-folder"
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              disabled={isLoading}
              list="add-folder-suggestions"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g., Work/Projects"
            />
            <datalist id="add-folder-suggestions">
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="add-tags"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Tags
            </label>
            <input
              id="add-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isLoading}
              list="add-tag-suggestions"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g., react, tutorial, javascript"
            />
            <datalist id="add-tag-suggestions">
              {allTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Separate tags with commas
            </p>
          </div>

          {/* Notes (Description) */}
          <div>
            <label
              htmlFor="add-notes"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="add-notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Add any notes about this bookmark..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Add Bookmark"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
