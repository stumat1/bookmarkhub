/**
 * SQLite backup script using better-sqlite3's .backup() API.
 * This is WAL-safe (unlike raw file copy).
 *
 * Usage: node scripts/db-backup.mjs
 *
 * Environment variables:
 *   SQLITE_DB_PATH  - Path to source database (default: ./sqlite.db)
 *   BACKUP_DIR      - Directory for backups (default: ./backups)
 *   BACKUP_RETAIN   - Number of backups to keep (default: 7)
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "sqlite.db");
const backupDir =
  process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");
const retainCount = parseInt(process.env.BACKUP_RETAIN || "7", 10);

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `sqlite-${timestamp}.db`);

console.log(`Backing up ${dbPath} to ${backupPath}...`);

const source = new Database(dbPath, { readonly: true });

try {
  await source.backup(backupPath);
  console.log("Backup completed successfully.");

  // Verify backup
  const backupSize = fs.statSync(backupPath).size;
  console.log(`Backup size: ${(backupSize / 1024 / 1024).toFixed(2)} MB`);

  // Cleanup old backups
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("sqlite-") && f.endsWith(".db"))
    .sort()
    .reverse();

  if (files.length > retainCount) {
    const toDelete = files.slice(retainCount);
    for (const file of toDelete) {
      fs.unlinkSync(path.join(backupDir, file));
      console.log(`Deleted old backup: ${file}`);
    }
  }

  console.log(`Retained ${Math.min(files.length, retainCount)} backup(s).`);
} catch (err) {
  console.error("Backup failed:", err.message);
  process.exit(1);
} finally {
  source.close();
}
