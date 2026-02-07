import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and, or, sql, desc, asc, type Column } from "drizzle-orm";
import { logger } from "@/src/lib/logger";

// Escape SQL LIKE wildcards (% and _) in user input so they match literally
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// Build a LIKE condition with proper ESCAPE clause for SQLite
function safeLike(column: Column, pattern: string) {
  return sql`${column} LIKE ${pattern} ESCAPE '\\'`;
}

// Build a case-insensitive contains-match with escaped user input
function safeContains(column: Column, value: string) {
  return safeLike(column, `%${escapeLikePattern(value)}%`);
}

// Request/Response Types
interface BookmarkCreateRequest {
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  folder?: string;
  tags?: string;
  browser?: string;
  dateAdded?: string;
}

interface BookmarkResponse {
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

interface PaginatedResponse {
  data: BookmarkResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: string[];
}

// Validation helpers
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateBookmarkInput(
  data: unknown
): { valid: true; data: BookmarkCreateRequest } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Request body must be an object"] };
  }

  const body = data as Record<string, unknown>;

  if (!body.url || typeof body.url !== "string") {
    errors.push("url is required and must be a string");
  } else if (!validateUrl(body.url)) {
    errors.push("url must be a valid URL");
  }

  if (!body.title || typeof body.title !== "string") {
    errors.push("title is required and must be a string");
  } else if (body.title.trim().length === 0) {
    errors.push("title cannot be empty");
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push("description must be a string");
  }

  if (body.favicon !== undefined && typeof body.favicon !== "string") {
    errors.push("favicon must be a string");
  }

  if (body.folder !== undefined && typeof body.folder !== "string") {
    errors.push("folder must be a string");
  }

  if (body.tags !== undefined && typeof body.tags !== "string") {
    errors.push("tags must be a string");
  }

  if (body.browser !== undefined && typeof body.browser !== "string") {
    errors.push("browser must be a string");
  }

  if (body.dateAdded !== undefined) {
    if (typeof body.dateAdded !== "string") {
      errors.push("dateAdded must be an ISO date string");
    } else if (isNaN(Date.parse(body.dateAdded))) {
      errors.push("dateAdded must be a valid ISO date string");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      url: body.url as string,
      title: body.title as string,
      description: body.description as string | undefined,
      favicon: body.favicon as string | undefined,
      folder: body.folder as string | undefined,
      tags: body.tags as string | undefined,
      browser: body.browser as string | undefined,
      dateAdded: body.dateAdded as string | undefined,
    },
  };
}

// Parse advanced search syntax
// Supports: folder:value, tag:value, title:value, url:value, notes:value, description:value
// Everything else is a general search across title, URL, and description
interface ParsedSearch {
  general: string[];
  folder?: string;
  tag?: string;
  title?: string;
  url?: string;
  notes?: string;
}

function parseAdvancedSearch(searchQuery: string): ParsedSearch {
  const result: ParsedSearch = { general: [] };

  // Regular expression to match field:value patterns
  // Handles quoted values like folder:"My Folder" and unquoted like folder:Work
  const fieldPattern = /(\w+):(?:"([^"]+)"|(\S+))/g;

  let lastIndex = 0;
  let match;

  while ((match = fieldPattern.exec(searchQuery)) !== null) {
    // Add any text before this match as general search terms
    const textBefore = searchQuery.slice(lastIndex, match.index).trim();
    if (textBefore) {
      result.general.push(...textBefore.split(/\s+/).filter(Boolean));
    }
    lastIndex = match.index + match[0].length;

    const field = match[1].toLowerCase();
    const value = match[2] || match[3]; // quoted or unquoted value

    switch (field) {
      case "folder":
        result.folder = value;
        break;
      case "tag":
        result.tag = value;
        break;
      case "title":
        result.title = value;
        break;
      case "url":
        result.url = value;
        break;
      case "notes":
      case "description":
        result.notes = value;
        break;
      default:
        // Unknown field, treat as general search
        result.general.push(match[0]);
    }
  }

  // Add any remaining text after the last match
  const textAfter = searchQuery.slice(lastIndex).trim();
  if (textAfter) {
    result.general.push(...textAfter.split(/\s+/).filter(Boolean));
  }

  return result;
}

// GET /api/bookmarks - Fetch bookmarks with search, filters, and pagination
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Filter params
    const search = searchParams.get("search")?.trim();
    const browser = searchParams.get("browser")?.trim();
    const folder = searchParams.get("folder")?.trim();
    const tag = searchParams.get("tag")?.trim();
    const linkStatus = searchParams.get("linkStatus")?.trim();
    const favorite = searchParams.get("favorite")?.trim();
    const readLater = searchParams.get("readLater")?.trim();
    const read = searchParams.get("read")?.trim();

    // Sort params
    const sortField = searchParams.get("sort")?.trim() || "createdAt";
    const sortOrder = searchParams.get("order")?.trim() || "desc";

    // Validate sort field
    const validSortFields = ["createdAt", "title", "url", "dateAdded", "updatedAt"] as const;
    type SortField = typeof validSortFields[number];
    const safeSortField: SortField = validSortFields.includes(sortField as SortField)
      ? (sortField as SortField)
      : "createdAt";
    const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

    // Build where conditions
    const conditions = [];

    // Parse advanced search syntax
    if (search) {
      const parsed = parseAdvancedSearch(search);

      // Handle field-specific searches from advanced syntax
      if (parsed.title) {
        conditions.push(safeContains(bookmarks.title, parsed.title));
      }

      if (parsed.url) {
        conditions.push(safeContains(bookmarks.url, parsed.url));
      }

      if (parsed.notes) {
        conditions.push(safeContains(bookmarks.description, parsed.notes));
      }

      // Handle folder from advanced syntax (overrides dropdown filter)
      if (parsed.folder) {
        conditions.push(safeContains(bookmarks.folder, parsed.folder));
      }

      // Handle tag from advanced syntax (overrides dropdown filter)
      if (parsed.tag) {
        const escaped = escapeLikePattern(parsed.tag);
        conditions.push(
          or(
            eq(bookmarks.tags, parsed.tag),
            safeLike(bookmarks.tags, `${escaped},%`),
            safeLike(bookmarks.tags, `%,${escaped}`),
            safeLike(bookmarks.tags, `%,${escaped},%`),
            safeLike(bookmarks.tags, `%${escaped}%`) // Also match partial tags
          )
        );
      }

      // Handle general search terms (search across title, URL, and description)
      if (parsed.general.length > 0) {
        const generalConditions = parsed.general.map((term) =>
          or(
            safeContains(bookmarks.title, term),
            safeContains(bookmarks.url, term),
            safeContains(bookmarks.description, term)
          )
        );
        // All general terms must match (AND logic)
        conditions.push(...generalConditions);
      }
    }

    if (browser) {
      conditions.push(eq(bookmarks.browser, browser));
    }

    // Only apply dropdown folder filter if not overridden by advanced search
    if (folder && !search?.includes("folder:")) {
      conditions.push(eq(bookmarks.folder, folder));
    }

    // Only apply dropdown tag filter if not overridden by advanced search
    if (tag && !search?.includes("tag:")) {
      // Match tag in comma-separated list (handles: "tag", "tag,other", "other,tag", "a,tag,b")
      const escapedTag = escapeLikePattern(tag);
      conditions.push(
        or(
          eq(bookmarks.tags, tag),
          safeLike(bookmarks.tags, `${escapedTag},%`),
          safeLike(bookmarks.tags, `%,${escapedTag}`),
          safeLike(bookmarks.tags, `%,${escapedTag},%`)
        )
      );
    }

    if (linkStatus) {
      const validStatuses = ["valid", "broken", "timeout", "redirect", "unchecked"] as const;
      type LinkStatusType = typeof validStatuses[number];

      if (linkStatus === "unchecked") {
        // Include both explicit "unchecked" and null values
        conditions.push(
          or(
            eq(bookmarks.linkStatus, "unchecked" as LinkStatusType),
            sql`${bookmarks.linkStatus} IS NULL`
          )
        );
      } else if (validStatuses.includes(linkStatus as LinkStatusType)) {
        conditions.push(eq(bookmarks.linkStatus, linkStatus as LinkStatusType));
      }
    }

    if (favorite === "true") {
      conditions.push(eq(bookmarks.isFavorite, true));
    }

    // Reading list filters
    if (readLater === "true") {
      conditions.push(eq(bookmarks.isReadLater, true));
    }
    if (read === "true") {
      conditions.push(eq(bookmarks.isRead, true));
    } else if (read === "false") {
      conditions.push(eq(bookmarks.isRead, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookmarks)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    // Build order by clause
    const orderFn = safeSortOrder === "asc" ? asc : desc;
    const orderByColumn = bookmarks[safeSortField];

    // Get paginated results
    const results = await db
      .select()
      .from(bookmarks)
      .where(whereClause)
      .orderBy(orderFn(orderByColumn))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching bookmarks", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}

// POST /api/bookmarks - Create a new bookmark
export async function POST(request: NextRequest): Promise<NextResponse<BookmarkResponse | ErrorResponse>> {
  try {
    const body = await request.json();

    const validation = validateBookmarkInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const { data } = validation;

    const result = await db
      .insert(bookmarks)
      .values({
        url: data.url,
        title: data.title,
        description: data.description ?? null,
        favicon: data.favicon ?? null,
        folder: data.folder ?? null,
        tags: data.tags ?? null,
        browser: data.browser ?? null,
        dateAdded: data.dateAdded ? new Date(data.dateAdded) : null,
      })
      .returning();

    const created = result[0];
    if (!created) {
      return NextResponse.json(
        { error: "Failed to create bookmark" },
        { status: 500 }
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("Error creating bookmark", { error: String(error) });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 }
    );
  }
}
