import { Kafka, logLevel } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'kafka-incident-simulator';

const kafka = new Kafka({
  clientId,
  brokers,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 1000,
    retries: 5,
    maxRetryTime: 30000,
  },
  connectionTimeout: 5000,
  requestTimeout: 30000,
});

export const getBrokerAddress = (): string => brokers.join(',');

export default kafka;
