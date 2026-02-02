import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, like, and, or, sql, desc, asc } from "drizzle-orm";

// Request/Response Types
interface BookmarkCreateRequest {
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  folder?: string;
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
      browser: body.browser as string | undefined,
      dateAdded: body.dateAdded as string | undefined,
    },
  };
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

    if (search) {
      conditions.push(
        or(
          like(bookmarks.title, `%${search}%`),
          like(bookmarks.url, `%${search}%`),
          like(bookmarks.description, `%${search}%`)
        )
      );
    }

    if (browser) {
      conditions.push(eq(bookmarks.browser, browser));
    }

    if (folder) {
      conditions.push(eq(bookmarks.folder, folder));
    }

    if (tag) {
      // Match tag in comma-separated list (handles: "tag", "tag,other", "other,tag", "a,tag,b")
      conditions.push(
        or(
          eq(bookmarks.tags, tag),
          like(bookmarks.tags, `${tag},%`),
          like(bookmarks.tags, `%,${tag}`),
          like(bookmarks.tags, `%,${tag},%`)
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
    console.error("Error fetching bookmarks:", error);
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
    console.error("Error creating bookmark:", error);

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
