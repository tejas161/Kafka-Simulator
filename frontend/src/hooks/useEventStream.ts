import { useState, useEffect, useCallback, useRef } from 'react';
import type { EventRecord, EventStats, KafkaHealthStatus } from '../types';

interface EventStreamState {
  events: EventRecord[];
  stats: EventStats;
  kafkaStatus: KafkaHealthStatus | null;
  isConnected: boolean;
}

const INITIAL_STATS: EventStats = { published: 0, received: 0, errors: 0 };

export const useEventStream = () => {
  const [state, setState] = useState<EventStreamState>({
    events: [],
    stats: INITIAL_STATS,
    kafkaStatus: null,
    isConnected: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/events/stream');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    });

    es.addEventListener('event', (e) => {
      try {
        const event: EventRecord = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          events: [event, ...prev.events].slice(0, 200),
        }));
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    });

    es.addEventListener('stats', (e) => {
      try {
        const stats: EventStats = JSON.parse(e.data);
        setState((prev) => ({ ...prev, stats }));
      } catch (err) {
        console.error('[SSE] Failed to parse stats:', err);
      }
    });

    es.addEventListener('kafka-status', (e) => {
      try {
        const status: KafkaHealthStatus = JSON.parse(e.data);
        setState((prev) => ({ ...prev, kafkaStatus: status }));
      } catch (err) {
        console.error('[SSE] Failed to parse kafka status:', err);
      }
    });

    es.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      es.close();
      eventSourceRef.current = null;

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[SSE] Reconnecting...');
        connect();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setState((prev) => ({
      ...prev,
      events: [],
      stats: INITIAL_STATS,
    }));
    fetch('/api/events/reset', { method: 'POST' }).catch(console.error);
  }, []);

  return {
    ...state,
    clearEvents,
  };
};
