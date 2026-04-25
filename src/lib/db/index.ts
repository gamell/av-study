import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

let _db: BunSQLiteDatabase<typeof schema> | null = null;

function getDbPath() {
  const dir = process.env.DATA_DIR ?? join(process.cwd(), "data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, "pilot-study.db");
}

export function getDb() {
  if (!_db) {
    const sqlite = new Database(getDbPath(), { create: true });
    sqlite.run("PRAGMA journal_mode = WAL;");
    sqlite.run("PRAGMA foreign_keys = ON;");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

/** Convenience accessor — same as getDb() but shorter for import sites */
export const db = new Proxy({} as BunSQLiteDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
