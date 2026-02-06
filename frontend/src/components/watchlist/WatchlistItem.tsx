import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { stockApi, type PriceData } from "../../api/endpoints/stocks";
import { useWatchlistStore } from "../../store/watchlistStore";
import { MiniSparkline } from "../charts/MiniSparkline";
import { formatCurrency, formatPercent, getChangeColor } from "../../lib/formatters";

interface WatchlistItemProps {
  ticker: string;
}

export const WatchlistItem: React.FC<WatchlistItemProps> = ({ ticker }) => {
  const navigate = useNavigate();
  const removeTicker = useWatchlistStore((state) => state.removeTicker);

  // Fetch current price
  const { data: priceData, isLoading: priceLoading } = useQuery<PriceData>({
    queryKey: ["stock", "price", ticker],
    queryFn: () => stockApi.getPrice(ticker),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  // Fetch 7-day history for sparkline
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["stock", "history", ticker, "7d", "1d"],
    queryFn: () => stockApi.getHistory(ticker, "7d", "1d"),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch company info for name
  const { data: infoData } = useQuery({
    queryKey: ["stock", "info", ticker],
    queryFn: () => stockApi.getInfo(ticker),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleClick = () => {
    navigate(`/stock/${ticker}`);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeTicker(ticker);
  };

  if (priceLoading || historyLoading) {
    return (
      <div className="card p-3 animate-pulse">
        <div className="h-16 bg-background rounded"></div>
      </div>
    );
  }

  const price = priceData?.last_price ?? 0;
  const previousClose = priceData?.previous_close ?? price;
  const change = price - previousClose;
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

  return (
    <div
      className="card p-3 cursor-pointer hover:bg-background transition-colors relative group"
      onClick={handleClick}
    >
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface"
        aria-label={`Remove ${ticker} from watchlist`}
      >
        <X size={16} />
      </button>

      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{ticker}</h3>
          {infoData?.name && (
            <p className="text-sm text-text-secondary truncate max-w-[120px]">
              {infoData.name}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold">
            {formatCurrency(price)}
          </p>
          <p className={`text-sm font-mono ${getChangeColor(change)}`}>
            {formatPercent(changePercent)} ({change >= 0 ? "+" : ""}
            {formatCurrency(change)})
          </p>
        </div>
      </div>

      {historyData?.data?.length > 0 && (
        <div className="mt-2">
          <MiniSparkline data={historyData.data} width={undefined} height={30} />
        </div>
      )}
    </div>
  );
};
