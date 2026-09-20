interface TopicListProps {
  topics: string[];
}

export const TopicList = ({ topics }: TopicListProps) => {
  return (
    <div className="topic-block">
      <p className="eyebrow">Topics</p>
      <ul className="topic-list">
        {topics.map((topic) => (
          <li key={topic}>
            <code>{topic}</code>
          </li>
        ))}
      </ul>
    </div>
  );
};
