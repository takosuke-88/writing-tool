import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // Check if KV is available
    const isKVAvailable = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

    const now = Date.now();
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).getTime();
    const start30Days = now - 30 * 24 * 60 * 60 * 1000;

    // Fetch logs (zrange returns array of members)
    let logs = [];
    if (isKVAvailable) {
      logs = await kv.zrange("usage:daily", start30Days, now);
    } else {
      // Mock data for local development
      console.log("[Dev Mode] Using mock data for stats");
      logs = [
        JSON.stringify({ cost: 50000000, provider: "claude", model: "claude-sonnet-4-5-20250929", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() }),
        JSON.stringify({ cost: 30000000, provider: "gemini", model: "gemini-2.5-flash", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() }),
        JSON.stringify({ cost: 20000000, provider: "perplexity", model: "sonar-pro", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }),
      ];
    }

    // Initialize stats
    const stats = {
      today: { requests: 0, cost: 0, byAPI: {} },
      thisMonth: { requests: 0, cost: 0, byAPI: {} },
      dailyBreakdown: [],
    };

    const dailyMap = new Map();

    for (const logItem of logs) {
      // Member is possibly a string depending on how it was stored (JSON.stringify)
      // If zrange returns objects (if configured/parsed), check type
      // Vercel KV REST API returns strings usually if simple, or we used sdks.
      // @vercel/kv zrange returns what you stored. We stored strings? JSON.stringify.
      // Let's safe parse.
      let log;
      try {
        log = typeof logItem === "string" ? JSON.parse(logItem) : logItem;
      } catch (e) {
        continue;
      }

      const logTime = new Date(log.timestamp).getTime();
      const costUSD = log.cost / 1_000_000_000;

      // Daily Chart
      const dateStr = log.timestamp.split("T")[0];
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + costUSD);

      // Today
      if (logTime >= startOfDay) {
        stats.today.requests++;
        stats.today.cost += costUSD;

        if (!stats.today.byAPI[log.provider])
          stats.today.byAPI[log.provider] = { requests: 0, cost: 0 };
        stats.today.byAPI[log.provider].requests++;
        stats.today.byAPI[log.provider].cost += costUSD;
      }

      // This Month
      if (logTime >= startOfMonth) {
        stats.thisMonth.requests++;
        stats.thisMonth.cost += costUSD;

        if (!stats.thisMonth.byAPI[log.provider])
          stats.thisMonth.byAPI[log.provider] = { requests: 0, cost: 0 };
        stats.thisMonth.byAPI[log.provider].requests++;
        stats.thisMonth.byAPI[log.provider].cost += costUSD;
      }
    }

    stats.dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json(stats);
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: error.message });
  }
}
