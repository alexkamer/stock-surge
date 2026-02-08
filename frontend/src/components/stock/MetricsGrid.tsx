import React, { useState } from "react";
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
  tooltip?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, formatter, tooltip }) => {
  let displayValue = "N/A";

  if (value !== null && value !== undefined) {
    if (formatter && typeof value === "number") {
      displayValue = formatter(value);
    } else {
      displayValue = String(value);
    }
  }

  return (
    <div className="p-4 bg-surface rounded border border-border" title={tooltip}>
      <p className="metric-label text-xs mb-1">{label}</p>
      <p className="metric-value text-xl">{displayValue}</p>
    </div>
  );
};

interface MetricSectionProps {
  title: string;
  metrics: Array<{
    label: string;
    value: string | number | null | undefined;
    formatter?: (value: number) => string;
    tooltip?: string;
  }>;
  defaultExpanded?: boolean;
}

const MetricSection: React.FC<MetricSectionProps> = ({ title, metrics, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-surface hover:bg-surface/80 flex items-center justify-between transition-colors"
      >
        <h4 className="font-semibold text-sm uppercase tracking-wider">{title}</h4>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric, index) => (
            <MetricItem
              key={index}
              label={metric.label}
              value={metric.value}
              formatter={metric.formatter}
              tooltip={metric.tooltip}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MetricsGrid: React.FC<MetricsGridProps> = ({ info, priceData }) => {
  const formatPercentage = (v: number) => `${(v * 100).toFixed(2)}%`;
  const formatRatio = (v: number) => v.toFixed(2);

  const valuationMetrics = [
    {
      label: "Market Cap",
      value: info.market_cap,
      formatter: formatLargeNumber,
      tooltip: "Total market value of outstanding shares"
    },
    {
      label: "Enterprise Value",
      value: info.enterprise_value,
      formatter: formatLargeNumber,
      tooltip: "Market cap + total debt - cash (true company value)"
    },
    {
      label: "P/E Ratio",
      value: info.pe_ratio,
      formatter: formatRatio,
      tooltip: "Price-to-Earnings ratio"
    },
    {
      label: "Forward P/E",
      value: info.forward_pe,
      formatter: formatRatio,
      tooltip: "Forward Price-to-Earnings ratio"
    },
    {
      label: "EV/Revenue",
      value: info.enterprise_to_revenue,
      formatter: formatRatio,
      tooltip: "Enterprise Value to Revenue ratio"
    },
    {
      label: "EV/EBITDA",
      value: info.enterprise_to_ebitda,
      formatter: formatRatio,
      tooltip: "Enterprise Value to EBITDA ratio (standard valuation metric)"
    },
    {
      label: "PEG Ratio",
      value: info.peg_ratio,
      formatter: formatRatio,
      tooltip: "Price/Earnings to Growth ratio"
    },
    {
      label: "Price/Book",
      value: info.price_to_book,
      formatter: formatRatio,
      tooltip: "Price-to-Book ratio"
    },
    {
      label: "Price/Sales",
      value: info.price_to_sales,
      formatter: formatRatio,
      tooltip: "Price-to-Sales ratio"
    },
  ];

  const profitabilityMetrics = [
    {
      label: "EPS (Trailing)",
      value: info.trailing_eps,
      formatter: formatCurrency,
      tooltip: "Earnings Per Share (trailing 12 months)"
    },
    {
      label: "EPS (Forward)",
      value: info.forward_eps,
      formatter: formatCurrency,
      tooltip: "Forward Earnings Per Share estimate"
    },
    {
      label: "Profit Margin",
      value: info.profit_margin,
      formatter: formatPercentage,
      tooltip: "Net profit as percentage of revenue"
    },
    {
      label: "Operating Margin",
      value: info.operating_margin,
      formatter: formatPercentage,
      tooltip: "Operating income as percentage of revenue"
    },
    {
      label: "EBITDA Margin",
      value: info.ebitda_margins,
      formatter: formatPercentage,
      tooltip: "EBITDA as percentage of revenue (operational efficiency)"
    },
    {
      label: "ROE",
      value: info.return_on_equity,
      formatter: formatPercentage,
      tooltip: "Return on Equity"
    },
    {
      label: "ROA",
      value: info.return_on_assets,
      formatter: formatPercentage,
      tooltip: "Return on Assets"
    },
  ];

  const cashFlowMetrics = [
    {
      label: "Free Cash Flow",
      value: info.free_cash_flow,
      formatter: formatLargeNumber,
      tooltip: "Operating cash flow minus capital expenditures"
    },
    {
      label: "EBITDA",
      value: info.ebitda,
      formatter: formatLargeNumber,
      tooltip: "Earnings before interest, taxes, depreciation, and amortization"
    },
    {
      label: "Revenue",
      value: info.revenue,
      formatter: formatLargeNumber,
      tooltip: "Total revenue (trailing 12 months)"
    },
    {
      label: "Revenue/Share",
      value: info.revenue_per_share,
      formatter: formatCurrency,
      tooltip: "Revenue per share"
    },
  ];

  const financialHealthMetrics = [
    {
      label: "Debt/Equity",
      value: info.debt_to_equity,
      formatter: formatRatio,
      tooltip: "Total debt divided by shareholder equity"
    },
    {
      label: "Current Ratio",
      value: info.current_ratio,
      formatter: formatRatio,
      tooltip: "Current assets divided by current liabilities"
    },
    {
      label: "Quick Ratio",
      value: info.quick_ratio,
      formatter: formatRatio,
      tooltip: "Liquid assets divided by current liabilities"
    },
    {
      label: "Beta",
      value: info.beta,
      formatter: formatRatio,
      tooltip: "Volatility relative to market"
    },
  ];

  const tradingMetrics = [
    {
      label: "Previous Close",
      value: priceData.previous_close,
      formatter: formatCurrency,
    },
    {
      label: "Volume",
      value: priceData.volume,
      formatter: formatLargeNumber,
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
      label: "Dividend Yield",
      value: info.dividend_yield ? info.dividend_yield * 100 : null,
      formatter: (v: number) => `${v.toFixed(2)}%`,
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>

      <MetricSection title="Trading" metrics={tradingMetrics} defaultExpanded={true} />
      <MetricSection title="Valuation" metrics={valuationMetrics} defaultExpanded={true} />
      <MetricSection title="Cash Flow & Revenue" metrics={cashFlowMetrics} defaultExpanded={true} />
      <MetricSection title="Profitability" metrics={profitabilityMetrics} defaultExpanded={false} />
      <MetricSection title="Financial Health" metrics={financialHealthMetrics} defaultExpanded={false} />
    </div>
  );
};
