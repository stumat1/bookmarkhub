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

interface StatsResponse {
  totalBookmarks: number;
  bookmarksByBrowser: BrowserCount[];
  recentImports: RecentImport[];
}

interface ErrorResponse {
  error: string;
}

// GET /api/stats - Return bookmark statistics
export async function GET(): Promise<NextResponse<StatsResponse | ErrorResponse>> {
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

    return NextResponse.json({
      totalBookmarks,
      bookmarksByBrowser,
      recentImports,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
