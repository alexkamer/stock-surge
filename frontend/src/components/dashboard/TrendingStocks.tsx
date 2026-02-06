import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { stockApi } from "../../api/endpoints/stocks";
import { formatCurrency, formatLargeNumber, formatPercent, getChangeColor } from "../../lib/formatters";

interface TrendingStockCardProps {
  ticker: string;
}

const TrendingStockCard: React.FC<TrendingStockCardProps> = ({ ticker }) => {
  const navigate = useNavigate();

  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["stock", "price", ticker],
    queryFn: () => stockApi.getPrice(ticker),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: infoData, isLoading: infoLoading } = useQuery({
    queryKey: ["stock", "info", ticker],
    queryFn: () => stockApi.getInfo(ticker),
    staleTime: 5 * 60 * 1000,
  });

  if (priceLoading || infoLoading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-20 bg-background rounded"></div>
      </div>
    );
  }

  const price = priceData?.last_price ?? 0;
  const previousClose = priceData?.previous_close ?? price;
  const change = price - previousClose;
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
  const marketCap = infoData?.market_cap ?? 0;

  return (
    <div
      className="card p-4 cursor-pointer hover:bg-background transition-colors"
      onClick={() => navigate(`/stock/${ticker}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{ticker}</h3>
          {infoData?.name && (
            <p className="text-sm text-text-secondary line-clamp-1">
              {infoData.name}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <p className="font-mono text-xl font-bold mb-1">
          {formatCurrency(price)}
        </p>
        <p className={`text-sm font-mono mb-2 ${getChangeColor(change)}`}>
          {formatPercent(changePercent)}
        </p>
        {marketCap > 0 && (
          <p className="text-xs text-text-secondary">
            Market Cap: <span className="font-mono">{formatLargeNumber(marketCap)}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export const TrendingStocks: React.FC = () => {
  const popularTickers = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "NVDA",
    "TSLA",
    "META",
    "AMD",
    "NFLX",
    "DIS",
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-positive" />
        <h2 className="text-xl font-semibold">Trending Stocks</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {popularTickers.map((ticker) => (
          <TrendingStockCard key={ticker} ticker={ticker} />
        ))}
      </div>
    </div>
  );
};
