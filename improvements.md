# BookmarkHub Improvements

A reference document outlining potential features and enhancements for the BookmarkHub application.

---

## Current Features

- Import/export browser bookmarks (Netscape HTML format)
- Search by title, URL, description
- Filter by browser source and folder
- Edit bookmark details (title, URL, folder, tags, notes)
- Folder hierarchy organization
- Dark/light theme toggle
- Dashboard with basic stats (total count, by browser, recent imports)
- Duplicate detection on import
- Pagination (50 per page)

---

## Proposed Improvements

### 1. Activate Tags System DONE

**Priority:** High | **Effort:** Low

Tags are already stored in the database but not utilized in the UI.

- [ ] Add tag filtering in the bookmarks sidebar/header
- [ ] Implement tag autocomplete when editing bookmarks
- [ ] Create a tag cloud or tag list showing popular tags
- [ ] Support multi-tag filtering (AND/OR logic)
- [ ] Show tags as chips/badges on bookmark cards

### 2. Dead Link Checker DONE

**Priority:** High | **Effort:** Medium

Help users maintain bookmark hygiene by detecting broken links.

- [ ] Add "Check Links" action to scan bookmarks for broken URLs
- [ ] Display link status indicators (valid, broken, timeout, redirect)
- [ ] Dashboard widget showing bookmark health percentage
- [ ] Bulk action to archive or delete dead links
- [ ] Optional scheduled background checks

### 3. Bulk Operations DONE

**Priority:** High | **Effort:** Medium

Enable efficient management of multiple bookmarks at once.

- [ ] Checkbox selection for multiple bookmarks
- [ ] "Select all" on current page and current filter
- [ ] Bulk delete with confirmation
- [ ] Bulk move to folder
- [ ] Bulk add/remove tags
- [ ] Bulk export selected items

### 4. Sorting Options DONE

**Priority:** High | **Effort:** Low

Currently bookmarks have no user-controlled sort order.

- [ ] Sort by date added (newest/oldest)
- [ ] Sort by title (A-Z / Z-A)
- [ ] Sort by URL domain
- [ ] Sort by last modified
- [ ] Persist sort preference in local storage

### 5. Favorites / Pinning DONE

**Priority:** Medium | **Effort:** Low

Quick access to important bookmarks.

- [ ] Add `isFavorite` boolean field to schema
- [ ] Star/pin toggle on each bookmark
- [ ] "Favorites" filter option
- [ ] Pinned bookmarks section at top of list
- [ ] Quick access favorites on dashboard

### 6. Quick Add Bookmarklet DONE

**Priority:** Medium | **Effort:** Low

Allow users to add bookmarks from any webpage without leaving it.

- [x] Generate a draggable bookmarklet link
- [x] Bookmarklet auto-captures current page URL and title
- [x] Opens BookmarkHub in popup or new tab with pre-filled form
- [x] Instructions page for installation

### 7. Enhanced Search DONE

**Priority:** Medium | **Effort:** Low

Improve search capabilities beyond current implementation.

- [x] Include notes/description in search results
- [x] Highlight search matches in results
- [x] Search history / recent searches
- [x] Advanced search syntax (e.g., `folder:Work tag:important`)
- [x] Search within specific fields only

### 8. Bookmark Preview DONE

**Priority:** Low | **Effort:** High

Visual previews of bookmarked pages.

- [x] Show page thumbnail on hover
- [x] Screenshot capture service integration
- [x] Preview modal with page snapshot
- [x] Fallback to favicon + domain for failed captures
- [x] Option to refresh/update preview

### 9. Reading List / "Read Later" DONE

**Priority:** Medium | **Effort:** Medium

Separate workflow for content to consume later.

- [x] Add `isReadLater` and `isRead` fields to schema
- [x] "Save for Later" action on bookmarks
- [x] Dedicated "Reading List" view
- [x] Mark as "Read" to archive
- [x] Reading list count on dashboard
- [x] Optional reading progress notes

### 10. Smart Duplicate Management DONE

**Priority:** Medium | **Effort:** Medium

Proactive duplicate detection beyond import time.

- [x] "Find Duplicates" tool in bookmarks view
- [x] Detect exact URL matches
- [x] Detect similar URLs (with/without trailing slash, http vs https)
- [x] Detect similar titles with different URLs
- [x] Merge duplicates (combine tags, keep newest)
- [x] Dashboard duplicate count indicator

### 11. Keyboard Shortcuts DONE

**Priority:** Medium | **Effort:** Low

Power user navigation and actions.

- [x] `j` / `k` - Navigate up/down in list
- [x] `o` or `Enter` - Open selected bookmark
- [x] `e` - Edit selected bookmark
- [x] `d` - Delete selected bookmark (with confirmation)
- [x] `/` - Focus search input
- [x] `n` - New bookmark
- [x] `f` - Toggle favorite
- [x] `Escape` - Close modals, clear selection
- [x] `?` - Show keyboard shortcuts help

### 12. Manual Bookmark Creation DONE

**Priority:** High | **Effort:** Low

Add bookmarks directly without importing a file.

- [x] "Add Bookmark" button in header/bookmarks page
- [x] Form with URL, title, folder, tags, notes
- [x] Auto-fetch page title from URL
- [x] Auto-fetch favicon from URL
- [x] URL validation and duplicate warning

---

## Quick Wins

Features with highest impact and lowest implementation effort:

| Feature                  | Impact | Effort |
| ------------------------ | ------ | ------ |
| Enable tag filtering     | High   | Low    |
| Add sorting options      | High   | Low    |
| Manual bookmark creation | High   | Low    |
| Favorites/pinning        | Medium | Low    |
| Keyboard shortcuts       | Medium | Low    |
| Quick add bookmarklet    | Medium | Low    |

---

## Future Considerations

Features that may be valuable but require more research or infrastructure:

- **Browser Extension**: Native extension for Chrome/Firefox to add bookmarks
- **Sync/Cloud Backup**: Export to cloud storage or sync across devices
- **Sharing**: Public/private bookmark collections with shareable links
- **AI Organization**: Auto-suggest folders/tags based on content
- **Bookmark Annotations**: Highlight and save snippets from pages
- **Collaboration**: Shared folders with team members
- **API Access**: Public API for third-party integrations
- **Mobile App**: PWA or native mobile application

---

## Implementation Notes

### Database Changes Required

Some features require schema updates:

```typescript
// New fields for bookmarks table (all implemented)
isFavorite: integer({ mode: 'boolean' }).default(false), // DONE
isReadLater: integer({ mode: 'boolean' }).default(false), // DONE
isRead: integer({ mode: 'boolean' }).default(false), // DONE
readingNotes: text(), // DONE - for reading progress tracking
linkStatus: text(), // 'valid' | 'broken' | 'timeout' | 'redirect' | 'unchecked' // DONE
lastChecked: integer({ mode: 'timestamp' }), // DONE
thumbnailUrl: text(), // DONE - for bookmark previews
```

### New Indexes

```typescript
idx_bookmarks_favorite: index('idx_bookmarks_favorite').on(bookmarks.isFavorite),
idx_bookmarks_tags: index('idx_bookmarks_tags').on(bookmarks.tags),
idx_bookmarks_read_later: index('idx_bookmarks_read_later').on(bookmarks.isReadLater),
```

---

_Last updated: February 2026_
