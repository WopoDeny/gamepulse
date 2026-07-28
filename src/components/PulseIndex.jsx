import { useMemo } from 'react';
import { formatMoney } from '../utils/format.js';

export function PulseIndex({ items = [] }) {
  const data = useMemo(() => {
    const valid = items.filter((item) => Number.isFinite(Number(item.salePrice)));
    const average = valid.length
      ? Math.round(valid.reduce((sum, item) => sum + Number(item.savings || 0), 0) / valid.length)
      : 0;
    const underTen = valid.filter((item) => Number(item.salePrice) <= 10).length;
    const deep = valid.filter((item) => Number(item.savings) >= 70).length;
    const stores = new Set(valid.map((item) => item.store).filter(Boolean)).size;
    const movers = [...valid]
      .sort((a, b) => Number(b.savings || 0) - Number(a.savings || 0))
      .slice(0, 6);

    return { average, underTen, deep, stores, movers };
  }, [items]);

  return (
    <section id="pulse" className="section pulse-section">
      <div className="shell pulse-layout">
        <div className="pulse-copy" data-reveal>
          <span className="eyebrow">MARKET PULSE</span>
          <h2>The feed, measured.</h2>
          <p>A quick read on the offers currently moving through the live catalogue.</p>
          <div className="pulse-average">
            <strong>{data.average}%</strong>
            <span>average saving across the loaded deal set</span>
          </div>
        </div>

        <div className="pulse-panel" data-reveal>
          <div className="pulse-stats">
            <div><strong>{data.deep}</strong><span>deals at 70%+</span></div>
            <div><strong>{data.underTen}</strong><span>games under $10</span></div>
            <div><strong>{data.stores}</strong><span>stores represented</span></div>
          </div>
          <div className="pulse-movers">
            {data.movers.map((game, index) => (
              <div className="pulse-mover" key={game.id}>
                <span className="pulse-mover__rank">0{index + 1}</span>
                <div className="pulse-mover__name"><strong>{game.title}</strong><small>{game.store}</small></div>
                <div className="pulse-mover__bar"><i style={{ width: `${Math.max(4, Number(game.savings || 0))}%` }} /></div>
                <span className="pulse-mover__saving">{Math.round(game.savings || 0)}%</span>
                <span className="pulse-mover__price">{formatMoney(game.salePrice)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
