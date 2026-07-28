import cors from 'cors';
import express from 'express';
import { getDeals } from './services/deals.js';
import { getGiveaways } from './services/giveaways.js';
import { getNews } from './services/news.js';

const app = express();
const port = Number(process.env.PORT || 8787);

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'gamepulse-api', timestamp: new Date().toISOString() });
});

app.get('/api/deals', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=45, s-maxage=240, stale-while-revalidate=1200');
  res.json(await getDeals(req.query));
});

app.get('/api/giveaways', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=1200');
  res.json(await getGiveaways());
});

app.get('/api/news', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=1200');
  res.json(await getNews());
});

app.use((error, _req, res, _next) => {
  console.error('[server]', error);
  res.status(500).json({ ok: false, message: 'Unexpected server error' });
});

app.listen(port, () => {
  console.log(`GamePulse API running on http://localhost:${port}`);
});
