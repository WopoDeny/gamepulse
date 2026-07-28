import { useEffect, useMemo, useState } from 'react';
import { Footer } from './components/Footer.jsx';
import { GameCard } from './components/GameCard.jsx';
import { GameModal } from './components/GameModal.jsx';
import { GiveawayCard } from './components/GiveawayCard.jsx';
import { Header } from './components/Header.jsx';
import { Hero } from './components/Hero.jsx';
import { NewsCard } from './components/NewsCard.jsx';
import { PulseIndex } from './components/PulseIndex.jsx';
import { SearchPalette } from './components/SearchPalette.jsx';
import { SectionHeading } from './components/SectionHeading.jsx';
import { DealSkeletons } from './components/Skeletons.jsx';
import { StatusStrip } from './components/StatusStrip.jsx';
import { useGamePulseData } from './hooks/useGamePulseData.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useScrollReveal } from './hooks/useScrollReveal.js';

const PAGE_STEP = 24;

const filters = [
  { id: 'all', label: 'All deals' },
  { id: 'deep', label: '70% and above' },
  { id: 'under10', label: 'Under $10' },
  { id: 'rated', label: 'Score 85+' },
  { id: 'saved', label: 'Saved' },
];

function App() {
  const {
    deals,
    giveaways,
    news,
    loading,
    refreshing,
    loadingMore,
    error,
    status,
    refresh,
    loadMoreDeals,
  } = useGamePulseData();
  const [favorites, setFavorites] = useLocalStorage('gamepulse:favorites', []);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useScrollReveal([loading, activeFilter, visibleCount, deals.items.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [activeFilter, sortBy]);

  const toggleFavorite = (id) => {
    setFavorites((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const filteredDeals = useMemo(() => {
    let result = [...deals.items];

    if (activeFilter === 'deep') result = result.filter((item) => item.savings >= 70);
    if (activeFilter === 'under10') result = result.filter((item) => item.salePrice <= 10);
    if (activeFilter === 'rated') result = result.filter((item) => (item.rating || item.steamRating) >= 85);
    if (activeFilter === 'saved') result = result.filter((item) => favorites.includes(item.id));

    if (sortBy === 'discount') result.sort((a, b) => b.savings - a.savings);
    if (sortBy === 'price') result.sort((a, b) => a.salePrice - b.salePrice);
    if (sortBy === 'rating') result.sort((a, b) => (b.rating || b.steamRating) - (a.rating || a.steamRating));
    if (sortBy === 'title') result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [deals.items, activeFilter, sortBy, favorites]);

  const visibleDeals = filteredDeals.slice(0, visibleCount);
  const featuredGiveaway = giveaways.items[0];
  const moreGiveaways = giveaways.items.slice(1, 5);
  const leadNews = news.items[0];
  const moreNews = news.items.slice(1, 7);
  const canRevealLoaded = visibleCount < filteredDeals.length;
  const canLoadRemote = activeFilter !== 'saved' && deals.hasMore;

  const handleMore = async () => {
    if (canRevealLoaded) {
      setVisibleCount((count) => count + PAGE_STEP);
      return;
    }
    if (canLoadRemote) {
      await loadMoreDeals();
      setVisibleCount((count) => count + PAGE_STEP);
    }
  };

  const moreLabel = loadingMore
    ? 'Loading more deals…'
    : canRevealLoaded
      ? `Show ${Math.min(PAGE_STEP, filteredDeals.length - visibleCount)} more`
      : 'Load the next deal page';

  return (
    <div className="app-shell">
      <Header onSearch={() => setSearchOpen(true)} />
      <Hero items={deals.items} onOpenGame={setSelectedGame} onSearch={() => setSearchOpen(true)} />
      <StatusStrip deals={deals} giveaways={giveaways} news={news} status={status} />

      <main>
        {error && (
          <div className="shell feed-alert">
            <span>{error}</span>
            <button onClick={refresh}>Retry</button>
          </div>
        )}

        <section id="deals" className="section section--deals">
          <div className="shell">
            <SectionHeading
              eyebrow="LIVE DEAL INDEX"
              title="The market, without the storefront noise."
              description="Fresh offers across PC storefronts. Browse the live index or search the wider catalogue by title."
              action={refreshing ? 'Refreshing…' : 'Refresh feed'}
              onAction={refresh}
              meta={`${deals.items.length} loaded`}
            />

            <div className="deal-toolbar" data-reveal>
              <div className="filter-pills" role="tablist" aria-label="Deal filters">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={activeFilter === filter.id ? 'is-active' : ''}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                    {filter.id === 'saved' && favorites.length > 0 && <sup>{favorites.length}</sup>}
                  </button>
                ))}
              </div>

              <label className="sort-control">
                <span>Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="discount">Biggest discount</option>
                  <option value="price">Lowest price</option>
                  <option value="rating">Highest score</option>
                  <option value="title">A–Z</option>
                </select>
              </label>
            </div>

            <div className="deal-count" data-reveal>
              <span>Showing {Math.min(visibleDeals.length, filteredDeals.length)} of {filteredDeals.length} matching deals</span>
              <button onClick={() => setSearchOpen(true)}>Search beyond this page <span aria-hidden="true">↗</span></button>
            </div>

            {loading ? (
              <DealSkeletons count={8} />
            ) : visibleDeals.length ? (
              <div className="deal-grid">
                {visibleDeals.map((game, index) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    featured={index === 0 || index === 7}
                    favorite={favorites.includes(game.id)}
                    onToggleFavorite={toggleFavorite}
                    onOpen={setSelectedGame}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state" data-reveal>
                <span>Nothing here yet.</span>
                <h3>No deals match this view.</h3>
                <p>Try another filter, or search the full catalogue by game title.</p>
                <div>
                  <button className="button button--quiet" onClick={() => setActiveFilter('all')}>Reset filter</button>
                  <button className="button button--primary" onClick={() => setSearchOpen(true)}>Search catalogue</button>
                </div>
              </div>
            )}

            {(canRevealLoaded || canLoadRemote) && activeFilter !== 'saved' && (
              <div className="section-more">
                <button className="load-more" onClick={handleMore} disabled={loadingMore}>
                  <span>{moreLabel}</span>
                  <i aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </section>

        <PulseIndex items={deals.items} />

        <section id="giveaways" className="section section--giveaways">
          <div className="shell">
            <SectionHeading
              eyebrow="FREE TO CLAIM"
              title="Good timing costs nothing."
              description="Limited offers from their original claim pages. Availability is always confirmed at the destination."
              meta={`${giveaways.items.length} active`}
            />

            {loading ? (
              <DealSkeletons count={4} />
            ) : (
              <div className="giveaway-layout">
                {featuredGiveaway && <GiveawayCard item={featuredGiveaway} featured />}
                <div className="giveaway-layout__grid">
                  {moreGiveaways.map((item) => <GiveawayCard key={item.id} item={item} />)}
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="news" className="section section--news">
          <div className="shell">
            <SectionHeading
              eyebrow="OFFICIAL UPDATE FEED"
              title="News from the games, not around them."
              description="Publisher and community updates linked directly to their original Steam posts."
              meta={`${news.items.length} recent`}
            />

            {loading ? (
              <DealSkeletons count={4} />
            ) : (
              <div className="news-layout">
                {leadNews && <NewsCard item={leadNews} large />}
                <div className="news-layout__grid">
                  {moreNews.map((item) => <NewsCard key={item.id} item={item} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <SearchPalette
        open={searchOpen}
        items={deals.items}
        onClose={() => setSearchOpen(false)}
        onOpenGame={setSelectedGame}
      />
      <GameModal
        game={selectedGame}
        favorite={selectedGame ? favorites.includes(selectedGame.id) : false}
        onToggleFavorite={toggleFavorite}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
}

export default App;
