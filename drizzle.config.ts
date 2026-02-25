import { defineConfig } from "drizzle-kit";

// Use default DATABASE_URL if not provided (for development without database)
// Vercel Postgres provides POSTGRES_URL
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "postgresql://localhost:5432/writing_tool";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
