import { Brand } from './Brand.jsx';

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__statement" data-reveal>
        <p>Find something worth playing.</p>
        <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
      </div>
      <div className="shell footer__main">
        <div className="footer__brand">
          <Brand />
          <p>A global, English-language index of game deals, giveaways and official updates.</p>
        </div>
        <nav className="footer__nav" aria-label="Footer navigation">
          <a href="#deals">Deals</a>
          <a href="#pulse">Pulse</a>
          <a href="#giveaways">Free games</a>
          <a href="#news">News</a>
        </nav>
      </div>
      <div className="shell footer__bottom">
        <span>© {new Date().getFullYear()} GamePulse</span>
        <span>Prices and availability can change. Data links lead to the original sources.</span>
        <span className="footer__sources">
          <a href="https://www.cheapshark.com/" target="_blank" rel="noreferrer">CheapShark</a>
          <a href="https://www.gamerpower.com/" target="_blank" rel="noreferrer">GamerPower</a>
          <a href="https://store.steampowered.com/news/" target="_blank" rel="noreferrer">Steam</a>
        </span>
      </div>
    </footer>
  );
}
