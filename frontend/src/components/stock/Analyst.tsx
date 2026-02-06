import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target } from "lucide-react";
import { stockApi } from "../../api/endpoints/stocks";
import { formatCurrency, formatPercent } from "../../lib/formatters";

interface AnalystProps {
  ticker: string;
  currentPrice: number;
}

interface RecommendationData {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface PriceTargetData {
  current: number;
  high: number;
  low: number;
  mean: number;
  median: number;
}

export const Analyst: React.FC<AnalystProps> = ({ ticker, currentPrice }) => {
  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ["recommendations", ticker],
    queryFn: async () => {
      const data = await stockApi.getRecommendations(ticker);
      return data as RecommendationData[];
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });

  const { data: priceTargets, isLoading: targetsLoading } = useQuery({
    queryKey: ["price-targets", ticker],
    queryFn: async () => {
      const data = await stockApi.getAnalystPriceTargets(ticker);
      return data as PriceTargetData;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = recsLoading || targetsLoading;

  // Get the most recent recommendation period
  const latestRecs = recommendations && recommendations.length > 0 ? recommendations[0] : null;

  // Calculate total analysts and percentages
  const getTotalAnalysts = (rec: RecommendationData) => {
    return rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  // Calculate consensus rating (1-5 scale)
  const getConsensusRating = (rec: RecommendationData) => {
    const total = getTotalAnalysts(rec);
    if (total === 0) return null;

    const weightedSum =
      rec.strongBuy * 5 +
      rec.buy * 4 +
      rec.hold * 3 +
      rec.sell * 2 +
      rec.strongSell * 1;

    return weightedSum / total;
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return "Strong Buy";
    if (rating >= 3.5) return "Buy";
    if (rating >= 2.5) return "Hold";
    if (rating >= 1.5) return "Sell";
    return "Strong Sell";
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-positive";
    if (rating >= 3.5) return "text-positive";
    if (rating >= 2.5) return "text-warning";
    if (rating >= 1.5) return "text-negative";
    return "text-negative";
  };

  return (
    <div className="space-y-6">
      {/* Analyst Price Targets */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Analyst Price Targets</h3>
        </div>

        {targetsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        )}

        {!targetsLoading && priceTargets && (
          <div className="space-y-6">
            {/* Price Target Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-surface rounded border border-border">
                <p className="text-xs text-text-secondary mb-1">Current</p>
                <p className="text-xl font-bold font-mono">{formatCurrency(priceTargets.current)}</p>
              </div>
              <div className="p-4 bg-surface rounded border border-border">
                <p className="text-xs text-text-secondary mb-1">Mean Target</p>
                <p className="text-xl font-bold font-mono text-accent">
                  {formatCurrency(priceTargets.mean)}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {priceTargets.mean > priceTargets.current
                    ? formatPercent(((priceTargets.mean - priceTargets.current) / priceTargets.current) * 100)
                    : formatPercent(((priceTargets.mean - priceTargets.current) / priceTargets.current) * 100)}
                </p>
              </div>
              <div className="p-4 bg-surface rounded border border-border">
                <p className="text-xs text-text-secondary mb-1">Median Target</p>
                <p className="text-xl font-bold font-mono">{formatCurrency(priceTargets.median)}</p>
              </div>
              <div className="p-4 bg-surface rounded border border-border">
                <p className="text-xs text-text-secondary mb-1">High Target</p>
                <p className="text-xl font-bold font-mono text-positive">
                  {formatCurrency(priceTargets.high)}
                </p>
              </div>
              <div className="p-4 bg-surface rounded border border-border">
                <p className="text-xs text-text-secondary mb-1">Low Target</p>
                <p className="text-xl font-bold font-mono text-negative">
                  {formatCurrency(priceTargets.low)}
                </p>
              </div>
            </div>

            {/* Visual Price Range */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Price Target Range</p>
              <div className="relative h-12 bg-surface rounded-lg border border-border overflow-hidden">
                {/* Range bar */}
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-negative/20 via-accent/20 to-positive/20"
                  style={{
                    left: `${((priceTargets.low - priceTargets.low) / (priceTargets.high - priceTargets.low)) * 100}%`,
                    width: `100%`,
                  }}
                />

                {/* Current price marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-text-primary"
                  style={{
                    left: `${((priceTargets.current - priceTargets.low) / (priceTargets.high - priceTargets.low)) * 100}%`,
                  }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-text-primary text-background text-xs px-2 py-0.5 rounded whitespace-nowrap">
                    Current
                  </div>
                </div>

                {/* Mean target marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-accent"
                  style={{
                    left: `${((priceTargets.mean - priceTargets.low) / (priceTargets.high - priceTargets.low)) * 100}%`,
                  }}
                >
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-accent text-background text-xs px-2 py-0.5 rounded whitespace-nowrap">
                    Target
                  </div>
                </div>

                {/* Low and High labels */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                  {formatCurrency(priceTargets.low)}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                  {formatCurrency(priceTargets.high)}
                </div>
              </div>
            </div>
          </div>
        )}

        {!targetsLoading && !priceTargets && (
          <p className="text-center py-8 text-text-secondary">No price target data available</p>
        )}
      </div>

      {/* Analyst Recommendations */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Analyst Recommendations</h3>
        </div>

        {recsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        )}

        {!recsLoading && latestRecs && (
          <div className="space-y-6">
            {/* Consensus Rating */}
            {(() => {
              const rating = getConsensusRating(latestRecs);
              return rating ? (
                <div className="text-center p-6 bg-surface rounded-lg border border-border">
                  <p className="text-sm text-text-secondary mb-2">Consensus Rating</p>
                  <p className={`text-3xl font-bold mb-1 ${getRatingColor(rating)}`}>
                    {getRatingLabel(rating)}
                  </p>
                  <p className="text-lg text-text-secondary">
                    {rating.toFixed(2)} / 5.00
                  </p>
                  <p className="text-sm text-text-secondary mt-2">
                    Based on {getTotalAnalysts(latestRecs)} analysts
                  </p>
                </div>
              ) : null;
            })()}

            {/* Recommendation Breakdown */}
            <div className="space-y-3">
              {[
                { label: "Strong Buy", value: latestRecs.strongBuy, color: "bg-positive" },
                { label: "Buy", value: latestRecs.buy, color: "bg-positive/70" },
                { label: "Hold", value: latestRecs.hold, color: "bg-warning" },
                { label: "Sell", value: latestRecs.sell, color: "bg-negative/70" },
                { label: "Strong Sell", value: latestRecs.strongSell, color: "bg-negative" },
              ].map((rec) => {
                const total = getTotalAnalysts(latestRecs);
                const percentage = getPercentage(rec.value, total);

                return (
                  <div key={rec.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{rec.label}</span>
                      <span className="text-sm text-text-secondary">
                        {rec.value} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className={`h-full ${rec.color} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation Trend */}
            {recommendations && recommendations.length > 1 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-text-secondary mb-3">
                  Recommendation Trend (Last 4 Months)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="text-left py-2 px-2 font-medium text-text-secondary">Period</th>
                        <th className="text-center py-2 px-2 font-medium text-positive">Strong Buy</th>
                        <th className="text-center py-2 px-2 font-medium text-positive">Buy</th>
                        <th className="text-center py-2 px-2 font-medium text-warning">Hold</th>
                        <th className="text-center py-2 px-2 font-medium text-negative">Sell</th>
                        <th className="text-center py-2 px-2 font-medium text-negative">Strong Sell</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.slice(0, 4).map((rec, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-surface/50">
                          <td className="py-2 px-2 text-text-secondary">
                            {rec.period === "0m" ? "Current" : rec.period}
                          </td>
                          <td className="text-center py-2 px-2">{rec.strongBuy}</td>
                          <td className="text-center py-2 px-2">{rec.buy}</td>
                          <td className="text-center py-2 px-2">{rec.hold}</td>
                          <td className="text-center py-2 px-2">{rec.sell}</td>
                          <td className="text-center py-2 px-2">{rec.strongSell}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!recsLoading && !latestRecs && (
          <p className="text-center py-8 text-text-secondary">No recommendation data available</p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-text-secondary">
        <p>
          Analyst ratings and price targets are sourced from Yahoo Finance and represent opinions
          from various financial analysts. This information should not be considered as investment
          advice. Always conduct your own research before making investment decisions.
        </p>
      </div>
    </div>
  );
};
