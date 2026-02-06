import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WS_URL } from "../lib/constants";

export const useWebSocket = (tickers: string[]) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    if (tickers.length === 0) return;

    const tickersStr = tickers.join(",");
    const ws = new WebSocket(`${WS_URL}/ws/live/${tickersStr}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update TanStack Query cache with live data
        if (data.id && data.price) {
          queryClient.setQueryData(["stock", "price", data.id], (oldData: any) => ({
            ...oldData,
            data: {
              ...oldData?.data,
              last_price: data.price,
              volume: data.volume,
              timestamp: data.timestamp,
            },
            cached: false,
          }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);

      // Attempt reconnection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        connect();
      }, 5000);
    };

    wsRef.current = ws;
  }, [tickers, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
};
