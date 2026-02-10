import { useQuery } from "@tanstack/react-query";
import { stockApi, type PriceData, type HistoryData } from "../../api/endpoints/stocks";
import { TrendingUp, TrendingDown, ExternalLink, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

interface TickerCardProps {
  ticker: string;
  compact?: boolean;
}

export function TickerCard({ ticker, compact = false }: TickerCardProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Fetch current price data
  const { data: priceData, isLoading: priceLoading, error: priceError } = useQuery<PriceData>({
    queryKey: ["stock", "price", ticker],
    queryFn: () => stockApi.getPrice(ticker),
    staleTime: 60000, // 60 seconds
    retry: 1,
  });

  // Fetch 7-day history for sparkline
  const { data: historyData } = useQuery<HistoryData>({
    queryKey: ["stock", "history", ticker, "7d"],
    queryFn: () => stockApi.getHistory(ticker, "7d", "1d"),
    staleTime: 300000, // 5 minutes
    retry: 1,
    enabled: !compact, // Only fetch history for non-compact view
  });

  if (priceLoading) {
    return (
      <div className="inline-block bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-slate-700 rounded"></div>
          <div className="h-4 w-20 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (priceError || !priceData) {
    return (
      <div className="inline-block bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm">
        {ticker} - Data unavailable
      </div>
    );
  }

  const change = priceData.last_price - priceData.previous_close;
  const changePercent = (change / priceData.previous_close) * 100;
  const isPositive = change >= 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: priceData.currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatMarketCap = (marketCap: number | null) => {
    if (!marketCap) return "N/A";
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toFixed(0)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };

  const handleAddToWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement watchlist integration
    setIsInWatchlist(!isInWatchlist);
  };

  // Compact version - single line
  if (compact) {
    return (
      <Link
        to={`/stock/${ticker}`}
        className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-colors group"
      >
        <span className="font-mono font-semibold text-sm">{ticker}</span>
        <span className="font-semibold text-sm">{formatPrice(priceData.last_price)}</span>
        <span
          className={`flex items-center gap-0.5 text-xs font-medium ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? "+" : ""}
          {changePercent.toFixed(2)}%
        </span>
        <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    );
  }

  // Full version with sparkline
  const sparklineData = historyData?.data || [];
  const minPrice = Math.min(...sparklineData.map(d => d.close));
  const maxPrice = Math.max(...sparklineData.map(d => d.close));
  const priceRange = maxPrice - minPrice;

  return (
    <div className="inline-block bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors w-full max-w-sm">
      {/* Header */}
      <div className="p-3 bg-slate-800/50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base">{ticker}</span>
              <span
                className={`flex items-center gap-1 text-sm font-semibold ${
                  isPositive ? "text-green-400" : "text-red-400"
                }`}
              >
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isPositive ? "+" : ""}
                {change.toFixed(2)} ({isPositive ? "+" : ""}
                {changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="text-2xl font-bold mt-1">{formatPrice(priceData.last_price)}</div>
          </div>
          <button
            onClick={handleAddToWatchlist}
            className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${
              isInWatchlist ? "text-yellow-400" : "text-slate-400"
            }`}
            title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star size={18} fill={isInWatchlist ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Sparkline */}
      {sparklineData.length > 0 && (
        <div className="px-3 pb-2">
          <svg width="100%" height="40" className="overflow-visible">
            <polyline
              points={sparklineData
                .map((d: { close: number }, i: number) => {
                  const x = (i / (sparklineData.length - 1)) * 100;
                  const y = 40 - ((d.close - minPrice) / priceRange) * 40;
                  return `${x}%,${y}`;
                })
                .join(" ")}
              fill="none"
              stroke={isPositive ? "#4ade80" : "#f87171"}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="text-xs text-slate-500 mt-1">7-day trend</div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-slate-400 text-xs">Volume</div>
          <div className="font-semibold">{formatVolume(priceData.volume)}</div>
        </div>
        {priceData.market_cap && (
          <div>
            <div className="text-slate-400 text-xs">Market Cap</div>
            <div className="font-semibold">{formatMarketCap(priceData.market_cap)}</div>
          </div>
        )}
        <div>
          <div className="text-slate-400 text-xs">Day Range</div>
          <div className="font-semibold text-xs">
            {formatPrice(priceData.day_low)} - {formatPrice(priceData.day_high)}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Prev Close</div>
          <div className="font-semibold">{formatPrice(priceData.previous_close)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <Link
          to={`/stock/${ticker}`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors"
        >
          View Details
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
