import { Response } from 'express';
import type { EventRecord, EventStats, KafkaHealthStatus, SSEEventType } from '../types/index.js';

type SSEClient = {
  id: string;
  res: Response;
};

const clients: SSEClient[] = [];
const eventHistory: EventRecord[] = [];
const MAX_HISTORY = 200;

const stats: EventStats = {
  published: 0,
  received: 0,
  errors: 0,
};

export const addSSEClient = (id: string, res: Response): void => {
  clients.push({ id, res });
  console.log(`[SSE] Client connected: ${id} (total: ${clients.length})`);
};

export const removeSSEClient = (id: string): void => {
  const index = clients.findIndex((c) => c.id === id);
  if (index !== -1) {
    clients.splice(index, 1);
    console.log(`[SSE] Client disconnected: ${id} (total: ${clients.length})`);
  }
};

const broadcast = (eventType: SSEEventType, data: unknown): void => {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const deadClients: string[] = [];

  for (const client of clients) {
    try {
      client.res.write(message);
    } catch {
      deadClients.push(client.id);
    }
  }

  for (const id of deadClients) {
    removeSSEClient(id);
  }
};

export const broadcastEvent = (event: EventRecord): void => {
  eventHistory.unshift(event);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.pop();
  }

  if (event.status === 'error') {
    stats.errors++;
  } else if (event.direction === 'outbound') {
    stats.published++;
  } else {
    stats.received++;
  }

  broadcast('event', event);
  broadcast('stats', stats);
};

export const broadcastKafkaStatus = (status: KafkaHealthStatus): void => {
  broadcast('kafka-status', status);
};

export const getStats = (): EventStats => ({ ...stats });

export const getEventHistory = (): EventRecord[] => [...eventHistory];

export const resetStats = (): void => {
  stats.published = 0;
  stats.received = 0;
  stats.errors = 0;
  eventHistory.length = 0;
};
