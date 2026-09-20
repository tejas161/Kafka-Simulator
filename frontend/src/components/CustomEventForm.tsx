import { useState, useCallback } from 'react';
import type { PublishRequest } from '../types';
import { publishEvent } from '../hooks/useApi';

interface CustomEventFormProps {
  kafkaConnected: boolean;
}

const DEFAULT_PAYLOAD = `{
  "event_type": "infrastructure.alert",
  "severity": "critical",
  "service": "payment-api",
  "environment": "production",
  "message": "Custom alert message"
}`;

export const CustomEventForm = ({ kafkaConnected }: CustomEventFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('infrastructure-alerts');
  const [key, setKey] = useState('payment-api');
  const [headersText, setHeadersText] = useState('');
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSuccess(false);

    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setError('Invalid JSON payload');
      return;
    }

    if (!payload.event_type) {
      setError('Payload must include event_type');
      return;
    }

    let headers: Record<string, string> = {};
    if (headersText.trim()) {
      try {
        headers = JSON.parse(headersText);
      } catch {
        setError('Invalid JSON headers. Use format: {"key": "value"}');
        return;
      }
    }

    const request: PublishRequest = {
      topic,
      key: key || undefined,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      payload: {
        ...payload,
        source: payload.source || 'incident-simulator',
        timestamp: payload.timestamp || new Date().toISOString(),
        incident_id: payload.incident_id || '',
      },
    };

    setSending(true);
    try {
      await publishEvent(request);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSending(false);
    }
  }, [topic, key, headersText, payloadText]);

  return (
    <div className="panel feature-panel">
      <button
        type="button"
        className="panel-head clickable"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-expanded={isOpen}
        aria-label="Toggle custom event form"
        tabIndex={0}
      >
        <div>
          <p className="eyebrow">Advanced</p>
          <h3>Custom payload</h3>
        </div>
        <span className={`chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="custom-topic">Topic</label>
              <input
                id="custom-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="infrastructure-alerts"
                aria-label="Kafka topic"
              />
            </div>
            <div className="field">
              <label htmlFor="custom-key">Kafka Key</label>
              <input
                id="custom-key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="payment-api"
                aria-label="Kafka message key"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="custom-headers">Headers (JSON)</label>
            <textarea
              id="custom-headers"
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              placeholder='{"custom_header": "value"}'
              rows={2}
              aria-label="Kafka headers in JSON format"
            />
          </div>

          <div className="field">
            <label htmlFor="custom-payload">Payload (JSON)</label>
            <textarea
              id="custom-payload"
              className="json-editor"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              spellCheck={false}
              aria-label="Kafka message payload in JSON format"
            />
          </div>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="success-banner" role="status">
              Event published
            </div>
          )}

          <button
            className="publish-btn"
            onClick={handleSubmit}
            disabled={!kafkaConnected || sending}
            aria-label="Publish custom event"
            tabIndex={0}
          >
            {sending ? 'Publishing...' : 'Publish Event'}
          </button>
        </div>
      )}
    </div>
  );
};
