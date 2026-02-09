import { GOOGLE_FAVICON_BASE, FAVICON_SIZE } from "./constants";

/**
 * Check whether a string is a valid URL.
 * Works identically on client and server.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract the hostname from a URL string, or return null if invalid.
 */
export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Build a Google Favicon service URL for the given page URL.
 * Returns the URL string, or a fallback if the page URL is invalid.
 */
export function getFaviconUrl(url: string, size: number = FAVICON_SIZE): string {
  const hostname = getHostname(url);
  if (!hostname) return `${GOOGLE_FAVICON_BASE}?domain=example.com&sz=${size}`;
  return `${GOOGLE_FAVICON_BASE}?domain=${hostname}&sz=${size}`;
}
