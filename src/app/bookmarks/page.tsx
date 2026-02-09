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
  Loader2,
  X,
  ArrowLeft,
  Tag,
  Link2,
  LinkIcon,
  HelpCircle,
  CheckSquare,
  Square,
  MinusSquare,
  Download,
  FolderInput,
  Tags,
  ArrowUpDown,
  Star,
  History,
  Image as ImageIcon,
  Eye,
  BookOpen,
  BookCheck,
  Copy,
  Keyboard,
  Plus,
} from "lucide-react";

import AddBookmarkModal from "@/src/components/AddBookmarkModal";
import { fetchWithRetry } from "@/src/lib/fetch-with-retry";
import { BOOKMARKS_PAGE_SIZE, STORAGE_KEYS, DEFAULT_SORT_FIELD, DEFAULT_SORT_ORDER, MAX_VISIBLE_PAGES, BROKEN_LINKS_FETCH_LIMIT, SEARCH_BLUR_DELAY_MS } from "@/src/lib/constants";
import type { BookmarkData, PaginatedResponse, StatsResponse } from "@/src/types/bookmark";
import { getSearchHistory, addToSearchHistory, clearSearchHistory } from "@/src/lib/search-history";
import { extractSearchTerms } from "@/src/components/bookmarks/HighlightedText";

// Extracted components
import BrowserIcon from "@/src/components/bookmarks/BrowserIcon";
import Favicon from "@/src/components/bookmarks/Favicon";
import LinkStatusBadge from "@/src/components/bookmarks/LinkStatusBadge";
import HighlightedText from "@/src/components/bookmarks/HighlightedText";
import EditModal from "@/src/components/bookmarks/EditModal";
import DeleteModal from "@/src/components/bookmarks/DeleteModal";
import BulkDeleteModal from "@/src/components/bookmarks/BulkDeleteModal";
import BulkMoveModal from "@/src/components/bookmarks/BulkMoveModal";
import BulkTagModal from "@/src/components/bookmarks/BulkTagModal";
import SearchHelpModal from "@/src/components/bookmarks/SearchHelpModal";
import ThumbnailPreview from "@/src/components/bookmarks/ThumbnailPreview";
import PreviewModal from "@/src/components/bookmarks/PreviewModal";
import DuplicatesModal from "@/src/components/bookmarks/DuplicatesModal";
import KeyboardShortcutsModal from "@/src/components/bookmarks/KeyboardShortcutsModal";

function BookmarksPageContent() {
  const searchParams = useSearchParams();

  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = BOOKMARKS_PAGE_SIZE;

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
      return localStorage.getItem(STORAGE_KEYS.SORT_BY) || DEFAULT_SORT_FIELD;
    }
    return DEFAULT_SORT_FIELD;
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(STORAGE_KEYS.SORT_ORDER) as "asc" | "desc") || (DEFAULT_SORT_ORDER as "asc" | "desc");
    }
    return DEFAULT_SORT_ORDER as "asc" | "desc";
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
        const statsRes = await fetchWithRetry("/api/stats");
        if (statsRes.ok) {
          const stats: StatsResponse = await statsRes.json();
          const browserList = stats.bookmarksByBrowser
            .map((b) => b.browser)
            .filter((b): b is string => b !== null);
          setBrowsers(browserList);
        }

        const foldersRes = await fetchWithRetry("/api/folders");
        if (foldersRes.ok) {
          const data: { folders: { folder: string | null; count: number }[] } = await foldersRes.json();
          const folderList = data.folders
            .map((f) => f.folder)
            .filter((f): f is string => f !== null)
            .sort();
          setFolders(folderList);
        }

        const tagsRes = await fetchWithRetry("/api/tags");
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
      const res = await fetchWithRetry("/api/link-check");
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

      const res = await fetchWithRetry(`/api/bookmarks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");

      const data: PaginatedResponse = await res.json();
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
      const res = await fetchWithRetry(`/api/bookmarks?linkStatus=broken&limit=${BROKEN_LINKS_FETCH_LIMIT}`);
      if (!res.ok) throw new Error("Failed to fetch broken bookmarks");

      const data: PaginatedResponse = await res.json();

      for (const bookmark of data.data) {
        await fetch(`/api/bookmarks/${bookmark.id}`, { method: "DELETE" });
      }

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
  const toggleFavorite = useCallback(async (bookmark: BookmarkData) => {
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
  }, []);

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
        setBookmarks((prev) =>
          prev.map((b) =>
            b.id === bookmark.id ? { ...b, thumbnailUrl: updatedThumbnailUrl } : b
          )
        );
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

  // Clear selection when page/filters change
  useEffect(() => {
    clearSelection();
  }, [page, search, browserFilter, folderFilter, tagFilter, linkStatusFilter, favoriteFilter, readLaterFilter, readFilter]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

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

      if (e.key === "Escape") {
        if (showShortcutsHelp) { setShowShortcutsHelp(false); return; }
        if (editingBookmark) { setEditingBookmark(null); return; }
        if (deletingBookmark) { setDeletingBookmark(null); return; }
        if (previewBookmark) { setPreviewBookmark(null); return; }
        if (showBulkDeleteModal) { setShowBulkDeleteModal(false); return; }
        if (showBulkMoveModal) { setShowBulkMoveModal(false); return; }
        if (showBulkTagModal) { setShowBulkTagModal(false); return; }
        if (showSearchHelp) { setShowSearchHelp(false); return; }
        if (showDuplicatesModal) { setShowDuplicatesModal(false); return; }
        if (showAddModal) { setShowAddModal(false); return; }
        if (isInputFocused) { (target as HTMLInputElement).blur(); return; }
        if (selectedIndex >= 0) { setSelectedIndex(-1); return; }
        return;
      }

      if (isAnyModalOpen() || isInputFocused) return;

      switch (e.key) {
        case "j": { e.preventDefault(); setSelectedIndex((prev) => prev < bookmarks.length - 1 ? prev + 1 : prev); break; }
        case "k": { e.preventDefault(); setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev)); break; }
        case "o":
        case "Enter": {
          if (selectedIndex >= 0 && selectedIndex < bookmarks.length) {
            e.preventDefault();
            window.open(bookmarks[selectedIndex].url, "_blank", "noopener,noreferrer");
          }
          break;
        }
        case "e": { if (selectedIndex >= 0 && selectedIndex < bookmarks.length) { e.preventDefault(); setEditingBookmark(bookmarks[selectedIndex]); } break; }
        case "d": { if (selectedIndex >= 0 && selectedIndex < bookmarks.length) { e.preventDefault(); setDeletingBookmark(bookmarks[selectedIndex]); } break; }
        case "f": { if (selectedIndex >= 0 && selectedIndex < bookmarks.length) { e.preventDefault(); toggleFavorite(bookmarks[selectedIndex]); } break; }
        case "/": { e.preventDefault(); searchInputRef.current?.focus(); break; }
        case "n": { e.preventDefault(); setShowAddModal(true); break; }
        case "?": { e.preventDefault(); setShowShortcutsHelp(true); break; }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookmarks, selectedIndex, editingBookmark, deletingBookmark, previewBookmark, showBulkDeleteModal, showBulkMoveModal, showBulkTagModal, showSearchHelp, showDuplicatesModal, showShortcutsHelp, showAddModal, toggleFavorite]);

  // Scroll selected bookmark into view
  useEffect(() => {
    if (selectedIndex >= 0 && bookmarkListRef.current) {
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

  const applyHistorySearch = (query: string) => {
    setSearchInput(query);
    setSearch(query);
    setPage(1);
    setShowSearchHistory(false);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

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
              <Link href="/" aria-label="Back to dashboard" className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">All Bookmarks</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{total.toLocaleString()} bookmark{total !== 1 ? "s" : ""} total</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Add Bookmark
              </button>
              <button onClick={() => setShowShortcutsHelp(true)} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800" title="Keyboard shortcuts (?)">
                <Keyboard className="h-4 w-4" />
                <kbd className="hidden sm:inline rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">?</kbd>
              </button>
              <button onClick={() => setShowDuplicatesModal(true)} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Copy className="h-4 w-4" /> Find Duplicates
              </button>
              <button onClick={() => checkLinks(bookmarks.map((b) => b.id))} disabled={checkingLinks || bookmarks.length === 0} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                {checkingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {checkingLinks ? `Checking ${checkProgress?.checked ?? 0}/${checkProgress?.total ?? 0}` : "Check Page"}
              </button>
              <button onClick={() => checkLinks("all")} disabled={checkingLinks || total === 0} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {checkingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                Check All
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Link Health Bar */}
        {linkHealth && linkHealth.checked > 0 && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Link Health</span>
              </div>
              <span className={`text-sm font-bold ${linkHealth.healthPercentage >= 80 ? "text-green-600 dark:text-green-400" : linkHealth.healthPercentage >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                {linkHealth.healthPercentage}% healthy
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {linkHealth.valid > 0 && <div className="bg-green-500" style={{ width: `${(linkHealth.valid / linkHealth.total) * 100}%` }} title={`${linkHealth.valid} valid`} />}
              {linkHealth.redirect > 0 && <div className="bg-blue-500" style={{ width: `${(linkHealth.redirect / linkHealth.total) * 100}%` }} title={`${linkHealth.redirect} redirects`} />}
              {linkHealth.timeout > 0 && <div className="bg-amber-500" style={{ width: `${(linkHealth.timeout / linkHealth.total) * 100}%` }} title={`${linkHealth.timeout} timeouts`} />}
              {linkHealth.broken > 0 && <div className="bg-red-500" style={{ width: `${(linkHealth.broken / linkHealth.total) * 100}%` }} title={`${linkHealth.broken} broken`} />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> {linkHealth.valid} valid</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> {linkHealth.redirect} redirects</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {linkHealth.timeout} timeouts</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> {linkHealth.broken} broken</span>
              <span className="flex items-center gap-1 text-zinc-400"><span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" /> {linkHealth.total - linkHealth.checked} unchecked</span>
              {linkHealth.broken > 0 && (
                <button onClick={deleteBrokenLinks} className="ml-auto flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                  <Trash2 className="h-3 w-3" /> Delete {linkHealth.broken} broken
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => searchHistory.length > 0 && setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), SEARCH_BLUR_DELAY_MS)}
                placeholder="Search bookmarks... (try folder:Work or tag:important)"
                aria-label="Search bookmarks"
                className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-10 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(""); if (search) { setSearch(""); setPage(1); } }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {showSearchHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400"><History className="h-3 w-3" /> Recent Searches</span>
                    <button type="button" onClick={handleClearHistory} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Clear all</button>
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {searchHistory.map((query, index) => (
                      <li key={index}>
                        <button type="button" onClick={() => applyHistorySearch(query)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                          <History className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="truncate">{query}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button type="button" onClick={() => setShowSearchHelp(true)} className="rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" title="Search syntax help">
              <HelpCircle className="h-5 w-5" />
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700">Search</button>
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><Filter className="h-4 w-4" /><span>Filters:</span></div>
            <select value={browserFilter} onChange={(e) => { setBrowserFilter(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">All Browsers</option>
              {browsers.map((browser) => <option key={browser} value={browser}>{browser}</option>)}
            </select>
            <select value={folderFilter} onChange={(e) => { setFolderFilter(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">All Folders</option>
              {folders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
            </select>
            <select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">All Tags</option>
              {tags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
            </select>
            <select value={linkStatusFilter} onChange={(e) => { setLinkStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">All Link Status</option>
              <option value="valid">Valid</option>
              <option value="broken">Broken</option>
              <option value="timeout">Timeout</option>
              <option value="redirect">Redirect</option>
              <option value="unchecked">Unchecked</option>
            </select>
            <button onClick={() => { setFavoriteFilter(!favoriteFilter); setPage(1); }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${favoriteFilter ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
              <Star className={`h-4 w-4 ${favoriteFilter ? "fill-amber-500" : ""}`} /> Favorites
            </button>
            <button onClick={() => { setReadLaterFilter(!readLaterFilter); if (!readLaterFilter) { setReadFilter(""); } setPage(1); }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${readLaterFilter ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
              <BookOpen className={`h-4 w-4 ${readLaterFilter ? "fill-blue-500" : ""}`} /> Reading List
            </button>
            {readLaterFilter && (
              <select value={readFilter} onChange={(e) => { setReadFilter(e.target.value as "" | "unread" | "read"); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">All Items</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="h-4 w-4 text-zinc-400" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [string, "asc" | "desc"];
                  setSortBy(field);
                  setSortOrder(order);
                  localStorage.setItem(STORAGE_KEYS.SORT_BY, field);
                  localStorage.setItem(STORAGE_KEYS.SORT_ORDER, order);
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
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-blue-300 dark:bg-blue-700" />
            <button onClick={() => setShowBulkDeleteModal(true)} disabled={bulkActionLoading} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50"><Trash2 className="h-4 w-4" /> Delete</button>
            <button onClick={() => setShowBulkMoveModal(true)} disabled={bulkActionLoading} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"><FolderInput className="h-4 w-4" /> Move to Folder</button>
            <button onClick={() => setShowBulkTagModal(true)} disabled={bulkActionLoading} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"><Tags className="h-4 w-4" /> Add Tags</button>
            <button onClick={bulkExport} disabled={bulkActionLoading} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
              {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
            </button>
            <button
              onClick={async () => {
                setBulkActionLoading(true);
                try {
                  const res = await fetch("/api/thumbnails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedIds) }) });
                  if (res.ok) { await fetchBookmarks(); }
                } catch (err) { console.error("Error generating previews:", err); } finally { setBulkActionLoading(false); clearSelection(); }
              }}
              disabled={bulkActionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Previews
            </button>
            <button onClick={clearSelection} className="ml-auto flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"><X className="h-4 w-4" /> Clear</button>
          </div>
        )}

        {/* Bookmarks List */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button onClick={fetchBookmarks} className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Try again</button>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 w-fit rounded-full bg-zinc-100 p-4 dark:bg-zinc-800"><Bookmark className="h-8 w-8 text-zinc-400" /></div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{hasFilters ? "No matching bookmarks" : "No bookmarks yet"}</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{hasFilters ? "Try adjusting your search or filters" : "Import your first bookmark file to get started"}</p>
              {hasFilters && <button onClick={clearFilters} className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Clear filters</button>}
            </div>
          ) : (
            <div ref={bookmarkListRef} className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {/* Select All Header */}
              <div className="flex items-center gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-800/50">
                <button onClick={() => (isAllSelected ? clearSelection() : selectAll())} className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
                  {isAllSelected ? <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : isSomeSelected ? <MinusSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : <Square className="h-5 w-5" />}
                  <span>{isAllSelected ? "Deselect all" : "Select all on this page"}</span>
                </button>
              </div>

              {bookmarks.map((bookmark, index) => (
                <div
                  key={bookmark.id}
                  className={`flex items-center gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${selectedIds.has(bookmark.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""} ${selectedIndex === index ? "ring-2 ring-inset ring-blue-500 bg-blue-50/30 dark:bg-blue-950/10" : ""}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <button onClick={() => toggleSelection(bookmark.id)} aria-label={selectedIds.has(bookmark.id) ? `Deselect ${bookmark.title || "bookmark"}` : `Select ${bookmark.title || "bookmark"}`} className="flex-shrink-0">
                    {selectedIds.has(bookmark.id) ? <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" /> : <Square className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" aria-hidden="true" />}
                  </button>
                  <Favicon url={bookmark.url} favicon={bookmark.favicon} />
                  <div className="min-w-0 flex-1">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2">
                      <HighlightedText text={bookmark.title || "Untitled"} searchTerms={searchTerms} className="truncate font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400" />
                      <ExternalLink className="h-4 w-4 flex-shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                    <HighlightedText text={bookmark.url} searchTerms={searchTerms} className="block truncate text-sm text-zinc-500 dark:text-zinc-400" />
                    {bookmark.description && <HighlightedText text={bookmark.description} searchTerms={searchTerms} className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2" />}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                      {bookmark.folder && <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" /><HighlightedText text={bookmark.folder} searchTerms={searchTerms} /></span>}
                      {bookmark.browser && <span className="flex items-center gap-1"><BrowserIcon browser={bookmark.browser} />{bookmark.browser}</span>}
                      <LinkStatusBadge status={bookmark.linkStatus} />
                    </div>
                    {bookmark.tags && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {bookmark.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                          <button key={tag} onClick={(e) => { e.preventDefault(); setTagFilter(tag); setPage(1); }} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50">
                            <Tag className="h-3 w-3" />{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <ThumbnailPreview bookmark={bookmark} onOpenModal={() => setPreviewBookmark(bookmark)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPreviewBookmark(bookmark)} aria-label={`Preview ${bookmark.title || "bookmark"}`} className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" title="Preview"><Eye className="h-4 w-4" aria-hidden="true" /></button>
                    <button onClick={() => toggleFavorite(bookmark)} aria-label={bookmark.isFavorite ? "Remove from favorites" : "Add to favorites"} className={`rounded-lg p-2 transition-colors ${bookmark.isFavorite ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30" : "text-zinc-400 hover:bg-zinc-100 hover:text-amber-500 dark:hover:bg-zinc-800"}`} title={bookmark.isFavorite ? "Remove from favorites" : "Add to favorites"}>
                      <Star className={`h-4 w-4 ${bookmark.isFavorite ? "fill-amber-500" : ""}`} aria-hidden="true" />
                    </button>
                    <button onClick={() => toggleReadLater(bookmark)} aria-label={bookmark.isReadLater ? "Remove from reading list" : "Add to reading list"} className={`rounded-lg p-2 transition-colors ${bookmark.isReadLater ? "text-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30" : "text-zinc-400 hover:bg-zinc-100 hover:text-blue-500 dark:hover:bg-zinc-800"}`} title={bookmark.isReadLater ? "Remove from reading list" : "Add to reading list"}>
                      <BookOpen className={`h-4 w-4 ${bookmark.isReadLater ? "fill-blue-500" : ""}`} aria-hidden="true" />
                    </button>
                    {bookmark.isReadLater && (
                      <button onClick={() => toggleRead(bookmark)} aria-label={bookmark.isRead ? "Mark as unread" : "Mark as read"} className={`rounded-lg p-2 transition-colors ${bookmark.isRead ? "text-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30" : "text-zinc-400 hover:bg-zinc-100 hover:text-green-500 dark:hover:bg-zinc-800"}`} title={bookmark.isRead ? "Mark as unread" : "Mark as read"}>
                        <BookCheck className={`h-4 w-4 ${bookmark.isRead ? "fill-green-500" : ""}`} aria-hidden="true" />
                      </button>
                    )}
                    <button onClick={() => setEditingBookmark(bookmark)} aria-label={`Edit ${bookmark.title || "bookmark"}`} className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" title="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                    <button onClick={() => setDeletingBookmark(bookmark)} aria-label={`Delete ${bookmark.title || "bookmark"}`} className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400" title="Delete"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(MAX_VISIBLE_PAGES, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= MAX_VISIBLE_PAGES) { pageNum = i + 1; }
                  else if (page <= 3) { pageNum = i + 1; }
                  else if (page >= totalPages - 2) { pageNum = totalPages - (MAX_VISIBLE_PAGES - 1) + i; }
                  else { pageNum = page - 2 + i; }
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)} aria-label={`Page ${pageNum}`} aria-current={page === pageNum ? "page" : undefined} className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${page === pageNum ? "bg-blue-600 text-white" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
      </main>

      {/* Modals */}
      {editingBookmark && (
        <EditModal bookmark={editingBookmark} onClose={() => setEditingBookmark(null)} onSave={(updated) => { setBookmarks((prev) => prev.map((b) => (b.id === updated.id ? updated : b))); setEditingBookmark(null); }} />
      )}
      {deletingBookmark && (
        <DeleteModal bookmark={deletingBookmark} onClose={() => setDeletingBookmark(null)} onDelete={() => {
          setBookmarks((prev) => prev.filter((b) => b.id !== deletingBookmark.id));
          setTotal((prevTotal) => {
            const newTotal = prevTotal - 1;
            const newTotalPages = Math.max(1, Math.ceil(newTotal / limit));
            setTotalPages(newTotalPages);
            if (page > newTotalPages) { setPage(newTotalPages); }
            return newTotal;
          });
          setDeletingBookmark(null);
        }} />
      )}
      {showBulkDeleteModal && <BulkDeleteModal count={selectedIds.size} onClose={() => setShowBulkDeleteModal(false)} onDelete={bulkDelete} loading={bulkActionLoading} />}
      {showBulkMoveModal && <BulkMoveModal count={selectedIds.size} folders={folders} onClose={() => setShowBulkMoveModal(false)} onMove={bulkMoveToFolder} loading={bulkActionLoading} />}
      {showBulkTagModal && <BulkTagModal count={selectedIds.size} onClose={() => setShowBulkTagModal(false)} onAddTags={bulkAddTags} loading={bulkActionLoading} />}
      {showSearchHelp && <SearchHelpModal onClose={() => setShowSearchHelp(false)} />}
      {previewBookmark && <PreviewModal bookmark={previewBookmark} onClose={() => setPreviewBookmark(null)} onRefresh={() => refreshPreview(previewBookmark)} refreshing={refreshingPreview} />}
      {showDuplicatesModal && <DuplicatesModal onClose={() => setShowDuplicatesModal(false)} onMergeComplete={fetchBookmarks} />}
      <AddBookmarkModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={() => { setShowAddModal(false); fetchBookmarks(); }} />
      {showShortcutsHelp && <KeyboardShortcutsModal onClose={() => setShowShortcutsHelp(false)} />}
    </div>
  );
}

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

export default function BookmarksPage() {
  return (
    <Suspense fallback={<BookmarksPageLoading />}>
      <BookmarksPageContent />
    </Suspense>
  );
}
