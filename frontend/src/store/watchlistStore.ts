import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistStore {
  tickers: string[];
  addTicker: (ticker: string) => void;
  removeTicker: (ticker: string) => void;
  setTickers: (tickers: string[]) => void;
  hasTicker: (ticker: string) => boolean;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      tickers: [],

      addTicker: (ticker: string) => {
        const upperTicker = ticker.toUpperCase();
        set((state) => {
          if (!state.tickers.includes(upperTicker)) {
            return { tickers: [...state.tickers, upperTicker] };
          }
          return state;
        });
      },

      removeTicker: (ticker: string) => {
        const upperTicker = ticker.toUpperCase();
        set((state) => ({
          tickers: state.tickers.filter((t) => t !== upperTicker),
        }));
      },

      setTickers: (tickers: string[]) => {
        set({ tickers: tickers.map((t) => t.toUpperCase()) });
      },

      hasTicker: (ticker: string) => {
        return get().tickers.includes(ticker.toUpperCase());
      },
    }),
    {
      name: "watchlist-storage",
    }
  )
);
