import { useEffect } from 'react';
import { formatMoney } from '../utils/format.js';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"%3E%3Crect width="1200" height="675" fill="%23090a0e"/%3E%3Ccircle cx="880" cy="110" r="300" fill="%23c9ff3f" opacity=".08"/%3E%3C/svg%3E';

export function GameModal({ game, favorite, onToggleFavorite, onClose }) {
  useEffect(() => {
    if (!game) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [game, onClose]);

  if (!game) return null;

  const image = game.image
    || (game.steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/header.jpg` : null)
    || FALLBACK_IMAGE;
  const hasDiscount = Number(game.savings) > 0;

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section className="game-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={game.title}>
        <button className="game-modal__close" onClick={onClose} aria-label="Close game details">Close</button>
        <div className="game-modal__media">
          <img src={image} alt="" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }} />
          <div className="game-modal__shade" />
          <div className="game-modal__headline">
            <span>{game.badge || 'LIVE OFFER'}</span>
            <h2>{game.title}</h2>
            <p>{game.store || 'Digital store'} · {game.rating || game.steamRating ? `${game.rating || game.steamRating} / 100` : 'Unrated'}</p>
          </div>
        </div>
        <div className="game-modal__content">
          <div className="game-modal__metrics">
            <div><span>Current price</span><strong>{formatMoney(game.salePrice)}</strong></div>
            <div><span>{hasDiscount ? 'Original price' : 'Price status'}</span><strong className={hasDiscount ? 'line-through' : ''}>{hasDiscount ? formatMoney(game.normalPrice) : 'Best found'}</strong></div>
            <div><span>Saving</span><strong className="positive">{hasDiscount ? `${Math.round(game.savings)}%` : '—'}</strong></div>
          </div>
          <p className="game-modal__note">
            The destination store controls the final price and availability. GamePulse opens the original offer so you can verify everything before buying.
          </p>
          <div className="game-modal__actions">
            <a className="button button--primary" href={game.dealUrl} target="_blank" rel="noreferrer">Open deal <span aria-hidden="true">↗</span></a>
            <button className="button button--quiet" onClick={() => onToggleFavorite(game.id)}>{favorite ? 'Remove from saved' : 'Save for later'}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
