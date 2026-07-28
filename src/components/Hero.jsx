import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '../utils/format.js';

const FALLBACK = {
  id: 'hero-fallback',
  title: 'Discover the next game worth your time',
  salePrice: 19.99,
  normalPrice: 59.99,
  savings: 67,
  rating: 92,
  image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1800&q=88',
  store: 'Live game feed',
  dealUrl: 'https://www.cheapshark.com/',
};

function gameImage(game) {
  return game.image
    || (game.steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/header.jpg` : null)
    || FALLBACK.image;
}

export function Hero({ items = [], onOpenGame, onSearch }) {
  const featured = useMemo(() => {
    const available = items.filter((item) => item?.title).slice(0, 5);
    return available.length ? available : [FALLBACK];
  }, [items]);
  const [active, setActive] = useState(0);
  const game = featured[active % featured.length] || FALLBACK;

  useEffect(() => {
    setActive(0);
  }, [featured.length]);

  useEffect(() => {
    if (featured.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % featured.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [featured.length]);

  return (
    <section id="top" className="hero">
      <div className="hero__media" key={game.id}>
        <img src={gameImage(game)} alt="" />
      </div>
      <div className="hero__shade" />
      <div className="hero__grain" />
      <div className="hero__beam hero__beam--one" />
      <div className="hero__beam hero__beam--two" />

      <div className="shell hero__content">
        <div className="hero__copy" data-reveal>
          <span className="hero__kicker">A live index of games worth opening</span>
          <h1>
            Catch the game.<br />
            <em>Catch the price.</em>
          </h1>
          <p>
            Deals, limited-time giveaways and official game updates gathered into one fast,
            searchable global feed.
          </p>
          <div className="hero__actions">
            <a className="button button--primary button--large" href="#deals">Browse live deals</a>
            <button className="button button--quiet button--large" onClick={onSearch}>Search all games</button>
          </div>
        </div>

        <button className="hero-feature" onClick={() => onOpenGame?.(game)} data-reveal>
          <span className="hero-feature__label">Current highlight</span>
          <div className="hero-feature__title-row">
            <h2>{game.title}</h2>
            <span aria-hidden="true">↗</span>
          </div>
          <div className="hero-feature__line" />
          <div className="hero-feature__metrics">
            <div><small>Now</small><strong>{formatMoney(game.salePrice)}</strong></div>
            <div><small>Was</small><strong className="line-through">{formatMoney(game.normalPrice)}</strong></div>
            <div><small>Saving</small><strong className="positive">{Math.round(game.savings || 0)}%</strong></div>
            <div><small>Score</small><strong>{game.rating || game.steamRating || '—'}</strong></div>
          </div>
        </button>
      </div>

      <div className="shell hero__rail" aria-label="Featured deals">
        {featured.map((item, index) => (
          <button
            key={item.id}
            className={index === active ? 'is-active' : ''}
            onClick={() => setActive(index)}
          >
            <span className="hero__rail-index">0{index + 1}</span>
            <span className="hero__rail-title">{item.title}</span>
            <span className="hero__rail-price">{formatMoney(item.salePrice)}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
