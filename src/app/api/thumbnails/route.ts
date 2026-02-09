import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, inArray, isNull } from "drizzle-orm";
import { logger } from "@/src/lib/logger";

// Response types
interface ThumbnailResponse {
  success: boolean;
  updated: number;
  failed: number;
  results: { id: number; thumbnailUrl: string | null; error?: string }[];
}

interface ErrorResponse {
  error: string;
}

import { MICROLINK_API_BASE, SCREENSHOT_VIEWPORT } from "@/src/lib/constants";

function generateThumbnailUrl(pageUrl: string): string {
  const encodedUrl = encodeURIComponent(pageUrl);
  return `${MICROLINK_API_BASE}?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=${SCREENSHOT_VIEWPORT.width}&viewport.height=${SCREENSHOT_VIEWPORT.height}&screenshot.type=jpeg`;
}


// GET /api/thumbnails - Get thumbnail generation status
export async function GET(): Promise<NextResponse<{ total: number; withThumbnails: number; withoutThumbnails: number }>> {
  try {
    const allBookmarks = await db.select({ id: bookmarks.id, thumbnailUrl: bookmarks.thumbnailUrl }).from(bookmarks);

    const total = allBookmarks.length;
    const withThumbnails = allBookmarks.filter(b => b.thumbnailUrl).length;
    const withoutThumbnails = total - withThumbnails;

    return NextResponse.json({
      total,
      withThumbnails,
      withoutThumbnails,
    });
  } catch (error) {
    logger.error("Error fetching thumbnail stats", { error: String(error) });
    return NextResponse.json(
      { total: 0, withThumbnails: 0, withoutThumbnails: 0 },
      { status: 500 }
    );
  }
}

// POST /api/thumbnails - Generate thumbnails for bookmarks
// Body: { ids: number[] | "all" | "missing" }
export async function POST(request: NextRequest): Promise<NextResponse<ThumbnailResponse | ErrorResponse>> {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids) {
      return NextResponse.json(
        { error: "ids parameter is required (array of IDs, 'all', or 'missing')" },
        { status: 400 }
      );
    }

    let bookmarksToUpdate;

    if (ids === "all") {
      // Generate for all bookmarks
      bookmarksToUpdate = await db
        .select({ id: bookmarks.id, url: bookmarks.url })
        .from(bookmarks);
    } else if (ids === "missing") {
      // Generate only for bookmarks without thumbnails
      bookmarksToUpdate = await db
        .select({ id: bookmarks.id, url: bookmarks.url })
        .from(bookmarks)
        .where(isNull(bookmarks.thumbnailUrl));
    } else if (Array.isArray(ids) && ids.every((id) => typeof id === "number")) {
      // Generate for specific bookmark IDs
      bookmarksToUpdate = await db
        .select({ id: bookmarks.id, url: bookmarks.url })
        .from(bookmarks)
        .where(inArray(bookmarks.id, ids));
    } else {
      return NextResponse.json(
        { error: "ids must be an array of numbers, 'all', or 'missing'" },
        { status: 400 }
      );
    }

    const results: { id: number; thumbnailUrl: string | null; error?: string }[] = [];
    let updated = 0;
    let failed = 0;

    for (const bookmark of bookmarksToUpdate) {
      try {
        // Generate the thumbnail URL
        const thumbnailUrl = generateThumbnailUrl(bookmark.url);

        // Update the bookmark with the thumbnail URL
        await db
          .update(bookmarks)
          .set({
            thumbnailUrl,
            updatedAt: new Date(),
          })
          .where(eq(bookmarks.id, bookmark.id));

        results.push({ id: bookmark.id, thumbnailUrl });
        updated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.push({ id: bookmark.id, thumbnailUrl: null, error: errorMessage });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      failed,
      results,
    });
  } catch (error) {
    logger.error("Error generating thumbnails", { error: String(error) });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}

// DELETE /api/thumbnails - Clear thumbnails for bookmarks
// Body: { ids: number[] | "all" }
export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean; cleared: number } | ErrorResponse>> {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids) {
      return NextResponse.json(
        { error: "ids parameter is required (array of IDs or 'all')" },
        { status: 400 }
      );
    }

    let cleared = 0;

    if (ids === "all") {
      const result = await db
        .update(bookmarks)
        .set({ thumbnailUrl: null, updatedAt: new Date() });
      cleared = result.changes;
    } else if (Array.isArray(ids) && ids.every((id) => typeof id === "number")) {
      const result = await db
        .update(bookmarks)
        .set({ thumbnailUrl: null, updatedAt: new Date() })
        .where(inArray(bookmarks.id, ids));
      cleared = result.changes;
    } else {
      return NextResponse.json(
        { error: "ids must be an array of numbers or 'all'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, cleared });
  } catch (error) {
    logger.error("Error clearing thumbnails", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to clear thumbnails" },
      { status: 500 }
    );
  }
}
