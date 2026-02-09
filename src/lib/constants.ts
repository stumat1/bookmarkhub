// =============================================================================
// Centralized configuration constants for BookmarkHub
// =============================================================================

// -- Pagination ---------------------------------------------------------------
export const BOOKMARKS_PAGE_SIZE = 50;
export const BOOKMARKS_API_DEFAULT_LIMIT = 20;
export const BOOKMARKS_API_MAX_LIMIT = 100;
export const MAX_VISIBLE_PAGES = 5;
export const EXPORT_PAGE_SIZE = 100;

// -- Timeouts & Delays --------------------------------------------------------
export const FETCH_METADATA_TIMEOUT_MS = 5000;
export const LINK_CHECK_TIMEOUT_MS = 10_000;
export const LINK_CHECK_BATCH_SIZE = 10;
export const METADATA_MAX_BYTES = 50 * 1024;
export const MODAL_FOCUS_DELAY_MS = 100;
export const NOTIFICATION_DURATION_MS = 4000;
export const MODAL_CLOSE_DELAY_MS = 1000;
export const SEARCH_BLUR_DELAY_MS = 200;
export const COPY_FEEDBACK_DELAY_MS = 2000;

// -- Fetch Retry --------------------------------------------------------------
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BASE_DELAY_MS = 1000;
export const RETRY_STATUS_THRESHOLD = 500;

// -- Image Dimensions ---------------------------------------------------------
export const FAVICON_SIZE = 32;
export const FAVICON_SIZE_LARGE = 128;
export const SCREENSHOT_VIEWPORT = { width: 1280, height: 800 } as const;
export const BOOKMARKLET_POPUP = { width: 600, height: 500 } as const;

// -- localStorage Keys --------------------------------------------------------
export const STORAGE_KEYS = {
  THEME: "theme",
  SORT_BY: "bookmarks-sort-by",
  SORT_ORDER: "bookmarks-sort-order",
  SEARCH_HISTORY: "bookmark-search-history",
} as const;

// -- Sort Defaults ------------------------------------------------------------
export const DEFAULT_SORT_FIELD = "createdAt";
export const DEFAULT_SORT_ORDER = "desc";
export const VALID_SORT_FIELDS = ["createdAt", "title", "url", "dateAdded", "updatedAt"] as const;

// -- Link Statuses ------------------------------------------------------------
export const LINK_STATUSES = ["valid", "broken", "timeout", "redirect", "unchecked"] as const;

// -- Search -------------------------------------------------------------------
export const MAX_SEARCH_HISTORY = 10;

// -- External Services --------------------------------------------------------
export const GOOGLE_FAVICON_BASE = "https://www.google.com/s2/favicons";
export const MICROLINK_API_BASE = "https://api.microlink.io/";

// -- User Agents --------------------------------------------------------------
export const USER_AGENT_METADATA = "BookmarkHub/1.0";
export const USER_AGENT_LINK_CHECKER = "BookmarkHub Link Checker/1.0";

// -- Misc Limits --------------------------------------------------------------
export const RECENT_IMPORTS_LIMIT = 10;
export const BROKEN_LINKS_FETCH_LIMIT = 1000;
export const DUPLICATE_CHECK_LIMIT = 5;
