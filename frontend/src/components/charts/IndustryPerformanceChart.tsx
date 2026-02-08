import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PerformanceData {
  ticker: string;
  data: Array<{
    date: string;
    close: number;
    normalized_return: number;
  }>;
}

interface Props {
  performance: PerformanceData[];
  period?: string;
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
];

export const IndustryPerformanceChart: React.FC<Props> = ({ performance }) => {
  // Merge all data by date
  const chartData = React.useMemo(() => {
    const dateMap = new Map<string, any>();

    performance.forEach(({ ticker, data }) => {
      data.forEach(({ date, normalized_return }) => {
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        dateMap.get(date)![ticker] = normalized_return;
      });
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [performance]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs text-text-secondary mb-2">{new Date(label).toLocaleDateString()}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-mono font-medium">{entry.name}:</span>
              <span
                className={`font-mono font-bold ${
                  entry.value >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {entry.value >= 0 ? "+" : ""}
                {entry.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#888", fontSize: 12 }}
            tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          />
          <YAxis
            tick={{ fill: "#888", fontSize: 12 }}
            tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
            formatter={(value) => <span className="text-sm font-mono">{value}</span>}
          />
          {performance.map((item, index) => (
            <Line
              key={item.ticker}
              type="monotone"
              dataKey={item.ticker}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
