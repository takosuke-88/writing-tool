import { defineConfig } from "drizzle-kit";

// Use default DATABASE_URL if not provided (for development without database)
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://localhost:5432/writing_tool";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
