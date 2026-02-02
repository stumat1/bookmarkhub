import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    favicon: text("favicon"),
    folder: text("folder"),
    tags: text("tags"),
    browser: text("browser"),
    dateAdded: integer("date_added", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_bookmarks_url").on(table.url),
    index("idx_bookmarks_browser").on(table.browser),
    index("idx_bookmarks_folder").on(table.folder),
  ]
);
