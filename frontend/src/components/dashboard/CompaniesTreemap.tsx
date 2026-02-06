import React from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

interface Company {
  name: string;
  "market weight": number;
  rating?: string;
  symbol?: string;
  ticker?: string;
}

interface CompaniesTreemapProps {
  companies: Company[];
  onCompanyClick?: (company: Company) => void;
}

export const CompaniesTreemap: React.FC<CompaniesTreemapProps> = ({ companies, onCompanyClick }) => {
  // Helper function to extract ticker from company name
  const extractTicker = (companyName: string): string => {
    // Common patterns for extracting tickers from full company names
    const tickerMap: Record<string, string> = {
      "NVIDIA Corporation": "NVDA",
      "Apple Inc.": "AAPL",
      "Microsoft Corporation": "MSFT",
      "Broadcom Inc.": "AVGO",
      "Micron Technology, Inc.": "MU",
      "Oracle Corporation": "ORCL",
      "Cisco Systems, Inc.": "CSCO",
      "Advanced Micro Devices, Inc.": "AMD",
      "Palantir Technologies Inc.": "PLTR",
      "International Business Machines Corporation": "IBM",
      "Lam Research Corporation": "LRCX",
      "Applied Materials, Inc.": "AMAT",
      "Intel Corporation": "INTC",
      "Texas Instruments Incorporated": "TXN",
      "Salesforce, Inc.": "CRM",
      "KLA Corporation": "KLAC",
      "Arista Networks, Inc.": "ANET",
      "Analog Devices, Inc.": "ADI",
      "Uber Technologies, Inc.": "UBER",
      "Amphenol Corporation": "APH",
    };

    return tickerMap[companyName] || companyName;
  };

  // Transform data for treemap - filter out invalid entries
  const treemapData = companies
    .slice(0, 20)
    .filter((company) => company && company.name && company["market weight"] !== undefined)
    .map((company, idx) => {
      const weight = company["market weight"] || 0;

      // Varied colors using golden angle for good distribution
      const hue = (idx * 137.5) % 360;
      const saturation = 65;
      const lightness = 70; // Consistent lightness for pastel colors

      // Get ticker: use symbol/ticker field if available, otherwise extract from name
      const displayText = company.symbol || company.ticker || extractTicker(company.name);

      return {
        name: company.name,
        ticker: displayText,
        size: weight * 100,
        rating: company.rating,
        fill: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        company: company, // Store original company object for click handler
      };
    });

  // Custom content renderer for treemap cells
  const CustomizedContent = (props: any) => {
    const { x, y, width, height, ticker, size, fill, company } = props;

    // Safety check
    if (!ticker || size === undefined || size === null) return null;

    // Only show text if the rectangle is large enough
    const showFullText = width > 80 && height > 45;
    const showTicker = width > 50 && height > 25;

    // Black text for all boxes
    const primaryTextColor = "#000000";
    const secondaryTextColor = "#333333";

    // Handle click on the rectangle
    const handleClick = () => {
      if (onCompanyClick && company) {
        onCompanyClick(company);
      }
    };

    return (
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill,
            stroke: "#1A1A1A",
            strokeWidth: 2,
          }}
          className="hover:opacity-80 transition-opacity"
        />
        {showTicker && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - (showFullText ? 8 : 0)}
              textAnchor="middle"
              fill={primaryTextColor}
              fontSize={showFullText ? 14 : 12}
              fontWeight="700"
              fontFamily="monospace"
              style={{ pointerEvents: "none" }}
            >
              {ticker}
            </text>
            {showFullText && (
              <text
                x={x + width / 2}
                y={y + height / 2 + 12}
                textAnchor="middle"
                fill={secondaryTextColor}
                fontSize={11}
                fontFamily="monospace"
                style={{ pointerEvents: "none" }}
              >
                {(size || 0).toFixed(2)}%
              </text>
            )}
          </>
        )}
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data || !data.ticker) return null;

      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-text-primary mb-1 font-mono text-lg">{data.ticker}</p>
          <p className="text-sm text-text-secondary mb-1">
            Market Weight: <span className="font-mono text-text-primary">{(data.size || 0).toFixed(2)}%</span>
          </p>
          {data.rating && (
            <p className="text-sm">
              <span className="inline-block text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                {data.rating}
              </span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (treemapData.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p>No company data available to display.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={500}>
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#1A1A1A"
          content={<CustomizedContent />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
      <p className="text-xs text-text-secondary text-center mt-3">
        Showing top {treemapData.length} companies by market weight. Box size represents relative market weight.
      </p>
    </div>
  );
};
