import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Better Auth tables
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// Bookmarks table
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
    // Link checker fields
    linkStatus: text("link_status").$type<"valid" | "broken" | "timeout" | "redirect" | "unchecked">().default("unchecked"),
    lastChecked: integer("last_checked", { mode: "timestamp" }),
    // Favorites
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    // Preview thumbnail
    thumbnailUrl: text("thumbnail_url"),
    // Reading list fields
    isReadLater: integer("is_read_later", { mode: "boolean" }).notNull().default(false),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    readingNotes: text("reading_notes"),
  },
  (table) => [
    index("idx_bookmarks_url").on(table.url),
    index("idx_bookmarks_browser").on(table.browser),
    index("idx_bookmarks_folder").on(table.folder),
    index("idx_bookmarks_link_status").on(table.linkStatus),
    index("idx_bookmarks_favorite").on(table.isFavorite),
    index("idx_bookmarks_read_later").on(table.isReadLater),
  ]
);
