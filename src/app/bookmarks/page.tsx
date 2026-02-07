"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Trash2,
  Bookmark,
  FolderOpen,
  Globe,
  Chrome,
  Loader2,
  X,
  Check,
  ArrowLeft,
  Tag,
  Link2,
  LinkIcon,
  Clock,
  ArrowRight,
  CircleHelp,
  CheckCircle,
  XCircle,
  Square,
  CheckSquare,
  MinusSquare,
  Download,
  FolderInput,
  Tags,
  ArrowUpDown,
  Star,
  History,
  HelpCircle,
  Image as ImageIcon,
  RefreshCw,
  Eye,
  ImageOff,
  BookOpen,
  BookCheck,
  Copy,
  Merge,
  Keyboard,
  Plus,
} from "lucide-react";
import AddBookmarkModal from "@/src/components/AddBookmarkModal";

// Types
type LinkStatus = "valid" | "broken" | "timeout" | "redirect" | "unchecked";

interface BookmarkData {
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
  linkStatus: LinkStatus | null;
  lastChecked: Date | null;
  isFavorite: boolean;
  thumbnailUrl: string | null;
  isReadLater: boolean;
  isRead: boolean;
  readingNotes: string | null;
}

interface PaginatedResponse {
  data: BookmarkData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RecentImport {
  id: number;
  title: string;
  url: string;
  browser: string | null;
  createdAt: string;
}

interface StatsResponse {
  totalBookmarks: number;
  bookmarksByBrowser: { browser: string | null; count: number }[];
  recentImports: RecentImport[];
}

// Browser icon component
function BrowserIcon({ browser }: { browser: string | null }) {
  const lowerBrowser = browser?.toLowerCase() ?? "";
  if (lowerBrowser.includes("chrome")) {
    return <Chrome className="h-4 w-4 text-yellow-500" />;
  }
  if (lowerBrowser.includes("firefox")) {
    return (
      <svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    );
  }
  if (lowerBrowser.includes("safari")) {
    return (
      <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    );
  }
  if (lowerBrowser.includes("edge")) {
    return (
      <svg className="h-4 w-4 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    );
  }
  return <Globe className="h-4 w-4 text-zinc-400" />;
}

// Favicon component with fallback
function Favicon({ url, favicon }: { url: string; favicon: string | null }) {
  const [error, setError] = useState(false);

  const getFaviconUrl = () => {
    if (favicon && !error) return favicon;
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = getFaviconUrl();

  if (!faviconUrl) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
        <Bookmark className="h-4 w-4 text-zinc-400" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Favicons from arbitrary domains need onError fallback
    <img
      src={faviconUrl}
      alt=""
      className="h-8 w-8 rounded bg-zinc-100 object-contain p-1 dark:bg-zinc-800"
      onError={() => setError(true)}
    />
  );
}

// Link Status Badge component
function LinkStatusBadge({ status }: { status: LinkStatus | null }) {
  if (!status || status === "unchecked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" title="Not checked">
        <CircleHelp className="h-3 w-3" />
        Unchecked
      </span>
    );
  }

  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400" title="Link is valid">
        <CheckCircle className="h-3 w-3" />
        Valid
      </span>
    );
  }

  if (status === "broken") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400" title="Link is broken">
        <XCircle className="h-3 w-3" />
        Broken
      </span>
    );
  }

  if (status === "timeout") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title="Request timed out">
        <Clock className="h-3 w-3" />
        Timeout
      </span>
    );
  }

  if (status === "redirect") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title="URL redirects">
        <ArrowRight className="h-3 w-3" />
        Redirect
      </span>
    );
  }

  return null;
}

// Edit Modal Component
function EditModal({
  bookmark,
  onClose,
  onSave,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
  onSave: (updated: BookmarkData) => void;
}) {
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [folder, setFolder] = useState(bookmark.folder ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) {
      setError("Title and URL are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          folder: folder.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update bookmark");
      }

      const updated = await res.json();
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Edit Bookmark
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Folder
            </label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g., Work/Projects"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteModal({
  bookmark,
  onClose,
  onDelete,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete bookmark");
      }

      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Delete Bookmark
          </h3>
        </div>

        <p className="mb-2 text-zinc-600 dark:text-zinc-400">
          Are you sure you want to delete this bookmark?
        </p>
        <p className="mb-4 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {bookmark.title}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Bulk Delete Modal
function BulkDeleteModal({
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
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
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

// Bulk Move Modal
function BulkMoveModal({
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
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <FolderInput className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Move {count} Bookmark{count !== 1 ? "s" : ""}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select existing folder
            </label>
            <select
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
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Create new folder
            </label>
            <input
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

// Search History Helper Functions
const SEARCH_HISTORY_KEY = "bookmark-search-history";
const MAX_SEARCH_HISTORY = 10;

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const history = getSearchHistory();
    // Remove if already exists (will be re-added at top)
    const filtered = history.filter((h) => h !== query);
    // Add to beginning
    const updated = [query, ...filtered].slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Text Highlighting Component
function HighlightedText({
  text,
  searchTerms,
  className = "",
}: {
  text: string;
  searchTerms: string[];
  className?: string;
}) {
  if (!text || searchTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create a regex pattern from search terms, escaping special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = searchTerms
    .filter((term) => term.length > 0)
    .map(escapeRegex)
    .join("|");

  if (!pattern) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

// Extract search terms for highlighting (excludes field prefixes)
function extractSearchTerms(searchQuery: string): string[] {
  if (!searchQuery) return [];

  const terms: string[] = [];
  // Remove field:value patterns and collect values and remaining terms
  const fieldPattern = /(\w+):(?:"([^"]+)"|(\S+))/g;
  let lastIndex = 0;
  let match;

  while ((match = fieldPattern.exec(searchQuery)) !== null) {
    // Add text before this match
    const textBefore = searchQuery.slice(lastIndex, match.index).trim();
    if (textBefore) {
      terms.push(...textBefore.split(/\s+/).filter(Boolean));
    }
    lastIndex = match.index + match[0].length;

    // Add the value from field:value (useful for highlighting)
    const value = match[2] || match[3];
    if (value) {
      terms.push(value);
    }
  }

  // Add remaining text
  const textAfter = searchQuery.slice(lastIndex).trim();
  if (textAfter) {
    terms.push(...textAfter.split(/\s+/).filter(Boolean));
  }

  return terms;
}

// Search Help Modal
function SearchHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Search Syntax Help
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            Use special prefixes to search within specific fields:
          </p>

          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">title:react</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Search only in bookmark titles
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">url:github</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Search only in URLs
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">folder:Work</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Filter by folder name
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">tag:important</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Filter by tag
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">notes:todo</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Search only in notes/description
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
            <p className="font-medium text-blue-900 dark:text-blue-100">Examples:</p>
            <ul className="mt-2 space-y-1.5 text-blue-700 dark:text-blue-300">
              <li><code className="font-mono">folder:Work tag:urgent react</code></li>
              <li><code className="font-mono">title:&quot;API Documentation&quot;</code></li>
              <li><code className="font-mono">url:docs.github</code></li>
            </ul>
          </div>

          <p className="text-zinc-500 dark:text-zinc-400">
            Use quotes for multi-word values: <code className="font-mono">folder:&quot;My Projects&quot;</code>
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// Bulk Tag Modal
function BulkTagModal({
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
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Tags className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Add Tags to {count} Bookmark{count !== 1 ? "s" : ""}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tags (comma-separated)
          </label>
          <input
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

// Thumbnail Preview Component (shows on hover)
function ThumbnailPreview({
  bookmark,
  onOpenModal,
}: {
  bookmark: BookmarkData;
  onOpenModal: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Generate fallback favicon URL
  const getFallbackUrl = () => {
    try {
      const domain = new URL(bookmark.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      return null;
    }
  };

  const thumbnailUrl = bookmark.thumbnailUrl;
  const fallbackUrl = getFallbackUrl();

  if (!thumbnailUrl && !fallbackUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
        <ImageOff className="h-8 w-8 text-zinc-400" />
      </div>
    );
  }

  return (
    <button
      onClick={onOpenModal}
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
        <Eye className="h-6 w-6 text-white" />
      </div>
    </button>
  );
}

// Preview Modal Component
function PreviewModal({
  bookmark,
  onClose,
  onRefresh,
  refreshing,
}: {
  bookmark: BookmarkData;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Generate fallback favicon URL
  const getFallbackUrl = () => {
    try {
      const domain = new URL(bookmark.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      return null;
    }
  };

  const thumbnailUrl = bookmark.thumbnailUrl;
  const fallbackUrl = getFallbackUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {bookmark.title}
            </h3>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              <span className="truncate">{bookmark.url}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Refresh preview"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Image */}
        <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
            </div>
          )}

          {!thumbnailUrl && !imageLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
              {fallbackUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fallbackUrl}
                    alt=""
                    className="h-24 w-24 rounded-lg bg-white p-2 dark:bg-zinc-700"
                  />
                  <p className="text-center text-zinc-500 dark:text-zinc-400">
                    No preview available
                  </p>
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Generate Preview
                  </button>
                </>
              ) : (
                <>
                  <ImageOff className="h-16 w-16 text-zinc-400" />
                  <p className="text-center text-zinc-500 dark:text-zinc-400">
                    No preview available
                  </p>
                </>
              )}
            </div>
          ) : thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageError ? fallbackUrl || "" : thumbnailUrl}
              alt={`Preview of ${bookmark.title}`}
              className={`h-full w-full ${
                imageError ? "object-contain p-8" : "object-contain"
              } ${imageLoading ? "opacity-0" : "opacity-100"}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {bookmark.thumbnailUrl ? "Preview generated via Microlink" : "Click refresh to generate preview"}
          </p>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            Visit Site
          </a>
        </div>
      </div>
    </div>
  );
}

// Duplicate types
interface DuplicateGroup {
  type: "exact_url" | "similar_url" | "similar_title";
  reason: string;
  bookmarks: BookmarkData[];
}

interface DuplicatesResponse {
  groups: DuplicateGroup[];
  totalDuplicates: number;
  totalGroups: number;
}

// Duplicates Modal Component
function DuplicatesModal({
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
        const res = await fetch("/api/duplicates");
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
      const refreshRes = await fetch("/api/duplicates");
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
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
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
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
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
                                  title="Keep this bookmark and merge tags from others"
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
                                  title="Keep this bookmark without merging tags"
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

// Keyboard Shortcuts Help Modal
function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ["j"], description: "Move down in bookmark list" },
    { keys: ["k"], description: "Move up in bookmark list" },
    { keys: ["o", "Enter"], description: "Open selected bookmark" },
    { keys: ["e"], description: "Edit selected bookmark" },
    { keys: ["d"], description: "Delete selected bookmark" },
    { keys: ["f"], description: "Toggle favorite on selected bookmark" },
    { keys: ["/"], description: "Focus search input" },
    { keys: ["n"], description: "Create new bookmark" },
    { keys: ["Esc"], description: "Close modal / clear selection" },
    { keys: ["?"], description: "Show this help" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={key} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-xs text-zinc-400">/</span>
                    )}
                    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function BookmarksPageContent() {
  const searchParams = useSearchParams();

  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Filters (initialized from URL params)
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [browserFilter, setBrowserFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [linkStatusFilter, setLinkStatusFilter] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState(() => searchParams.get("favorite") === "true");
  const [readLaterFilter, setReadLaterFilter] = useState(() => searchParams.get("readLater") === "true");
  const [readFilter, setReadFilter] = useState<"" | "unread" | "read">("");

  // Sorting
  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bookmarks-sort-by") || "createdAt";
    }
    return "createdAt";
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("bookmarks-sort-order") as "asc" | "desc") || "desc";
    }
    return "desc";
  });

  // Filter options
  const [browsers, setBrowsers] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);

  // Modals
  const [editingBookmark, setEditingBookmark] = useState<BookmarkData | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkData | null>(null);

  // Link checking
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [checkProgress, setCheckProgress] = useState<{ checked: number; total: number } | null>(null);
  const [linkHealth, setLinkHealth] = useState<{
    total: number;
    checked: number;
    valid: number;
    broken: number;
    timeout: number;
    redirect: number;
    healthPercentage: number;
  } | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Bulk action modals
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);

  // Search history and help
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  // Preview modal
  const [previewBookmark, setPreviewBookmark] = useState<BookmarkData | null>(null);
  const [refreshingPreview, setRefreshingPreview] = useState(false);

  // Duplicates modal
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

  // Add bookmark modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Keyboard shortcuts
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bookmarkListRef = useRef<HTMLDivElement>(null);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Get search terms for highlighting
  const searchTerms = extractSearchTerms(search);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch browsers from stats
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const stats: StatsResponse = await statsRes.json();
          const browserList = stats.bookmarksByBrowser
            .map((b) => b.browser)
            .filter((b): b is string => b !== null);
          setBrowsers(browserList);
        }

        // Fetch all unique folders from dedicated endpoint
        const foldersRes = await fetch("/api/folders");
        if (foldersRes.ok) {
          const data: { folders: { folder: string | null; count: number }[] } = await foldersRes.json();
          const folderList = data.folders
            .map((f) => f.folder)
            .filter((f): f is string => f !== null)
            .sort();
          setFolders(folderList);
        }

        // Fetch all unique tags
        const tagsRes = await fetch("/api/tags");
        if (tagsRes.ok) {
          const data: { tags: { tag: string; count: number }[] } = await tagsRes.json();
          setTags(data.tags);
        }
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch link health statistics
  const fetchLinkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/link-check");
      if (res.ok) {
        const data = await res.json();
        setLinkHealth(data);
      }
    } catch (err) {
      console.error("Failed to fetch link health:", err);
    }
  }, []);

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      if (browserFilter) params.set("browser", browserFilter);
      if (folderFilter) params.set("folder", folderFilter);
      if (tagFilter) params.set("tag", tagFilter);
      if (linkStatusFilter) params.set("linkStatus", linkStatusFilter);
      if (favoriteFilter) params.set("favorite", "true");
      if (readLaterFilter) params.set("readLater", "true");
      if (readFilter === "unread") params.set("read", "false");
      if (readFilter === "read") params.set("read", "true");
      params.set("sort", sortBy);
      params.set("order", sortOrder);

      const res = await fetch(`/api/bookmarks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");

      const data: PaginatedResponse = await res.json();
      // Sort favorites to the top of each page (unless already filtering by favorites)
      const sortedData = favoriteFilter
        ? data.data
        : [...data.data].sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
          });
      setBookmarks(sortedData);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  }, [page, search, browserFilter, folderFilter, tagFilter, linkStatusFilter, favoriteFilter, readLaterFilter, readFilter, sortBy, sortOrder]);

  // Check links for current page or all bookmarks
  const checkLinks = async (ids: number[] | "all") => {
    setCheckingLinks(true);
    setCheckProgress({ checked: 0, total: ids === "all" ? total : ids.length });

    try {
      const res = await fetch("/api/link-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, batchSize: 5 }),
      });

      if (!res.ok) throw new Error("Failed to check links");

      const data = await res.json();
      setCheckProgress({ checked: data.checked, total: data.total });

      // Refresh bookmarks and link health after checking
      await Promise.all([fetchBookmarks(), fetchLinkHealth()]);
    } catch (err) {
      console.error("Error checking links:", err);
    } finally {
      setCheckingLinks(false);
      setCheckProgress(null);
    }
  };

  // Delete broken links in bulk
  const deleteBrokenLinks = async () => {
    if (!confirm(`Are you sure you want to delete all ${linkHealth?.broken ?? 0} broken links?`)) {
      return;
    }

    try {
      // Fetch all broken bookmarks
      const res = await fetch("/api/bookmarks?linkStatus=broken&limit=1000");
      if (!res.ok) throw new Error("Failed to fetch broken bookmarks");

      const data: PaginatedResponse = await res.json();

      // Delete each broken bookmark
      for (const bookmark of data.data) {
        await fetch(`/api/bookmarks/${bookmark.id}`, { method: "DELETE" });
      }

      // Refresh
      await Promise.all([fetchBookmarks(), fetchLinkHealth()]);
    } catch (err) {
      console.error("Error deleting broken links:", err);
    }
  };

  // Selection helpers
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(bookmarks.map((b) => b.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isAllSelected = bookmarks.length > 0 && bookmarks.every((b) => selectedIds.has(b.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  // Bulk delete
  const bulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      }
      clearSelection();
      await Promise.all([fetchBookmarks(), fetchLinkHealth()]);
    } catch (err) {
      console.error("Error deleting bookmarks:", err);
    } finally {
      setBulkActionLoading(false);
      setShowBulkDeleteModal(false);
    }
  };

  // Bulk move to folder
  const bulkMoveToFolder = async (folder: string) => {
    setBulkActionLoading(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/bookmarks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: folder || null }),
        });
      }
      clearSelection();
      await fetchBookmarks();
    } catch (err) {
      console.error("Error moving bookmarks:", err);
    } finally {
      setBulkActionLoading(false);
      setShowBulkMoveModal(false);
    }
  };

  // Bulk add tags
  const bulkAddTags = async (newTags: string) => {
    setBulkActionLoading(true);
    try {
      for (const id of selectedIds) {
        const bookmark = bookmarks.find((b) => b.id === id);
        if (bookmark) {
          const existingTags = bookmark.tags ? bookmark.tags.split(",").map((t) => t.trim()) : [];
          const tagsToAdd = newTags.split(",").map((t) => t.trim()).filter(Boolean);
          const combinedTags = [...new Set([...existingTags, ...tagsToAdd])].join(", ");

          await fetch(`/api/bookmarks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: combinedTags }),
          });
        }
      }
      clearSelection();
      await fetchBookmarks();
    } catch (err) {
      console.error("Error adding tags:", err);
    } finally {
      setBulkActionLoading(false);
      setShowBulkTagModal(false);
    }
  };

  // Bulk export
  const bulkExport = async () => {
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!res.ok) throw new Error("Failed to export bookmarks");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookmarks-export-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      clearSelection();
    } catch (err) {
      console.error("Error exporting bookmarks:", err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (bookmark: BookmarkData) => {
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !bookmark.isFavorite }),
      });

      if (!res.ok) throw new Error("Failed to update favorite");

      const updated = await res.json();
      setBookmarks((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  // Toggle read later status
  const toggleReadLater = async (bookmark: BookmarkData) => {
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReadLater: !bookmark.isReadLater }),
      });

      if (!res.ok) throw new Error("Failed to update read later status");

      const updated = await res.json();
      setBookmarks((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
    } catch (err) {
      console.error("Error toggling read later:", err);
    }
  };

  // Toggle read status
  const toggleRead = async (bookmark: BookmarkData) => {
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !bookmark.isRead }),
      });

      if (!res.ok) throw new Error("Failed to update read status");

      const updated = await res.json();
      setBookmarks((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
    } catch (err) {
      console.error("Error toggling read status:", err);
    }
  };

  // Refresh preview for a bookmark
  const refreshPreview = async (bookmark: BookmarkData) => {
    setRefreshingPreview(true);
    try {
      const res = await fetch("/api/thumbnails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [bookmark.id] }),
      });

      if (!res.ok) throw new Error("Failed to generate preview");

      const data = await res.json();
      if (data.results && data.results[0]) {
        const updatedThumbnailUrl = data.results[0].thumbnailUrl;
        // Update the bookmark in the list
        setBookmarks((prev) =>
          prev.map((b) =>
            b.id === bookmark.id ? { ...b, thumbnailUrl: updatedThumbnailUrl } : b
          )
        );
        // Update the preview modal bookmark if open
        if (previewBookmark?.id === bookmark.id) {
          setPreviewBookmark({ ...bookmark, thumbnailUrl: updatedThumbnailUrl });
        }
      }
    } catch (err) {
      console.error("Error refreshing preview:", err);
    } finally {
      setRefreshingPreview(false);
    }
  };

  // Clear selection when page changes
  useEffect(() => {
    clearSelection();
  }, [page, search, browserFilter, folderFilter, tagFilter, linkStatusFilter, favoriteFilter, readLaterFilter, readFilter]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Fetch link health on mount and when bookmarks change
  useEffect(() => {
    fetchLinkHealth();
  }, [fetchLinkHealth]);

  // Reset selected index when bookmarks change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [bookmarks]);

  // Keyboard shortcuts
  useEffect(() => {
    const isAnyModalOpen = () =>
      !!editingBookmark ||
      !!deletingBookmark ||
      !!previewBookmark ||
      showBulkDeleteModal ||
      showBulkMoveModal ||
      showBulkTagModal ||
      showSearchHelp ||
      showDuplicatesModal ||
      showShortcutsHelp ||
      showAddModal;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Escape always works: close modals, clear selection, blur search
      if (e.key === "Escape") {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
          return;
        }
        if (editingBookmark) {
          setEditingBookmark(null);
          return;
        }
        if (deletingBookmark) {
          setDeletingBookmark(null);
          return;
        }
        if (previewBookmark) {
          setPreviewBookmark(null);
          return;
        }
        if (showBulkDeleteModal) {
          setShowBulkDeleteModal(false);
          return;
        }
        if (showBulkMoveModal) {
          setShowBulkMoveModal(false);
          return;
        }
        if (showBulkTagModal) {
          setShowBulkTagModal(false);
          return;
        }
        if (showSearchHelp) {
          setShowSearchHelp(false);
          return;
        }
        if (showDuplicatesModal) {
          setShowDuplicatesModal(false);
          return;
        }
        if (showAddModal) {
          setShowAddModal(false);
          return;
        }
        if (isInputFocused) {
          (target as HTMLInputElement).blur();
          return;
        }
        if (selectedIndex >= 0) {
          setSelectedIndex(-1);
          return;
        }
        return;
      }

      // Don't handle shortcuts if a modal is open or input is focused
      if (isAnyModalOpen() || isInputFocused) return;

      switch (e.key) {
        case "j": {
          // Move down
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < bookmarks.length - 1 ? prev + 1 : prev
          );
          break;
        }
        case "k": {
          // Move up
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        }
        case "o":
        case "Enter": {
          // Open selected bookmark
          if (selectedIndex >= 0 && selectedIndex < bookmarks.length) {
            e.preventDefault();
            const bookmark = bookmarks[selectedIndex];
            window.open(bookmark.url, "_blank", "noopener,noreferrer");
          }
          break;
        }
        case "e": {
          // Edit selected bookmark
          if (selectedIndex >= 0 && selectedIndex < bookmarks.length) {
            e.preventDefault();
            setEditingBookmark(bookmarks[selectedIndex]);
          }
          break;
        }
        case "d": {
          // Delete selected bookmark (with confirmation modal)
          if (selectedIndex >= 0 && selectedIndex < bookmarks.length) {
            e.preventDefault();
            setDeletingBookmark(bookmarks[selectedIndex]);
          }
          break;
        }
        case "f": {
          // Toggle favorite
          if (selectedIndex >= 0 && selectedIndex < bookmarks.length) {
            e.preventDefault();
            toggleFavorite(bookmarks[selectedIndex]);
          }
          break;
        }
        case "/": {
          // Focus search
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        }
        case "n": {
          // New bookmark - open add modal
          e.preventDefault();
          setShowAddModal(true);
          break;
        }
        case "?": {
          // Show shortcuts help
          e.preventDefault();
          setShowShortcutsHelp(true);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    bookmarks,
    selectedIndex,
    editingBookmark,
    deletingBookmark,
    previewBookmark,
    showBulkDeleteModal,
    showBulkMoveModal,
    showBulkTagModal,
    showSearchHelp,
    showDuplicatesModal,
    showShortcutsHelp,
    showAddModal,
    toggleFavorite,
  ]);

  // Scroll selected bookmark into view
  useEffect(() => {
    if (selectedIndex >= 0 && bookmarkListRef.current) {
      // +1 to skip the "Select all" header row
      const items = bookmarkListRef.current.children;
      const targetItem = items[selectedIndex + 1] as HTMLElement | undefined;
      if (targetItem) {
        targetItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    setSearch(query);
    setPage(1);
    setShowSearchHistory(false);
    if (query) {
      addToSearchHistory(query);
      setSearchHistory(getSearchHistory());
    }
  };

  // Apply search from history
  const applyHistorySearch = (query: string) => {
    setSearchInput(query);
    setSearch(query);
    setPage(1);
    setShowSearchHistory(false);
  };

  // Clear all search history
  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setBrowserFilter("");
    setFolderFilter("");
    setTagFilter("");
    setLinkStatusFilter("");
    setFavoriteFilter(false);
    setReadLaterFilter(false);
    setReadFilter("");
    setPage(1);
  };

  const hasFilters = search || browserFilter || folderFilter || tagFilter || linkStatusFilter || favoriteFilter || readLaterFilter || readFilter;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  All Bookmarks
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {total.toLocaleString()} bookmark{total !== 1 ? "s" : ""} total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Bookmark
              </button>
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="h-4 w-4" />
                <kbd className="hidden sm:inline rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">?</kbd>
              </button>
              <button
                onClick={() => setShowDuplicatesModal(true)}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Copy className="h-4 w-4" />
                Find Duplicates
              </button>
              <button
                onClick={() => checkLinks(bookmarks.map((b) => b.id))}
                disabled={checkingLinks || bookmarks.length === 0}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {checkingLinks ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {checkingLinks ? `Checking ${checkProgress?.checked ?? 0}/${checkProgress?.total ?? 0}` : "Check Page"}
              </button>
              <button
                onClick={() => checkLinks("all")}
                disabled={checkingLinks || total === 0}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkingLinks ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                Check All
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Link Health Bar */}
        {linkHealth && linkHealth.checked > 0 && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Link Health
                </span>
              </div>
              <span className={`text-sm font-bold ${
                linkHealth.healthPercentage >= 80 ? "text-green-600 dark:text-green-400" :
                linkHealth.healthPercentage >= 50 ? "text-amber-600 dark:text-amber-400" :
                "text-red-600 dark:text-red-400"
              }`}>
                {linkHealth.healthPercentage}% healthy
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {linkHealth.valid > 0 && (
                <div
                  className="bg-green-500"
                  style={{ width: `${(linkHealth.valid / linkHealth.total) * 100}%` }}
                  title={`${linkHealth.valid} valid`}
                />
              )}
              {linkHealth.redirect > 0 && (
                <div
                  className="bg-blue-500"
                  style={{ width: `${(linkHealth.redirect / linkHealth.total) * 100}%` }}
                  title={`${linkHealth.redirect} redirects`}
                />
              )}
              {linkHealth.timeout > 0 && (
                <div
                  className="bg-amber-500"
                  style={{ width: `${(linkHealth.timeout / linkHealth.total) * 100}%` }}
                  title={`${linkHealth.timeout} timeouts`}
                />
              )}
              {linkHealth.broken > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${(linkHealth.broken / linkHealth.total) * 100}%` }}
                  title={`${linkHealth.broken} broken`}
                />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" /> {linkHealth.valid} valid
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> {linkHealth.redirect} redirects
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> {linkHealth.timeout} timeouts
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> {linkHealth.broken} broken
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" /> {linkHealth.total - linkHealth.checked} unchecked
              </span>
              {linkHealth.broken > 0 && (
                <button
                  onClick={deleteBrokenLinks}
                  className="ml-auto flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete {linkHealth.broken} broken
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => searchHistory.length > 0 && setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                placeholder="Search bookmarks... (try folder:Work or tag:important)"
                className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-10 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    if (search) {
                      setSearch("");
                      setPage(1);
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Search History Dropdown */}
              {showSearchHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <History className="h-3 w-3" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {searchHistory.map((query, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          onClick={() => applyHistorySearch(query)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <History className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="truncate">{query}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSearchHelp(true)}
              className="rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="Search syntax help"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Search
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>

            {/* Browser Filter */}
            <select
              value={browserFilter}
              onChange={(e) => {
                setBrowserFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">All Browsers</option>
              {browsers.map((browser) => (
                <option key={browser} value={browser}>
                  {browser}
                </option>
              ))}
            </select>

            {/* Folder Filter */}
            <select
              value={folderFilter}
              onChange={(e) => {
                setFolderFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">All Folders</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>

            {/* Tag Filter */}
            <select
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.tag} value={t.tag}>
                  {t.tag} ({t.count})
                </option>
              ))}
            </select>

            {/* Link Status Filter */}
            <select
              value={linkStatusFilter}
              onChange={(e) => {
                setLinkStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">All Link Status</option>
              <option value="valid">Valid</option>
              <option value="broken">Broken</option>
              <option value="timeout">Timeout</option>
              <option value="redirect">Redirect</option>
              <option value="unchecked">Unchecked</option>
            </select>

            {/* Favorites Filter */}
            <button
              onClick={() => {
                setFavoriteFilter(!favoriteFilter);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                favoriteFilter
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <Star className={`h-4 w-4 ${favoriteFilter ? "fill-amber-500" : ""}`} />
              Favorites
            </button>

            {/* Reading List Filter */}
            <button
              onClick={() => {
                setReadLaterFilter(!readLaterFilter);
                if (!readLaterFilter) {
                  setReadFilter("");
                }
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                readLaterFilter
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <BookOpen className={`h-4 w-4 ${readLaterFilter ? "fill-blue-500" : ""}`} />
              Reading List
            </button>

            {/* Read Status Filter (only show when reading list is active) */}
            {readLaterFilter && (
              <select
                value={readFilter}
                onChange={(e) => {
                  setReadFilter(e.target.value as "" | "unread" | "read");
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">All Items</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            )}

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="h-4 w-4 text-zinc-400" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [string, "asc" | "desc"];
                  setSortBy(field);
                  setSortOrder(order);
                  localStorage.setItem("bookmarks-sort-by", field);
                  localStorage.setItem("bookmarks-sort-order", order);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="createdAt-desc">Date Added (Newest)</option>
                <option value="createdAt-asc">Date Added (Oldest)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="url-asc">URL (A-Z)</option>
                <option value="url-desc">URL (Z-A)</option>
                <option value="updatedAt-desc">Last Modified (Newest)</option>
                <option value="updatedAt-asc">Last Modified (Oldest)</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-blue-300 dark:bg-blue-700" />
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={bulkActionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={() => setShowBulkMoveModal(true)}
              disabled={bulkActionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <FolderInput className="h-4 w-4" />
              Move to Folder
            </button>
            <button
              onClick={() => setShowBulkTagModal(true)}
              disabled={bulkActionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Tags className="h-4 w-4" />
              Add Tags
            </button>
            <button
              onClick={bulkExport}
              disabled={bulkActionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {bulkActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export
            </button>
            <button
              onClick={async () => {
                setBulkActionLoading(true);
                try {
                  const res = await fetch("/api/thumbnails", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: Array.from(selectedIds) }),
                  });
                  if (res.ok) {
                    await fetchBookmarks();
                  }
                } catch (err) {
                  console.error("Error generating previews:", err);
                } finally {
                  setBulkActionLoading(false);
                  clearSelection();
                }
              }}
              disabled={bulkActionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {bulkActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Previews
            </button>
            <button
              onClick={clearSelection}
              className="ml-auto flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        )}

        {/* Bookmarks List */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchBookmarks}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Try again
              </button>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 w-fit rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                <Bookmark className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {hasFilters ? "No matching bookmarks" : "No bookmarks yet"}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {hasFilters
                  ? "Try adjusting your search or filters"
                  : "Import your first bookmark file to get started"}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div ref={bookmarkListRef} className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {/* Select All Header */}
              <div className="flex items-center gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-800/50">
                <button
                  onClick={() => (isAllSelected ? clearSelection() : selectAll())}
                  className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {isAllSelected ? (
                    <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : isSomeSelected ? (
                    <MinusSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                  <span>{isAllSelected ? "Deselect all" : "Select all on this page"}</span>
                </button>
              </div>

              {bookmarks.map((bookmark, index) => (
                <div
                  key={bookmark.id}
                  className={`flex items-center gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    selectedIds.has(bookmark.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  } ${
                    selectedIndex === index
                      ? "ring-2 ring-inset ring-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
                      : ""
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelection(bookmark.id)}
                    className="flex-shrink-0"
                  >
                    {selectedIds.has(bookmark.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                    )}
                  </button>

                  {/* Favicon */}
                  <Favicon url={bookmark.url} favicon={bookmark.favicon} />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2"
                    >
                      <HighlightedText
                        text={bookmark.title || "Untitled"}
                        searchTerms={searchTerms}
                        className="truncate font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400"
                      />
                      <ExternalLink className="h-4 w-4 flex-shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                    <HighlightedText
                      text={bookmark.url}
                      searchTerms={searchTerms}
                      className="block truncate text-sm text-zinc-500 dark:text-zinc-400"
                    />
                    {/* Description/Notes - show when searching or if exists */}
                    {bookmark.description && (
                      <HighlightedText
                        text={bookmark.description}
                        searchTerms={searchTerms}
                        className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2"
                      />
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                      {bookmark.folder && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          <HighlightedText text={bookmark.folder} searchTerms={searchTerms} />
                        </span>
                      )}
                      {bookmark.browser && (
                        <span className="flex items-center gap-1">
                          <BrowserIcon browser={bookmark.browser} />
                          {bookmark.browser}
                        </span>
                      )}
                      <LinkStatusBadge status={bookmark.linkStatus} />
                    </div>
                    {bookmark.tags && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {bookmark.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                          <button
                            key={tag}
                            onClick={(e) => {
                              e.preventDefault();
                              setTagFilter(tag);
                              setPage(1);
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Preview (on hover) */}
                  <div className="hidden sm:block h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <ThumbnailPreview
                      bookmark={bookmark}
                      onOpenModal={() => setPreviewBookmark(bookmark)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewBookmark(bookmark)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(bookmark)}
                      className={`rounded-lg p-2 transition-colors ${
                        bookmark.isFavorite
                          ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
                          : "text-zinc-400 hover:bg-zinc-100 hover:text-amber-500 dark:hover:bg-zinc-800"
                      }`}
                      title={bookmark.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className={`h-4 w-4 ${bookmark.isFavorite ? "fill-amber-500" : ""}`} />
                    </button>
                    <button
                      onClick={() => toggleReadLater(bookmark)}
                      className={`rounded-lg p-2 transition-colors ${
                        bookmark.isReadLater
                          ? "text-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
                          : "text-zinc-400 hover:bg-zinc-100 hover:text-blue-500 dark:hover:bg-zinc-800"
                      }`}
                      title={bookmark.isReadLater ? "Remove from reading list" : "Add to reading list"}
                    >
                      <BookOpen className={`h-4 w-4 ${bookmark.isReadLater ? "fill-blue-500" : ""}`} />
                    </button>
                    {bookmark.isReadLater && (
                      <button
                        onClick={() => toggleRead(bookmark)}
                        className={`rounded-lg p-2 transition-colors ${
                          bookmark.isRead
                            ? "text-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-green-500 dark:hover:bg-zinc-800"
                        }`}
                        title={bookmark.isRead ? "Mark as unread" : "Mark as read"}
                      >
                        <BookCheck className={`h-4 w-4 ${bookmark.isRead ? "fill-green-500" : ""}`} />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingBookmark(bookmark)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingBookmark(bookmark)}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1">
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingBookmark && (
        <EditModal
          bookmark={editingBookmark}
          onClose={() => setEditingBookmark(null)}
          onSave={(updated) => {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b))
            );
            setEditingBookmark(null);
          }}
        />
      )}

      {/* Delete Modal */}
      {deletingBookmark && (
        <DeleteModal
          bookmark={deletingBookmark}
          onClose={() => setDeletingBookmark(null)}
          onDelete={() => {
            setBookmarks((prev) => prev.filter((b) => b.id !== deletingBookmark.id));
            setTotal((prevTotal) => {
              const newTotal = prevTotal - 1;
              // Recalculate total pages and adjust current page if needed
              const newTotalPages = Math.max(1, Math.ceil(newTotal / limit));
              setTotalPages(newTotalPages);
              if (page > newTotalPages) {
                setPage(newTotalPages);
              }
              return newTotal;
            });
            setDeletingBookmark(null);
          }}
        />
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          count={selectedIds.size}
          onClose={() => setShowBulkDeleteModal(false)}
          onDelete={bulkDelete}
          loading={bulkActionLoading}
        />
      )}

      {/* Bulk Move Modal */}
      {showBulkMoveModal && (
        <BulkMoveModal
          count={selectedIds.size}
          folders={folders}
          onClose={() => setShowBulkMoveModal(false)}
          onMove={bulkMoveToFolder}
          loading={bulkActionLoading}
        />
      )}

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <BulkTagModal
          count={selectedIds.size}
          onClose={() => setShowBulkTagModal(false)}
          onAddTags={bulkAddTags}
          loading={bulkActionLoading}
        />
      )}

      {/* Search Help Modal */}
      {showSearchHelp && (
        <SearchHelpModal onClose={() => setShowSearchHelp(false)} />
      )}

      {/* Preview Modal */}
      {previewBookmark && (
        <PreviewModal
          bookmark={previewBookmark}
          onClose={() => setPreviewBookmark(null)}
          onRefresh={() => refreshPreview(previewBookmark)}
          refreshing={refreshingPreview}
        />
      )}

      {/* Duplicates Modal */}
      {showDuplicatesModal && (
        <DuplicatesModal
          onClose={() => setShowDuplicatesModal(false)}
          onMergeComplete={fetchBookmarks}
        />
      )}

      {/* Add Bookmark Modal */}
      <AddBookmarkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={() => {
          setShowAddModal(false);
          fetchBookmarks();
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsHelp && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsHelp(false)} />
      )}
    </div>
  );
}

// Loading component for Suspense fallback
function BookmarksPageLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
        <span>Loading bookmarks...</span>
      </div>
    </div>
  );
}

// Wrap the page in Suspense to handle useSearchParams
export default function BookmarksPage() {
  return (
    <Suspense fallback={<BookmarksPageLoading />}>
      <BookmarksPageContent />
    </Suspense>
  );
}
