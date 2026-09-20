import type { EventRecord } from '../types';
import { EventDetail } from './EventDetail';

interface EventActivityProps {
  events: EventRecord[];
  onClear: () => void;
}

export const EventActivity = ({ events, onClear }: EventActivityProps) => {
  const handleClear = () => {
    onClear();
  };

  return (
    <div className="panel activity-panel" id="activity">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Tape</p>
          <h3>Event activity</h3>
        </div>
        <div className="header-actions">
          <span className="event-count">{events.length}</span>
          {events.length > 0 && (
            <button
              type="button"
              className="ghost-btn"
              onClick={handleClear}
              aria-label="Clear event history"
              tabIndex={0}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="panel-body activity-body">
        {events.length === 0 ? (
          <div className="empty-state">
            <p>Waiting on the first publish</p>
            <p className="empty-hint">Fire a playbook on the left. Events land here over SSE.</p>
          </div>
        ) : (
          <div className="event-list">
            {events.map((event) => (
              <EventDetail key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
