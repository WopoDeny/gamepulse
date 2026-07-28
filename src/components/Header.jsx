import { useEffect, useState } from 'react';
import { Brand } from './Brand.jsx';

const links = [
  ['Deals', '#deals'],
  ['Pulse', '#pulse'],
  ['Free games', '#giveaways'],
  ['News', '#news'],
];

export function Header({ onSearch }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [open]);

  return (
    <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
      <div className="shell site-header__inner">
        <Brand />

        <nav className={`site-nav ${open ? 'site-nav--open' : ''}`} aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>

        <div className="site-header__actions">
          <button className="search-trigger" onClick={onSearch} aria-label="Search the game catalogue">
            <span>Search catalogue</span>
            <kbd>Ctrl K</kbd>
          </button>
          <a className="header-drop-link" href="#giveaways">Free now</a>
          <button
            className="mobile-menu"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
    </header>
  );
}
