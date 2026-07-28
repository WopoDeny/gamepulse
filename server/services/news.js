import { fallbackNews } from '../data/fallback.js';
import { fetchJson } from '../utils/http.js';

const games = [
  { appId: '730', name: 'Counter-Strike 2' },
  { appId: '570', name: 'Dota 2' },
  { appId: '1091500', name: 'Cyberpunk 2077' },
  { appId: '1086940', name: 'Baldur’s Gate 3' },
  { appId: '553850', name: 'Helldivers 2' },
  { appId: '1245620', name: 'ELDEN RING' },
];

function stripHtml(value = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function newsImage(appId) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

export async function getNews() {
  try {
    const results = await Promise.allSettled(
      games.map(async (game) => {
        const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${game.appId}&count=3&maxlength=420&format=json`;
        const data = await fetchJson(url, { timeout: 6000 });
        const items = data?.appnews?.newsitems ?? [];

        return items.map((item) => ({
          id: `${game.appId}-${item.gid}`,
          title: stripHtml(item.title),
          excerpt: stripHtml(item.contents).slice(0, 260),
          game: game.name,
          source: item.feedlabel || 'Steam News',
          date: new Date(Number(item.date) * 1000).toISOString(),
          url: item.url,
          image: newsImage(game.appId),
        }));
      }),
    );

    const normalized = results
      .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .filter((item) => item.title && item.url)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12);

    if (normalized.length < 3) throw new Error('Not enough news returned');

    return {
      items: normalized,
      status: 'live',
      source: 'Steam News',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[news]', error.message);
    return {
      items: fallbackNews,
      status: 'fallback',
      source: 'GamePulse fallback',
      updatedAt: new Date().toISOString(),
    };
  }
}
