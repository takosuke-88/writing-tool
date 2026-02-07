import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const now = Date.now();
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).getTime();
    const start30Days = now - 30 * 24 * 60 * 60 * 1000;

    // Fetch logs from Vercel KV
    const logs = await kv.zrange("usage:daily", start30Days, now);

    // Initialize stats
    const stats = {
      today: { requests: 0, cost: 0, byAPI: {} },
      thisMonth: { requests: 0, cost: 0, byAPI: {} },
      dailyBreakdown: [],
      budget: {
        limit: 50, // $50 monthly budget
        remaining: 50,
        percentage: 0,
        warning: false,
        danger: false,
      },
    };

    const dailyMap = new Map();

    for (const logItem of logs) {
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

    // Budget calculations
    stats.budget.remaining = Math.max(0, stats.budget.limit - stats.thisMonth.cost);
    stats.budget.percentage = (stats.thisMonth.cost / stats.budget.limit) * 100;
    stats.budget.warning = stats.thisMonth.cost > 40;
    stats.budget.danger = stats.thisMonth.cost > 50;

    res.status(200).json(stats);
  } catch (error) {
    console.error("Usage Stats Error:", error);
    res.status(500).json({ error: error.message });
  }
}
