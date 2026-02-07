import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const dbPath =
  process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "sqlite.db");

export async function GET() {
  let dbStatus: "connected" | "error" = "connected";
  let bookmarkCount = 0;
  let freePages = 0;
  let totalPages = 0;

  try {
    db.get<{ result: number }>(sql`SELECT 1 as result`);
    const countResult = db.get<{ count: number }>(
      sql`SELECT count(*) as count FROM bookmarks`
    );
    bookmarkCount = countResult?.count ?? 0;
    const pageCountResult = db.get<{ page_count: number }>(
      sql`SELECT * FROM pragma_page_count`
    );
    totalPages = pageCountResult?.page_count ?? 0;
    const freeListResult = db.get<{ freelist_count: number }>(
      sql`SELECT * FROM pragma_freelist_count`
    );
    freePages = freeListResult?.freelist_count ?? 0;
  } catch {
    dbStatus = "error";
  }

  // Get database file sizes
  let databaseSizeMB = 0;
  let walSizeMB = 0;
  try {
    if (fs.existsSync(dbPath)) {
      databaseSizeMB =
        Math.round((fs.statSync(dbPath).size / 1024 / 1024) * 100) / 100;
    }
    const walPath = dbPath + "-wal";
    if (fs.existsSync(walPath)) {
      walSizeMB =
        Math.round((fs.statSync(walPath).size / 1024 / 1024) * 100) / 100;
    }
  } catch {
    // File stat errors are non-critical
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";
  const httpStatus = dbStatus === "connected" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      databaseSizeMB,
      walSizeMB,
      bookmarkCount,
      totalPages,
      freePages,
    },
    { status: httpStatus }
  );
}
