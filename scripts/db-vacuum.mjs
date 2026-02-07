/**
 * Run VACUUM and ANALYZE on the SQLite database to reclaim space and optimize.
 * Should be run during low-usage periods (e.g., weekly via cron).
 *
 * Usage: node scripts/db-vacuum.mjs
 *
 * Environment variables:
 *   SQLITE_DB_PATH - Path to database (default: ./sqlite.db)
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "sqlite.db");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

const sizeBefore = fs.statSync(dbPath).size;
console.log(
  `Database size before VACUUM: ${(sizeBefore / 1024 / 1024).toFixed(2)} MB`
);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

console.log("Running VACUUM...");
db.exec("VACUUM");

console.log("Running ANALYZE...");
db.exec("ANALYZE");

db.close();

const sizeAfter = fs.statSync(dbPath).size;
console.log(
  `Database size after VACUUM: ${(sizeAfter / 1024 / 1024).toFixed(2)} MB`
);
console.log(
  `Space reclaimed: ${((sizeBefore - sizeAfter) / 1024 / 1024).toFixed(2)} MB`
);
