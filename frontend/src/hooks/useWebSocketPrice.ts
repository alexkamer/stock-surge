import { useEffect, useRef, useState } from 'react';

interface WebSocketPriceData {
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

interface UseWebSocketPriceResult {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  isLive: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
}

const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

export const useWebSocketPrice = (ticker: string): UseWebSocketPriceResult => {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);
  const currentTicker = useRef<string>(ticker);

  // Connect on mount or when ticker changes
  useEffect(() => {
    // Update current ticker ref
    currentTicker.current = ticker;

    // Reset state when ticker changes
    setPrice(null);
    setChange(null);
    setChangePercent(null);
    setVolume(null);
    setError(null);

    shouldReconnect.current = true;
    reconnectAttempts.current = 0;

    // Disconnect any existing connection first
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Switching ticker');
      wsRef.current = null;
    }

    if (!ticker) {
      return;
    }

    // Connect function
    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        setConnectionStatus('connecting');
        setError(null);

        // Construct WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.VITE_WS_HOST || window.location.host.replace(':5173', ':8000');
        const wsUrl = `${protocol}//${host}/ws/live/${ticker}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`WebSocket connected for ${ticker}`);
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            const data: WebSocketPriceData = JSON.parse(event.data);

            // Only update if this is still the current ticker
            if (currentTicker.current === ticker) {
              setPrice(data.price);
              setChange(data.change);
              setChangePercent(data.changePercent);
              if (data.volume !== undefined) {
                setVolume(data.volume);
              }
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setConnectionStatus('error');
          setError('WebSocket connection error');
        };

        ws.onclose = (event) => {
          console.log(`WebSocket disconnected for ${ticker}`, event.code, event.reason);
          setConnectionStatus('disconnected');
          wsRef.current = null;

          // Attempt to reconnect if not manually closed and within retry limit
          if (
            shouldReconnect.current &&
            reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS &&
            event.code !== 1000 &&
            currentTicker.current === ticker // Only reconnect if still the same ticker
          ) {
            reconnectAttempts.current += 1;
            console.log(`Reconnect attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms`);

            reconnectTimeoutRef.current = setTimeout(() => {
              if (currentTicker.current === ticker) {
                connect();
              }
            }, RECONNECT_DELAY);
          } else if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            setError('Max reconnection attempts reached. Please refresh the page.');
            setConnectionStatus('error');
          }
        };
      } catch (err) {
        console.error('Failed to create WebSocket connection:', err);
        setConnectionStatus('error');
        setError('Failed to establish WebSocket connection');
      }
    };

    connect();

    return () => {
      shouldReconnect.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }

      setConnectionStatus('disconnected');
    };
  }, [ticker]);

  return {
    price,
    change,
    changePercent,
    volume,
    isLive: connectionStatus === 'connected',
    connectionStatus,
    error,
  };
};
