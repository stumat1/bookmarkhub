import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath =
  process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "sqlite.db");

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
