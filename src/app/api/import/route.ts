import { NextRequest, NextResponse } from "next/server";
import {
  parseBookmarkHTML,
  BookmarkParseError,
  type ParsedBookmark,
} from "@/src/lib/parsers/bookmarkParser";
import {
  insertBookmarks,
  findDuplicates,
  DatabaseError,
  type NewBookmark,
} from "@/src/lib/db/operations";

// ============================================================================
// Types
// ============================================================================

interface DuplicateBookmark {
  url: string;
  title: string;
  existingId: number;
}

interface ImportResponse {
  success: boolean;
  message: string;
  imported: number;
  duplicates: DuplicateBookmark[];
  errors?: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert parsed bookmarks to database format
 */
function toNewBookmark(
  parsed: ParsedBookmark,
  browserType: string
): NewBookmark {
  return {
    url: parsed.url,
    title: parsed.title,
    folder: parsed.folderPath.length > 0 ? parsed.folderPath.join(" > ") : null,
    favicon: parsed.icon ?? null,
    browser: browserType,
    dateAdded: parsed.dateAdded,
  };
}

/**
 * Check which bookmarks are duplicates
 */
async function partitionDuplicates(
  bookmarks: ParsedBookmark[]
): Promise<{
  unique: ParsedBookmark[];
  duplicates: DuplicateBookmark[];
}> {
  const unique: ParsedBookmark[] = [];
  const duplicates: DuplicateBookmark[] = [];
  const seenUrls = new Set<string>();

  for (const bookmark of bookmarks) {
    const normalizedUrl = bookmark.url.trim().toLowerCase();

    // Skip if we've already processed this URL in this batch
    if (seenUrls.has(normalizedUrl)) {
      duplicates.push({
        url: bookmark.url,
        title: bookmark.title,
        existingId: -1, // Duplicate within the same import
      });
      continue;
    }
    seenUrls.add(normalizedUrl);

    // Check database for existing bookmark
    const existing = await findDuplicates(bookmark.url);
    if (existing.length > 0) {
      duplicates.push({
        url: bookmark.url,
        title: bookmark.title,
        existingId: existing[0].id,
      });
    } else {
      unique.push(bookmark);
    }
  }

  return { unique, duplicates };
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file");

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "No file provided. Please upload a bookmark HTML file.",
          imported: 0,
          duplicates: [],
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file format. Expected a file upload.",
          imported: 0,
          duplicates: [],
        },
        { status: 400 }
      );
    }

    // Validate file extension/type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".html") && !fileName.endsWith(".htm")) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file type. Please upload an HTML file (.html or .htm).",
          imported: 0,
          duplicates: [],
        },
        { status: 400 }
      );
    }

    // Read file content
    const htmlContent = await file.text();

    if (!htmlContent.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "The uploaded file is empty.",
          imported: 0,
          duplicates: [],
        },
        { status: 400 }
      );
    }

    // Parse bookmark HTML
    const parseResult = parseBookmarkHTML(htmlContent);

    if (parseResult.bookmarks.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No bookmarks found in the uploaded file.",
          imported: 0,
          duplicates: [],
          errors: parseResult.parseErrors.length > 0 ? parseResult.parseErrors : undefined,
        },
        { status: 200 }
      );
    }

    // Partition bookmarks into unique and duplicates
    const { unique, duplicates } = await partitionDuplicates(parseResult.bookmarks);

    // Insert unique bookmarks
    let importedCount = 0;
    if (unique.length > 0) {
      const newBookmarks = unique.map((b) =>
        toNewBookmark(b, parseResult.browserType)
      );
      const inserted = await insertBookmarks(newBookmarks);
      importedCount = inserted.length;
    }

    // Build response message
    let message: string;
    if (importedCount > 0 && duplicates.length > 0) {
      message = `Successfully imported ${importedCount} bookmark${importedCount !== 1 ? "s" : ""}. ${duplicates.length} duplicate${duplicates.length !== 1 ? "s" : ""} skipped.`;
    } else if (importedCount > 0) {
      message = `Successfully imported ${importedCount} bookmark${importedCount !== 1 ? "s" : ""}.`;
    } else if (duplicates.length > 0) {
      message = `All ${duplicates.length} bookmark${duplicates.length !== 1 ? "s" : ""} already exist in the database.`;
    } else {
      message = "No bookmarks were imported.";
    }

    return NextResponse.json(
      {
        success: true,
        message,
        imported: importedCount,
        duplicates,
        errors: parseResult.parseErrors.length > 0 ? parseResult.parseErrors : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle parsing errors
    if (error instanceof BookmarkParseError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          imported: 0,
          duplicates: [],
        },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        {
          success: false,
          message: `Database error: ${error.message}`,
          imported: 0,
          duplicates: [],
        },
        { status: 500 }
      );
    }

    // Handle unexpected errors
    console.error("Import error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while importing bookmarks.",
        imported: 0,
        duplicates: [],
      },
      { status: 500 }
    );
  }
}
