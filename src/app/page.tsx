"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  Chrome,
  Globe,
  Download,
  List,
  Activity,
  Loader2,
  RefreshCw,
  ExternalLink,
  Link2,
  AlertTriangle,
  Star,
} from "lucide-react";
import BookmarkUploader from "@/src/components/BookmarkUploader";

// Types matching API response
interface BrowserCount {
  browser: string | null;
  count: number;
}

interface RecentImport {
  id: number;
  title: string;
  url: string;
  browser: string | null;
  createdAt: Date;
}

interface StatsResponse {
  totalBookmarks: number;
  bookmarksByBrowser: BrowserCount[];
  recentImports: RecentImport[];
}

// Browser icon mapping
function getBrowserIcon(browser: string | null) {
  const lowerBrowser = browser?.toLowerCase() ?? "";
  if (lowerBrowser.includes("chrome")) {
    return <Chrome className="h-5 w-5 text-yellow-500" />;
  }
  if (lowerBrowser.includes("firefox")) {
    return (
      <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    );
  }
  if (lowerBrowser.includes("safari")) {
    return (
      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    );
  }
  if (lowerBrowser.includes("edge")) {
    return (
      <svg className="h-5 w-5 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    );
  }
  return <Globe className="h-5 w-5 text-zinc-500" />;
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

interface LinkHealthResponse {
  total: number;
  checked: number;
  unchecked: number;
  valid: number;
  broken: number;
  timeout: number;
  redirect: number;
  healthPercentage: number;
}

interface FavoriteBookmark {
  id: number;
  title: string;
  url: string;
  favicon: string | null;
  isFavorite: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [linkHealth, setLinkHealth] = useState<LinkHealthResponse | null>(null);
  const [favorites, setFavorites] = useState<FavoriteBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, linkHealthRes, favoritesRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/link-check"),
        fetch("/api/bookmarks?favorite=true&limit=5"),
      ]);

      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      if (linkHealthRes.ok) {
        const linkHealthData = await linkHealthRes.json();
        setLinkHealth(linkHealthData);
      }

      if (favoritesRes.ok) {
        const favoritesData = await favoritesRes.json();
        setFavorites(favoritesData.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <Bookmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  BookmarkHub
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Organize and manage your bookmarks
                </p>
              </div>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Statistics Section */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Overview
          </h2>

          {loading && !stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-3 h-8 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchStats}
                className="mt-2 text-sm font-medium text-red-700 hover:underline dark:text-red-300"
              >
                Try again
              </button>
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Bookmarks */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <Bookmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Total Bookmarks
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stats.totalBookmarks.toLocaleString()}
                </p>
              </div>

              {/* Link Health */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    !linkHealth || linkHealth.checked === 0
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : linkHealth.healthPercentage >= 80
                        ? "bg-green-100 dark:bg-green-900/30"
                        : linkHealth.healthPercentage >= 50
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                  }`}>
                    {linkHealth && linkHealth.broken > 0 ? (
                      <AlertTriangle className={`h-5 w-5 ${
                        linkHealth.healthPercentage >= 80
                          ? "text-green-600 dark:text-green-400"
                          : linkHealth.healthPercentage >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      }`} />
                    ) : (
                      <Link2 className={`h-5 w-5 ${
                        !linkHealth || linkHealth.checked === 0
                          ? "text-zinc-500 dark:text-zinc-400"
                          : "text-green-600 dark:text-green-400"
                      }`} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Link Health
                  </span>
                </div>
                {linkHealth && linkHealth.checked > 0 ? (
                  <div>
                    <p className={`mt-3 text-3xl font-bold ${
                      linkHealth.healthPercentage >= 80
                        ? "text-green-600 dark:text-green-400"
                        : linkHealth.healthPercentage >= 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}>
                      {linkHealth.healthPercentage}%
                    </p>
                    {linkHealth.broken > 0 && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {linkHealth.broken} broken link{linkHealth.broken !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    Not checked yet
                  </p>
                )}
              </div>

              {/* Browser Stats */}
              {stats.bookmarksByBrowser.slice(0, 2).map((browser, index) => (
                <div
                  key={browser.browser ?? `unknown-${index}`}
                  className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                      {getBrowserIcon(browser.browser)}
                    </div>
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {browser.browser ?? "Unknown"}
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                    {browser.count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upload Section */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Import Bookmarks
            </h2>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <BookmarkUploader />
            </div>
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Quick Actions
            </h2>
            <div className="grid gap-4">
              <Link
                href="/bookmarks"
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
              >
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                  <List className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    View All Bookmarks
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Browse, search, and manage your saved bookmarks
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-zinc-400" />
              </Link>

              <a
                href="/api/export"
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-green-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-green-700"
              >
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                  <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Export Bookmarks
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Download your bookmarks as an HTML file
                  </p>
                </div>
                <Download className="h-5 w-5 text-zinc-400" />
              </a>
            </div>
          </section>
        </div>

        {/* Quick Favorites */}
        {favorites.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Quick Favorites
              </h2>
              <Link
                href="/bookmarks?favorite=true"
                className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                <Star className="h-4 w-4" />
                View all
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {favorites.map((bookmark) => (
                <a
                  key={bookmark.id}
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-amber-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-700"
                >
                  <div className="flex-shrink-0">
                    {bookmark.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bookmark.favicon}
                        alt=""
                        className="h-8 w-8 rounded bg-zinc-100 object-contain p-1 dark:bg-zinc-800"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className={`flex h-8 w-8 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/30 ${bookmark.favicon ? "hidden" : ""}`}>
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 group-hover:text-amber-600 dark:text-zinc-100 dark:group-hover:text-amber-400">
                      {bookmark.title || "Untitled"}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {new URL(bookmark.url).hostname}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Activity
            </h2>
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Activity className="h-4 w-4" />
              <span>Latest imports</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {loading && !stats ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            ) : stats?.recentImports.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 w-fit rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                  <Bookmark className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  No bookmarks yet
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Import your first bookmark file to get started
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {stats?.recentImports.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                      {getBrowserIcon(bookmark.browser)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {bookmark.title || "Untitled"}
                      </p>
                      <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {bookmark.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500">
                        {formatRelativeTime(bookmark.createdAt)}
                      </span>
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-zinc-500 dark:text-zinc-400 sm:px-6 lg:px-8">
          BookmarkHub - Organize your bookmarks with ease
        </div>
      </footer>
    </div>
  );
}
