import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { sql, desc } from "drizzle-orm";

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

    // Calculate duplicate stats using SQL (avoids loading all bookmarks into memory)
    // Uses lower(url) for grouping which catches exact matches and case variations.
    // The full normalization (www removal, protocol changes) is on the dedicated /api/duplicates page.
    const dupGroupsResult = db.get<{ groups: number }>(
      sql`SELECT COUNT(*) as groups FROM (SELECT lower(url) FROM bookmarks GROUP BY lower(url) HAVING COUNT(*) > 1)`
    );
    const totalGroups = dupGroupsResult?.groups ?? 0;

    const dupCountResult = db.get<{ duplicates: number }>(
      sql`SELECT COALESCE(SUM(cnt - 1), 0) as duplicates FROM (SELECT COUNT(*) as cnt FROM bookmarks GROUP BY lower(url) HAVING COUNT(*) > 1)`
    );
    const totalDuplicates = dupCountResult?.duplicates ?? 0;

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
