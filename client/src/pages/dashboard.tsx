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
    // Try /api/usage first, fallback to /api/stats
    fetch("/api/usage")
      .catch(() => fetch("/api/stats"))
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

  // Monthly budget and progress
  const MONTHLY_BUDGET = 50; // $50 target
  const monthlyProgress = (stats.thisMonth.cost / MONTHLY_BUDGET) * 100;
  const isWarning = stats.thisMonth.cost > 40;
  const isDanger = stats.thisMonth.cost > 50;

  const getProgressColor = () => {
    if (isDanger) return "bg-red-500";
    if (isWarning) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">API使用状況ダッシュボード</h1>

      {/* Monthly Budget Progress */}
      <Card className={isDanger ? "border-red-500 border-2" : isWarning ? "border-yellow-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>今月の予算進捗</span>
            {isDanger && <span className="text-red-500 text-sm font-normal">⚠️ 予算超過</span>}
            {isWarning && !isDanger && <span className="text-yellow-600 text-sm font-normal">⚠️ 予算警告</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <div>
                <div className="text-4xl font-bold">{formatCurrency(stats.thisMonth.cost)}</div>
                <div className="text-sm text-gray-500">目標: ${MONTHLY_BUDGET.toFixed(2)}以内</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">{monthlyProgress.toFixed(0)}%</div>
                <div className="text-xs text-gray-500">予算使用率</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-300 flex items-center justify-center text-white text-xs font-semibold`}
                style={{ width: `${Math.min(monthlyProgress, 100)}%` }}
              >
                {monthlyProgress > 10 && `${formatCurrency(stats.thisMonth.cost)} / $${MONTHLY_BUDGET}`}
              </div>
            </div>

            {isDanger && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                💰 予算を超過しています。使用量を確認してください。
              </div>
            )}
            {isWarning && !isDanger && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                ⚡ 予算の80%に達しました。残り${(MONTHLY_BUDGET - stats.thisMonth.cost).toFixed(2)}です。
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
