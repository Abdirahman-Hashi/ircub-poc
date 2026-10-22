import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { API_PATHS } from '../api/api-paths.constants';

import { useAuth } from './auth';
import { ENV } from './env.constants';
import { LIVE_EVENT, LIVE_EVENTS } from './live-events.constants';
import { getAccessToken } from './token-store';

import type {
  LiveEvent,
  LiveEventListener,
  LiveEventsContextValue,
  PaymentPermanentlyFailedEvent,
} from './live-events.types';

const LiveEventsContext = createContext<LiveEventsContextValue | null>(null);

/**
 * One EventSource per signed-in session (D4). The API scopes what each user receives;
 * screens subscribe to react (refresh a table, toast a status change). EventSource cannot
 * send headers, so the access token travels as a query parameter over the same origin.
 */
export function LiveEventsProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const { status } = useAuth();
  const [connected, setConnected] = useState(false);
  const [escalations, setEscalations] = useState<readonly PaymentPermanentlyFailedEvent[]>([]);
  const listeners = useRef(new Set<LiveEventListener>());

  const dispatch = useCallback((event: LiveEvent): void => {
    if (event.type === LIVE_EVENT.PAYMENT_PERMANENTLY_FAILED) {
      setEscalations((current) => [event.data, ...current].slice(0, LIVE_EVENTS.MAX_ESCALATIONS));
    }
    for (const listener of listeners.current) {
      listener(event);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = (): void => {
      const token = getAccessToken();
      if (disposed || token === null) {
        return;
      }
      const url = new URL(`${ENV.API_URL}${API_PATHS.EVENTS}`, window.location.origin);
      url.searchParams.set(LIVE_EVENTS.TOKEN_QUERY, token);
      source = new EventSource(url.toString());
      source.onopen = () => {
        setConnected(true);
      };
      const onMessage = (raw: MessageEvent<string>): void => {
        dispatch(JSON.parse(raw.data) as LiveEvent);
      };
      source.addEventListener(LIVE_EVENT.PAYMENT_UPDATED, onMessage);
      source.addEventListener(LIVE_EVENT.PAYMENT_PERMANENTLY_FAILED, onMessage);
      source.addEventListener(LIVE_EVENT.ALERT_CREATED, onMessage);
      source.onerror = () => {
        setConnected(false);
        source?.close();
        timer = setTimeout(connect, LIVE_EVENTS.RECONNECT_MS);
      };
    };
    connect();

    return () => {
      disposed = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
      source?.close();
      setConnected(false);
    };
  }, [status, dispatch]);

  const subscribe = useCallback((listener: LiveEventListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const clearEscalations = useCallback(() => {
    setEscalations([]);
  }, []);

  const value = useMemo(
    () => ({ connected, escalations, clearEscalations, subscribe }),
    [connected, escalations, clearEscalations, subscribe],
  );
  return <LiveEventsContext.Provider value={value}>{children}</LiveEventsContext.Provider>;
}

export function useLiveEvents(): LiveEventsContextValue {
  const value = useContext(LiveEventsContext);
  if (value === null) {
    throw new Error('useLiveEvents must be used within LiveEventsProvider');
  }
  return value;
}

/** Subscribe for the lifetime of a component; the listener is kept in a ref so it may close over fresh state. */
export function useLiveEvent(listener: LiveEventListener): void {
  const { subscribe } = useLiveEvents();
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  });
  useEffect(() => {
    return subscribe((event) => {
      latest.current(event);
    });
  }, [subscribe]);
}
