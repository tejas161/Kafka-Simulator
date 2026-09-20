import { useState } from 'react';
import type { EventRecord } from '../types';

interface EventDetailProps {
  event: EventRecord;
}

export const EventDetail = ({ event }: EventDetailProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => setExpanded((prev) => !prev);

  const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const directionIcon = event.direction === 'outbound' ? '→' : '←';
  const directionClass = event.direction === 'outbound' ? 'outbound' : 'inbound';
  const severityClass = `severity-${event.payload.severity || 'info'}`;

  return (
    <div className={`event-item ${directionClass} ${event.status === 'error' ? 'error' : ''}`}>
      <button
        className="event-summary"
        onClick={handleToggle}
        onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
        aria-expanded={expanded}
        aria-label={`${event.direction} event: ${event.payload.event_type}`}
        tabIndex={0}
      >
        <span className="event-time">{time}</span>
        <span className={`event-direction ${directionClass}`}>{directionIcon}</span>
        <div className="event-info">
          <span className="event-type">{event.payload.event_type || 'unknown'}</span>
          <span className="event-service">{event.payload.service || event.key || '—'}</span>
          <span className={`event-severity ${severityClass}`}>
            {event.payload.severity || '—'}
          </span>
        </div>
        <span className={`event-status status-${event.status}`}>
          {event.status === 'published' && 'Out'}
          {event.status === 'received' && 'In'}
          {event.status === 'error' && 'Err'}
        </span>
        <span className={`chevron small ${expanded ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div className="event-details">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Topic</span>
              <code className="detail-value">{event.topic}</code>
            </div>
            <div className="detail-item">
              <span className="detail-label">Key</span>
              <code className="detail-value">{event.key || '(null)'}</code>
            </div>
            {event.partition !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Partition</span>
                <code className="detail-value">{event.partition}</code>
              </div>
            )}
            {event.offset !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Offset</span>
                <code className="detail-value">{event.offset}</code>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Message</span>
              <span className="detail-value">{event.payload.message}</span>
            </div>
            {event.error && (
              <div className="detail-item error">
                <span className="detail-label">Error</span>
                <span className="detail-value">{event.error}</span>
              </div>
            )}
          </div>

          {Object.keys(event.headers).length > 0 && (
            <div className="detail-section">
              <h4>Headers</h4>
              <pre className="json-block">{JSON.stringify(event.headers, null, 2)}</pre>
            </div>
          )}

          <div className="detail-section">
            <h4>Payload</h4>
            <pre className="json-block">{JSON.stringify(event.payload, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
