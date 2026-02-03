import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { sql, desc } from "drizzle-orm";

// URL normalization helpers for duplicate detection
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let normalized = parsed.protocol.toLowerCase() + "//";
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    normalized += host;
    if (parsed.port && !((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443"))) {
      normalized += ":" + parsed.port;
    }
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      const sortedParams = new URLSearchParams([...params.entries()].sort());
      const searchStr = sortedParams.toString();
      if (searchStr) {
        normalized += "?" + searchStr;
      }
    }
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}

function getSimilarityKey(url: string): string {
  try {
    const parsed = new URL(url);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return host + pathname;
  } catch {
    return url.toLowerCase();
  }
}

// Response Types
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

interface ReadingListStats {
  readLaterCount: number;
  unreadCount: number;
  readCount: number;
}

interface DuplicateStats {
  totalDuplicates: number;
  totalGroups: number;
}

interface StatsResponse {
  totalBookmarks: number;
  bookmarksByBrowser: BrowserCount[];
  recentImports: RecentImport[];
  readingList: ReadingListStats;
  duplicates: DuplicateStats;
}

interface ErrorResponse {
  error: string;
}

// GET /api/stats - Return bookmark statistics
export async function GET(): Promise<
  NextResponse<StatsResponse | ErrorResponse>
> {
  try {
    // Get total bookmark count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookmarks);
    const totalBookmarks = totalResult[0]?.count ?? 0;

    // Get bookmarks grouped by browser
    const browserResults = await db
      .select({
        browser: bookmarks.browser,
        count: sql<number>`count(*)`,
      })
      .from(bookmarks)
      .groupBy(bookmarks.browser)
      .orderBy(desc(sql`count(*)`));

    const bookmarksByBrowser: BrowserCount[] = browserResults.map((row) => ({
      browser: row.browser,
      count: row.count,
    }));

    // Get recent imports (last 10 bookmarks by createdAt)
    const recentResults = await db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        browser: bookmarks.browser,
        createdAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .orderBy(desc(bookmarks.createdAt))
      .limit(10);

    const recentImports: RecentImport[] = recentResults.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      browser: row.browser,
      createdAt: row.createdAt,
    }));

    // Get reading list statistics
    const readLaterResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookmarks)
      .where(sql`${bookmarks.isReadLater} = 1`);
    const readLaterCount = readLaterResult[0]?.count ?? 0;

    const unreadResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookmarks)
      .where(sql`${bookmarks.isReadLater} = 1 AND ${bookmarks.isRead} = 0`);
    const unreadCount = unreadResult[0]?.count ?? 0;

    const readResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookmarks)
      .where(sql`${bookmarks.isReadLater} = 1 AND ${bookmarks.isRead} = 1`);
    const readCount = readResult[0]?.count ?? 0;

    // Calculate duplicate stats
    const allBookmarks = await db.select({ id: bookmarks.id, url: bookmarks.url }).from(bookmarks);
    const processedIds = new Set<number>();
    let totalGroups = 0;
    let totalDuplicates = 0;

    // Check exact URL matches
    const urlMap = new Map<string, number[]>();
    for (const bm of allBookmarks) {
      const normalizedUrl = normalizeUrl(bm.url);
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl)!.push(bm.id);
    }

    for (const ids of urlMap.values()) {
      if (ids.length > 1) {
        totalGroups++;
        totalDuplicates += ids.length - 1;
        ids.forEach((id) => processedIds.add(id));
      }
    }

    // Check similar URLs (not already counted as exact matches)
    const similarUrlMap = new Map<string, number[]>();
    for (const bm of allBookmarks) {
      if (processedIds.has(bm.id)) continue;
      const similarityKey = getSimilarityKey(bm.url);
      if (!similarUrlMap.has(similarityKey)) {
        similarUrlMap.set(similarityKey, []);
      }
      similarUrlMap.get(similarityKey)!.push(bm.id);
    }

    for (const ids of similarUrlMap.values()) {
      if (ids.length > 1) {
        totalGroups++;
        totalDuplicates += ids.length - 1;
      }
    }

    return NextResponse.json({
      totalBookmarks,
      bookmarksByBrowser,
      recentImports,
      readingList: {
        readLaterCount,
        unreadCount,
        readCount,
      },
      duplicates: {
        totalDuplicates,
        totalGroups,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
