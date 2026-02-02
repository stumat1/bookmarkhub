import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { isNotNull } from "drizzle-orm";

interface TagCount {
  tag: string;
  count: number;
}

interface TagsResponse {
  tags: TagCount[];
  total: number;
}

// GET /api/tags - Fetch all unique tags with bookmark counts
export async function GET(): Promise<NextResponse<TagsResponse>> {
  try {
    // Fetch all bookmarks that have tags
    const results = await db
      .select({ tags: bookmarks.tags })
      .from(bookmarks)
      .where(isNotNull(bookmarks.tags));

    // Parse comma-separated tags and count occurrences
    const tagCounts = new Map<string, number>();

    for (const row of results) {
      if (row.tags) {
        const tagList = row.tags.split(",").map((t) => t.trim()).filter(Boolean);
        for (const tag of tagList) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    // Convert to array and sort alphabetically
    const tags: TagCount[] = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag));

    // Total is number of unique tags
    const total = tags.length;

    return NextResponse.json({ tags, total });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ tags: [], total: 0 }, { status: 500 });
  }
}
