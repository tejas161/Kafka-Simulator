import { useCallback, useState, type KeyboardEvent } from 'react';
import { useEventStream } from '../hooks/useEventStream';
import { KafkaStatus } from './KafkaStatus';
import { EventStatsCard } from './EventStats';
import { IncidentSimulator } from './IncidentSimulator';
import { CustomEventForm } from './CustomEventForm';
import { EventActivity } from './EventActivity';
import { TopicList } from './TopicList';

const DEFAULT_TOPICS = ['infrastructure-alerts', 'remediation-events', 'dead-letter'];

export const Dashboard = () => {
  const { events, stats, kafkaStatus, isConnected, clearEvents } = useEventStream();

  const kafkaConnected = kafkaStatus?.connected ?? false;
  const topics = kafkaStatus?.topics ?? DEFAULT_TOPICS;
  const [activeNav, setActiveNav] = useState('overview');

  const handleNavClick = useCallback((sectionId: string) => {
    setActiveNav(sectionId);
    const node = document.getElementById(sectionId);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleNavKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, sectionId: string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNavClick(sectionId);
      }
    },
    [handleNavClick]
  );

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            K
          </span>
          <div className="brand-copy">
            <strong>KIS</strong>
            <span>Incident lab</span>
          </div>
        </div>

        <nav className="side-nav">
          <button
            type="button"
            className={`nav-item ${activeNav === 'overview' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('overview')}
            onKeyDown={(event) => handleNavKeyDown(event, 'overview')}
            aria-label="Jump to overview"
            tabIndex={0}
          >
            Overview
          </button>
          <button
            type="button"
            className={`nav-item ${activeNav === 'simulator' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('simulator')}
            onKeyDown={(event) => handleNavKeyDown(event, 'simulator')}
            aria-label="Jump to incident simulator"
            tabIndex={0}
          >
            Simulator
          </button>
          <button
            type="button"
            className={`nav-item ${activeNav === 'activity' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('activity')}
            onKeyDown={(event) => handleNavKeyDown(event, 'activity')}
            aria-label="Jump to event activity"
            tabIndex={0}
          >
            Activity
            {events.length > 0 && <span className="nav-count">{events.length}</span>}
          </button>
        </nav>

        <TopicList topics={topics} />

        <div className="sidebar-foot">
          <KafkaStatus status={kafkaStatus} isSSEConnected={isConnected} />
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live broker session</p>
            <h1 id="overview">Kafka incident stream</h1>
          </div>
          <div className={`live-chip ${kafkaConnected ? 'on' : 'off'}`}>
            <span className="status-dot" />
            {kafkaConnected ? 'Broker live' : 'Broker down'}
          </div>
        </header>

        <EventStatsCard stats={stats} />

        <div className="workspace-grid">
          <div className="stack">
            <IncidentSimulator kafkaConnected={kafkaConnected} />
            <CustomEventForm kafkaConnected={kafkaConnected} />
          </div>
          <EventActivity events={events} onClear={clearEvents} />
        </div>
      </div>
    </div>
  );
};
