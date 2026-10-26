import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_BASE_URL } from './auth';

type LiveCounts = { cart: number; saved: number; orders: number };
type LiveContextValue = LiveCounts & { refresh: () => void };
const emptyCounts: LiveCounts = { cart: 0, saved: 0, orders: 0 };
const MarketplaceLiveContext = createContext<LiveContextValue>({ ...emptyCounts, refresh: () => undefined });

function readRole() {
  try { return (JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string } | null)?.role || ''; } catch { return ''; }
}

async function getData<T>(path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const body = await response.json() as { data?: T };
    return body.data ?? null;
  } catch { return null; }
}

export function MarketplaceLiveProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<LiveCounts>(emptyCounts);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refresh = useCallback(() => setRefreshVersion((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('unimartxToken');
    const buyer = readRole() === 'buyer';
    if (!token || !buyer) { setCounts(emptyCounts); }
    else {
      void Promise.all([
        getData<{ itemCount?: number; items?: unknown[] }>('/cart', token),
        getData<string[]>('/wishlist/ids', token),
        getData<{ orders?: { status: string }[] }>('/buyer/orders?limit=100', token),
      ]).then(([cart, saved, orderResult]) => {
        if (cancelled) return;
        const openOrders = (orderResult?.orders || []).filter((order) => !['delivered', 'cancelled', 'refunded'].includes(order.status)).length;
        setCounts({ cart: Number(cart?.itemCount ?? cart?.items?.length ?? 0), saved: saved?.length ?? 0, orders: openOrders });
      });
    }
    return () => { cancelled = true; };
  }, [refreshVersion]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    let stopped = false;
    const connect = () => {
      if (stopped) return;
      const token = localStorage.getItem('unimartxToken');
      if (!token || readRole() !== 'buyer') return;
      const wsBase = API_BASE_URL.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
      try {
        socket = new WebSocket(`${wsBase}/ws`, ['unimartx', token]);
        socket.onmessage = (message) => {
          try {
            const event = JSON.parse(String(message.data)) as { type?: string; resource?: string };
            if (event.type === 'cart.updated' || event.type === 'order.created' || event.type === 'order.status_changed') {
              refresh();
              window.dispatchEvent(new CustomEvent('unimartx:market-refresh', { detail: event }));
            }
          } catch { /* Ignore malformed realtime messages. */ }
        };
        socket.onclose = () => { if (!stopped) retryTimer = window.setTimeout(connect, 5000); };
        socket.onerror = () => socket?.close();
      } catch { retryTimer = window.setTimeout(connect, 5000); }
    };
    connect();
    const reconnectForAuth = () => { socket?.close(); window.clearTimeout(retryTimer); connect(); };
    window.addEventListener('unimartx:auth-change', reconnectForAuth);
    return () => { stopped = true; window.clearTimeout(retryTimer); window.removeEventListener('unimartx:auth-change', reconnectForAuth); socket?.close(); };
  }, [refresh]);

  useEffect(() => {
    const onAuthChange = () => refresh();
    const onStorage = () => {
      refresh();
      window.dispatchEvent(new CustomEvent('unimartx:market-refresh', { detail: { type: 'market.refresh', resource: 'all' } }));
    };
    const onFocus = () => refresh();
    const poll = window.setInterval(() => {
      refresh();
      window.dispatchEvent(new CustomEvent('unimartx:market-refresh', { detail: { type: 'market.refresh', resource: 'products' } }));
    }, 60000);
    window.addEventListener('unimartx:auth-change', onAuthChange);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('unimartx:auth-change', onAuthChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const value = useMemo(() => ({ ...counts, refresh }), [counts, refresh]);
  return <MarketplaceLiveContext.Provider value={value}>{children}</MarketplaceLiveContext.Provider>;
}

export function useMarketplaceLive() { return useContext(MarketplaceLiveContext); }
