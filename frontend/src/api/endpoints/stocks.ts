import { apiClient } from "../client";

export interface PriceData {
  last_price: number;
  open: number;
  day_high: number;
  day_low: number;
  previous_close: number;
  volume: number;
  currency: string;
  exchange: string;
  market_cap: number | null;
  timestamp: string;
}

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoryData {
  period: string;
  interval: string;
  count: number;
  data: OHLCVData[];
}

export interface CompanyInfo {
  name: string;
  symbol: string;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  market_cap?: number;
  pe_ratio?: number;
  forward_pe?: number;
  dividend_yield?: number;
  beta?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  employees?: number;
  country?: string;
  city?: string;
}

export interface MarketIndexData {
  symbol: string;
  short_name: string;
  regular_market_price: number;
  regular_market_change: number;
  regular_market_change_percent: number;
  regular_market_previous_close: number;
  market_state: string;
}

export interface MarketOverviewResponse {
  market_id: string;
  market_name: string;
  status: string;
  indices: Record<string, MarketIndexData>;
  cached: boolean;
}

export interface AvailableMarket {
  id: string;
  name: string;
  description: string;
}

export interface AvailableMarketsResponse {
  markets: AvailableMarket[];
}

export interface SectorOverview {
  companies_count: number;
  market_cap: number;
  description: string;
  industries_count: number;
  market_weight: number;
  employee_count: number;
}

export interface SectorResponse {
  key: string;
  name: string;
  symbol: string;
  overview: SectorOverview;
  top_companies: Array<Record<string, any>>;
  industries: Array<Record<string, any>>;
  top_etfs: Record<string, string>;
  top_mutual_funds: Record<string, string>;
  cached: boolean;
}

export interface IndustryOverview {
  companies_count: number;
  market_cap: number;
  description: string;
  market_weight: number;
  employee_count: number;
}

export interface IndustryResponse {
  key: string;
  name: string;
  symbol: string;
  sector_key: string;
  sector_name: string;
  overview: IndustryOverview;
  top_performing_companies: Array<Record<string, any>>;
  top_growth_companies: Array<Record<string, any>>;
  cached: boolean;
}

export const stockApi = {
  getPrice: async (ticker: string) => {
    const response = await apiClient.get(`/stock/${ticker}/price`);
    return response.data.data; // Unwrap the nested data
  },

  getInfo: async (ticker: string) => {
    const response = await apiClient.get(`/stock/${ticker}/info`);
    return response.data.data; // Unwrap the nested data
  },

  getHistory: async (ticker: string, period: string = "1mo", interval: string = "1d") => {
    const response = await apiClient.get(`/stock/${ticker}/history`, {
      params: { period, interval },
    });
    return response.data.data; // Unwrap the nested data
  },

  getNews: async (ticker: string, count: number = 10) => {
    const response = await apiClient.get(`/stock/${ticker}/news`, {
      params: { count },
    });
    return response.data.data; // Unwrap the nested data
  },

  getRecommendations: async (ticker: string) => {
    const response = await apiClient.get(`/stock/${ticker}/recommendations`);
    return response.data.data; // Unwrap the nested data
  },

  getMarketOverview: async (marketId: string = "US") => {
    const response = await apiClient.get<MarketOverviewResponse>(`/market/${marketId}/overview`);
    return response.data;
  },

  getAvailableMarkets: async () => {
    const response = await apiClient.get<AvailableMarketsResponse>("/markets/available");
    return response.data;
  },

  getSector: async (sectorKey: string) => {
    const response = await apiClient.get<SectorResponse>(`/sector/${sectorKey}`);
    return response.data;
  },

  getIndustry: async (industryKey: string) => {
    const response = await apiClient.get<IndustryResponse>(`/industry/${industryKey}`);
    return response.data;
  },

  getFinancials: async (ticker: string, statementType: "income" | "balance-sheet" | "cash-flow") => {
    const response = await apiClient.get(`/stock/${ticker}/financials/${statementType}`);
    return response.data;
  },
};
