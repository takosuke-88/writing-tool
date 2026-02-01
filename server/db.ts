import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Make database connection optional for development
const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/writing_tool";

const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

// Check if database is available
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    console.warn("⚠️  Database not available. Running in mock data mode.");
    return false;
  }
}
