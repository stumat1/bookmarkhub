import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";

// Request/Response Types
interface BookmarkUpdateRequest {
  url?: string;
  title?: string;
  description?: string | null;
  favicon?: string | null;
  folder?: string | null;
  browser?: string | null;
  dateAdded?: string | null;
}

interface BookmarkResponse {
  id: number;
  url: string;
  title: string;
  description: string | null;
  favicon: string | null;
  folder: string | null;
  browser: string | null;
  dateAdded: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorResponse {
  error: string;
  details?: string[];
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Validation helpers
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateId(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function validateBookmarkUpdate(
  data: unknown
): { valid: true; data: BookmarkUpdateRequest } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Request body must be an object"] };
  }

  const body = data as Record<string, unknown>;

  // Check if at least one field is being updated
  const updateableFields = ["url", "title", "description", "favicon", "folder", "browser", "dateAdded"];
  const hasUpdates = updateableFields.some((field) => field in body);
  if (!hasUpdates) {
    return { valid: false, errors: ["At least one field must be provided for update"] };
  }

  if (body.url !== undefined) {
    if (typeof body.url !== "string") {
      errors.push("url must be a string");
    } else if (!validateUrl(body.url)) {
      errors.push("url must be a valid URL");
    }
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      errors.push("title must be a string");
    } else if (body.title.trim().length === 0) {
      errors.push("title cannot be empty");
    }
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
    errors.push("description must be a string or null");
  }

  if (body.favicon !== undefined && body.favicon !== null && typeof body.favicon !== "string") {
    errors.push("favicon must be a string or null");
  }

  if (body.folder !== undefined && body.folder !== null && typeof body.folder !== "string") {
    errors.push("folder must be a string or null");
  }

  if (body.browser !== undefined && body.browser !== null && typeof body.browser !== "string") {
    errors.push("browser must be a string or null");
  }

  if (body.dateAdded !== undefined && body.dateAdded !== null) {
    if (typeof body.dateAdded !== "string") {
      errors.push("dateAdded must be an ISO date string or null");
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
      url: body.url as string | undefined,
      title: body.title as string | undefined,
      description: body.description as string | null | undefined,
      favicon: body.favicon as string | null | undefined,
      folder: body.folder as string | null | undefined,
      browser: body.browser as string | null | undefined,
      dateAdded: body.dateAdded as string | null | undefined,
    },
  };
}

// GET /api/bookmarks/[id] - Fetch single bookmark
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<BookmarkResponse | ErrorResponse>> {
  try {
    const { id } = await context.params;
    const bookmarkId = validateId(id);

    if (!bookmarkId) {
      return NextResponse.json(
        { error: "Invalid bookmark ID" },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId))
      .limit(1);

    const bookmark = result[0];
    if (!bookmark) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("Error fetching bookmark:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmark" },
      { status: 500 }
    );
  }
}

// PUT /api/bookmarks/[id] - Update a bookmark
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<BookmarkResponse | ErrorResponse>> {
  try {
    const { id } = await context.params;
    const bookmarkId = validateId(id);

    if (!bookmarkId) {
      return NextResponse.json(
        { error: "Invalid bookmark ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validation = validateBookmarkUpdate(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const { data } = validation;

    // Check if bookmark exists
    const existing = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.url !== undefined) {
      updateData.url = data.url;
    }
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.favicon !== undefined) {
      updateData.favicon = data.favicon;
    }
    if (data.folder !== undefined) {
      updateData.folder = data.folder;
    }
    if (data.browser !== undefined) {
      updateData.browser = data.browser;
    }
    if (data.dateAdded !== undefined) {
      updateData.dateAdded = data.dateAdded ? new Date(data.dateAdded) : null;
    }

    const result = await db
      .update(bookmarks)
      .set(updateData)
      .where(eq(bookmarks.id, bookmarkId))
      .returning();

    const updated = result[0];
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update bookmark" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating bookmark:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update bookmark" },
      { status: 500 }
    );
  }
}

// DELETE /api/bookmarks/[id] - Delete a bookmark
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ success: true } | ErrorResponse>> {
  try {
    const { id } = await context.params;
    const bookmarkId = validateId(id);

    if (!bookmarkId) {
      return NextResponse.json(
        { error: "Invalid bookmark ID" },
        { status: 400 }
      );
    }

    // Check if bookmark exists
    const existing = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}
