import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { portfolioApi } from "../../api/endpoints/portfolio";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, PieChartIcon, BarChart3 } from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
];

const SECTOR_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export default function PortfolioAnalytics() {
  const [period, setPeriod] = useState("1mo");

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["portfolio-analytics", period],
    queryFn: () => portfolioApi.getAnalytics(period),
    refetchInterval: 60000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400">Error loading analytics</div>
      </div>
    );
  }

  if (!analytics || analytics.performance.data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">
          No data available. Add positions to your portfolio to see analytics.
        </div>
      </div>
    );
  }

  const latestPerformance = analytics.performance.data[analytics.performance.data.length - 1];
  const firstPerformance = analytics.performance.data[0];
  const periodChange = latestPerformance.pl - firstPerformance.pl;
  const periodChangePercent =
    ((latestPerformance.value - firstPerformance.value) / firstPerformance.value) * 100;

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Portfolio Analytics</h2>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            Current Portfolio Value
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(latestPerformance.value)}
          </div>
          <div className={`flex items-center gap-2 text-sm ${latestPerformance.pl >= 0 ? "text-green-500" : "text-red-500"}`}>
            {latestPerformance.pl >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {formatCurrency(latestPerformance.pl)} ({formatPercent(latestPerformance.pl_percent)})
            </span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            Period Change ({PERIOD_OPTIONS.find((o) => o.value === period)?.label})
          </div>
          <div className={`text-3xl font-bold mb-1 ${periodChange >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(periodChange)}
          </div>
          <div className={`text-sm ${periodChangePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatPercent(periodChangePercent)}
          </div>
        </div>
      </div>

      {/* Portfolio Value Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Portfolio Value</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.performance.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#888", fontSize: 12 }}
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tick={{ fill: "#888", fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value: number) => [formatCurrency(value), "Value"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* P/L Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Profit/Loss</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.performance.data}>
            <defs>
              <linearGradient id="plGradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="plGradientNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#888", fontSize: 12 }}
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tick={{ fill: "#888", fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value: number, name: string) => {
                if (name === "pl") return [formatCurrency(value), "P/L"];
                if (name === "pl_percent") return [formatPercent(value), "P/L %"];
                return [value, name];
              }}
            />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            {analytics.performance.data.some((d) => d.pl >= 0) && (
              <Area
                type="monotone"
                dataKey="pl"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#plGradientPositive)"
                isAnimationActive={false}
                data={analytics.performance.data.map((d) => ({
                  ...d,
                  pl: d.pl >= 0 ? d.pl : 0,
                }))}
              />
            )}
            {analytics.performance.data.some((d) => d.pl < 0) && (
              <Area
                type="monotone"
                dataKey="pl"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#plGradientNegative)"
                isAnimationActive={false}
                data={analytics.performance.data.map((d) => ({
                  ...d,
                  pl: d.pl < 0 ? d.pl : 0,
                }))}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout for Sector and Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sector Allocation */}
        {analytics.sector_allocation.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Sector Allocation</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.sector_allocation}
                  dataKey="value"
                  nameKey="sector"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ sector, percent }) => `${sector}: ${percent.toFixed(1)}%`}
                  labelLine={{ stroke: "#888" }}
                >
                  {analytics.sector_allocation.map((entry, index) => (
                    <Cell key={entry.sector} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Performers */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Top Performers</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.top_performers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
              <XAxis type="number" tick={{ fill: "#888", fontSize: 12 }} />
              <YAxis
                dataKey="ticker"
                type="category"
                tick={{ fill: "#888", fontSize: 12 }}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "pl") return [formatCurrency(value), "P/L"];
                  if (name === "pl_percent") return [formatPercent(value), "P/L %"];
                  return [value, name];
                }}
              />
              <Bar dataKey="pl" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Performers */}
      {analytics.bottom_performers.length > 0 && analytics.bottom_performers.some((p) => p.pl < 0) && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Bottom Performers</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.bottom_performers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
              <XAxis type="number" tick={{ fill: "#888", fontSize: 12 }} />
              <YAxis
                dataKey="ticker"
                type="category"
                tick={{ fill: "#888", fontSize: 12 }}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "pl") return [formatCurrency(value), "P/L"];
                  if (name === "pl_percent") return [formatPercent(value), "P/L %"];
                  return [value, name];
                }}
              />
              <Bar dataKey="pl" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
