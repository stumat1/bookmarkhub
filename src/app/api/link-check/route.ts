import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "@/src/lib/logger";
import { LINK_CHECK_TIMEOUT_MS, LINK_CHECK_BATCH_SIZE, USER_AGENT_LINK_CHECKER } from "@/src/lib/constants";

type LinkStatus = "valid" | "broken" | "timeout" | "redirect" | "unchecked";

interface CheckResult {
  id: number;
  url: string;
  status: LinkStatus;
  statusCode?: number;
  redirectUrl?: string;
  error?: string;
}

interface CheckRequest {
  ids: number[] | "all";
  batchSize?: number;
}

// Check a single URL and return its status
async function checkUrlWithMethod(url: string, method: "HEAD" | "GET"): Promise<{ status: LinkStatus; statusCode?: number; redirectUrl?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT_LINK_CHECKER,
      },
    });

    clearTimeout(timeoutId);

    const statusCode = response.status;

    // Check for redirects (3xx status codes)
    if (statusCode >= 300 && statusCode < 400) {
      const redirectUrl = response.headers.get("location") || undefined;
      return { status: "redirect", statusCode, redirectUrl };
    }

    // Check for success (2xx status codes)
    if (statusCode >= 200 && statusCode < 300) {
      return { status: "valid", statusCode };
    }

    // Everything else is considered broken
    return { status: "broken", statusCode };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { status: "timeout", error: `Request timed out after ${LINK_CHECK_TIMEOUT_MS / 1000} seconds` };
      }
      return { status: "broken", error: error.message };
    }

    return { status: "broken", error: "Unknown error occurred" };
  }
}

// Check a single URL - tries HEAD first, falls back to GET if HEAD is rejected
async function checkUrl(url: string): Promise<{ status: LinkStatus; statusCode?: number; redirectUrl?: string; error?: string }> {
  const headResult = await checkUrlWithMethod(url, "HEAD");

  // If HEAD returned 405 Method Not Allowed or 403 Forbidden, retry with GET
  // Many servers reject HEAD requests but respond fine to GET
  if (headResult.statusCode === 405 || headResult.statusCode === 403) {
    return checkUrlWithMethod(url, "GET");
  }

  return headResult;
}

// POST /api/link-check - Check links for specified bookmarks
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CheckRequest = await request.json();
    const { ids, batchSize = LINK_CHECK_BATCH_SIZE } = body;

    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      return NextResponse.json(
        { error: "ids is required and must be an array of numbers or 'all'" },
        { status: 400 }
      );
    }

    // Fetch bookmarks to check
    let bookmarksToCheck;
    if (ids === "all") {
      bookmarksToCheck = await db.select({ id: bookmarks.id, url: bookmarks.url }).from(bookmarks);
    } else {
      bookmarksToCheck = await db
        .select({ id: bookmarks.id, url: bookmarks.url })
        .from(bookmarks)
        .where(inArray(bookmarks.id, ids));
    }

    if (bookmarksToCheck.length === 0) {
      return NextResponse.json({ results: [], checked: 0, total: 0 });
    }

    const results: CheckResult[] = [];

    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < bookmarksToCheck.length; i += batchSize) {
      const batch = bookmarksToCheck.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (bookmark) => {
          const checkResult = await checkUrl(bookmark.url);

          // Update the database with the result
          await db
            .update(bookmarks)
            .set({
              linkStatus: checkResult.status,
              lastChecked: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(bookmarks.id, bookmark.id));

          return {
            id: bookmark.id,
            url: bookmark.url,
            ...checkResult,
          };
        })
      );

      results.push(...batchResults);
    }

    // Calculate summary
    const summary = {
      valid: results.filter((r) => r.status === "valid").length,
      broken: results.filter((r) => r.status === "broken").length,
      timeout: results.filter((r) => r.status === "timeout").length,
      redirect: results.filter((r) => r.status === "redirect").length,
    };

    return NextResponse.json({
      results,
      checked: results.length,
      total: bookmarksToCheck.length,
      summary,
    });
  } catch (error) {
    logger.error("Error checking links", { error: String(error) });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to check links" },
      { status: 500 }
    );
  }
}

// GET /api/link-check - Get link health statistics
export async function GET(): Promise<NextResponse> {
  try {
    const allBookmarks = await db
      .select({
        id: bookmarks.id,
        linkStatus: bookmarks.linkStatus,
        lastChecked: bookmarks.lastChecked,
      })
      .from(bookmarks);

    const total = allBookmarks.length;
    const valid = allBookmarks.filter((b) => b.linkStatus === "valid").length;
    const broken = allBookmarks.filter((b) => b.linkStatus === "broken").length;
    const timeout = allBookmarks.filter((b) => b.linkStatus === "timeout").length;
    const redirect = allBookmarks.filter((b) => b.linkStatus === "redirect").length;
    const unchecked = allBookmarks.filter((b) => b.linkStatus === "unchecked" || !b.linkStatus).length;

    const checked = total - unchecked;
    const healthPercentage = checked > 0 ? Math.round((valid / checked) * 100) : 100;

    return NextResponse.json({
      total,
      checked,
      unchecked,
      valid,
      broken,
      timeout,
      redirect,
      healthPercentage,
    });
  } catch (error) {
    logger.error("Error fetching link health", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch link health statistics" },
      { status: 500 }
    );
  }
}
