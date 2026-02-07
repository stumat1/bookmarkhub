import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { normalizeUrl, getSimilarityKey } from "@/src/lib/db/operations";
import { logger } from "@/src/lib/logger";

// Types for duplicate detection
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
  linkStatus: string | null;
  lastChecked: Date | null;
  isFavorite: boolean;
  thumbnailUrl: string | null;
  isReadLater: boolean;
  isRead: boolean;
  readingNotes: string | null;
}

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

interface MergeRequest {
  keepId: number;
  deleteIds: number[];
  mergeTags: boolean;
}

interface ErrorResponse {
  error: string;
}

// Normalize title for comparison
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove common prefixes/suffixes
    .replace(/^(the|a|an)\s+/i, "")
    // Remove special characters
    .replace(/[^\w\s]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

// GET /api/duplicates - Find duplicate bookmarks
export async function GET(): Promise<NextResponse<DuplicatesResponse | ErrorResponse>> {
  try {
    // Phase 1: Fetch only lightweight fields to identify duplicate groups
    const lightweight = await db
      .select({ id: bookmarks.id, url: bookmarks.url, title: bookmarks.title })
      .from(bookmarks);

    // Build groups using only IDs (no full records in memory yet)
    interface IdGroup {
      type: "exact_url" | "similar_url" | "similar_title";
      reason: string;
      ids: number[];
    }

    const idGroups: IdGroup[] = [];
    const processedIds = new Set<number>();
    const duplicateIds = new Set<number>();

    // 1. Find exact URL matches
    const urlMap = new Map<string, { id: number }[]>();
    for (const bm of lightweight) {
      const normalized = normalizeUrl(bm.url);
      if (!urlMap.has(normalized)) {
        urlMap.set(normalized, []);
      }
      urlMap.get(normalized)!.push({ id: bm.id });
    }

    for (const [url, entries] of urlMap.entries()) {
      if (entries.length > 1) {
        const ids = entries.map((e) => e.id);
        idGroups.push({ type: "exact_url", reason: `Exact URL match: ${url}`, ids });
        ids.forEach((id) => { processedIds.add(id); duplicateIds.add(id); });
      }
    }

    // 2. Find similar URLs (different protocols, www variations)
    const similarUrlMap = new Map<string, { id: number }[]>();
    for (const bm of lightweight) {
      if (processedIds.has(bm.id)) continue;
      const key = getSimilarityKey(bm.url);
      if (!similarUrlMap.has(key)) {
        similarUrlMap.set(key, []);
      }
      similarUrlMap.get(key)!.push({ id: bm.id });
    }

    for (const [key, entries] of similarUrlMap.entries()) {
      if (entries.length > 1) {
        const ids = entries.map((e) => e.id);
        idGroups.push({ type: "similar_url", reason: `Similar URLs (protocol/www variations): ${key}`, ids });
        ids.forEach((id) => { processedIds.add(id); duplicateIds.add(id); });
      }
    }

    // 3. Find similar titles with different URLs
    const titleMap = new Map<string, { id: number }[]>();
    for (const bm of lightweight) {
      if (processedIds.has(bm.id)) continue;
      const normalized = normalizeTitle(bm.title);
      if (normalized.length < 5) continue;
      if (!titleMap.has(normalized)) {
        titleMap.set(normalized, []);
      }
      titleMap.get(normalized)!.push({ id: bm.id });
    }

    for (const [title, entries] of titleMap.entries()) {
      if (entries.length > 1) {
        const ids = entries.map((e) => e.id);
        idGroups.push({ type: "similar_title", reason: `Similar titles: "${title}"`, ids });
        ids.forEach((id) => duplicateIds.add(id));
      }
    }

    // Phase 2: Fetch full records only for bookmarks that are in duplicate groups
    const fullRecordsMap = new Map<number, BookmarkData>();

    if (duplicateIds.size > 0) {
      const allDupIds = Array.from(duplicateIds);
      // Fetch in batches to avoid overly large IN clauses
      const batchSize = 500;
      for (let i = 0; i < allDupIds.length; i += batchSize) {
        const batch = allDupIds.slice(i, i + batchSize);
        const records = await db.select().from(bookmarks).where(inArray(bookmarks.id, batch));
        for (const r of records) {
          fullRecordsMap.set(r.id, r);
        }
      }
    }

    // Build final groups with full bookmark data
    const groups: DuplicateGroup[] = [];

    for (const idGroup of idGroups) {
      const groupBookmarks = idGroup.ids
        .map((id) => fullRecordsMap.get(id))
        .filter((b): b is BookmarkData => b !== undefined);

      if (groupBookmarks.length > 1) {
        // Sort by createdAt descending (newest first)
        groupBookmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        groups.push({
          type: idGroup.type,
          reason: idGroup.reason,
          bookmarks: groupBookmarks,
        });
      }
    }

    const totalDuplicates = groups.reduce((sum, group) => sum + (group.bookmarks.length - 1), 0);

    return NextResponse.json({
      groups,
      totalDuplicates,
      totalGroups: groups.length,
    });
  } catch (error) {
    logger.error("Error finding duplicates", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to find duplicates" },
      { status: 500 }
    );
  }
}

// POST /api/duplicates/merge - Merge duplicate bookmarks
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; message: string } | ErrorResponse>> {
  try {
    const body = await request.json() as MergeRequest;
    const { keepId, deleteIds, mergeTags } = body;

    if (!keepId || !Array.isArray(deleteIds) || deleteIds.length === 0) {
      return NextResponse.json(
        { error: "keepId and deleteIds are required" },
        { status: 400 }
      );
    }

    // Get the bookmark to keep
    const [keepBookmark] = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, keepId));

    if (!keepBookmark) {
      return NextResponse.json(
        { error: "Bookmark to keep not found" },
        { status: 404 }
      );
    }

    // If merging tags, collect tags from all bookmarks
    if (mergeTags) {
      const tagsToDelete = await db
        .select({ tags: bookmarks.tags })
        .from(bookmarks)
        .where(sql`${bookmarks.id} IN (${sql.join(deleteIds.map(id => sql`${id}`), sql`, `)})`);

      // Collect all tags
      const allTags = new Set<string>();

      // Add existing tags from the bookmark to keep
      if (keepBookmark.tags) {
        keepBookmark.tags.split(",").forEach((t) => allTags.add(t.trim()));
      }

      // Add tags from bookmarks to be deleted
      for (const row of tagsToDelete) {
        if (row.tags) {
          row.tags.split(",").forEach((t) => allTags.add(t.trim()));
        }
      }

      // Update the bookmark to keep with merged tags
      if (allTags.size > 0) {
        const mergedTags = Array.from(allTags).filter(Boolean).join(", ");
        await db
          .update(bookmarks)
          .set({ tags: mergedTags, updatedAt: new Date() })
          .where(eq(bookmarks.id, keepId));
      }
    }

    // Delete the duplicate bookmarks
    for (const id of deleteIds) {
      await db.delete(bookmarks).where(eq(bookmarks.id, id));
    }

    return NextResponse.json({
      success: true,
      message: `Merged ${deleteIds.length} duplicate(s) into bookmark #${keepId}`,
    });
  } catch (error) {
    logger.error("Error merging duplicates", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to merge duplicates" },
      { status: 500 }
    );
  }
}
