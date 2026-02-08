import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { stockApi } from "../../api/endpoints/stocks";
import { useDebounce } from "../../hooks/useDebounce";
import { useWatchlistStore } from "../../store/watchlistStore";

export const Header: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const { addTicker, hasTicker } = useWatchlistStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-search", debouncedQuery],
    queryFn: () => stockApi.getPrice(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    retry: false,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddToWatchlist = () => {
    if (debouncedQuery) {
      addTicker(debouncedQuery);
      setQuery("");
      setIsOpen(false);
    }
  };

  const handleViewDetails = () => {
    navigate(`/stock/${debouncedQuery}`);
    setQuery("");
    setIsOpen(false);
  };

  const getPriceChange = () => {
    if (!data) return { value: 0, percent: 0 };
    const change = data.last_price - data.previous_close;
    const previousClose = data.previous_close > 0 ? data.previous_close : 1;
    const percent = (change / previousClose) * 100;
    return { value: change, percent };
  };

  const priceChange = data ? getPriceChange() : null;
  const isPositive = priceChange && priceChange.value >= 0;

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <h1 className="text-2xl font-bold">Stock Surge</h1>
          </div>

          <div className="relative w-80" ref={dropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.toUpperCase());
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query) {
                    navigate(`/stock/${query}`);
                    setQuery("");
                    setIsOpen(false);
                  }
                }}
                placeholder="Search stocks..."
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-positive transition text-sm"
              />
              {isLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-positive border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {isOpen && (query || data) && (
              <div className="absolute top-full mt-2 w-96 right-0 bg-surface border border-border rounded-md shadow-lg max-h-96 overflow-y-auto">
                {error && !isLoading && (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    <p>Keep typing...</p>
                  </div>
                )}

                {data && (
                  <div
                    className="p-4 hover:bg-background cursor-pointer transition"
                    onClick={handleViewDetails}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{debouncedQuery}</h3>
                          <span className="text-xs text-text-secondary px-2 py-0.5 bg-background rounded">
                            {data.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{data.currency}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-mono font-bold">
                          ${data.last_price.toFixed(2)}
                        </p>
                        {priceChange && (
                          <p className={`text-xs font-mono ${isPositive ? 'text-positive' : 'text-negative'}`}>
                            {isPositive ? '+' : ''}{priceChange.value.toFixed(2)} ({isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-text-secondary">Open</p>
                        <p className="font-mono text-sm font-semibold">${data.open.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">High</p>
                        <p className="font-mono text-sm font-semibold text-positive">${data.day_high.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Low</p>
                        <p className="font-mono text-sm font-semibold text-negative">${data.day_low.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Volume</p>
                        <p className="font-mono text-sm font-semibold">{(data.volume / 1000000).toFixed(1)}M</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWatchlist();
                        }}
                        disabled={hasTicker(debouncedQuery)}
                        className="py-1.5 px-3 text-sm bg-surface border border-positive text-positive hover:bg-positive hover:text-background font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {hasTicker(debouncedQuery) ? 'In Watchlist' : 'Add to Watchlist'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails();
                        }}
                        className="py-1.5 px-3 text-sm bg-positive hover:bg-positive/90 text-background font-semibold rounded-md transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )}

                {!query && !data && (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    <p>Start typing a stock ticker</p>
                    <p className="text-xs mt-1">Try: AAPL, MSFT, GOOGL</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
