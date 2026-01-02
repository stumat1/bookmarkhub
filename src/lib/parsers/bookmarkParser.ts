/**
 * Bookmark HTML Parser
 * Parses standard browser bookmark HTML export files (Chrome, Firefox, Edge, Safari)
 * using the Netscape Bookmark Format (DL/DT tags)
 */

// ============================================================================
// Types
// ============================================================================

export type BrowserType = 'chrome' | 'firefox' | 'edge' | 'safari' | 'unknown';

export interface ParsedBookmark {
  title: string;
  url: string;
  folderPath: string[];
  dateAdded: Date | null;
  icon?: string;
}

export interface BookmarkFolder {
  name: string;
  path: string[];
  dateAdded: Date | null;
  dateModified: Date | null;
}

export interface ParseResult {
  bookmarks: ParsedBookmark[];
  folders: BookmarkFolder[];
  browserType: BrowserType;
  totalCount: number;
  parseErrors: string[];
}

export class BookmarkParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookmarkParseError';
  }
}

// ============================================================================
// Browser Detection
// ============================================================================

function detectBrowserType(html: string): BrowserType {
  const lowerHtml = html.toLowerCase();
  const first2000Chars = lowerHtml.slice(0, 2000);

  // Chrome/Edge: Usually contains "<!DOCTYPE NETSCAPE-Bookmark-file-1>"
  // and specific meta tags or comments
  if (first2000Chars.includes('<!doctype netscape-bookmark-file-1>')) {
    // Edge often includes "edge" in personal toolbar folder name or metadata
    if (lowerHtml.includes('edge') && lowerHtml.includes('favorites')) {
      return 'edge';
    }

    // Firefox includes specific attributes like LAST_CHARSET, SHORTCUTURL
    if (
      lowerHtml.includes('last_charset') ||
      lowerHtml.includes('shortcuturl') ||
      lowerHtml.includes('web_panel') ||
      first2000Chars.includes('mozilla')
    ) {
      return 'firefox';
    }

    // Chrome typically has simpler structure
    if (
      lowerHtml.includes('bookmarks bar') ||
      lowerHtml.includes('bookmark bar') ||
      lowerHtml.includes('chrome')
    ) {
      return 'chrome';
    }
  }

  // Safari: Uses property list style or different format hints
  if (
    first2000Chars.includes('safari') ||
    first2000Chars.includes('<!doctype plist') ||
    lowerHtml.includes('com.apple')
  ) {
    return 'safari';
  }

  // Firefox fallback checks
  if (first2000Chars.includes('mozilla') || first2000Chars.includes('firefox')) {
    return 'firefox';
  }

  // Chrome/Chromium fallback
  if (first2000Chars.includes('chromium') || first2000Chars.includes('google chrome')) {
    return 'chrome';
  }

  return 'unknown';
}

// ============================================================================
// HTML Parsing Utilities
// ============================================================================

interface TagMatch {
  tag: string;
  attributes: Record<string, string>;
  content: string;
  fullMatch: string;
  startIndex: number;
  endIndex: number;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  // Match attribute="value" or attribute='value' or attribute=value
  const attrRegex = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/gi;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const key = match[1].toUpperCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes[key] = value;
  }

  return attributes;
}

function parseTimestamp(timestamp: string | undefined): Date | null {
  if (!timestamp) return null;

  const num = parseInt(timestamp, 10);
  if (isNaN(num)) return null;

  // Timestamps in bookmark files are usually Unix timestamps (seconds since epoch)
  // Some browsers use milliseconds, so check the magnitude
  if (num > 1e12) {
    // Likely milliseconds
    return new Date(num);
  }
  // Likely seconds
  return new Date(num * 1000);
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char);
  }

  // Handle numeric entities (&#123; or &#x7B;)
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return result;
}

function extractTextContent(html: string): string {
  // Remove all HTML tags and get text content
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, '').trim());
}

// ============================================================================
// Main Parser
// ============================================================================

interface ParseContext {
  bookmarks: ParsedBookmark[];
  folders: BookmarkFolder[];
  errors: string[];
  currentPath: string[];
}

function parseBookmarkAnchor(
  anchorHtml: string,
  context: ParseContext
): ParsedBookmark | null {
  // Extract anchor tag attributes
  const anchorMatch = anchorHtml.match(/<a\s+([^>]*)>([\s\S]*?)<\/a>/i);
  if (!anchorMatch) {
    return null;
  }

  const attributes = parseAttributes(anchorMatch[1]);
  const title = extractTextContent(anchorMatch[2]);
  const url = attributes.HREF;

  if (!url) {
    return null;
  }

  const bookmark: ParsedBookmark = {
    title: title || url,
    url,
    folderPath: [...context.currentPath],
    dateAdded: parseTimestamp(attributes.ADD_DATE),
  };

  // Extract icon if present
  if (attributes.ICON) {
    bookmark.icon = attributes.ICON;
  } else if (attributes.ICON_URI) {
    bookmark.icon = attributes.ICON_URI;
  }

  return bookmark;
}

function parseFolderHeader(
  headerHtml: string,
  context: ParseContext
): BookmarkFolder | null {
  // Extract H3 tag for folder name and attributes
  const h3Match = headerHtml.match(/<h3\s*([^>]*)>([\s\S]*?)<\/h3>/i);
  if (!h3Match) {
    return null;
  }

  const attributes = parseAttributes(h3Match[1]);
  const name = extractTextContent(h3Match[2]);

  if (!name) {
    return null;
  }

  const folder: BookmarkFolder = {
    name,
    path: [...context.currentPath, name],
    dateAdded: parseTimestamp(attributes.ADD_DATE),
    dateModified: parseTimestamp(attributes.LAST_MODIFIED),
  };

  return folder;
}

function parseDL(html: string, context: ParseContext): void {
  // Find all DT elements at this level (not nested)
  let depth = 0;
  let currentDT = '';
  let inDT = false;
  let i = 0;

  const processCurrentDT = () => {
    if (!currentDT.trim()) return;

    const dtContent = currentDT;

    // Check if this DT contains a folder (H3) or a bookmark (A)
    const hasFolder = /<h3[\s>]/i.test(dtContent);
    const hasLink = /<a[\s>]/i.test(dtContent) && !hasFolder;

    if (hasLink) {
      // This is a bookmark
      const bookmark = parseBookmarkAnchor(dtContent, context);
      if (bookmark) {
        context.bookmarks.push(bookmark);
      }
    } else if (hasFolder) {
      // This is a folder
      const folder = parseFolderHeader(dtContent, context);
      if (folder) {
        context.folders.push(folder);
        context.currentPath.push(folder.name);

        // Find and parse nested DL
        const dlMatch = dtContent.match(/<dl[\s>]/i);
        if (dlMatch) {
          const dlStartIndex = dtContent.indexOf(dlMatch[0]);
          const nestedDLContent = extractDLContent(dtContent.slice(dlStartIndex));
          if (nestedDLContent) {
            parseDL(nestedDLContent, context);
          }
        }

        context.currentPath.pop();
      }
    }
  };

  // Simple state machine to parse DT elements
  while (i < html.length) {
    const remaining = html.slice(i);

    // Check for DT start
    const dtStartMatch = remaining.match(/^<dt[\s>]/i);
    if (dtStartMatch && depth === 0) {
      processCurrentDT();
      currentDT = '';
      inDT = true;
      i += dtStartMatch[0].length;
      continue;
    }

    // Check for DL start (increases nesting depth)
    const dlStartMatch = remaining.match(/^<dl[\s>]/i);
    if (dlStartMatch) {
      if (inDT) {
        currentDT += dlStartMatch[0];
      }
      depth++;
      i += dlStartMatch[0].length;
      continue;
    }

    // Check for DL end
    const dlEndMatch = remaining.match(/^<\/dl>/i);
    if (dlEndMatch) {
      if (inDT) {
        currentDT += dlEndMatch[0];
      }
      depth--;
      i += dlEndMatch[0].length;
      continue;
    }

    // Check for next DT at same level (ends current DT)
    if (inDT && depth === 0) {
      const nextDTMatch = remaining.match(/^<dt[\s>]/i);
      if (nextDTMatch) {
        processCurrentDT();
        currentDT = '';
        i += nextDTMatch[0].length;
        continue;
      }
    }

    if (inDT) {
      currentDT += html[i];
    }
    i++;
  }

  // Process last DT
  processCurrentDT();
}

function extractDLContent(html: string): string | null {
  // Find matching DL tags
  const dlStart = html.match(/<dl[^>]*>/i);
  if (!dlStart) return null;

  let depth = 1;
  let i = dlStart.index! + dlStart[0].length;
  const startContent = i;

  while (i < html.length && depth > 0) {
    const remaining = html.slice(i);

    if (remaining.match(/^<dl[\s>]/i)) {
      depth++;
      i += 3;
      continue;
    }

    if (remaining.match(/^<\/dl>/i)) {
      depth--;
      if (depth === 0) {
        return html.slice(startContent, i);
      }
      i += 5;
      continue;
    }

    i++;
  }

  // If we didn't find closing tag, return what we have
  return html.slice(startContent);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse browser bookmark HTML export file content
 *
 * @param htmlContent - The HTML content from a browser bookmark export file
 * @returns ParseResult containing bookmarks, folders, browser type, and any parse errors
 * @throws BookmarkParseError if the HTML is invalid or cannot be parsed
 *
 * @example
 * ```typescript
 * import { parseBookmarkHTML } from '@/src/lib/parsers/bookmarkParser';
 *
 * const html = await file.text();
 * const result = parseBookmarkHTML(html);
 *
 * console.log(`Found ${result.totalCount} bookmarks from ${result.browserType}`);
 *
 * for (const bookmark of result.bookmarks) {
 *   console.log(`${bookmark.title}: ${bookmark.url}`);
 *   console.log(`  Folder: ${bookmark.folderPath.join(' > ')}`);
 * }
 * ```
 */
export function parseBookmarkHTML(htmlContent: string): ParseResult {
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new BookmarkParseError('Invalid input: htmlContent must be a non-empty string');
  }

  const trimmedContent = htmlContent.trim();

  if (!trimmedContent) {
    throw new BookmarkParseError('Invalid input: htmlContent is empty');
  }

  // Check for basic bookmark file structure
  const hasNetscapeDoctype =
    trimmedContent.toLowerCase().includes('<!doctype netscape-bookmark-file-1>') ||
    trimmedContent.toLowerCase().includes('netscape-bookmark-file');

  const hasDLTags = /<dl[\s>]/i.test(trimmedContent);

  if (!hasNetscapeDoctype && !hasDLTags) {
    throw new BookmarkParseError(
      'Invalid bookmark file: Missing Netscape bookmark format or DL tags. ' +
        'Ensure this is a valid browser bookmark export file.'
    );
  }

  const browserType = detectBrowserType(trimmedContent);

  const context: ParseContext = {
    bookmarks: [],
    folders: [],
    errors: [],
    currentPath: [],
  };

  try {
    // Find the main DL content
    const mainDLContent = extractDLContent(trimmedContent);

    if (!mainDLContent) {
      throw new BookmarkParseError(
        'Invalid bookmark file: Could not find bookmark list (DL element)'
      );
    }

    parseDL(mainDLContent, context);
  } catch (error) {
    if (error instanceof BookmarkParseError) {
      throw error;
    }
    throw new BookmarkParseError(
      `Failed to parse bookmark file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return {
    bookmarks: context.bookmarks,
    folders: context.folders,
    browserType,
    totalCount: context.bookmarks.length,
    parseErrors: context.errors,
  };
}

/**
 * Validate if content appears to be a valid bookmark HTML file
 *
 * @param htmlContent - The content to validate
 * @returns true if the content appears to be a valid bookmark file
 */
export function isValidBookmarkHTML(htmlContent: string): boolean {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return false;
  }

  const lower = htmlContent.toLowerCase();
  return (
    (lower.includes('<!doctype netscape-bookmark-file-1>') ||
      lower.includes('netscape-bookmark-file')) &&
    /<dl[\s>]/i.test(htmlContent)
  );
}
