import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "../../api/endpoints/stocks";
import { formatCurrency, formatPercent, getChangeColor } from "../../lib/formatters";

interface MarketIndexCardProps {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
}

const MarketIndexCard: React.FC<MarketIndexCardProps> = ({
  symbol,
  shortName,
  price,
  change,
  changePercent,
  marketState,
}) => {
  return (
    <div className="card p-4 hover:bg-background transition-colors">
      <div className="mb-3">
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
          {shortName}
        </p>
        <p className="text-sm text-text-secondary font-mono">{symbol}</p>
      </div>

      <div className="mb-2">
        <p className="font-mono text-2xl font-bold mb-1">
          {formatCurrency(price)}
        </p>
        <p className={`text-sm font-mono ${getChangeColor(change)}`}>
          {formatPercent(changePercent)} ({change >= 0 ? "+" : ""}
          {change.toFixed(2)})
        </p>
      </div>

      <div className="mt-2">
        <span className={`text-xs px-2 py-1 rounded ${
          marketState === "REGULAR"
            ? "bg-success/20 text-success"
            : "bg-text-secondary/20 text-text-secondary"
        }`}>
          {marketState === "REGULAR" ? "Open" : marketState === "PRE" ? "Pre-Market" : marketState === "POST" ? "After Hours" : "Closed"}
        </span>
      </div>
    </div>
  );
};

export const MarketOverview: React.FC = () => {
  const [selectedMarket, setSelectedMarket] = useState("US");

  // Fetch available markets
  const { data: marketsData } = useQuery({
    queryKey: ["markets", "available"],
    queryFn: () => stockApi.getAvailableMarkets(),
    staleTime: Infinity, // This data rarely changes
  });

  // Fetch market overview data
  const { data: marketData, isLoading } = useQuery({
    queryKey: ["market", "overview", selectedMarket],
    queryFn: () => stockApi.getMarketOverview(selectedMarket),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Market Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-24 bg-background rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!marketData?.indices) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Market Overview</h2>
        <p className="text-text-secondary">Unable to load market data</p>
      </div>
    );
  }

  // Get all indices for the selected market
  const indicesToDisplay = Object.values(marketData.indices);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Market Overview</h2>
          <span className={`text-xs px-2 py-1 rounded ${
            marketData.status === "open"
              ? "bg-success/20 text-success"
              : "bg-text-secondary/20 text-text-secondary"
          }`}>
            {marketData.status}
          </span>
        </div>

        {/* Market Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="appearance-none bg-background border border-border rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-card transition-colors"
          >
            {marketsData?.markets.map((market) => (
              <option key={market.id} value={market.id}>
                {market.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Display market name if different from ID */}
      {marketData.market_name && marketData.market_name !== selectedMarket && (
        <p className="text-sm text-text-secondary mb-4">{marketData.market_name}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {indicesToDisplay.length > 0 ? (
          indicesToDisplay.map((index) => (
            <MarketIndexCard
              key={index.symbol}
              symbol={index.symbol}
              shortName={index.short_name}
              price={index.regular_market_price}
              change={index.regular_market_change}
              changePercent={index.regular_market_change_percent}
              marketState={index.market_state}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-text-secondary">
            No market data available for {selectedMarket}
          </div>
        )}
      </div>
    </div>
  );
};
