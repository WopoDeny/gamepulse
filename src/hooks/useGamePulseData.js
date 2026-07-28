import { useCallback, useEffect, useMemo, useState } from 'react';
import { gamePulseApi } from '../api/client.js';

const emptyFeed = {
  items: [],
  status: 'loading',
  source: '',
  updatedAt: null,
  page: 0,
  pageSize: 60,
  hasMore: false,
  totalPages: null,
};

function mergeDeals(current, incoming) {
  const seen = new Set();
  const items = [...current.items, ...incoming.items].filter((item) => {
    const key = item.id || item.steamAppId || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ...incoming,
    items,
  };
}

export function useGamePulseData() {
  const [data, setData] = useState({
    deals: emptyFeed,
    giveaways: emptyFeed,
    news: emptyFeed,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    const requests = await Promise.allSettled([
      gamePulseApi.getDeals({ page: 0, pageSize: 60, sortBy: 'Deal Rating' }),
      gamePulseApi.getGiveaways(),
      gamePulseApi.getNews(),
    ]);

    const [deals, giveaways, news] = requests;
    const next = {
      deals: deals.status === 'fulfilled' ? deals.value : emptyFeed,
      giveaways: giveaways.status === 'fulfilled' ? giveaways.value : emptyFeed,
      news: news.status === 'fulfilled' ? news.value : emptyFeed,
    };

    const failedCount = requests.filter((result) => result.status === 'rejected').length;
    if (failedCount === requests.length) {
      setError('The live sources are temporarily unavailable. The page will retry when refreshed.');
    } else if (deals.status === 'rejected') {
      setError('Deals could not be refreshed, but the rest of the page is still live.');
    }

    setData(next);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadMoreDeals = useCallback(async () => {
    if (loadingMore || !data.deals.hasMore) return;
    setLoadingMore(true);

    try {
      const nextPage = (data.deals.page ?? 0) + 1;
      const next = await gamePulseApi.getDeals({
        page: nextPage,
        pageSize: data.deals.pageSize || 60,
        sortBy: 'Deal Rating',
      });

      setData((current) => ({
        ...current,
        deals: mergeDeals(current.deals, next),
      }));
    } catch (loadError) {
      console.error(loadError);
      setError('More deals could not be loaded. Try again in a moment.');
    } finally {
      setLoadingMore(false);
    }
  }, [data.deals.hasMore, data.deals.page, data.deals.pageSize, loadingMore]);

  useEffect(() => {
    load(false);
  }, [load]);

  const status = useMemo(() => {
    const feeds = Object.values(data);
    if (feeds.some((feed) => feed.status === 'fallback')) return 'resilient';
    if (feeds.every((feed) => feed.status === 'live')) return 'live';
    return 'partial';
  }, [data]);

  return {
    ...data,
    loading,
    refreshing,
    loadingMore,
    error,
    status,
    refresh: () => load(true),
    loadMoreDeals,
  };
}
