import type { PublishRequest } from '../types';

const API_BASE = '/api';

export const publishEvent = async (request: PublishRequest): Promise<void> => {
  const response = await fetch(`${API_BASE}/events/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || `HTTP ${response.status}`);
  }
};

export const fetchKafkaHealth = async () => {
  const response = await fetch(`${API_BASE}/health/kafka`);
  return response.json();
};
