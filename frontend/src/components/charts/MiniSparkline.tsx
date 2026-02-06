import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { OHLCVData } from "../../api/endpoints/stocks";

interface MiniSparklineProps {
  data: OHLCVData[];
  width?: number;
  height?: number;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  width = 100,
  height = 30,
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-chart-background rounded"
        style={{ width, height }}
      >
        <span className="text-xs text-text-secondary">No data</span>
      </div>
    );
  }

  // Determine if the trend is positive or negative
  const firstValue = data[0].close;
  const lastValue = data[data.length - 1].close;
  const isPositive = lastValue >= firstValue;
  const strokeColor = isPositive ? "#0ECB81" : "#F6465D";

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="close"
          stroke={strokeColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
