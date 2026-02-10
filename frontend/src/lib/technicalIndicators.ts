import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators';
import type { LineData, HistogramData, Time } from 'lightweight-charts';

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicatorData {
  movingAverages: {
    sma20?: LineData<Time>[];
    sma50?: LineData<Time>[];
    sma200?: LineData<Time>[];
    ema20?: LineData<Time>[];
    ema50?: LineData<Time>[];
    ema200?: LineData<Time>[];
  };
  rsi?: LineData<Time>[];
  macd?: {
    macd: LineData<Time>[];
    signal: LineData<Time>[];
    histogram: HistogramData<Time>[];
  };
  bollingerBands?: {
    upper: LineData<Time>[];
    middle: LineData<Time>[];
    lower: LineData<Time>[];
  };
}

const convertToTime = (dateStr: string): Time => {
  return (new Date(dateStr).getTime() / 1000) as Time;
};

export const calculateMovingAverages = (
  data: OHLCVData[],
  periods: number[] = [20, 50, 200],
  type: 'sma' | 'ema' = 'sma'
): Record<string, LineData<Time>[]> => {
  const closes = data.map(d => d.close);
  const result: Record<string, LineData<Time>[]> = {};

  periods.forEach(period => {
    if (closes.length < period) return;

    const values = type === 'sma'
      ? SMA.calculate({ period, values: closes })
      : EMA.calculate({ period, values: closes });

    const indicatorData: LineData<Time>[] = values.map((value, idx) => ({
      time: convertToTime(data[idx + period - 1].date),
      value: value
    }));

    result[`${type}${period}`] = indicatorData;
  });

  return result;
};

export const calculateRSI = (data: OHLCVData[], period: number = 14): LineData<Time>[] => {
  const closes = data.map(d => d.close);

  if (closes.length < period) return [];

  const rsiValues = RSI.calculate({ period, values: closes });

  return rsiValues.map((value, idx) => ({
    time: convertToTime(data[idx + period].date),
    value: value
  }));
};

export const calculateMACD = (
  data: OHLCVData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: LineData<Time>[], signal: LineData<Time>[], histogram: HistogramData<Time>[] } | null => {
  const closes = data.map(d => d.close);

  if (closes.length < slowPeriod + signalPeriod) return null;

  const macdData = MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });

  const offset = closes.length - macdData.length;

  return {
    macd: macdData.map((d, idx) => ({
      time: convertToTime(data[idx + offset].date),
      value: d.MACD ?? 0
    })),
    signal: macdData.map((d, idx) => ({
      time: convertToTime(data[idx + offset].date),
      value: d.signal ?? 0
    })),
    histogram: macdData.map((d, idx) => ({
      time: convertToTime(data[idx + offset].date),
      value: d.histogram ?? 0,
      color: (d.histogram ?? 0) >= 0 ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)'
    }))
  };
};

export const calculateBollingerBands = (
  data: OHLCVData[],
  period: number = 20,
  stdDev: number = 2
): { upper: LineData<Time>[], middle: LineData<Time>[], lower: LineData<Time>[] } | null => {
  const closes = data.map(d => d.close);

  if (closes.length < period) return null;

  const bbData = BollingerBands.calculate({
    period,
    values: closes,
    stdDev
  });

  const offset = closes.length - bbData.length;

  return {
    upper: bbData.map((d, idx) => ({
      time: convertToTime(data[idx + offset].date),
      value: d.upper
    })),
    middle: bbData.map((d, idx) => ({
      time: convertToTime(data[idx + offset].date),
      value: d.middle
    })),
    lower: bbData.map((d, idx) => ({
      time: convertToTime(data[idx + offset].date),
      value: d.lower
    }))
  };
};

export const calculateAllIndicators = (data: OHLCVData[]): TechnicalIndicatorData => {
  const smaData = calculateMovingAverages(data, [20, 50, 200], 'sma');
  const emaData = calculateMovingAverages(data, [20, 50, 200], 'ema');

  return {
    movingAverages: {
      ...smaData,
      ...emaData
    },
    rsi: calculateRSI(data),
    macd: calculateMACD(data) ?? undefined,
    bollingerBands: calculateBollingerBands(data) ?? undefined
  };
};
