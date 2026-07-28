import { formatMoney } from '../utils/format.js';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" y1="0" x2="1" y2="1"%3E%3Cstop stop-color="%23191c25"/%3E%3Cstop offset="1" stop-color="%23090a0e"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1200" height="675" fill="url(%23g)"/%3E%3Ccircle cx="890" cy="140" r="240" fill="%23c9ff3f" opacity=".08"/%3E%3Cpath d="M0 510L310 290l190 125 220-190 480 350v100H0z" fill="%23fff" opacity=".045"/%3E%3C/svg%3E';

function imageFor(game) {
  return game.image
    || (game.steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/header.jpg` : null)
    || FALLBACK_IMAGE;
}

export function GameCard({ game, favorite, onToggleFavorite, onOpen, featured = false }) {
  const handlePointerMove = (event) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  };

  const hasDiscount = Number(game.savings) > 0;

  return (
    <article
      className={`game-card ${featured ? 'game-card--featured' : ''}`}
      onPointerMove={handlePointerMove}
      data-reveal
    >
      <button className="game-card__visual" onClick={() => onOpen(game)} aria-label={`Open ${game.title}`}>
        <img
          src={imageFor(game)}
          alt=""
          loading="lazy"
          onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }}
        />
        <span className="game-card__wash" />
        <span className="game-card__tag">{game.badge || 'ON SALE'}</span>
        <span className="game-card__corner" aria-hidden="true">↗</span>
        <span className="game-card__discount">
          {hasDiscount ? `−${Math.round(game.savings)}%` : 'BEST PRICE'}
        </span>
      </button>

      <div className="game-card__body">
        <div className="game-card__meta">
          <span>{game.store || 'Digital store'}</span>
          <span>{game.rating || game.steamRating ? `${game.rating || game.steamRating} / 100` : 'No score'}</span>
        </div>
        <button className="game-card__title" onClick={() => onOpen(game)}>{game.title}</button>
        <div className="game-card__footer">
          <div className="game-card__price">
            <strong>{formatMoney(game.salePrice)}</strong>
            {hasDiscount && <span>{formatMoney(game.normalPrice)}</span>}
          </div>
          <div className="game-card__actions">
            <button
              className={`save-action ${favorite ? 'is-saved' : ''}`}
              onClick={() => onToggleFavorite(game.id)}
              aria-label={favorite ? 'Remove from saved games' : 'Save game'}
            >
              {favorite ? 'Saved' : 'Save'}
            </button>
            <a href={game.dealUrl} target="_blank" rel="noreferrer">View deal <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </div>
    </article>
  );
}
