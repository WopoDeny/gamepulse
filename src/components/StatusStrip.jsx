import { formatUpdateTime } from '../utils/format.js';

export function StatusStrip({ deals, giveaways, news, status }) {
  const update = deals.updatedAt || giveaways.updatedAt || news.updatedAt;
  const statusLabel = status === 'live' ? 'Live feed' : status === 'resilient' ? 'Cached mode' : 'Partial feed';

  return (
    <div className="status-strip-wrap">
      <div className="shell status-strip">
        <span className="status-strip__state"><i aria-hidden="true" />{statusLabel}</span>
        <div className="status-strip__marquee">
          <span><b>{deals.items.length}</b> deals loaded</span>
          <span><b>{giveaways.items.length}</b> free offers</span>
          <span><b>{news.items.length}</b> new stories</span>
          <span>updated <b>{formatUpdateTime(update)}</b></span>
        </div>
      </div>
    </div>
  );
}
