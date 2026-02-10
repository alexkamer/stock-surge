import { useState, useEffect } from "react";
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
import { TrendingUp, TrendingDown, PieChartIcon, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [showSlowLoadingMessage, setShowSlowLoadingMessage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const chartsPerPage = 2; // Show 2 chart sections at a time

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["portfolio-analytics", period],
    queryFn: () => portfolioApi.getAnalytics(period),
    refetchInterval: 60000,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Cache for 5 minutes
  });

  // Show slow loading message after 3 seconds
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSlowLoadingMessage(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSlowLoadingMessage(false);
    }
  }, [isLoading]);

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
      <div className="space-y-8 animate-pulse">
        {/* Period Selector Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-700 rounded"></div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 w-16 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="h-4 w-32 bg-gray-700 rounded mb-2"></div>
              <div className="h-8 w-40 bg-gray-700 rounded mb-1"></div>
              <div className="h-4 w-24 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>

        {/* Chart Skeletons */}
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="h-6 w-48 bg-gray-700 rounded mb-4"></div>
            <div className="h-[300px] bg-gray-700/30 rounded"></div>
          </div>
        ))}

        <div className="text-center mt-4">
          <div className="text-gray-400">Loading analytics data...</div>
          {showSlowLoadingMessage && (
            <div className="text-gray-500 text-sm mt-2">
              This is taking longer than usual. We're fetching historical data for all your positions.
            </div>
          )}
        </div>
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

  // Define chart sections for pagination
  const chartSections = [
    { id: "performance", title: "Performance Overview" },
    { id: "allocation", title: "Allocation & Performance" },
  ];

  const totalPages = chartSections.length;

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Portfolio Analytics</h2>
            <p className="text-gray-400 text-sm">Track your portfolio performance over time</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  period === option.value
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Portfolio Value */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Portfolio Value
            </div>
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-white mb-2">
            {formatCurrency(latestPerformance.value)}
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${latestPerformance.pl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {latestPerformance.pl >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {formatCurrency(latestPerformance.pl)}
            </span>
          </div>
          <div className={`text-xs mt-1 ${latestPerformance.pl >= 0 ? "text-green-400/70" : "text-red-400/70"}`}>
            {formatPercent(latestPerformance.pl_percent)} all time
          </div>
        </div>

        {/* Period Change */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              {PERIOD_OPTIONS.find((o) => o.value === period)?.label} Change
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${periodChange >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
              {periodChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>
          <div className={`text-2xl lg:text-3xl font-bold mb-2 ${periodChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatCurrency(Math.abs(periodChange))}
          </div>
          <div className={`text-sm font-medium ${periodChangePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatPercent(periodChangePercent)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {PERIOD_OPTIONS.find((o) => o.value === period)?.label} ago
          </div>
        </div>

        {/* Top Performer */}
        {analytics.top_performers.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                Top Gainer
              </div>
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {analytics.top_performers[0].ticker}
            </div>
            <div className="text-sm font-medium text-green-400">
              {formatCurrency(analytics.top_performers[0].pl)}
            </div>
            <div className="text-xs text-green-400/70 mt-1">
              {formatPercent(analytics.top_performers[0].pl_percent)} gain
            </div>
          </div>
        )}

        {/* Diversification */}
        {analytics.sector_allocation.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                Sectors
              </div>
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <PieChartIcon className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {analytics.sector_allocation.length}
            </div>
            <div className="text-sm font-medium text-gray-400">
              {analytics.sector_allocation[0].sector}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.sector_allocation[0].percent.toFixed(1)}% of portfolio
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="text-sm text-gray-400">
          Section <span className="text-white font-semibold">{currentPage}</span> of {totalPages}
          <span className="ml-2 text-gray-500">• {chartSections[currentPage - 1].title}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              currentPage === 1
                ? "bg-gray-900 text-gray-600 cursor-not-allowed"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              currentPage === totalPages
                ? "bg-gray-900 text-gray-600 cursor-not-allowed"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page 1: Performance Charts */}
      {currentPage === 1 && (
        <div className="space-y-6">
          {/* Portfolio Value Chart */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Portfolio Value Over Time</h3>
                <p className="text-sm text-gray-400">Track your total portfolio value</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
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
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* P/L Chart */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Profit & Loss Trend</h3>
                <p className="text-sm text-gray-400">Visualize gains and losses over time</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
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
        </div>
      )}

      {/* Page 2: Allocation & Performance */}
      {currentPage === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector Allocation */}
            {analytics.sector_allocation.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <PieChartIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Sector Allocation</h3>
                    <p className="text-sm text-gray-400">Portfolio diversification by sector</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
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
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Top Performers</h3>
                  <p className="text-sm text-gray-400">Your best investments</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
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
                <Bar dataKey="pl" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Performers */}
          {analytics.bottom_performers.length > 0 && analytics.bottom_performers.some((p) => p.pl < 0) && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Bottom Performers</h3>
                  <p className="text-sm text-gray-400">Positions needing attention</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
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
                <Bar dataKey="pl" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
