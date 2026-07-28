import { formatRelativeDate, truncate } from '../utils/format.js';

export function GiveawayCard({ item, featured = false }) {
  return (
    <article className={`giveaway-card ${featured ? 'giveaway-card--featured' : ''}`} data-reveal>
      <a className="giveaway-card__visual" href={item.openGiveawayUrl} target="_blank" rel="noreferrer">
        <img src={item.image || item.thumbnail} alt="" loading="lazy" />
        <span className="giveaway-card__shade" />
        <span className="giveaway-card__type">{item.type || 'Game'}</span>
        <strong className="giveaway-card__free">FREE</strong>
      </a>
      <div className="giveaway-card__body">
        <div className="giveaway-card__meta">
          <span>{item.platforms}</span>
          <span>{item.endDate ? formatRelativeDate(item.endDate) : 'Limited time'}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{truncate(item.description, featured ? 180 : 112)}</p>
        <div className="giveaway-card__bottom">
          <span>{item.worth && item.worth !== 'N/A' ? `Usual value ${item.worth}` : 'Free to claim'}</span>
          <a href={item.openGiveawayUrl} target="_blank" rel="noreferrer">Claim offer <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </article>
  );
}
