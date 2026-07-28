import { formatRelativeDate, truncate } from '../utils/format.js';

export function NewsCard({ item, large = false }) {
  return (
    <article className={`news-card ${large ? 'news-card--large' : ''}`} data-reveal>
      <a className="news-card__image" href={item.url} target="_blank" rel="noreferrer">
        <img src={item.image} alt="" loading="lazy" />
        <span>{item.game}</span>
      </a>
      <div className="news-card__body">
        <div className="news-card__meta">
          <span>{item.source}</span>
          <span>{formatRelativeDate(item.date)}</span>
        </div>
        <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>
        <p>{truncate(item.excerpt, large ? 230 : 135)}</p>
        <a className="news-card__link" href={item.url} target="_blank" rel="noreferrer">Read original <span aria-hidden="true">↗</span></a>
      </div>
    </article>
  );
}
