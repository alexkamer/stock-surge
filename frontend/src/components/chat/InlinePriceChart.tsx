import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createChart,
  ColorType,
  AreaSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { stockApi } from "../../api/endpoints/stocks";
import { Maximize2, Download } from "lucide-react";

interface InlinePriceChartProps {
  ticker: string;
  period?: "1d" | "1w" | "1mo" | "3mo";
  height?: number;
  showVolume?: boolean;
}

const PERIOD_INTERVALS: Record<string, string> = {
  "1d": "5m",
  "1w": "1d",
  "1mo": "1d",
  "3mo": "1d",
};

const PERIOD_LABELS: Record<string, string> = {
  "1d": "1 Day",
  "1w": "1 Week",
  "1mo": "1 Month",
  "3mo": "3 Months",
};

export function InlinePriceChart({
  ticker,
  period = "1w",
  height = 300,
  showVolume = false,
}: InlinePriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const interval = PERIOD_INTERVALS[period];

  // Map internal period names to API period names
  const apiPeriod = period === "1w" ? "7d" : period;

  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ["stock", "history", ticker, apiPeriod, interval],
    queryFn: () => stockApi.getHistory(ticker, apiPeriod, interval),
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.log('InlinePriceChart: No container ref');
      return;
    }

    console.log('InlinePriceChart: Initializing chart for', ticker);
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
      height: isExpanded ? 600 : height,
      timeScale: {
        borderColor: "#334155",
        timeVisible: period === "1d",
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#64748B",
          width: 1,
          style: 3,
        },
        horzLine: {
          color: "#64748B",
          width: 1,
          style: 3,
        },
      },
    });

    chartRef.current = chart;

    // Add area series
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#0ECB81",
      topColor: "rgba(14, 203, 129, 0.4)",
      bottomColor: "rgba(14, 203, 129, 0.0)",
      lineWidth: 2,
    });

    seriesRef.current = areaSeries;

    // Add volume series if requested
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#26a69a",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "volume",
      });
      volumeSeriesRef.current = volumeSeries;

      chart.priceScale("volume").applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
    }

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
    };
  }, [height, period, showVolume, isExpanded]);

  // Update data when history changes
  useEffect(() => {
    if (!historyData?.data || !seriesRef.current) {
      console.log('InlinePriceChart: No data or series', { hasData: !!historyData?.data, hasSeries: !!seriesRef.current });
      return;
    }

    console.log('InlinePriceChart: Setting data', { ticker, dataPoints: historyData.data.length });
    const chartData = historyData.data.map((d: { date: string; close: number }) => ({
      time: new Date(d.date).getTime() / 1000,
      value: d.close,
    }));

    console.log('InlinePriceChart: Chart data sample', chartData.slice(0, 3));
    seriesRef.current.setData(chartData);

    if (showVolume && volumeSeriesRef.current) {
      const volumeData = historyData.data.map((d: { date: string; open: number; close: number; volume: number }) => ({
        time: new Date(d.date).getTime() / 1000,
        value: d.volume,
        color: d.close >= d.open ? "#0ECB81" : "#F6465D",
      }));

      volumeSeriesRef.current.setData(volumeData);
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [historyData, showVolume]);

  // Handle expand/collapse
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        height: isExpanded ? 600 : height,
      });
      chartRef.current.timeScale().fitContent();
    }
  }, [isExpanded, height]);

  const handleDownload = () => {
    if (!chartRef.current) return;

    // Take screenshot using canvas
    const canvas = chartContainerRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${ticker}-${period}-chart.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg animate-pulse"
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full text-slate-400">
          Loading chart...
        </div>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-slate-400 text-sm">
          Unable to load chart for {ticker}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden my-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700">
        <div>
          <h4 className="font-semibold text-sm">
            {ticker} - {PERIOD_LABELS[period]}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {historyData.data.length} data points
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
            title="Download chart"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} style={{ width: '100%', height: isExpanded ? 600 : height }} />
    </div>
  );
}
