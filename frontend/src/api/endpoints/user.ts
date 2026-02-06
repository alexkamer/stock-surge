import { apiClient } from "../client";

export interface WatchlistItem {
  ticker: string;
  position: number;
  created_at: string;
}

export interface UserPreferences {
  theme: string;
  chart_type: string;
  default_period: string;
  default_interval: string;
  preferences: Record<string, any>;
}

export const userApi = {
  getWatchlist: async () => {
    const response = await apiClient.get("/user/watchlist");
    return response.data;
  },

  addToWatchlist: async (ticker: string, position?: number) => {
    const response = await apiClient.post("/user/watchlist", { ticker, position });
    return response.data;
  },

  removeFromWatchlist: async (ticker: string) => {
    const response = await apiClient.delete(`/user/watchlist/${ticker}`);
    return response.data;
  },

  getPreferences: async (): Promise<UserPreferences> => {
    const response = await apiClient.get("/user/preferences");
    return response.data;
  },

  updatePreferences: async (preferences: Partial<UserPreferences>) => {
    const response = await apiClient.put("/user/preferences", preferences);
    return response.data;
  },
};
