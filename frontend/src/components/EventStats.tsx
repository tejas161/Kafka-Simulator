import type { EventStats } from '../types';

interface EventStatsCardProps {
  stats: EventStats;
}

const SPARK = {
  published: 'M0 28 C12 26 18 10 28 14 C38 18 44 8 56 11 C68 14 74 22 88 16',
  received: 'M0 22 C14 24 20 8 32 12 C44 16 52 28 64 20 C74 14 80 6 88 9',
  errors: 'M0 18 C16 16 22 26 34 22 C46 18 52 8 64 14 C74 20 80 28 88 24',
};

export const EventStatsCard = ({ stats }: EventStatsCardProps) => {
  return (
    <div className="stat-row">
      <article className="metric-card">
        <p className="metric-kicker">Outbound</p>
        <h2>Published</h2>
        <p className="metric-value tone-out">{stats.published}</p>
        <svg className="spark" viewBox="0 0 88 36" aria-hidden="true">
          <path d={SPARK.published} />
        </svg>
      </article>
      <article className="metric-card">
        <p className="metric-kicker">Inbound</p>
        <h2>Received</h2>
        <p className="metric-value tone-in">{stats.received}</p>
        <svg className="spark spark-in" viewBox="0 0 88 36" aria-hidden="true">
          <path d={SPARK.received} />
        </svg>
      </article>
      <article className="metric-card">
        <p className="metric-kicker">Failed writes</p>
        <h2>Errors</h2>
        <p className="metric-value tone-err">{stats.errors}</p>
        <svg className="spark spark-err" viewBox="0 0 88 36" aria-hidden="true">
          <path d={SPARK.errors} />
        </svg>
      </article>
    </div>
  );
};
