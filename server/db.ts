import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema";

// Make database connection optional for development
// Vercel Postgres provides POSTGRES_URL; legacy code uses DATABASE_URL
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "postgresql://localhost:5432/writing_tool";

// Create Neon HTTP connection client (poolless, ideal for Vercel Edge/Serverless Functions)
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

// Check if database is available via HTTP request
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.warn(
      "⚠️  Database not available. Running in mock data mode or throwing in production.",
    );
    return false;
  }
}
