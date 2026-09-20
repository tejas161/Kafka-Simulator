import { Router, Request, Response } from 'express';
import { getBrokerAddress } from '../kafka/client.js';
import { isProducerConnected } from '../kafka/producer.js';
import { isConsumerConnected } from '../kafka/consumer.js';
import type { KafkaHealthStatus } from '../types/index.js';

const router = Router();

const alertTopic = process.env.KAFKA_ALERT_TOPIC || 'infrastructure-alerts';
const remediationTopic = process.env.KAFKA_REMEDIATION_TOPIC || 'remediation-events';
const dlqTopic = process.env.KAFKA_DLQ_TOPIC || 'dead-letter';

export const getKafkaHealthStatus = (): KafkaHealthStatus => {
  const producerReady = isProducerConnected();
  const consumerReady = isConsumerConnected();

  return {
    connected: producerReady || consumerReady,
    broker: getBrokerAddress(),
    producerReady,
    consumerReady,
    topics: [alertTopic, remediationTopic, dlqTopic],
  };
};

router.get('/kafka', (_req: Request, res: Response) => {
  const status = getKafkaHealthStatus();
  const httpStatus = status.connected ? 200 : 503;
  res.status(httpStatus).json(status);
});

router.get('/', (_req: Request, res: Response) => {
  const kafkaStatus = getKafkaHealthStatus();
  res.json({
    status: 'ok',
    kafka: kafkaStatus.connected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

export default router;
