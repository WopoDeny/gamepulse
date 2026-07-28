import { fallbackGiveaways } from '../data/fallback.js';
import { fetchJson } from '../utils/http.js';

const ENDPOINT = 'https://www.gamerpower.com/api/giveaways?sort-by=popularity';

export async function getGiveaways() {
  try {
    const giveaways = await fetchJson(ENDPOINT, { timeout: 8000 });

    if (!Array.isArray(giveaways)) throw new Error('Unexpected giveaway response');

    const normalized = giveaways
      .filter((item) => item?.title && item?.open_giveaway_url)
      .slice(0, 12)
      .map((item) => ({
        id: String(item.id),
        title: item.title,
        description: item.description || item.instructions || 'Limited-time gaming giveaway.',
        image: item.image || item.thumbnail || null,
        thumbnail: item.thumbnail || item.image || null,
        worth: item.worth || 'FREE',
        platforms: item.platforms || 'Multiple platforms',
        type: item.type || 'Game',
        endDate: item.end_date && item.end_date !== 'N/A' ? item.end_date : null,
        openGiveawayUrl: item.open_giveaway_url,
        source: 'GamerPower',
      }));

    if (normalized.length < 2) throw new Error('Not enough giveaways returned');

    return {
      items: normalized,
      status: 'live',
      source: 'GamerPower',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[giveaways]', error.message);
    return {
      items: fallbackGiveaways,
      status: 'fallback',
      source: 'GamePulse fallback',
      updatedAt: new Date().toISOString(),
    };
  }
}
