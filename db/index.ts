import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Use environment variable for database path, default to sqlite.db in project root
const dbPath =
  process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "sqlite.db");

// Initialize database - create file if it doesn't exist to prevent errors
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "");
}

const sqlite = new Database(dbPath);

// Enable WAL mode with increased timeout for concurrent access
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000"); // 5 second timeout

export const db = drizzle(sqlite, { schema });
