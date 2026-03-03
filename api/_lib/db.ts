import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Vercel Storage (Neon) sets: POSTGRES_URL, POSTGRES_URL_NON_POOLING, etc.
// Some setups use DATABASE_URL instead.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

// Do NOT throw at module initialization — this crashes the entire Vercel
// serverless function before the handler even runs.
const sql = connectionString ? neon(connectionString) : null;

export function getDb() {
  if (!sql) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL or POSTGRES_URL in Vercel Environment Variables.",
    );
  }
  return drizzle(sql);
}
