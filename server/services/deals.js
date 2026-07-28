import { fallbackDeals } from '../data/fallback.js';
import { fetchJson, fetchJsonWithMeta, safeInteger, safeNumber } from '../utils/http.js';

const DEALS_ENDPOINT = 'https://www.cheapshark.com/api/1.0/deals';
const GAMES_ENDPOINT = 'https://www.cheapshark.com/api/1.0/games';
const STORES_ENDPOINT = 'https://www.cheapshark.com/api/1.0/stores';
const STORE_CACHE_TTL = 1000 * 60 * 60 * 12;

let storeCache = {
  expiresAt: 0,
  map: new Map(),
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cleanSearch(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function toDealUrl(dealId) {
  return dealId
    ? `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(dealId)}`
    : 'https://www.cheapshark.com/';
}

function badgeFor(deal) {
  const savings = safeNumber(deal.savings);
  const score = safeNumber(deal.dealRating);

  if (savings >= 90) return '90%+ OFF';
  if (savings >= 75) return 'DEEP CUT';
  if (score >= 9) return 'STRONG VALUE';
  if (safeNumber(deal.salePrice) <= 5) return 'UNDER $5';
  return 'ON SALE';
}

async function getStoreMap() {
  if (storeCache.expiresAt > Date.now() && storeCache.map.size) {
    return storeCache.map;
  }

  try {
    const stores = await fetchJson(STORES_ENDPOINT, { timeout: 6500 });
    const map = new Map(
      Array.isArray(stores)
        ? stores.map((store) => [String(store.storeID), store.storeName])
        : [],
    );

    storeCache = {
      map,
      expiresAt: Date.now() + STORE_CACHE_TTL,
    };

    return map;
  } catch (error) {
    console.error('[deals:stores]', error.message);
    return storeCache.map.size ? storeCache.map : new Map();
  }
}

function normalizeDeal(deal, storeMap) {
  const savings = clamp(Math.round(safeNumber(deal.savings)), 0, 100);
  const steamRating = clamp(Math.round(safeNumber(deal.steamRatingPercent)), 0, 100);
  const metaScore = clamp(Math.round(safeNumber(deal.metacriticScore)), 0, 100);
  const steamAppId = deal.steamAppID ? String(deal.steamAppID) : null;

  return {
    id: String(deal.dealID),
    gameId: deal.gameID ? String(deal.gameID) : null,
    title: deal.title,
    store: storeMap.get(String(deal.storeID)) ?? 'Digital store',
    storeId: String(deal.storeID ?? ''),
    salePrice: safeNumber(deal.salePrice),
    normalPrice: safeNumber(deal.normalPrice, safeNumber(deal.salePrice)),
    savings,
    rating: metaScore || steamRating,
    steamRating,
    steamAppId,
    image: steamAppId
      ? `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`
      : (deal.thumb || null),
    dealUrl: toDealUrl(deal.dealID),
    badge: badgeFor(deal),
    catalogOnly: false,
  };
}

function normalizeCatalogGame(game) {
  const dealId = game.cheapestDealID || game.dealID || null;
  const steamAppId = game.steamAppID ? String(game.steamAppID) : null;
  const price = safeNumber(game.cheapest);

  return {
    id: dealId ? String(dealId) : `catalog-${game.gameID || game.external}`,
    gameId: game.gameID ? String(game.gameID) : null,
    title: game.external || game.title || 'Untitled game',
    store: 'Best available price',
    storeId: '',
    salePrice: price,
    normalPrice: price,
    savings: 0,
    rating: 0,
    steamRating: 0,
    steamAppId,
    image: steamAppId
      ? `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`
      : (game.thumb || null),
    dealUrl: toDealUrl(dealId),
    badge: 'CATALOG MATCH',
    catalogOnly: true,
  };
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.steamAppId || item.gameId || item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseOptions(options = {}) {
  const page = clamp(safeInteger(options.page ?? options.pageNumber, 0), 0, 500);
  const pageSize = clamp(safeInteger(options.pageSize, 60), 1, 60);
  const search = cleanSearch(options.search ?? options.q ?? options.title);

  const allowedSorts = new Map([
    ['deal rating', 'Deal Rating'],
    ['savings', 'Savings'],
    ['price', 'Price'],
    ['metacritic', 'Metacritic'],
    ['reviews', 'Reviews'],
    ['release', 'Release'],
    ['title', 'Title'],
  ]);

  const requestedSort = String(options.sortBy || 'Deal Rating').toLowerCase();
  const sortBy = allowedSorts.get(requestedSort) || 'Deal Rating';

  return { page, pageSize, search, sortBy };
}

function fallbackResponse({ page, pageSize, search }, error) {
  const filtered = search
    ? fallbackDeals.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    : fallbackDeals;
  const start = page * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    hasMore: start + pageSize < filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    totalItems: filtered.length,
    query: search,
    status: 'fallback',
    source: 'Cached sample feed',
    updatedAt: new Date().toISOString(),
    warning: error?.message || 'Live deal source unavailable',
  };
}

export async function getDeals(rawOptions = {}) {
  const options = parseOptions(rawOptions);
  const { page, pageSize, search, sortBy } = options;

  try {
    const params = new URLSearchParams({
      pageNumber: String(page),
      pageSize: String(pageSize),
      sortBy,
      desc: '1',
      onSale: '1',
    });

    if (search) params.set('title', search);

    const [{ data: deals, headers }, storeMap] = await Promise.all([
      fetchJsonWithMeta(`${DEALS_ENDPOINT}?${params.toString()}`, { timeout: 8500 }),
      getStoreMap(),
    ]);

    if (!Array.isArray(deals)) throw new Error('Unexpected deal response');

    let normalized = deals
      .filter((deal) => deal?.title && deal?.dealID)
      .map((deal) => normalizeDeal(deal, storeMap));

    // A title search should behave like a real catalogue search, not merely search
    // the already-loaded homepage page. CheapShark's games endpoint supplements
    // exact deal results with catalogue matches and their current cheapest offer.
    if (search && page === 0 && normalized.length < Math.min(18, pageSize)) {
      const gameParams = new URLSearchParams({
        title: search,
        limit: String(pageSize),
        exact: '0',
      });

      try {
        const games = await fetchJson(`${GAMES_ENDPOINT}?${gameParams.toString()}`, { timeout: 7500 });
        if (Array.isArray(games)) {
          normalized = deduplicate([
            ...normalized,
            ...games.filter((game) => game?.external).map(normalizeCatalogGame),
          ]).slice(0, pageSize);
        }
      } catch (catalogError) {
        console.error('[deals:catalog]', catalogError.message);
      }
    }

    const headerPages = safeInteger(
      headers['x-total-page-count']
        ?? headers['x-total-pages']
        ?? headers['total-page-count'],
      -1,
    );
    const totalPages = headerPages >= 0 ? headerPages : null;
    const hasMore = search
      ? normalized.length >= pageSize && !normalized.some((item) => item.catalogOnly)
      : totalPages !== null
        ? page + 1 < totalPages
        : deals.length === pageSize;

    return {
      items: normalized,
      page,
      pageSize,
      hasMore,
      totalPages,
      totalItems: totalPages ? totalPages * pageSize : null,
      query: search,
      status: 'live',
      source: 'CheapShark',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[deals]', error.message);
    return fallbackResponse(options, error);
  }
}
