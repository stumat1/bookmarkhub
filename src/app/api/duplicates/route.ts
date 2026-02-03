import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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

// Normalize URL for comparison
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Normalize to lowercase
    let normalized = parsed.protocol.toLowerCase() + "//";
    // Remove www. prefix
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    normalized += host;
    // Add port if non-standard
    if (parsed.port && !((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443"))) {
      normalized += ":" + parsed.port;
    }
    // Normalize path (remove trailing slash for non-root paths)
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;
    // Include search params (sorted for consistency)
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      const sortedParams = new URLSearchParams([...params.entries()].sort());
      const searchStr = sortedParams.toString();
      if (searchStr) {
        normalized += "?" + searchStr;
      }
    }
    // Exclude hash/fragment
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}

// Create a URL similarity key (more aggressive normalization)
function getSimilarityKey(url: string): string {
  try {
    const parsed = new URL(url);
    // Aggressive normalization: ignore protocol, www, trailing slashes
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
    // Fetch all bookmarks
    const allBookmarks = await db.select().from(bookmarks);

    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<number>();

    // 1. Find exact URL matches
    const urlMap = new Map<string, BookmarkData[]>();
    for (const bookmark of allBookmarks) {
      const normalizedUrl = normalizeUrl(bookmark.url);
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl)!.push(bookmark);
    }

    for (const [url, duplicates] of urlMap.entries()) {
      if (duplicates.length > 1) {
        // Sort by createdAt descending (newest first)
        duplicates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        groups.push({
          type: "exact_url",
          reason: `Exact URL match: ${url}`,
          bookmarks: duplicates,
        });
        duplicates.forEach((b) => processedIds.add(b.id));
      }
    }

    // 2. Find similar URLs (different protocols, www variations)
    const similarUrlMap = new Map<string, BookmarkData[]>();
    for (const bookmark of allBookmarks) {
      if (processedIds.has(bookmark.id)) continue;
      const similarityKey = getSimilarityKey(bookmark.url);
      if (!similarUrlMap.has(similarityKey)) {
        similarUrlMap.set(similarityKey, []);
      }
      similarUrlMap.get(similarityKey)!.push(bookmark);
    }

    for (const [key, duplicates] of similarUrlMap.entries()) {
      if (duplicates.length > 1) {
        // Sort by createdAt descending (newest first)
        duplicates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        groups.push({
          type: "similar_url",
          reason: `Similar URLs (protocol/www variations): ${key}`,
          bookmarks: duplicates,
        });
        duplicates.forEach((b) => processedIds.add(b.id));
      }
    }

    // 3. Find similar titles with different URLs
    const titleMap = new Map<string, BookmarkData[]>();
    for (const bookmark of allBookmarks) {
      if (processedIds.has(bookmark.id)) continue;
      const normalizedTitle = normalizeTitle(bookmark.title);
      if (normalizedTitle.length < 5) continue; // Skip very short titles
      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }
      titleMap.get(normalizedTitle)!.push(bookmark);
    }

    for (const [title, duplicates] of titleMap.entries()) {
      if (duplicates.length > 1) {
        // Sort by createdAt descending (newest first)
        duplicates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        groups.push({
          type: "similar_title",
          reason: `Similar titles: "${title}"`,
          bookmarks: duplicates,
        });
      }
    }

    // Calculate total duplicates (all bookmarks that are in groups minus one per group - the "original")
    const totalDuplicates = groups.reduce((sum, group) => sum + (group.bookmarks.length - 1), 0);

    return NextResponse.json({
      groups,
      totalDuplicates,
      totalGroups: groups.length,
    });
  } catch (error) {
    console.error("Error finding duplicates:", error);
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
    console.error("Error merging duplicates:", error);
    return NextResponse.json(
      { error: "Failed to merge duplicates" },
      { status: 500 }
    );
  }
}
