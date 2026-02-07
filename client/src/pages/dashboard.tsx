import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface UsageStats {
  today: {
    requests: number;
    cost: number;
    byAPI: Record<string, { requests: number; cost: number }>;
  };
  thisMonth: {
    requests: number;
    cost: number;
    byAPI: Record<string, { requests: number; cost: number }>;
  };
  dailyBreakdown: Array<{
    date: string;
    cost: number;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">読み込み中...</div>;
  if (!stats) return <div className="p-8">データを取得できませんでした。</div>;

  const formatCurrency = (val: number) => {
    // USD表記
    return `$${val.toFixed(4)}`;
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">API使用状況ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Stats */}
        <Card>
          <CardHeader>
            <CardTitle>今日の使用状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {formatCurrency(stats.today.cost)}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              合計リクエスト数: {stats.today.requests}回
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">プロバイダー別内訳:</h4>
              {Object.entries(stats.today.byAPI).map(([provider, data]) => (
                <div key={provider} className="flex justify-between text-sm">
                  <span className="capitalize">{provider}</span>
                  <span>
                    {formatCurrency(data.cost)} ({data.requests}回)
                  </span>
                </div>
              ))}
              {Object.keys(stats.today.byAPI).length === 0 && (
                <div className="text-gray-400 text-sm">データなし</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* This Month's Stats */}
        <Card>
          <CardHeader>
            <CardTitle>今月の使用状況 (過去30日)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {formatCurrency(stats.thisMonth.cost)}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              合計リクエスト数: {stats.thisMonth.requests}回
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">プロバイダー別内訳:</h4>
              {Object.entries(stats.thisMonth.byAPI).map(([provider, data]) => (
                <div key={provider} className="flex justify-between text-sm">
                  <span className="capitalize">{provider}</span>
                  <span>
                    {formatCurrency(data.cost)} ({data.requests}回)
                  </span>
                </div>
              ))}
              {Object.keys(stats.thisMonth.byAPI).length === 0 && (
                <div className="text-gray-400 text-sm">データなし</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <Card>
        <CardHeader>
          <CardTitle>日別コスト推移</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
              />
              <Legend />
              <Bar dataKey="cost" fill="#8884d8" name="Cost (USD)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
