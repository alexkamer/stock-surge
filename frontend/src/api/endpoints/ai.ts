import { apiClient } from "../client";

export interface OllamaStatus {
  available: boolean;
  model: string;
  base_url: string;
}

export interface ArticleSummary {
  success: boolean;
  url: string;
  title: string;
  summary: string;
  key_takeaway?: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  word_count: number;
  model: string;
  original_word_count: number;
}

export interface ContentSummary {
  success: boolean;
  title: string;
  summary: string;
  word_count: number;
  model: string;
}

export interface KeyPoints {
  success: boolean;
  url: string;
  title: string;
  key_points: string[];
  model: string;
}

export const aiApi = {
  checkStatus: async (): Promise<OllamaStatus> => {
    const response = await apiClient.get<OllamaStatus>("/ai/status");
    return response.data;
  },

  summarizeArticle: async (url: string, maxLength: number = 200): Promise<ArticleSummary> => {
    const response = await apiClient.post<ArticleSummary>("/ai/summarize", {
      url,
      max_length: maxLength,
    });
    return response.data;
  },

  summarizeContent: async (
    title: string,
    content: string,
    maxLength: number = 200
  ): Promise<ContentSummary> => {
    const response = await apiClient.post<ContentSummary>("/ai/summarize-content", {
      title,
      content,
      max_length: maxLength,
    });
    return response.data;
  },

  extractKeyPoints: async (url: string, numPoints: number = 5): Promise<KeyPoints> => {
    const response = await apiClient.post<KeyPoints>("/ai/key-points", {
      url,
      num_points: numPoints,
    });
    return response.data;
  },
};
