import React from "react";
import { formatCurrency, formatLargeNumber } from "../../lib/formatters";
import type { CompanyInfo } from "../../api/endpoints/stocks";

interface MetricsGridProps {
  info: CompanyInfo;
  priceData: {
    last_price: number;
    volume: number;
    previous_close: number;
  };
}

interface MetricItemProps {
  label: string;
  value: string | number | null | undefined;
  formatter?: (value: number) => string;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, formatter }) => {
  let displayValue = "N/A";

  if (value !== null && value !== undefined) {
    if (formatter && typeof value === "number") {
      displayValue = formatter(value);
    } else {
      displayValue = String(value);
    }
  }

  return (
    <div className="p-4 bg-surface rounded border border-border">
      <p className="metric-label text-xs mb-1">{label}</p>
      <p className="metric-value text-xl">{displayValue}</p>
    </div>
  );
};

export const MetricsGrid: React.FC<MetricsGridProps> = ({ info, priceData }) => {
  const metrics = [
    {
      label: "Market Cap",
      value: info.market_cap,
      formatter: formatLargeNumber,
    },
    {
      label: "P/E Ratio",
      value: info.pe_ratio,
      formatter: (v: number) => v.toFixed(2),
    },
    {
      label: "Forward P/E",
      value: info.forward_pe,
      formatter: (v: number) => v.toFixed(2),
    },
    {
      label: "Dividend Yield",
      value: info.dividend_yield ? info.dividend_yield * 100 : null,
      formatter: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      label: "Beta",
      value: info.beta,
      formatter: (v: number) => v.toFixed(2),
    },
    {
      label: "52 Week High",
      value: info.fifty_two_week_high,
      formatter: formatCurrency,
    },
    {
      label: "52 Week Low",
      value: info.fifty_two_week_low,
      formatter: formatCurrency,
    },
    {
      label: "Volume",
      value: priceData.volume,
      formatter: formatLargeNumber,
    },
    {
      label: "Previous Close",
      value: priceData.previous_close,
      formatter: formatCurrency,
    },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <MetricItem
            key={index}
            label={metric.label}
            value={metric.value}
            formatter={metric.formatter}
          />
        ))}
      </div>
    </div>
  );
};
