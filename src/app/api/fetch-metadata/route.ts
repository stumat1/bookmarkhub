import { NextRequest, NextResponse } from "next/server";

interface MetadataResponse {
  title: string | null;
  favicon: string | null;
}

interface ErrorResponse {
  error: string;
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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

  if (!validateUrl(url)) {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    );
  }

  let title: string | null = null;
  let favicon: string | null = null;

  try {
    const hostname = new URL(url).hostname;
    favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    // Invalid URL for favicon - leave null
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BookmarkHub/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (response.ok) {
      // Only read first 50KB to find the title
      const reader = response.body?.getReader();
      if (reader) {
        let html = "";
        const decoder = new TextDecoder();
        let bytesRead = 0;
        const maxBytes = 50 * 1024;

        while (bytesRead < maxBytes) {
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
