import React from "react";
import { useWatchlistStore } from "../store/watchlistStore";
import { WatchlistItem } from "../components/watchlist/WatchlistItem";
import { MarketOverview } from "../components/dashboard/MarketOverview";
import { TrendingStocks } from "../components/dashboard/TrendingStocks";
import { SectorIndustry } from "../components/dashboard/SectorIndustry";
import { Header } from "../components/layout/Header";

export const Dashboard: React.FC = () => {
  const { tickers } = useWatchlistStore();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-text-secondary mt-1">Real-time stock market analysis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <MarketOverview />

              <SectorIndustry />

              <TrendingStocks />
            </div>

            <div>
              <div className="card sticky top-4">
                <h2 className="text-xl font-semibold mb-4">Watchlist</h2>
                {tickers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-text-secondary mb-2">
                      No stocks in your watchlist yet.
                    </p>
                    <p className="text-sm text-text-secondary">
                      Search and add stocks to track them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {tickers.map((ticker) => (
                      <WatchlistItem key={ticker} ticker={ticker} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
