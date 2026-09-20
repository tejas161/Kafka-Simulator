import { Producer, Message } from 'kafkajs';
import kafka from './client.js';

let producer: Producer | null = null;
let isConnected = false;

export const connectProducer = async (): Promise<void> => {
  producer = kafka.producer({
    allowAutoTopicCreation: false,
    retry: { retries: 3 },
  });

  producer.on('producer.connect', () => {
    isConnected = true;
    console.log('[Kafka Producer] Connected');
  });

  producer.on('producer.disconnect', () => {
    isConnected = false;
    console.log('[Kafka Producer] Disconnected');
  });

  await producer.connect();
};

export const disconnectProducer = async (): Promise<void> => {
  if (!producer) return;
  await producer.disconnect();
  producer = null;
  isConnected = false;
};

export const isProducerConnected = (): boolean => isConnected;

export interface SendMessageOptions {
  topic: string;
  key?: string;
  value: string;
  headers?: Record<string, string>;
}

export const sendMessage = async (options: SendMessageOptions): Promise<{
  partition: number;
  offset: string;
}> => {
  if (!producer || !isConnected) {
    throw new Error('Kafka producer is not connected');
  }

  const kafkaHeaders: Record<string, string> = {};
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      kafkaHeaders[k] = v;
    }
  }

  const message: Message = {
    value: options.value,
    headers: kafkaHeaders,
  };

  if (options.key) {
    message.key = options.key;
  }

  const result = await producer.send({
    topic: options.topic,
    messages: [message],
  });

  const record = result[0];
  return {
    partition: record.partition ?? -1,
    offset: record.baseOffset ?? '-1',
  };
};
