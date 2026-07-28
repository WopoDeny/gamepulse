import { useEffect, useMemo, useRef, useState } from 'react';
import { gamePulseApi } from '../api/client.js';
import { formatMoney } from '../utils/format.js';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="338"%3E%3Crect width="600" height="338" fill="%23101218"/%3E%3Ccircle cx="480" cy="30" r="190" fill="%23c9ff3f" opacity=".08"/%3E%3C/svg%3E';

function imageFor(item) {
  return item.image
    || (item.steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${item.steamAppId}/header.jpg` : null)
    || FALLBACK_IMAGE;
}

export function SearchPalette({ open, items, onClose, onOpenGame }) {
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const normalizedQuery = query.trim();
  const results = useMemo(() => {
    if (normalizedQuery.length >= 2) return remoteResults;
    return items.slice(0, 12);
  }, [items, normalizedQuery.length, remoteResults]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setRemoteResults([]);
    setSearchError('');
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 50);
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  useEffect(() => {
    if (!open || normalizedQuery.length < 2) {
      setSearching(false);
      setRemoteResults([]);
      setSearchError('');
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');

      try {
        const response = await gamePulseApi.searchDeals(normalizedQuery, {
          pageSize: 40,
          signal: controller.signal,
        });
        setRemoteResults(response.items || []);
        setActiveIndex(0);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error);
          setSearchError('Search is temporarily unavailable. Try again in a moment.');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (!results.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % results.length);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + results.length) % results.length);
      }
      if (event.key === 'Enter' && results[activeIndex]) {
        event.preventDefault();
        onOpenGame(results[activeIndex]);
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, onClose, onOpenGame, open, results]);

  if (!open) return null;

  return (
    <div className="search-backdrop" onMouseDown={onClose}>
      <section className="search-palette" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search GamePulse">
        <header className="search-palette__header">
          <div className="search-palette__input-row">
            <span className="search-palette__index">SEARCH</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type any game title…"
              autoComplete="off"
              spellCheck="false"
            />
            <button onClick={onClose} aria-label="Close search">Close</button>
          </div>
          <div className="search-palette__status">
            <span>{normalizedQuery.length >= 2 ? 'Searching the remote catalogue' : 'Popular deals from the live feed'}</span>
            <span>{searching ? 'Searching…' : `${results.length} results`}</span>
          </div>
        </header>

        <div className="search-palette__results">
          {results.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              className={index === activeIndex ? 'is-active' : ''}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => { onOpenGame(item); onClose(); }}
            >
              <span className="search-result__number">{String(index + 1).padStart(2, '0')}</span>
              <img
                src={imageFor(item)}
                alt=""
                onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }}
              />
              <span className="search-result__copy">
                <strong>{item.title}</strong>
                <small>{item.store} · {item.savings > 0 ? `${Math.round(item.savings)}% off` : 'best price found'}</small>
              </span>
              <b>{formatMoney(item.salePrice)}</b>
              <span className="search-result__open" aria-hidden="true">↗</span>
            </button>
          ))}

          {!searching && !results.length && !searchError && (
            <div className="search-palette__empty">
              <strong>No matching games found.</strong>
              <span>Try a shorter title or check the spelling.</span>
            </div>
          )}
          {searchError && <div className="search-palette__empty"><strong>{searchError}</strong></div>}
          {searching && !results.length && (
            <div className="search-palette__loading">
              <i /><i /><i />
            </div>
          )}
        </div>

        <footer className="search-palette__footer">
          <span><kbd>↑ ↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </footer>
      </section>
    </div>
  );
}
