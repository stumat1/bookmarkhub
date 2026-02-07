import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { sql } from "drizzle-orm";
import { logger } from "@/src/lib/logger";

interface FolderCount {
  folder: string | null;
  count: number;
}

interface FoldersResponse {
  folders: FolderCount[];
  total: number;
}

// GET /api/folders - Fetch all unique folders with bookmark counts
export async function GET(): Promise<NextResponse<FoldersResponse>> {
  try {
    const results = await db
      .select({
        folder: bookmarks.folder,
        count: sql<number>`count(*)`,
      })
      .from(bookmarks)
      .groupBy(bookmarks.folder)
      .orderBy(bookmarks.folder);

    // Calculate total bookmarks
    const total = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      folders: results,
      total,
    });
  } catch (error) {
    logger.error("Error fetching folders", { error: String(error) });
    return NextResponse.json(
      { folders: [], total: 0 },
      { status: 500 }
    );
  }
}
