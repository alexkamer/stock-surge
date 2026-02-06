import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { stockApi } from "../../api/endpoints/stocks";
import { useDebounce } from "../../hooks/useDebounce";
import { useWatchlistStore } from "../../store/watchlistStore";

export const StockSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { addTicker, hasTicker } = useWatchlistStore();
  const navigate = useNavigate();

  // Fetch stock data when user types
  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-search", debouncedQuery],
    queryFn: () => stockApi.getPrice(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    retry: false,
  });

  const handleAddToWatchlist = () => {
    if (debouncedQuery) {
      addTicker(debouncedQuery);
      setQuery("");
    }
  };

  const getPriceChange = () => {
    if (!data) return { value: 0, percent: 0 };
    const change = data.last_price - data.previous_close;
    const previousClose = data.previous_close > 0 ? data.previous_close : 1; // Prevent division by zero
    const percent = (change / previousClose) * 100;
    return { value: change, percent };
  };

  const priceChange = data ? getPriceChange() : null;
  const isPositive = priceChange && priceChange.value >= 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="Search stocks (e.g., AAPL, MSFT, GOOGL)..."
          className="w-full px-4 py-3 bg-background border border-border rounded-md text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-positive transition"
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin h-5 w-5 border-2 border-positive border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-negative/10 border border-negative rounded-md">
          <p className="text-negative text-sm">
            Stock not found. Try another ticker symbol.
          </p>
        </div>
      )}

      {data && (
        <div
          className="p-4 bg-surface border border-border rounded-md hover:border-positive cursor-pointer transition"
          onClick={() => navigate(`/stock/${debouncedQuery}`)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{debouncedQuery}</h3>
                <span className="text-xs text-text-secondary px-2 py-1 bg-background rounded">
                  {data.exchange}
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1">{data.currency}</p>
            </div>

            <div className="text-right">
              <p className="text-3xl font-mono font-bold">
                ${data.last_price.toFixed(2)}
              </p>
              {priceChange && (
                <p className={`text-sm font-mono ${isPositive ? 'text-positive' : 'text-negative'}`}>
                  {isPositive ? '+' : ''}{priceChange.value.toFixed(2)} ({isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-text-secondary">Open</p>
              <p className="font-mono font-semibold">${data.open.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">High</p>
              <p className="font-mono font-semibold text-positive">${data.day_high.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Low</p>
              <p className="font-mono font-semibold text-negative">${data.day_low.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Volume</p>
              <p className="font-mono font-semibold">{(data.volume / 1000000).toFixed(1)}M</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToWatchlist();
              }}
              disabled={hasTicker(debouncedQuery)}
              className="py-2 px-4 bg-surface border border-positive text-positive hover:bg-positive hover:text-background font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {hasTicker(debouncedQuery) ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/stock/${debouncedQuery}`);
              }}
              className="py-2 px-4 bg-positive hover:bg-positive/90 text-background font-semibold rounded-md transition"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {!query && !data && (
        <div className="text-center py-8 text-text-secondary">
          <p>Start typing a stock ticker to search</p>
          <p className="text-sm mt-2">Try: AAPL, MSFT, GOOGL, TSLA, AMZN</p>
        </div>
      )}
    </div>
  );
};
