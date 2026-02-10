import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { stockApi, type PriceData } from "../../api/endpoints/stocks";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockComparisonProps {
  tickers: string[]; // 2-4 tickers
  period?: "1w" | "1mo" | "3mo";
}

const COLORS = ["#0ECB81", "#3B82F6", "#F59E0B", "#8B5CF6"];

const PERIOD_MAP: Record<string, string> = {
  "1w": "7d",
  "1mo": "1mo",
  "3mo": "3mo",
};

const PERIOD_INTERVALS: Record<string, string> = {
  "1w": "15m",
  "1mo": "1h",
  "3mo": "1d",
};

export function StockComparison({ tickers, period = "1mo" }: StockComparisonProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  // Limit to 4 tickers
  const validTickers = tickers.slice(0, 4);
  const apiPeriod = PERIOD_MAP[period];
  const interval = PERIOD_INTERVALS[period];

  // Fetch price data for all tickers
  const priceQueries = validTickers.map((ticker) =>
    useQuery<PriceData>({
      queryKey: ["stock", "price", ticker],
      queryFn: () => stockApi.getPrice(ticker),
      staleTime: 60000,
      retry: 1,
    })
  );

  // Fetch history data for all tickers
  const historyQueries = validTickers.map((ticker) =>
    useQuery({
      queryKey: ["stock", "history", ticker, apiPeriod, interval],
      queryFn: () => stockApi.getHistory(ticker, apiPeriod, interval),
      staleTime: 300000,
      retry: 1,
    })
  );

  const isLoading = historyQueries.some((q) => q.isLoading);
  const hasError = historyQueries.some((q) => q.error);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0F172A" },
        textColor: "#94A3B8",
      },
      grid: {
        vertLines: { color: "#1E293B" },
        horzLines: { color: "#1E293B" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: "#334155",
      },
      rightPriceScale: {
        borderColor: "#334155",
        mode: 1, // Percentage mode for comparison
      },
    });

    chartRef.current = chart;

    // Create line series for each ticker
    seriesRefs.current = validTickers.map((_, index) => {
      return chart.addSeries(LineSeries, {
        color: COLORS[index],
        lineWidth: 2,
        priceFormat: {
          type: "percent",
        },
      });
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
  }, [validTickers.length]);

  // Update data when history changes
  useEffect(() => {
    if (!chartRef.current || isLoading) return;

    historyQueries.forEach((query, index) => {
      if (!query.data?.data || !seriesRefs.current[index]) return;

      const historyData = query.data.data;
      if (historyData.length === 0) return;

      // Normalize to percentage change from first value
      const firstValue = historyData[0].close;

      const chartData = historyData.map((d: { date: string; close: number }) => ({
        time: new Date(d.date).getTime() / 1000,
        value: ((d.close - firstValue) / firstValue) * 100,
      }));

      seriesRefs.current[index].setData(chartData);
    });

    chartRef.current.timeScale().fitContent();
  }, [historyQueries, isLoading]);

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 animate-pulse">
        <div className="h-[400px] flex items-center justify-center text-slate-400">
          Loading comparison...
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="h-[400px] flex items-center justify-center text-slate-400 text-sm">
          Unable to load comparison data
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden my-4">
      {/* Header */}
      <div className="p-4 bg-slate-800/50 border-b border-slate-700">
        <h4 className="font-semibold text-sm mb-3">Stock Comparison</h4>
        <div className="flex flex-wrap gap-3">
          {validTickers.map((ticker, index) => {
            const priceData = priceQueries[index].data;
            if (!priceData) return null;

            const change = priceData.last_price - priceData.previous_close;
            const changePercent = (change / priceData.previous_close) * 100;
            const isPositive = change >= 0;

            return (
              <div key={ticker} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-sm">{ticker}</span>
                    <span className="text-xs text-slate-400">
                      ${priceData.last_price.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-xs ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {isPositive ? "+" : ""}
                    {changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} />

      {/* Metrics Table */}
      <div className="p-4 border-t border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs">
              <th className="text-left pb-2">Ticker</th>
              <th className="text-right pb-2">Price</th>
              <th className="text-right pb-2">Change</th>
              <th className="text-right pb-2">Volume</th>
              <th className="text-right pb-2">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {validTickers.map((ticker, index) => {
              const priceData = priceQueries[index].data;
              if (!priceData) return null;

              const change = priceData.last_price - priceData.previous_close;
              const changePercent = (change / priceData.previous_close) * 100;
              const isPositive = change >= 0;

              const formatVolume = (volume: number) => {
                if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
                if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
                return `${(volume / 1e3).toFixed(2)}K`;
              };

              const formatMarketCap = (marketCap: number | null) => {
                if (!marketCap) return "N/A";
                if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
                if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
                return `$${(marketCap / 1e6).toFixed(2)}M`;
              };

              return (
                <tr key={ticker} className="border-t border-slate-700/50">
                  <td className="py-2 font-mono font-semibold">{ticker}</td>
                  <td className="text-right">${priceData.last_price.toFixed(2)}</td>
                  <td
                    className={`text-right font-medium ${
                      isPositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {changePercent.toFixed(2)}%
                  </td>
                  <td className="text-right text-slate-400">
                    {formatVolume(priceData.volume)}
                  </td>
                  <td className="text-right text-slate-400">
                    {formatMarketCap(priceData.market_cap)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
