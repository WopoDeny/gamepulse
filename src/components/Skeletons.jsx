export function DealSkeletons({ count = 8 }) {
  return (
    <div className="deal-grid" aria-label="Loading deals">
      {Array.from({ length: count }).map((_, index) => (
        <div className="game-card skeleton-card" key={index}>
          <div className="skeleton skeleton--image" />
          <div className="skeleton-card__body">
            <div className="skeleton skeleton--line skeleton--short" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--medium" />
          </div>
        </div>
      ))}
    </div>
  );
}
