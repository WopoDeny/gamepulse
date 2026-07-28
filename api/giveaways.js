import { getGiveaways } from '../server/services/giveaways.js';

export default async function handler(_request, response) {
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200');
  response.status(200).json(await getGiveaways());
}
