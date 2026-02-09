import { STORAGE_KEYS, MAX_SEARCH_HISTORY } from "@/src/lib/constants";

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const history = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const history = getSearchHistory();
    // Remove if already exists (will be re-added at top)
    const filtered = history.filter((h) => h !== query);
    // Add to beginning
    const updated = [query, ...filtered].slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  } catch {
    // Ignore storage errors
  }
}
