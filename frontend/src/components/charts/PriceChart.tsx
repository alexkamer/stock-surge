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
import { TrendingUp, Activity, BarChart2, GitBranch } from "lucide-react";
import { stockApi } from "../../api/endpoints/stocks";
import { type ChartType, type TimePeriod, useChartPreferencesStore } from "../../store/chartPreferencesStore";
import { calculateAllIndicators, type TechnicalIndicatorData } from "../../lib/technicalIndicators";

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
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [rsiContainer, setRsiContainer] = useState<HTMLDivElement | null>(null);
  const [macdContainer, setMacdContainer] = useState<HTMLDivElement | null>(null);

  // Indicator series refs
  const indicatorSeriesRefs = useRef<{
    sma20?: ISeriesApi<"Line">;
    sma50?: ISeriesApi<"Line">;
    sma200?: ISeriesApi<"Line">;
    ema20?: ISeriesApi<"Line">;
    ema50?: ISeriesApi<"Line">;
    ema200?: ISeriesApi<"Line">;
    bbUpper?: ISeriesApi<"Line">;
    bbMiddle?: ISeriesApi<"Line">;
    bbLower?: ISeriesApi<"Line">;
    rsiLine?: ISeriesApi<"Line">;
    rsiOverbought?: ISeriesApi<"Line">;
    rsiOversold?: ISeriesApi<"Line">;
    macdLine?: ISeriesApi<"Line">;
    macdSignal?: ISeriesApi<"Line">;
    macdHistogram?: ISeriesApi<"Histogram">;
  }>({});

  const { chartType, period, setChartType, setPeriod } = useChartPreferencesStore();
  const [isChartReady, setIsChartReady] = useState(false);

  // Indicator toggles
  const [showIndicators, setShowIndicators] = useState({
    sma20: false,
    sma50: false,
    sma200: false,
    ema20: false,
    ema50: false,
    ema200: false,
    bb: false,
    rsi: false,
    macd: false,
  });

  const [indicators, setIndicators] = useState<TechnicalIndicatorData | null>(null);

  const interval = PERIOD_INTERVALS[period];

  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ["stock", "history", ticker, period, interval],
    queryFn: () => stockApi.getHistory(ticker, period, interval),
    staleTime: period === "1d" ? 60 * 1000 : 30 * 60 * 1000,
  });

  // Calculate indicators when data changes
  useEffect(() => {
    if (historyData?.data && historyData.data.length > 0) {
      const calculatedIndicators = calculateAllIndicators(historyData.data);
      setIndicators(calculatedIndicators);
    }
  }, [historyData]);

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
        timeVisible: period === "1d",
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          // Show time for 1d period, otherwise show month/day
          if (period === "1d") {
            return date.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
          }
          return date.toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
          });
        },
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

  // Initialize RSI chart
  useEffect(() => {
    if (!rsiContainer || !showIndicators.rsi) return;

    const chart = createChart(rsiContainer, {
      layout: {
        background: { type: ColorType.Solid, color: "#0D0D0D" },
        textColor: "#B3B3B3",
      },
      grid: {
        vertLines: { color: "#1A1A1A" },
        horzLines: { color: "#1A1A1A" },
      },
      width: rsiContainer.clientWidth,
      height: 150,
      timeScale: {
        borderColor: "#333333",
        visible: true,
        timeVisible: period === "1d",
      },
      rightPriceScale: {
        borderColor: "#333333",
      },
    });

    rsiChartRef.current = chart;

    return () => {
      chart.remove();
      rsiChartRef.current = null;
    };
  }, [rsiContainer, showIndicators.rsi, period]);

  // Initialize MACD chart
  useEffect(() => {
    if (!macdContainer || !showIndicators.macd) return;

    const chart = createChart(macdContainer, {
      layout: {
        background: { type: ColorType.Solid, color: "#0D0D0D" },
        textColor: "#B3B3B3",
      },
      grid: {
        vertLines: { color: "#1A1A1A" },
        horzLines: { color: "#1A1A1A" },
      },
      width: macdContainer.clientWidth,
      height: 150,
      timeScale: {
        borderColor: "#333333",
        visible: true,
        timeVisible: period === "1d",
      },
      rightPriceScale: {
        borderColor: "#333333",
      },
    });

    macdChartRef.current = chart;

    return () => {
      chart.remove();
      macdChartRef.current = null;
    };
  }, [macdContainer, showIndicators.macd, period]);

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

    // Remove existing indicator overlays
    Object.values(indicatorSeriesRefs.current).forEach(series => {
      if (series && chartRef.current) {
        try {
          chartRef.current.removeSeries(series as any);
        } catch (e) {
          // Series might already be removed
        }
      }
    });
    indicatorSeriesRefs.current = {};

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

    // Update timeScale options based on period
    chartRef.current.timeScale().applyOptions({
      timeVisible: period === "1d",
      fixLeftEdge: true,
      fixRightEdge: true,
    });

    // Fit content and set visible range to prevent blank space when zooming out
    chartRef.current.timeScale().fitContent();

    // Set the visible range to match the data range
    if (chartData.length > 0) {
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: 0,
        to: chartData.length - 1,
      });
    }

    // Add indicator overlays
    if (indicators && chartRef.current) {
      // Moving averages
      if (showIndicators.sma20 && indicators.movingAverages.sma20) {
        const sma20Series = chartRef.current.addSeries(LineSeries, {
          color: "#2962FF",
          lineWidth: 2,
          title: "SMA 20"
        });
        sma20Series.setData(indicators.movingAverages.sma20);
        indicatorSeriesRefs.current.sma20 = sma20Series as any;
      }

      if (showIndicators.sma50 && indicators.movingAverages.sma50) {
        const sma50Series = chartRef.current.addSeries(LineSeries, {
          color: "#F23645",
          lineWidth: 2,
          title: "SMA 50"
        });
        sma50Series.setData(indicators.movingAverages.sma50);
        indicatorSeriesRefs.current.sma50 = sma50Series as any;
      }

      if (showIndicators.sma200 && indicators.movingAverages.sma200) {
        const sma200Series = chartRef.current.addSeries(LineSeries, {
          color: "#FF6D00",
          lineWidth: 2,
          title: "SMA 200"
        });
        sma200Series.setData(indicators.movingAverages.sma200);
        indicatorSeriesRefs.current.sma200 = sma200Series as any;
      }

      if (showIndicators.ema20 && indicators.movingAverages.ema20) {
        const ema20Series = chartRef.current.addSeries(LineSeries, {
          color: "#9C27B0",
          lineWidth: 2,
          title: "EMA 20"
        });
        ema20Series.setData(indicators.movingAverages.ema20);
        indicatorSeriesRefs.current.ema20 = ema20Series as any;
      }

      if (showIndicators.ema50 && indicators.movingAverages.ema50) {
        const ema50Series = chartRef.current.addSeries(LineSeries, {
          color: "#00BCD4",
          lineWidth: 2,
          title: "EMA 50"
        });
        ema50Series.setData(indicators.movingAverages.ema50);
        indicatorSeriesRefs.current.ema50 = ema50Series as any;
      }

      if (showIndicators.ema200 && indicators.movingAverages.ema200) {
        const ema200Series = chartRef.current.addSeries(LineSeries, {
          color: "#FFC107",
          lineWidth: 2,
          title: "EMA 200"
        });
        ema200Series.setData(indicators.movingAverages.ema200);
        indicatorSeriesRefs.current.ema200 = ema200Series as any;
      }

      // Bollinger Bands
      if (showIndicators.bb && indicators.bollingerBands) {
        const bbUpperSeries = chartRef.current.addSeries(LineSeries, {
          color: "#787B86",
          lineWidth: 1,
          lineStyle: 2,
          title: "BB Upper"
        });
        bbUpperSeries.setData(indicators.bollingerBands.upper);
        indicatorSeriesRefs.current.bbUpper = bbUpperSeries as any;

        const bbMiddleSeries = chartRef.current.addSeries(LineSeries, {
          color: "#787B86",
          lineWidth: 1,
          title: "BB Middle"
        });
        bbMiddleSeries.setData(indicators.bollingerBands.middle);
        indicatorSeriesRefs.current.bbMiddle = bbMiddleSeries as any;

        const bbLowerSeries = chartRef.current.addSeries(LineSeries, {
          color: "#787B86",
          lineWidth: 1,
          lineStyle: 2,
          title: "BB Lower"
        });
        bbLowerSeries.setData(indicators.bollingerBands.lower);
        indicatorSeriesRefs.current.bbLower = bbLowerSeries as any;
      }
    }

    // Clear and update RSI chart
    if (rsiChartRef.current) {
      // Remove all existing series from RSI chart
      try {
        const allSeries = [
          indicatorSeriesRefs.current.rsiLine,
          indicatorSeriesRefs.current.rsiOverbought,
          indicatorSeriesRefs.current.rsiOversold
        ];
        allSeries.forEach(series => {
          if (series) {
            try {
              rsiChartRef.current?.removeSeries(series as any);
            } catch (e) {
              // Series might already be removed
            }
          }
        });
      } catch (e) {
        // Ignore errors
      }

      if (showIndicators.rsi && indicators?.rsi) {
        const rsiSeries = rsiChartRef.current.addSeries(LineSeries, {
          color: "#2962FF",
          lineWidth: 2
        });
        rsiSeries.setData(indicators.rsi);
        indicatorSeriesRefs.current.rsiLine = rsiSeries as any;

        // Add overbought/oversold reference lines
        const overbought = indicators.rsi.map(d => ({ time: d.time, value: 70 }));
        const oversold = indicators.rsi.map(d => ({ time: d.time, value: 30 }));

        const overboughtSeries = rsiChartRef.current.addSeries(LineSeries, {
          color: "rgba(246, 70, 93, 0.3)",
          lineWidth: 1,
          lineStyle: 2
        });
        overboughtSeries.setData(overbought);
        indicatorSeriesRefs.current.rsiOverbought = overboughtSeries as any;

        const oversoldSeries = rsiChartRef.current.addSeries(LineSeries, {
          color: "rgba(14, 203, 129, 0.3)",
          lineWidth: 1,
          lineStyle: 2
        });
        oversoldSeries.setData(oversold);
        indicatorSeriesRefs.current.rsiOversold = oversoldSeries as any;

        rsiChartRef.current.timeScale().fitContent();
      }
    }

    // Clear and update MACD chart
    if (macdChartRef.current) {
      // Remove all existing series from MACD chart
      try {
        const allSeries = [
          indicatorSeriesRefs.current.macdLine,
          indicatorSeriesRefs.current.macdSignal,
          indicatorSeriesRefs.current.macdHistogram
        ];
        allSeries.forEach(series => {
          if (series) {
            try {
              macdChartRef.current?.removeSeries(series as any);
            } catch (e) {
              // Series might already be removed
            }
          }
        });
      } catch (e) {
        // Ignore errors
      }

      if (showIndicators.macd && indicators?.macd) {
        const macdSeries = macdChartRef.current.addSeries(LineSeries, {
          color: "#2962FF",
          lineWidth: 2
        });
        macdSeries.setData(indicators.macd.macd);
        indicatorSeriesRefs.current.macdLine = macdSeries as any;

        const signalSeries = macdChartRef.current.addSeries(LineSeries, {
          color: "#F23645",
          lineWidth: 2
        });
        signalSeries.setData(indicators.macd.signal);
        indicatorSeriesRefs.current.macdSignal = signalSeries as any;

        const histogramSeries = macdChartRef.current.addSeries(HistogramSeries, {
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          }
        });
        histogramSeries.setData(indicators.macd.histogram);
        indicatorSeriesRefs.current.macdHistogram = histogramSeries as any;

        macdChartRef.current.timeScale().fitContent();
      }
    }
  }, [isChartReady, historyData, chartType, period, showIndicators, indicators]);

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
      <div className="space-y-4 mb-4">
        {/* Chart Type and Period Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
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

        {/* Technical Indicators Controls */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-text-secondary" />
            <span className="text-sm font-semibold text-text-primary">Technical Indicators</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Moving Averages */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-text-secondary" />
                <span className="text-xs font-medium text-text-secondary">Moving Averages</span>
              </div>
              <div className="space-y-1">
                {[
                  { key: "sma20" as const, label: "SMA 20", color: "#2962FF" },
                  { key: "sma50" as const, label: "SMA 50", color: "#F23645" },
                  { key: "sma200" as const, label: "SMA 200", color: "#FF6D00" },
                  { key: "ema20" as const, label: "EMA 20", color: "#9C27B0" },
                  { key: "ema50" as const, label: "EMA 50", color: "#00BCD4" },
                  { key: "ema200" as const, label: "EMA 200", color: "#FFC107" },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setShowIndicators(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${
                      showIndicators[key]
                        ? "bg-surface text-text-primary"
                        : "text-text-secondary hover:bg-background"
                    }`}
                  >
                    <span
                      className="w-3 h-0.5 rounded"
                      style={{ backgroundColor: showIndicators[key] ? color : "#4a4a4a" }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bollinger Bands */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <GitBranch size={14} className="text-text-secondary" />
                <span className="text-xs font-medium text-text-secondary">Volatility</span>
              </div>
              <button
                onClick={() => setShowIndicators(prev => ({ ...prev, bb: !prev.bb }))}
                className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${
                  showIndicators.bb
                    ? "bg-surface text-text-primary"
                    : "text-text-secondary hover:bg-background"
                }`}
              >
                <span
                  className="w-3 h-0.5 rounded"
                  style={{ backgroundColor: showIndicators.bb ? "#787B86" : "#4a4a4a" }}
                />
                Bollinger Bands
              </button>
            </div>

            {/* Momentum Indicators */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <BarChart2 size={14} className="text-text-secondary" />
                <span className="text-xs font-medium text-text-secondary">Momentum</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setShowIndicators(prev => ({ ...prev, rsi: !prev.rsi }))}
                  className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${
                    showIndicators.rsi
                      ? "bg-surface text-text-primary"
                      : "text-text-secondary hover:bg-background"
                  }`}
                >
                  <span
                    className="w-3 h-0.5 rounded"
                    style={{ backgroundColor: showIndicators.rsi ? "#2962FF" : "#4a4a4a" }}
                  />
                  RSI
                </button>
                <button
                  onClick={() => setShowIndicators(prev => ({ ...prev, macd: !prev.macd }))}
                  className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${
                    showIndicators.macd
                      ? "bg-surface text-text-primary"
                      : "text-text-secondary hover:bg-background"
                  }`}
                >
                  <span
                    className="w-3 h-0.5 rounded"
                    style={{ backgroundColor: showIndicators.macd ? "#2962FF" : "#4a4a4a" }}
                  />
                  MACD
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Price Chart */}
      <div
        ref={(el) => {
          chartContainerRef.current = el;
          setContainerElement(el);
        }}
        className="rounded overflow-hidden"
        style={{ minHeight: '500px' }}
      />

      {/* RSI Chart */}
      {showIndicators.rsi && (
        <div className="mt-4">
          <div className="text-xs font-medium text-text-secondary mb-2 px-2">
            RSI (14) - Relative Strength Index
          </div>
          <div
            ref={setRsiContainer}
            className="rounded overflow-hidden"
            style={{ minHeight: '150px' }}
          />
        </div>
      )}

      {/* MACD Chart */}
      {showIndicators.macd && (
        <div className="mt-4">
          <div className="text-xs font-medium text-text-secondary mb-2 px-2">
            MACD (12, 26, 9) - Moving Average Convergence Divergence
          </div>
          <div
            ref={setMacdContainer}
            className="rounded overflow-hidden"
            style={{ minHeight: '150px' }}
          />
        </div>
      )}
    </div>
  );
};
