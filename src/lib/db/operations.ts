/**
 * Database operations for bookmark management using Drizzle ORM
 */

import { eq, like, and, or, sql, count, desc } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";

// ============================================================================
// Types
// ============================================================================

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

export interface BookmarkFilters {
  search?: string;
  browser?: string;
  folder?: string;
}

export interface BookmarkStats {
  totalBookmarks: number;
  byBrowser: Record<string, number>;
  byFolder: Record<string, number>;
  recentlyAdded: number;
}

export interface UpdateBookmarkData {
  url?: string;
  title?: string;
  description?: string | null;
  favicon?: string | null;
  folder?: string | null;
  browser?: string | null;
}

export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

// ============================================================================
// Insert Operations
// ============================================================================

/**
 * Insert multiple bookmarks in a single transaction
 *
 * @param bookmarkData - Array of bookmarks to insert
 * @returns Array of inserted bookmarks with their IDs
 * @throws DatabaseError if insertion fails
 *
 * @example
 * ```typescript
 * const newBookmarks = await insertBookmarks([
 *   { url: 'https://example.com', title: 'Example', browser: 'chrome' },
 *   { url: 'https://test.com', title: 'Test', browser: 'firefox' }
 * ]);
 * ```
 */
export async function insertBookmarks(
  bookmarkData: NewBookmark[]
): Promise<Bookmark[]> {
  if (!bookmarkData.length) {
    return [];
  }

  // Validate required fields
  for (const bookmark of bookmarkData) {
    if (!bookmark.url?.trim()) {
      throw new DatabaseError("Bookmark URL is required");
    }
    if (!bookmark.title?.trim()) {
      throw new DatabaseError("Bookmark title is required");
    }
  }

  try {
    // Use transaction for bulk insert
    const inserted = db.transaction((tx) => {
      const results: Bookmark[] = [];

      for (const bookmark of bookmarkData) {
        const result = tx
          .insert(bookmarks)
          .values({
            ...bookmark,
            url: bookmark.url.trim(),
            title: bookmark.title.trim(),
          })
          .returning()
          .get();

        if (result) {
          results.push(result);
        }
      }

      return results;
    });

    return inserted;
  } catch (error) {
    throw new DatabaseError(
      `Failed to insert bookmarks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

/**
 * Insert a single bookmark
 *
 * @param bookmark - Bookmark data to insert
 * @returns The inserted bookmark
 * @throws DatabaseError if insertion fails
 */
export async function insertBookmark(bookmark: NewBookmark): Promise<Bookmark> {
  const result = await insertBookmarks([bookmark]);
  if (!result[0]) {
    throw new DatabaseError("Failed to insert bookmark");
  }
  return result[0];
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Check if a URL already exists in the database
 *
 * @param url - URL to check for duplicates
 * @returns Array of existing bookmarks with matching URL
 *
 * @example
 * ```typescript
 * const existing = await findDuplicates('https://example.com');
 * if (existing.length > 0) {
 *   console.log('URL already exists');
 * }
 * ```
 */
export async function findDuplicates(url: string): Promise<Bookmark[]> {
  if (!url?.trim()) {
    return [];
  }

  try {
    const normalizedUrl = url.trim().toLowerCase();

    // Check for exact match and common variations (with/without trailing slash)
    const urlWithoutSlash = normalizedUrl.replace(/\/$/, "");
    const urlWithSlash = `${urlWithoutSlash}/`;

    return await db
      .select()
      .from(bookmarks)
      .where(
        or(
          eq(sql`lower(${bookmarks.url})`, normalizedUrl),
          eq(sql`lower(${bookmarks.url})`, urlWithoutSlash),
          eq(sql`lower(${bookmarks.url})`, urlWithSlash)
        )
      );
  } catch (error) {
    throw new DatabaseError(
      `Failed to find duplicates: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

/**
 * Get all bookmarks with optional filtering
 *
 * @param filters - Optional filters for search, browser, and folder
 * @returns Array of bookmarks matching the filters
 *
 * @example
 * ```typescript
 * // Get all bookmarks
 * const all = await getAllBookmarks();
 *
 * // Filter by search term
 * const results = await getAllBookmarks({ search: 'github' });
 *
 * // Filter by browser and folder
 * const chromeBookmarks = await getAllBookmarks({
 *   browser: 'chrome',
 *   folder: 'Development'
 * });
 * ```
 */
export async function getAllBookmarks(
  filters?: BookmarkFilters
): Promise<Bookmark[]> {
  try {
    const conditions = [];

    if (filters?.search?.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          like(bookmarks.title, searchTerm),
          like(bookmarks.url, searchTerm),
          like(bookmarks.description, searchTerm)
        )
      );
    }

    if (filters?.browser?.trim()) {
      conditions.push(eq(bookmarks.browser, filters.browser.trim()));
    }

    if (filters?.folder?.trim()) {
      conditions.push(eq(bookmarks.folder, filters.folder.trim()));
    }

    const query = db.select().from(bookmarks);

    if (conditions.length > 0) {
      return await query
        .where(and(...conditions))
        .orderBy(desc(bookmarks.createdAt));
    }

    return await query.orderBy(desc(bookmarks.createdAt));
  } catch (error) {
    throw new DatabaseError(
      `Failed to get bookmarks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

/**
 * Get a single bookmark by ID
 *
 * @param id - Bookmark ID
 * @returns The bookmark or null if not found
 */
export async function getBookmarkById(id: number): Promise<Bookmark | null> {
  try {
    const result = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, id))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get bookmark: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Update bookmark details
 *
 * @param id - ID of the bookmark to update
 * @param data - Fields to update
 * @returns The updated bookmark
 * @throws DatabaseError if bookmark not found or update fails
 *
 * @example
 * ```typescript
 * const updated = await updateBookmark(1, {
 *   title: 'New Title',
 *   description: 'Updated description'
 * });
 * ```
 */
export async function updateBookmark(
  id: number,
  data: UpdateBookmarkData
): Promise<Bookmark> {
  if (!id || id <= 0) {
    throw new DatabaseError("Invalid bookmark ID");
  }

  // Validate URL if provided
  if (data.url !== undefined && !data.url?.trim()) {
    throw new DatabaseError("Bookmark URL cannot be empty");
  }

  // Validate title if provided
  if (data.title !== undefined && !data.title?.trim()) {
    throw new DatabaseError("Bookmark title cannot be empty");
  }

  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.url !== undefined) updateData.url = data.url.trim();
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.favicon !== undefined) updateData.favicon = data.favicon;
    if (data.folder !== undefined) updateData.folder = data.folder;
    if (data.browser !== undefined) updateData.browser = data.browser;

    const result = await db
      .update(bookmarks)
      .set(updateData)
      .where(eq(bookmarks.id, id))
      .returning();

    if (!result[0]) {
      throw new DatabaseError(`Bookmark with ID ${id} not found`);
    }

    return result[0];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to update bookmark: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete a bookmark by ID
 *
 * @param id - ID of the bookmark to delete
 * @returns true if deleted, false if not found
 * @throws DatabaseError if deletion fails
 *
 * @example
 * ```typescript
 * const deleted = await deleteBookmark(1);
 * if (deleted) {
 *   console.log('Bookmark deleted successfully');
 * }
 * ```
 */
export async function deleteBookmark(id: number): Promise<boolean> {
  if (!id || id <= 0) {
    throw new DatabaseError("Invalid bookmark ID");
  }

  try {
    const result = await db
      .delete(bookmarks)
      .where(eq(bookmarks.id, id))
      .returning({ id: bookmarks.id });

    return result.length > 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to delete bookmark: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

/**
 * Delete multiple bookmarks by IDs
 *
 * @param ids - Array of bookmark IDs to delete
 * @returns Number of bookmarks deleted
 */
export async function deleteBookmarks(ids: number[]): Promise<number> {
  if (!ids.length) {
    return 0;
  }

  try {
    let deletedCount = 0;

    await db.transaction(async (tx) => {
      for (const id of ids) {
        const result = await tx
          .delete(bookmarks)
          .where(eq(bookmarks.id, id))
          .returning({ id: bookmarks.id });

        if (result.length > 0) {
          deletedCount++;
        }
      }
    });

    return deletedCount;
  } catch (error) {
    throw new DatabaseError(
      `Failed to delete bookmarks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get bookmark statistics
 *
 * @returns Statistics including total count, counts by browser/folder, and recent additions
 *
 * @example
 * ```typescript
 * const stats = await getStats();
 * console.log(`Total: ${stats.totalBookmarks}`);
 * console.log(`Chrome: ${stats.byBrowser.chrome || 0}`);
 * ```
 */
export async function getStats(): Promise<BookmarkStats> {
  try {
    // Get total count
    const totalResult = await db.select({ count: count() }).from(bookmarks);
    const totalBookmarks = totalResult[0]?.count ?? 0;

    // Get counts by browser
    const browserCounts = await db
      .select({
        browser: bookmarks.browser,
        count: count(),
      })
      .from(bookmarks)
      .groupBy(bookmarks.browser);

    const byBrowser: Record<string, number> = {};
    for (const row of browserCounts) {
      const key = row.browser || "unknown";
      byBrowser[key] = row.count;
    }

    // Get counts by folder
    const folderCounts = await db
      .select({
        folder: bookmarks.folder,
        count: count(),
      })
      .from(bookmarks)
      .groupBy(bookmarks.folder);

    const byFolder: Record<string, number> = {};
    for (const row of folderCounts) {
      const key = row.folder || "unfiled";
      byFolder[key] = row.count;
    }

    // Get recently added (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentResult = await db
      .select({ count: count() })
      .from(bookmarks)
      .where(sql`${bookmarks.createdAt} >= ${sevenDaysAgo.getTime() / 1000}`);

    const recentlyAdded = recentResult[0]?.count ?? 0;

    return {
      totalBookmarks,
      byBrowser,
      byFolder,
      recentlyAdded,
    };
  } catch (error) {
    throw new DatabaseError(
      `Failed to get stats: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

/**
 * Get distinct browsers in the database
 *
 * @returns Array of browser names
 */
export async function getDistinctBrowsers(): Promise<string[]> {
  try {
    const result = await db
      .selectDistinct({ browser: bookmarks.browser })
      .from(bookmarks)
      .where(sql`${bookmarks.browser} IS NOT NULL`);

    return result.map((r) => r.browser).filter((b): b is string => b !== null);
  } catch (error) {
    throw new DatabaseError(
      `Failed to get browsers: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}

/**
 * Get distinct folders in the database
 *
 * @returns Array of folder names
 */
export async function getDistinctFolders(): Promise<string[]> {
  try {
    const result = await db
      .selectDistinct({ folder: bookmarks.folder })
      .from(bookmarks)
      .where(sql`${bookmarks.folder} IS NOT NULL`);

    return result.map((r) => r.folder).filter((f): f is string => f !== null);
  } catch (error) {
    throw new DatabaseError(
      `Failed to get folders: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error
    );
  }
}
