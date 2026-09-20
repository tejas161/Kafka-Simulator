import { Consumer, EachMessagePayload } from 'kafkajs';
import kafka from './client.js';

let consumer: Consumer | null = null;
let isConnected = false;
let isShuttingDown = false;

type MessageHandler = (payload: {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string | null;
  headers: Record<string, string>;
  timestamp: string;
}) => void;

let messageHandler: MessageHandler | null = null;

export const setMessageHandler = (handler: MessageHandler): void => {
  messageHandler = handler;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RESTART_ATTEMPTS = 10;
const RESTART_DELAY_MS = 5000;

const getTopics = (): string[] => {
  const remediationTopic = process.env.KAFKA_REMEDIATION_TOPIC || 'remediation-events';
  const dlqTopic = process.env.KAFKA_DLQ_TOPIC || 'dead-letter';
  const consumeDLQ = process.env.KAFKA_CONSUME_DLQ === 'true';

  const topics = [remediationTopic];
  if (consumeDLQ) {
    topics.push(dlqTopic);
  }
  return topics;
};

const eachMessage = async (messagePayload: EachMessagePayload) => {
  if (!messageHandler) return;

  const { topic, partition, message } = messagePayload;

  const headers: Record<string, string> = {};
  if (message.headers) {
    for (const [key, val] of Object.entries(message.headers)) {
      if (val) {
        headers[key] = Buffer.isBuffer(val) ? val.toString() : String(val);
      }
    }
  }

  messageHandler({
    topic,
    partition,
    offset: message.offset,
    key: message.key ? message.key.toString() : null,
    value: message.value ? message.value.toString() : null,
    headers,
    timestamp: message.timestamp || new Date().toISOString(),
  });
};

const startConsumer = async (attempt = 1): Promise<void> => {
  if (isShuttingDown) return;

  const groupId = process.env.KAFKA_CONSUMER_GROUP || 'kafka-incident-simulator-group';

  try {
    if (consumer) {
      await consumer.disconnect().catch(() => {});
      consumer = null;
    }

    consumer = kafka.consumer({
      groupId,
      retry: {
        retries: 8,
        initialRetryTime: 1000,
        maxRetryTime: 30000,
      },
      sessionTimeout: 30000,
      heartbeatInterval: 10000,
    });

    consumer.on('consumer.connect', () => {
      isConnected = true;
      console.log('[Kafka Consumer] Connected');
    });

    consumer.on('consumer.disconnect', () => {
      isConnected = false;
      console.log('[Kafka Consumer] Disconnected');
    });

    consumer.on('consumer.crash', async (event) => {
      isConnected = false;
      const error = event.payload.error;
      console.error(`[Kafka Consumer] Crashed: ${error.message}`);

      if (isShuttingDown) return;

      const nextAttempt = attempt + 1;
      if (nextAttempt <= MAX_RESTART_ATTEMPTS) {
        console.log(
          `[Kafka Consumer] Restarting in ${RESTART_DELAY_MS / 1000}s (attempt ${nextAttempt}/${MAX_RESTART_ATTEMPTS})...`
        );
        await delay(RESTART_DELAY_MS);
        startConsumer(nextAttempt).catch((err) => {
          console.error('[Kafka Consumer] Restart failed:', err.message);
        });
      } else {
        console.error('[Kafka Consumer] Max restart attempts reached. Consumer stopped.');
      }
    });

    await consumer.connect();

    const topics = getTopics();
    await consumer.subscribe({ topics, fromBeginning: false });
    await consumer.run({ eachMessage });

    console.log(`[Kafka Consumer] Subscribed to: ${topics.join(', ')}`);
  } catch (error) {
    isConnected = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Kafka Consumer] Connection failed: ${errorMsg}`);

    if (isShuttingDown) return;

    const nextAttempt = attempt + 1;
    if (nextAttempt <= MAX_RESTART_ATTEMPTS) {
      console.log(
        `[Kafka Consumer] Retrying in ${RESTART_DELAY_MS / 1000}s (attempt ${nextAttempt}/${MAX_RESTART_ATTEMPTS})...`
      );
      await delay(RESTART_DELAY_MS);
      return startConsumer(nextAttempt);
    }
    throw error;
  }
};

export const connectConsumer = async (): Promise<void> => {
  isShuttingDown = false;
  await startConsumer(1);
};

export const disconnectConsumer = async (): Promise<void> => {
  isShuttingDown = true;
  if (!consumer) return;
  await consumer.disconnect();
  consumer = null;
  isConnected = false;
};

export const isConsumerConnected = (): boolean => isConnected;
