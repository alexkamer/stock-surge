/**
 * Chat API endpoints
 */

import { apiClient, getAccessToken } from "../client";

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  context_data?: Record<string, any>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

export const chatApi = {
  /**
   * Create a new chat session
   */
  createSession: async (title?: string): Promise<ChatSession> => {
    const response = await apiClient.post("/chat/sessions", { title });
    return response.data;
  },

  /**
   * Get all chat sessions
   */
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await apiClient.get("/chat/sessions");
    return response.data;
  },

  /**
   * Get a single session with all messages
   */
  getSession: async (sessionId: string): Promise<ChatSessionWithMessages> => {
    const response = await apiClient.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Delete a chat session
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/chat/sessions/${sessionId}`);
  },

  /**
   * Send a message and get streaming response
   * Returns an EventSource for Server-Sent Events
   */
  sendMessage: (
    sessionId: string,
    content: string,
    onMessage: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): EventSource => {
    // Get the current token
    const token = getAccessToken();

    // Use fetch with streaming
    const controller = new AbortController();

    fetch(`${apiClient.defaults.baseURL}/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            onComplete();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              if (data === "[DONE]") {
                onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  onMessage(parsed.content);
                } else if (parsed.error) {
                  onError(parsed.error);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          onError(error.message);
        }
      });

    // Return a mock EventSource-like object with close method
    return {
      close: () => controller.abort(),
    } as EventSource;
  },

  /**
   * Get current market context and watchlist
   */
  getContext: async (): Promise<{
    watchlist: string[];
    market_overview: Record<string, any>;
  }> => {
    const response = await apiClient.get("/chat/context");
    return response.data;
  },

  /**
   * Send an anonymous message (no session persistence)
   * For users who aren't logged in
   */
  sendAnonymousMessage: (
    content: string,
    onMessage: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): EventSource => {
    // Get the current token (may be null for anonymous users)
    const token = getAccessToken();

    // Use fetch with streaming
    const controller = new AbortController();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${apiClient.defaults.baseURL}/chat/anonymous/message`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            onComplete();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              if (data === "[DONE]") {
                onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  onMessage(parsed.content);
                } else if (parsed.error) {
                  onError(parsed.error);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          onError(error.message);
        }
      });

    // Return a mock EventSource-like object with close method
    return {
      close: () => controller.abort(),
    } as EventSource;
  },
};
