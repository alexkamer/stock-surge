import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface IndustryData {
  name: string;
  weight: number;
  symbol: string;
  color: string;
  key: string;
}

interface IndustryPieChartProps {
  industries: IndustryData[];
  onIndustryClick: (industryKey: string) => void;
}

interface ChartDataItem {
  name: string;
  value: number;
  key: string;
  color: string;
  percentage: string;
}

export const IndustryPieChart: React.FC<IndustryPieChartProps> = ({
  industries,
  onIndustryClick,
}) => {
  // Transform data for chart
  const chartData: ChartDataItem[] = industries.map((industry) => ({
    name: industry.name,
    value: industry.weight * 100, // Convert to percentage
    key: industry.key,
    color: industry.color,
    percentage: `${(industry.weight * 100).toFixed(1)}%`,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-text-primary mb-1">{data.name}</p>
          <p className="text-sm text-text-secondary">
            Market Weight: <span className="font-mono text-text-primary">{data.percentage}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          innerRadius={0}
          paddingAngle={0}
          onClick={(data) => {
            if (data && data.key) {
              onIndustryClick(data.key);
            }
          }}
          style={{ cursor: "pointer" }}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              stroke="none"
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
};
