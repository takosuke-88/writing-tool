export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    nodeVersion: process.version,
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      nodeEnv: process.env.NODE_ENV,
      type: "diagnostic",
    },
  });
}
