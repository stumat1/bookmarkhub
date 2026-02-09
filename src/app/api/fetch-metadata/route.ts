import { NextRequest, NextResponse } from "next/server";
import { isValidUrl } from "@/src/lib/url";
import { getFaviconUrl } from "@/src/lib/url";
import { FETCH_METADATA_TIMEOUT_MS, METADATA_MAX_BYTES, USER_AGENT_METADATA } from "@/src/lib/constants";

interface MetadataResponse {
  title: string | null;
  favicon: string | null;
}

interface ErrorResponse {
  error: string;
}

// Extract <title> from HTML string
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  // Decode common HTML entities and trim
  return match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

// GET /api/fetch-metadata?url=... - Fetch page title and favicon for a URL
export async function GET(
  request: NextRequest
): Promise<NextResponse<MetadataResponse | ErrorResponse>> {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "url query parameter is required" },
      { status: 400 }
    );
  }

  if (!isValidUrl(url)) {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    );
  }

  let title: string | null = null;
  let favicon: string | null = null;

  favicon = getFaviconUrl(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_METADATA_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT_METADATA,
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (response.ok) {
      const reader = response.body?.getReader();
      if (reader) {
        let html = "";
        const decoder = new TextDecoder();
        let bytesRead = 0;

        while (bytesRead < METADATA_MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
          bytesRead += value.length;

          // Stop early if we found the closing title tag
          if (html.includes("</title>") || html.includes("</Title>") || html.includes("</TITLE>")) {
            break;
          }
        }

        reader.cancel();
        title = extractTitle(html);
      }
    }
  } catch {
    // Failed to fetch - return what we have (favicon at minimum)
  }

  return NextResponse.json({ title, favicon });
}
