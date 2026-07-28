const DEFAULT_TIMEOUT = 7000;

async function performFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GamePulse/2.0 (+https://vercel.app)',
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Upstream request failed with ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson(url, options = {}) {
  const response = await performFetch(url, options);
  return response.json();
}

export async function fetchJsonWithMeta(url, options = {}) {
  const response = await performFetch(url, options);
  const data = await response.json();
  const headers = Object.fromEntries(response.headers.entries());

  return {
    data,
    headers,
    status: response.status,
  };
}

export function sendJson(res, status, payload, cacheSeconds = 300) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}`,
  );
  return res.status(status).json(payload);
}

export function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function safeInteger(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}
