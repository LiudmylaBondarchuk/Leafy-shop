let db: any;

if (process.env.DATABASE_URL) {
  const { neon } = require("@neondatabase/serverless");
  const { drizzle } = require("drizzle-orm/neon-http");
  const schema = require("./schema-pg");
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
} else {
  const Database = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const path = require("path");
  const schema = require("./schema");
  const dbPath = path.join(process.cwd(), "leafy.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
}

export { db };
