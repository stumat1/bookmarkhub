"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { isValidUrl } from "@/src/lib/url";
import { MODAL_FOCUS_DELAY_MS, NOTIFICATION_DURATION_MS, MODAL_CLOSE_DELAY_MS } from "@/src/lib/constants";

// Types
export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string | null;
  favicon: string | null;
  folder: string | null;
  tags: string | null;
  browser: string | null;
  dateAdded: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isReadLater?: boolean;
  isRead?: boolean;
  readingNotes?: string | null;
}

interface EditBookmarkModalProps {
  bookmark: Bookmark;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Bookmark) => void;
}

interface FormErrors {
  title?: string;
  url?: string;
}

type NotificationState = {
  type: "success" | "error";
  message: string;
} | null;

// Validate API response matches Bookmark structure
function isValidBookmarkResponse(data: unknown): data is Bookmark {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === "number" &&
    typeof obj.url === "string" &&
    typeof obj.title === "string" &&
    (obj.description === null || typeof obj.description === "string") &&
    (obj.favicon === null || typeof obj.favicon === "string") &&
    (obj.folder === null || typeof obj.folder === "string") &&
    (obj.tags === null || typeof obj.tags === "string") &&
    (obj.browser === null || typeof obj.browser === "string")
  );
}

export default function EditBookmarkModal({
  bookmark,
  isOpen,
  onClose,
  onSave,
}: EditBookmarkModalProps) {
  // Form state
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [folder, setFolder] = useState(bookmark.folder || "");
  const [tags, setTags] = useState(bookmark.tags || "");
  const [description, setDescription] = useState(bookmark.description || "");
  const [readingNotes, setReadingNotes] = useState(bookmark.readingNotes || "");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notification, setNotification] = useState<NotificationState>(null);

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset form when bookmark changes
  useEffect(() => {
    setTitle(bookmark.title);
    setUrl(bookmark.url);
    setFolder(bookmark.folder || "");
    setTags(bookmark.tags || "");
    setDescription(bookmark.description || "");
    setReadingNotes(bookmark.readingNotes || "");
    setErrors({});
    setNotification(null);
  }, [bookmark]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), MODAL_FOCUS_DELAY_MS);
    }
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
      const timer = setTimeout(() => setNotification(null), NOTIFICATION_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const response = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          folder: folder.trim() || null,
          tags: tags.trim() || null,
          description: description.trim() || null,
          readingNotes: readingNotes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update bookmark");
      }

      // Validate response structure before passing to callback
      if (!isValidBookmarkResponse(data)) {
        throw new Error("Invalid response from server");
      }

      setNotification({
        type: "success",
        message: "Bookmark updated successfully",
      });

      // Call onSave callback with validated bookmark
      onSave(data);

      setTimeout(() => onClose(), MODAL_CLOSE_DELAY_MS);
    } catch (error) {
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update bookmark",
      });
    } finally {
      setIsLoading(false);
    }
  }, [bookmark.id, title, url, folder, tags, description, readingNotes, validateForm, onSave, onClose]);

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  if (!isOpen) {
    return null;
  }

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
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Edit Bookmark
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div
            role="alert"
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-200"
                : "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="edit-title"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              disabled={isLoading}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.title
                  ? "border-red-500 focus:ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
              placeholder="Enter bookmark title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="edit-url"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              URL <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors((prev) => ({ ...prev, url: undefined }));
              }}
              disabled={isLoading}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.url
                  ? "border-red-500 focus:ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
              placeholder="https://example.com"
            />
            {errors.url && (
              <p className="mt-1 text-sm text-red-500">{errors.url}</p>
            )}
          </div>

          {/* Folder Path */}
          <div>
            <label
              htmlFor="edit-folder"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Folder Path
            </label>
            <input
              id="edit-folder"
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g., Work/Projects"
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="edit-tags"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Tags
            </label>
            <input
              id="edit-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g., react, tutorial, javascript"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Separate tags with commas
            </p>
          </div>

          {/* Notes (Description) */}
          <div>
            <label
              htmlFor="edit-notes"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="edit-notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Add any notes about this bookmark..."
            />
          </div>

          {/* Reading Progress Notes (show when bookmark is in reading list) */}
          {bookmark.isReadLater && (
            <div>
              <label
                htmlFor="edit-reading-notes"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Reading Progress
              </label>
              <textarea
                id="edit-reading-notes"
                value={readingNotes}
                onChange={(e) => setReadingNotes(e.target.value)}
                disabled={isLoading}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                placeholder="Track your reading progress, e.g., 'Read chapters 1-3, need to finish section 4'"
              />
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Track your progress on items in your reading list
              </p>
            </div>
          )}
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
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
