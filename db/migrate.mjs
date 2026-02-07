import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use environment variable for database path, default to sqlite.db in project root
const dbPath =
  process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "sqlite.db");

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database - create file if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "");
}

const sqlite = new Database(dbPath);

// Enable WAL mode
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");

const db = drizzle(sqlite);

// Run migrations
console.log("Running migrations...");
migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
console.log("Migrations completed successfully!");

sqlite.close();
