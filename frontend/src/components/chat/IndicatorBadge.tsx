import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

export type IndicatorType = "rsi" | "macd" | "ma_cross";
export type Signal = "bullish" | "bearish" | "neutral";

interface IndicatorBadgeProps {
  type: IndicatorType;
  signal: Signal;
  value?: number;
  details?: string;
}

const INDICATOR_CONFIG = {
  rsi: {
    label: "RSI",
    description: "Relative Strength Index",
  },
  macd: {
    label: "MACD",
    description: "Moving Average Convergence Divergence",
  },
  ma_cross: {
    label: "MA Cross",
    description: "Moving Average Crossover",
  },
};

const SIGNAL_CONFIG = {
  bullish: {
    label: "Bullish",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    icon: TrendingUp,
  },
  bearish: {
    label: "Bearish",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    icon: TrendingDown,
  },
  neutral: {
    label: "Neutral",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
    icon: Minus,
  },
};

export function IndicatorBadge({ type, signal, value, details }: IndicatorBadgeProps) {
  const indicatorConfig = INDICATOR_CONFIG[type];
  const signalConfig = SIGNAL_CONFIG[signal];
  const Icon = signalConfig.icon;

  // RSI-specific rendering
  if (type === "rsi" && value !== undefined) {
    const getRsiLevel = (rsi: number) => {
      if (rsi >= 70) return { label: "Overbought", signal: "bearish" as Signal };
      if (rsi <= 30) return { label: "Oversold", signal: "bullish" as Signal };
      return { label: "Neutral", signal: "neutral" as Signal };
    };

    const level = getRsiLevel(value);
    const effectiveSignal = SIGNAL_CONFIG[level.signal];
    const barWidth = Math.min(Math.max(value, 0), 100);

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${effectiveSignal.bg} ${effectiveSignal.border}`}
      >
        <div className="flex items-center gap-1.5">
          <Icon size={14} className={effectiveSignal.color} />
          <span className="text-xs font-semibold">{indicatorConfig.label}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${effectiveSignal.color.replace("text", "bg")}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className={`text-xs font-mono font-bold ${effectiveSignal.color}`}>
              {value.toFixed(1)}
            </span>
          </div>
          <span className={`text-xs ${effectiveSignal.color}`}>{level.label}</span>
        </div>
      </div>
    );
  }

  // MACD-specific rendering
  if (type === "macd") {
    const TrendIcon = signal === "bullish" ? ArrowUpRight : signal === "bearish" ? ArrowDownRight : Minus;

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${signalConfig.bg} ${signalConfig.border}`}
      >
        <div className="flex items-center gap-1.5">
          <TrendIcon size={14} className={signalConfig.color} />
          <span className="text-xs font-semibold">{indicatorConfig.label}</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-xs font-semibold ${signalConfig.color}`}>
            {signalConfig.label}
          </span>
          {details && <span className="text-xs text-slate-400">{details}</span>}
        </div>
      </div>
    );
  }

  // MA Cross-specific rendering
  if (type === "ma_cross") {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${signalConfig.bg} ${signalConfig.border}`}
      >
        <div className="flex items-center gap-1.5">
          <Icon size={14} className={signalConfig.color} />
          <span className="text-xs font-semibold">{indicatorConfig.label}</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-xs font-semibold ${signalConfig.color}`}>
            {signal === "bullish"
              ? "Golden Cross"
              : signal === "bearish"
              ? "Death Cross"
              : "No Signal"}
          </span>
          {details && <span className="text-xs text-slate-400">{details}</span>}
        </div>
      </div>
    );
  }

  // Generic rendering
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${signalConfig.bg} ${signalConfig.border}`}
      title={indicatorConfig.description}
    >
      <Icon size={14} className={signalConfig.color} />
      <span className="text-xs font-semibold">{indicatorConfig.label}</span>
      <span className={`text-xs font-semibold ${signalConfig.color}`}>
        {signalConfig.label}
      </span>
      {value !== undefined && (
        <span className={`text-xs font-mono ${signalConfig.color}`}>{value.toFixed(2)}</span>
      )}
    </div>
  );
}

// Helper component for multiple indicators
interface IndicatorGroupProps {
  indicators: Array<{
    type: IndicatorType;
    signal: Signal;
    value?: number;
    details?: string;
  }>;
}

export function IndicatorGroup({ indicators }: IndicatorGroupProps) {
  if (indicators.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-3">
      {indicators.map((indicator, index) => (
        <IndicatorBadge key={`${indicator.type}-${index}`} {...indicator} />
      ))}
    </div>
  );
}
