import type { KafkaHealthStatus } from '../types';

interface KafkaStatusProps {
  status: KafkaHealthStatus | null;
  isSSEConnected: boolean;
}

export const KafkaStatus = ({ status, isSSEConnected }: KafkaStatusProps) => {
  const isConnected = status?.connected ?? false;
  const broker = status?.broker || 'localhost:9092';

  return (
    <div className="kafka-dock">
      <div className="kafka-dock-head">
        <span>Kafka</span>
        <span className={`mini-pill ${isConnected ? 'on' : 'off'}`}>
          {isConnected ? 'Up' : 'Down'}
        </span>
      </div>
      <dl>
        <div>
          <dt>Broker</dt>
          <dd>
            <code>{broker}</code>
          </dd>
        </div>
        <div>
          <dt>Producer</dt>
          <dd className={status?.producerReady ? 'ok' : 'dim'}>
            {status?.producerReady ? 'Ready' : 'Idle'}
          </dd>
        </div>
        <div>
          <dt>Consumer</dt>
          <dd className={status?.consumerReady ? 'ok' : 'dim'}>
            {status?.consumerReady ? 'Ready' : 'Idle'}
          </dd>
        </div>
        <div>
          <dt>SSE</dt>
          <dd className={isSSEConnected ? 'ok' : 'dim'}>
            {isSSEConnected ? 'Open' : 'Closed'}
          </dd>
        </div>
      </dl>
      {!isConnected && (
        <p className="dock-note" role="status">
          Broker unreachable. Publish is paused; reconnect is automatic.
        </p>
      )}
    </div>
  );
};
