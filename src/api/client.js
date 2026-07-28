const REQUEST_TIMEOUT = 11000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout ?? REQUEST_TIMEOUT);

  const abortFromParent = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromParent, { once: true });

  try {
    const response = await fetch(path, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromParent);
  }
}

function dealsPath(options = {}) {
  const params = new URLSearchParams();
  if (options.page !== undefined) params.set('page', String(options.page));
  if (options.pageSize !== undefined) params.set('pageSize', String(options.pageSize));
  if (options.search) params.set('search', options.search);
  if (options.sortBy) params.set('sortBy', options.sortBy);
  const query = params.toString();
  return `/api/deals${query ? `?${query}` : ''}`;
}

export const gamePulseApi = {
  getDeals: (options = {}) => request(dealsPath(options), options),
  searchDeals: (search, options = {}) => request(
    dealsPath({ search, page: 0, pageSize: options.pageSize ?? 40, sortBy: 'Deal Rating' }),
    options,
  ),
  getGiveaways: () => request('/api/giveaways'),
  getNews: () => request('/api/news'),
};
