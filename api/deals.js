import { getDeals } from '../server/services/deals.js';

function readQuery(request) {
  if (request.query && typeof request.query === 'object') return request.query;

  try {
    const url = new URL(request.url, 'http://localhost');
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'public, s-maxage=240, stale-while-revalidate=1200');
  response.status(200).json(await getDeals(readQuery(request)));
}
