import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage } from '../kafka/producer.js';
import {
  addSSEClient,
  removeSSEClient,
  broadcastEvent,
  getStats,
  getEventHistory,
  resetStats,
} from '../services/eventService.js';
import { getKafkaHealthStatus } from './health.js';
import type { PublishRequest, EventRecord, KafkaEventPayload } from '../types/index.js';

const router = Router();

const alertTopic = process.env.KAFKA_ALERT_TOPIC || 'infrastructure-alerts';

router.post('/publish', async (req: Request, res: Response) => {
  try {
    const body = req.body as PublishRequest;

    if (!body.payload) {
      res.status(400).json({ error: 'Missing payload' });
      return;
    }

    const payload: KafkaEventPayload = {
      ...body.payload,
      source: body.payload.source || 'incident-simulator',
      timestamp: body.payload.timestamp || new Date().toISOString(),
      incident_id: body.payload.incident_id || `inc-${uuidv4().slice(0, 8)}`,
    };

    const topic = body.topic || alertTopic;
    const key = body.key || payload.service || undefined;

    const headers: Record<string, string> = {
      event_type: payload.event_type,
      severity: payload.severity,
      environment: payload.environment,
      source: payload.source,
      ...body.headers,
    };

    const result = await sendMessage({
      topic,
      key,
      value: JSON.stringify(payload),
      headers,
    });

    const eventRecord: EventRecord = {
      id: uuidv4(),
      direction: 'outbound',
      topic,
      key: key || null,
      headers,
      payload,
      partition: result.partition,
      offset: result.offset,
      timestamp: payload.timestamp,
      status: 'published',
    };

    broadcastEvent(eventRecord);

    res.json({
      success: true,
      event: eventRecord,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Events] Publish error:', errorMessage);

    const errorRecord: EventRecord = {
      id: uuidv4(),
      direction: 'outbound',
      topic: (req.body as PublishRequest).topic || alertTopic,
      key: null,
      headers: {},
      payload: (req.body as PublishRequest).payload || ({} as KafkaEventPayload),
      timestamp: new Date().toISOString(),
      status: 'error',
      error: errorMessage,
    };

    broadcastEvent(errorRecord);

    res.status(500).json({ error: errorMessage });
  }
});

router.get('/stream', (req: Request, res: Response) => {
  const clientId = uuidv4();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const kafkaStatus = getKafkaHealthStatus();
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);
  res.write(`event: kafka-status\ndata: ${JSON.stringify(kafkaStatus)}\n\n`);
  res.write(`event: stats\ndata: ${JSON.stringify(getStats())}\n\n`);

  const history = getEventHistory().slice(0, 50).reverse();
  for (const event of history) {
    res.write(`event: event\ndata: ${JSON.stringify(event)}\n\n`);
  }

  addSSEClient(clientId, res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeSSEClient(clientId);
  });
});

router.get('/history', (_req: Request, res: Response) => {
  res.json({
    events: getEventHistory(),
    stats: getStats(),
  });
});

router.post('/reset', (_req: Request, res: Response) => {
  resetStats();
  res.json({ success: true });
});

export default router;
