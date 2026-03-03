export default async function handler(req, res) {
  // Check all possible Neon/Postgres env var names
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_HOST: !!process.env.POSTGRES_HOST,
    POSTGRES_USER: !!process.env.POSTGRES_USER,
    POSTGRES_DATABASE: !!process.env.POSTGRES_DATABASE,
  };

  // Try to connect to DB if any URL is found
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null;

  let dbTest = null;
  if (connectionString) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(connectionString);
      const result = await sql`SELECT 1 as connected`;
      dbTest = { success: true, result: result[0] };
    } catch (e) {
      dbTest = { success: false, error: e.message };
    }
  }

  return res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    nodeVersion: process.version,
    envVars: envCheck,
    dbTest,
  });
}
