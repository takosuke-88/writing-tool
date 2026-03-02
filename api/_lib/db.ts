import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

// Do NOT throw at module initialization — this crashes the entire Vercel
// serverless function before the handler even runs.
// Instead, create a lazy client and let errors surface at query time
// with proper HTTP error responses.
const sql = connectionString ? neon(connectionString) : null;

export function getDb() {
  if (!sql) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL is not set. Please configure your database in Vercel Environment Variables.",
    );
  }
  return drizzle(sql);
}
