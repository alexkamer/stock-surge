import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createChart,
  ColorType,
  LineSeries,
  AreaSeries,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
} from "lightweight-charts";
import { stockApi } from "../../api/endpoints/stocks";
import { type ChartType, type TimePeriod, useChartPreferencesStore } from "../../store/chartPreferencesStore";

interface PriceChartProps {
  ticker: string;
}

const PERIOD_INTERVALS: Record<TimePeriod, string> = {
  "1d": "1m",
  "5d": "15m",
  "1mo": "1h",
  "3mo": "1d",
  "6mo": "1d",
  "1y": "1d",
  "5y": "1wk",
  "max": "1mo",
};

const PERIOD_LABELS: Record<TimePeriod, string> = {
  "1d": "1D",
  "5d": "5D",
  "1mo": "1M",
  "3mo": "3M",
  "6mo": "6M",
  "1y": "1Y",
  "5y": "5Y",
  "max": "MAX",
};

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  candlestick: "Candles",
  line: "Line",
  area: "Area",
};

export const PriceChart: React.FC<PriceChartProps> = ({ ticker }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick" | "Line" | "Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);

  const { chartType, period, setChartType, setPeriod } = useChartPreferencesStore();
  const [isChartReady, setIsChartReady] = useState(false);

  const interval = PERIOD_INTERVALS[period];

  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ["stock", "history", ticker, period, interval],
    queryFn: () => stockApi.getHistory(ticker, period, interval),
    staleTime: period === "1d" ? 60 * 1000 : 30 * 60 * 1000,
  });

  // Initialize chart
  useEffect(() => {
    if (!containerElement) {
      return;
    }
    const chart = createChart(containerElement, {
      layout: {
        background: { type: ColorType.Solid, color: "#0D0D0D" },
        textColor: "#B3B3B3",
      },
      grid: {
        vertLines: { color: "#1A1A1A" },
        horzLines: { color: "#1A1A1A" },
      },
      width: containerElement.clientWidth,
      height: 500,
      timeScale: {
        borderColor: "#333333",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#333333",
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#B3B3B3",
          width: 1,
          style: 3,
          labelBackgroundColor: "#0ECB81",
        },
        horzLine: {
          color: "#B3B3B3",
          width: 1,
          style: 3,
          labelBackgroundColor: "#0ECB81",
        },
      },
    });

    chartRef.current = chart;
    setIsChartReady(true);

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
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      setIsChartReady(false);
    };
  }, [containerElement]);

  // Update chart data and type
  useEffect(() => {
    if (!isChartReady || !chartRef.current || !historyData?.data) return;

    // Remove existing series
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    const chartData = historyData.data.map((item: any) => ({
      time: new Date(item.date).getTime() / 1000,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      value: item.close,
    }));

    // Create appropriate series based on chart type
    if (chartType === "candlestick") {
      const candlestickSeriesInstance = chartRef.current.addSeries(CandlestickSeries, {
        upColor: "#0ECB81",
        downColor: "#F6465D",
        borderUpColor: "#0ECB81",
        borderDownColor: "#F6465D",
        wickUpColor: "#0ECB81",
        wickDownColor: "#F6465D",
      });
      candlestickSeriesInstance.setData(chartData as CandlestickData[]);
      seriesRef.current = candlestickSeriesInstance as any;
    } else if (chartType === "line") {
      const lineSeriesInstance = chartRef.current.addSeries(LineSeries, {
        color: "#0ECB81",
        lineWidth: 2,
      });
      const lineData = chartData.map((d: any) => ({
        time: d.time,
        value: d.close,
      }));
      lineSeriesInstance.setData(lineData as LineData[]);
      seriesRef.current = lineSeriesInstance as any;
    } else if (chartType === "area") {
      const areaSeriesInstance = chartRef.current.addSeries(AreaSeries, {
        topColor: "rgba(14, 203, 129, 0.4)",
        bottomColor: "rgba(14, 203, 129, 0.0)",
        lineColor: "#0ECB81",
        lineWidth: 2,
      });
      const areaData = chartData.map((d: any) => ({
        time: d.time,
        value: d.close,
      }));
      areaSeriesInstance.setData(areaData as LineData[]);
      seriesRef.current = areaSeriesInstance as any;
    }

    // Add volume series
    const volumeSeriesInstance = chartRef.current.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    const volumeData = historyData.data.map((item: any) => ({
      time: new Date(item.date).getTime() / 1000,
      value: item.volume,
      color: item.close >= item.open ? "rgba(14, 203, 129, 0.3)" : "rgba(246, 70, 93, 0.3)",
    }));

    volumeSeriesInstance.setData(volumeData as HistogramData[]);
    volumeSeriesRef.current = volumeSeriesInstance as any;

    volumeSeriesInstance.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Fit content and set visible range to prevent blank space when zooming out
    chartRef.current.timeScale().fitContent();

    // Set logical range boundaries to prevent zooming beyond data
    if (chartData.length > 0) {
      const minTime = chartData[0].time;
      const maxTime = chartData[chartData.length - 1].time;

      chartRef.current.timeScale().applyOptions({
        fixLeftEdge: true,
        fixRightEdge: true,
      });

      // Set the visible range to match the data range
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: 0,
        to: chartData.length - 1,
      });
    }
  }, [isChartReady, historyData, chartType]);

  if (isLoading) {
    return (
      <div className="card">
        <div className="h-[500px] flex items-center justify-center bg-chart-background rounded">
          <div className="text-text-secondary">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="h-[500px] flex items-center justify-center bg-chart-background rounded">
          <div className="text-negative">Error loading chart data</div>
        </div>
      </div>
    );
  }

  if (!historyData?.data || historyData.data.length === 0) {
    return (
      <div className="card">
        <div className="h-[500px] flex items-center justify-center bg-chart-background rounded">
          <div className="text-text-secondary">No chart data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Chart Type:</span>
          <div className="flex gap-1">
            {(["candlestick", "line", "area"] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chartType === type
                    ? "bg-positive text-background font-semibold"
                    : "bg-surface text-text-secondary hover:text-text-primary hover:bg-background"
                }`}
              >
                {CHART_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Period:</span>
          <div className="flex gap-1">
            {(["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"] as TimePeriod[]).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    period === p
                      ? "bg-positive text-background font-semibold"
                      : "bg-surface text-text-secondary hover:text-text-primary hover:bg-background"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div
        ref={(el) => {
          chartContainerRef.current = el;
          setContainerElement(el);
        }}
        className="rounded overflow-hidden"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
};
