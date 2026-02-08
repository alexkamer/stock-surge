import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  BarChart3,
  Newspaper,
  Plus,
  Check,
} from "lucide-react";
import { stockApi, type PriceData, type CompanyInfo } from "../api/endpoints/stocks";
import { useWatchlistStore } from "../store/watchlistStore";
import { PriceChart } from "../components/charts/PriceChart";
import { TabNavigation, type Tab } from "../components/layout/TabNavigation";
import { MetricsGrid } from "../components/stock/MetricsGrid";
import { CompanyInfo as CompanyInfoComponent } from "../components/stock/CompanyInfo";
import { Financials } from "../components/stock/Financials";
import { Analyst } from "../components/stock/Analyst";
import { News } from "../components/stock/News";
import { RangeVisualizer } from "../components/stock/RangeVisualizer";
import { QuickStats } from "../components/stock/QuickStats";
import { DividendCard } from "../components/stock/DividendCard";
import { formatCurrency, formatPercent, getChangeColor } from "../lib/formatters";
import { useWebSocketPrice } from "../hooks/useWebSocketPrice";
import { Header } from "../components/layout/Header";

export const StockDetail: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { addTicker, removeTicker, hasTicker } = useWatchlistStore();
  const isInWatchlist = ticker ? hasTicker(ticker) : false;

  // WebSocket for real-time price updates
  const {
    price: wsPrice,
    change: wsChange,
    changePercent: wsChangePercent,
    isLive,
  } = useWebSocketPrice(ticker || '');

  // Fallback to regular API query
  const { data: priceData, isLoading: priceLoading } = useQuery<PriceData>({
    queryKey: ["stock", "price", ticker],
    queryFn: () => stockApi.getPrice(ticker!),
    enabled: !!ticker && !isLive, // Only fetch if WebSocket is not live
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: infoData, isLoading: infoLoading } = useQuery<CompanyInfo>({
    queryKey: ["stock", "info", ticker],
    queryFn: () => stockApi.getInfo(ticker!),
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });

  if (!ticker) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">No ticker specified</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-positive text-background rounded hover:bg-opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs: Tab[] = [
    { id: "overview", label: "Overview", icon: <TrendingUp size={16} /> },
    { id: "financials", label: "Financials", icon: <DollarSign size={16} /> },
    { id: "analyst", label: "Analyst", icon: <BarChart3 size={16} /> },
    { id: "news", label: "News", icon: <Newspaper size={16} /> },
  ];

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeTicker(ticker);
    } else {
      addTicker(ticker);
    }
  };

  // Use WebSocket data if available, otherwise fall back to API data
  const price = wsPrice ?? priceData?.last_price ?? 0;
  const previousClose = priceData?.previous_close ?? price;
  const change = wsChange ?? (price - previousClose);
  const changePercent = wsChangePercent ?? (previousClose !== 0 ? (change / previousClose) * 100 : 0);

  const isLoading = priceLoading || infoLoading;

  // Calculate 52-week change percentage
  const fiftyTwoWeekLow = infoData?.fifty_two_week_low ?? 0;
  const fiftyTwoWeekChange = fiftyTwoWeekLow !== 0
    ? ((price - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{ticker}</h1>
                {infoData?.name && (
                  <span className="text-xl text-text-secondary">
                    {infoData.name}
                  </span>
                )}
              </div>

              {!isLoading && (
                <div className="flex items-center gap-4">
                  <span className="font-mono text-2xl font-bold">
                    {formatCurrency(price)}
                  </span>
                  <span className={`font-mono text-lg ${getChangeColor(change)}`}>
                    {change >= 0 ? "+" : ""}
                    {formatCurrency(change)} ({formatPercent(changePercent)})
                  </span>
                  {isLive && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-positive/10 text-positive rounded-full text-xs font-medium">
                      <span className="w-2 h-2 bg-positive rounded-full animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleWatchlistToggle}
              className={`
                flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors
                ${
                  isInWatchlist
                    ? "bg-surface text-text-primary border border-border hover:bg-background"
                    : "bg-positive text-background hover:bg-opacity-90"
                }
              `}
            >
              {isInWatchlist ? (
                <>
                  <Check size={18} />
                  In Watchlist
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add to Watchlist
                </>
              )}
            </button>
          </div>
        </div>

        {/* 52-Week Range Visualizer */}
        {infoData && priceData && (
          <div className="mb-6 card p-6">
            <RangeVisualizer
              high={infoData.fifty_two_week_high ?? price}
              low={infoData.fifty_two_week_low ?? price}
              current={price}
              previousClose={previousClose}
            />
          </div>
        )}

        {/* Quick Stats Bar */}
        {priceData && infoData && (
          <QuickStats
            dayLow={priceData.day_low}
            dayHigh={priceData.day_high}
            fiftyTwoWeekChange={fiftyTwoWeekChange}
            avgVolume={priceData.volume}
            nextEarningsDate={infoData.next_earnings_date}
          />
        )}

        {/* Price Chart */}
        <div className="mb-6">
          <PriceChart ticker={ticker} />
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Dividend Card - only shows if stock pays dividends */}
              {infoData && (
                <DividendCard
                  ticker={ticker}
                  currentYield={infoData.dividend_yield ? infoData.dividend_yield * 100 : undefined}
                />
              )}

              {priceData && infoData && (
                <MetricsGrid info={infoData} priceData={priceData} />
              )}

              {infoData && <CompanyInfoComponent info={infoData} />}
            </div>
          )}

          {activeTab === "financials" && <Financials ticker={ticker} />}

          {activeTab === "analyst" && <Analyst ticker={ticker} currentPrice={price} />}

          {activeTab === "news" && <News ticker={ticker} />}
        </div>
      </div>
    </div>
  );
};
