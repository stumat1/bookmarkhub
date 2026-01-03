import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { inArray } from "drizzle-orm";

// Request Types
interface ExportRequest {
  ids: number[] | "all";
}

interface ErrorResponse {
  error: string;
  details?: string[];
}

interface BookmarkRow {
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

// Validation
function validateExportInput(
  data: unknown
): { valid: true; data: ExportRequest } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Request body must be an object"] };
  }

  const body = data as Record<string, unknown>;

  if (body.ids === undefined) {
    errors.push("ids is required (array of bookmark IDs or 'all')");
  } else if (body.ids !== "all") {
    if (!Array.isArray(body.ids)) {
      errors.push("ids must be an array of numbers or 'all'");
    } else if (body.ids.length === 0) {
      errors.push("ids array cannot be empty");
    } else if (!body.ids.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0)) {
      errors.push("ids must contain only positive integers");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      ids: body.ids as number[] | "all",
    },
  };
}

// Generate standard Netscape bookmark HTML format
function generateBookmarkHtml(bookmarkList: BookmarkRow[]): string {
  // Group bookmarks by folder
  const folderMap = new Map<string, BookmarkRow[]>();
  const noFolder: BookmarkRow[] = [];

  for (const bookmark of bookmarkList) {
    if (bookmark.folder) {
      const existing = folderMap.get(bookmark.folder) || [];
      existing.push(bookmark);
      folderMap.set(bookmark.folder, existing);
    } else {
      noFolder.push(bookmark);
    }
  }

  // Escape HTML entities
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  // Generate bookmark entry
  const generateBookmarkEntry = (bookmark: BookmarkRow, indent: string): string => {
    const addDate = bookmark.dateAdded
      ? Math.floor(bookmark.dateAdded.getTime() / 1000)
      : Math.floor(bookmark.createdAt.getTime() / 1000);

    let entry = `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${addDate}"`;

    if (bookmark.favicon) {
      entry += ` ICON="${escapeHtml(bookmark.favicon)}"`;
    }

    entry += `>${escapeHtml(bookmark.title)}</A>`;

    if (bookmark.description) {
      entry += `\n${indent}<DD>${escapeHtml(bookmark.description)}`;
    }

    return entry;
  };

  // Build HTML
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // Add bookmarks without folders first
  for (const bookmark of noFolder) {
    html += generateBookmarkEntry(bookmark, "    ") + "\n";
  }

  // Add folders with their bookmarks
  for (const [folderName, folderBookmarks] of folderMap) {
    const addDate = Math.floor(Date.now() / 1000);
    html += `    <DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${addDate}">${escapeHtml(folderName)}</H3>\n`;
    html += `    <DL><p>\n`;

    for (const bookmark of folderBookmarks) {
      html += generateBookmarkEntry(bookmark, "        ") + "\n";
    }

    html += `    </DL><p>\n`;
  }

  html += `</DL><p>
`;

  return html;
}

// GET /api/export - Redirect to export page
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL("/export", request.url);
  return NextResponse.redirect(url);
}

// POST /api/export - Export bookmarks to HTML file
export async function POST(request: NextRequest): Promise<NextResponse<Blob | ErrorResponse>> {
  try {
    const body = await request.json();

    const validation = validateExportInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const { ids } = validation.data;

    // Fetch bookmarks
    let bookmarkList: BookmarkRow[];

    if (ids === "all") {
      bookmarkList = await db.select().from(bookmarks);
    } else {
      bookmarkList = await db
        .select()
        .from(bookmarks)
        .where(inArray(bookmarks.id, ids));

      // Check if all requested IDs were found
      if (bookmarkList.length !== ids.length) {
        const foundIds = new Set(bookmarkList.map((b) => b.id));
        const missingIds = ids.filter((id) => !foundIds.has(id));
        return NextResponse.json(
          { error: "Some bookmarks not found", details: [`Missing IDs: ${missingIds.join(", ")}`] },
          { status: 404 }
        );
      }
    }

    if (bookmarkList.length === 0) {
      return NextResponse.json(
        { error: "No bookmarks to export" },
        { status: 404 }
      );
    }

    // Generate HTML
    const html = generateBookmarkHtml(bookmarkList);

    // Return as downloadable file
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `bookmarks-export-${timestamp}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting bookmarks:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export bookmarks" },
      { status: 500 }
    );
  }
}
