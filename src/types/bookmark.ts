// =============================================================================
// Shared bookmark types used across the application
// =============================================================================

export type LinkStatus = "valid" | "broken" | "timeout" | "redirect" | "unchecked";

export interface BookmarkData {
  id: number;
  url: string;
  title: string;
  description: string | null;
  favicon: string | null;
  folder: string | null;
  tags: string | null;
  browser: string | null;
  dateAdded: Date | null;
  createdAt: Date;
  updatedAt: Date;
  linkStatus: LinkStatus | null;
  lastChecked: Date | null;
  isFavorite: boolean;
  thumbnailUrl: string | null;
  isReadLater: boolean;
  isRead: boolean;
  readingNotes: string | null;
}

export interface PaginatedResponse {
  data: BookmarkData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecentImport {
  id: number;
  title: string;
  url: string;
  browser: string | null;
  createdAt: string;
}

export interface StatsResponse {
  totalBookmarks: number;
  bookmarksByBrowser: { browser: string | null; count: number }[];
  recentImports: RecentImport[];
}

export interface DuplicateGroup {
  type: "exact_url" | "similar_url" | "similar_title";
  reason: string;
  bookmarks: BookmarkData[];
}

export interface DuplicatesResponse {
  groups: DuplicateGroup[];
  totalDuplicates: number;
  totalGroups: number;
}
