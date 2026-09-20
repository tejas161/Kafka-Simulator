import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { connectProducer, disconnectProducer } from './kafka/producer.js';
import { connectConsumer, disconnectConsumer, setMessageHandler } from './kafka/consumer.js';
import { broadcastEvent, broadcastKafkaStatus } from './services/eventService.js';
import { getKafkaHealthStatus } from './routes/health.js';
import healthRouter from './routes/health.js';
import eventsRouter from './routes/events.js';
import type { EventRecord, KafkaEventPayload } from './types/index.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRouter);
app.use('/api/events', eventsRouter);

const initKafka = async (): Promise<void> => {
  console.log('[Server] Initializing Kafka connections...');

  try {
    await connectProducer();
    console.log('[Server] Kafka producer ready');
  } catch (error) {
    console.error('[Server] Failed to connect Kafka producer:', error);
  }

  try {
    setMessageHandler((msg) => {
      let payload: KafkaEventPayload;
      try {
        payload = msg.value ? JSON.parse(msg.value) : ({} as KafkaEventPayload);
      } catch {
        payload = {
          event_type: 'unknown',
          severity: 'info',
          source: 'unknown',
          service: 'unknown',
          environment: 'unknown',
          message: msg.value || '',
          timestamp: msg.timestamp,
          incident_id: 'unknown',
          raw_value: msg.value,
        };
      }

      const eventRecord: EventRecord = {
        id: uuidv4(),
        direction: 'inbound',
        topic: msg.topic,
        key: msg.key,
        headers: msg.headers,
        payload,
        partition: msg.partition,
        offset: msg.offset,
        timestamp: payload.timestamp || msg.timestamp || new Date().toISOString(),
        status: 'received',
      };

      broadcastEvent(eventRecord);
      console.log(
        `[Consumer] Received: ${payload.event_type} from ${msg.topic} [${msg.partition}:${msg.offset}]`
      );
    });

    await connectConsumer();
    console.log('[Server] Kafka consumer ready');
  } catch (error) {
    console.error('[Server] Failed to connect Kafka consumer:', error);
  }

  broadcastKafkaStatus(getKafkaHealthStatus());
};

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

const startHealthCheck = (): void => {
  let lastStatus = '';

  healthCheckInterval = setInterval(() => {
    const status = getKafkaHealthStatus();
    const statusKey = `${status.connected}:${status.producerReady}:${status.consumerReady}`;
    if (lastStatus !== statusKey) {
      lastStatus = statusKey;
      broadcastKafkaStatus(status);
      console.log(
        `[Health] Kafka status: producer=${status.producerReady ? 'ready' : 'down'} consumer=${status.consumerReady ? 'ready' : 'down'}`
      );
    }
  }, 3000);
};

const shutdown = async (): Promise<void> => {
  console.log('\n[Server] Shutting down...');

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  await disconnectProducer().catch((e) => console.error('[Shutdown] Producer error:', e));
  await disconnectConsumer().catch((e) => console.error('[Shutdown] Consumer error:', e));

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] SSE endpoint: http://localhost:${PORT}/api/events/stream`);

  initKafka().then(() => {
    startHealthCheck();
    console.log('[Server] Initialization complete');
  });
});
