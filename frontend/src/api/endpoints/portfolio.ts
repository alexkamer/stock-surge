import { apiClient } from "../client";

export interface PortfolioPosition {
  id: string;
  ticker: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioPositionWithMetrics extends PortfolioPosition {
  current_price: number;
  current_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_pl_percent: number;
  day_change: number;
  day_change_percent: number;
}

export interface PortfolioSummary {
  user_id: string;
  total_positions: number;
  total_value: number;
  total_cost_basis: number;
  total_unrealized_pl: number;
  total_unrealized_pl_percent: number;
  total_day_change: number;
  total_day_change_percent: number;
  positions: PortfolioPositionWithMetrics[];
}

export interface AddPositionRequest {
  ticker: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string; // ISO date string
  notes?: string;
}

export interface UpdatePositionRequest {
  quantity?: number;
  purchase_price?: number;
  purchase_date?: string;
  notes?: string;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
  pl: number;  // P/L relative to start of period
  pl_percent: number;  // P/L % relative to start of period
  alltime_pl: number;  // All-time P/L vs purchase price
  alltime_pl_percent: number;  // All-time P/L % vs purchase price
}

export interface PerformanceResponse {
  period: string;
  data: PerformanceDataPoint[];
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percent: number;
}

export interface PositionPerformance {
  ticker: string;
  pl: number;
  pl_percent: number;
  current_value: number;
}

export interface AnalyticsResponse {
  performance: PerformanceResponse;
  sector_allocation: SectorAllocation[];
  top_performers: PositionPerformance[];
  bottom_performers: PositionPerformance[];
}

export const portfolioApi = {
  getPortfolio: async (): Promise<PortfolioSummary> => {
    const response = await apiClient.get("/portfolio/");
    return response.data;
  },

  addPosition: async (data: AddPositionRequest): Promise<PortfolioPosition> => {
    const response = await apiClient.post("/portfolio/", data);
    return response.data;
  },

  updatePosition: async (
    positionId: string,
    data: UpdatePositionRequest
  ): Promise<PortfolioPosition> => {
    const response = await apiClient.put(`/portfolio/${positionId}`, data);
    return response.data;
  },

  deletePosition: async (positionId: string): Promise<{ message: string; ticker: string }> => {
    const response = await apiClient.delete(`/portfolio/${positionId}`);
    return response.data;
  },

  getAnalytics: async (period: string = "1mo"): Promise<AnalyticsResponse> => {
    const response = await apiClient.get(`/portfolio/analytics?period=${period}`);
    return response.data;
  },
};
