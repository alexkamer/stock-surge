import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChartType = "candlestick" | "line" | "area";
export type TimePeriod = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max";

interface ChartPreferencesStore {
  chartType: ChartType;
  period: TimePeriod;
  setChartType: (type: ChartType) => void;
  setPeriod: (period: TimePeriod) => void;
}

export const useChartPreferencesStore = create<ChartPreferencesStore>()(
  persist(
    (set) => ({
      chartType: "candlestick",
      period: "1mo",

      setChartType: (chartType: ChartType) => {
        set({ chartType });
      },

      setPeriod: (period: TimePeriod) => {
        set({ period });
      },
    }),
    {
      name: "chart-preferences-storage",
    }
  )
);
