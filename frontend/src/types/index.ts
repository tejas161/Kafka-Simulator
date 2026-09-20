export interface KafkaEventPayload {
  event_type: string;
  severity: string;
  source: string;
  service: string;
  environment: string;
  message: string;
  timestamp: string;
  incident_id: string;
  [key: string]: unknown;
}

export interface EventRecord {
  id: string;
  direction: 'outbound' | 'inbound';
  topic: string;
  key: string | null;
  headers: Record<string, string>;
  payload: KafkaEventPayload;
  partition?: number;
  offset?: string;
  timestamp: string;
  status: 'published' | 'received' | 'error';
  error?: string;
}

export interface EventStats {
  published: number;
  received: number;
  errors: number;
}

export interface KafkaHealthStatus {
  connected: boolean;
  broker: string;
  producerReady: boolean;
  consumerReady: boolean;
  topics: string[];
  error?: string;
}

export interface PublishRequest {
  topic?: string;
  key?: string;
  headers?: Record<string, string>;
  payload: KafkaEventPayload;
}

export type SeverityLevel = 'critical' | 'high' | 'warning' | 'info';

export interface IncidentTemplatePayload {
  event_type: string;
  severity: string;
  service: string;
  environment: string;
  message: string;
}

export interface IncidentTemplate {
  id: string;
  label: string;
  icon: string;
  severity: SeverityLevel;
  payload: IncidentTemplatePayload;
}
