import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/auth';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import CustomSelect from '../../components/ui/CustomSelect';
import DeliveryLocationPicker from '../../components/marketplace/DeliveryLocationPicker';
import MarketplaceAccountNav from '../../components/marketplace/MarketplaceAccountNav';
import MarketplaceSidebar from '../../components/marketplace/MarketplaceSidebar';
import MarketplaceQuickAdd from '../../components/marketplace/MarketplaceQuickAdd';
import './marketplace.css';
import '../../components/marketplace/marketplace-sidebar.css';

type Category = { id: string; slug: string; name: string; icon?: string | null; description?: string };
type Product = {
  id: string; name: string; description?: string; price: number; comparePrice?: number | null;
  image?: string | null; category?: string; rating?: number; reviewCount?: number; storeName?: string; sellerId?: string;
};
type Store = { id: string; slug?: string; storeName: string; storeDescription?: string; storeAvatar?: string; storeBanner?: string; category?: string; productCount?: number; avgRating?: number; totalReviews?: number; isVerified?: boolean; isOpen?: boolean; isNewStore?: boolean; featuredProducts?: { id: string; name: string; image?: string | null }[] };
type Envelope<T> = { success?: boolean; data?: T; total?: number; message?: string };
type ProductFilters = { category: string; minPrice: string; maxPrice: string; minRating: string; sellerType: string; condition: string; inStock: boolean };
const emptyFilters: ProductFilters = { category: '', minPrice: '', maxPrice: '', minRating: '', sellerType: '', condition: '', inStock: false };

function readBuyerAvatar() {
  try {
    const user = JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string; avatar?: string | null } | null;
    return user?.role === 'buyer' ? user.avatar : null;
  } catch { return null; }
}

async function getApi<T>(path: string): Promise<Envelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error('Could not load the marketplace. Please try again shortly.');
  return response.json() as Promise<Envelope<T>>;
}

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    heart: <path d="M20.8 8.8c0 5.3-8.8 10-8.8 10s-8.8-4.7-8.8-10A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z"/>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    shop: <><path d="M3 10h18l-2 11H5L3 10Z"/><path d="m5 10 2-7h10l2 7M9 14v3m6-3v3"/></>,
    sliders: <><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
    cpu: <><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8"/></>,
    'grad-cap': <><path d="m2 10 10-6 10 6-10 6-10-6Z"/><path d="M6 12.5V17c4 3 8 3 12 0v-4.5M22 10v6"/></>,
    'graduation-cap': <><path d="m2 10 10-6 10 6-10 6-10-6Z"/><path d="M6 12.5V17c4 3 8 3 12 0v-4.5M22 10v6"/></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z"/></>,
    shirt: <><path d="m8 4 4 2 4-2 5 3-2 5-3-1v10H8V11l-3 1-2-5 5-3Z"/><path d="M9 5a3 3 0 0 0 6 0"/></>,
    utensils: <><path d="M7 3v7m4-7v7M7 7h4M9 10v11M17 3c-2 2-3 5-3 8h3v10M17 3v8"/></>,
    sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    dumbbell: <><path d="m6.5 6.5 11 11m-13-8 5-5m5 15 5-5M3 9l6-6m6 18 6-6"/></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.5-3.3 1.7 1.7 0 0 1 1.3-2.8H18a3 3 0 0 0 3-3c0-5-4-8.9-9-8.9Z"/><circle cx="7.5" cy="11" r=".8"/><circle cx="10" cy="7.5" r=".8"/><circle cx="15" cy="8" r=".8"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18m-11 0v2h4v-2"/></>,
    tag: <><path d="m20 13-7 7L3 10V4h6l11 9Z"/><circle cx="7.5" cy="7.5" r="1"/></>,
    check: <><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></>,
    visualSearch: <><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="12" r="4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.shop}</svg>;
}

function currency(value: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(value);
}

export default function MarketplacePage({ storesView = false }: { storesView?: boolean }) {
  const { orders: openOrderCount, saved: savedCount, refresh: refreshLive } = useMarketplaceLive();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [queryParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState(queryParams.get('search') || queryParams.get('q') || '');
  const [sort, setSort] = useState(queryParams.get('sort') || 'popular');
  const [productsOnly, setProductsOnly] = useState(queryParams.get('view') === 'products');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [storeFilter, setStoreFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<ProductFilters>(emptyFilters);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [buyerAccountVisible, setBuyerAccountVisible] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string } | null)?.role === 'buyer'; } catch { return false; }
  });
  const [buyerAvatar, setBuyerAvatar] = useState<string | null | undefined>(readBuyerAvatar);
  const [liveListingVersion, setLiveListingVersion] = useState(0);

  useEffect(() => {
    const refreshListing = () => setLiveListingVersion((version) => version + 1);
    window.addEventListener('unimartx:market-refresh', refreshListing);
    return () => window.removeEventListener('unimartx:market-refresh', refreshListing);
  }, []);

  useEffect(() => {
    getApi<Category[]>('/categories/').then((res) => setCategories(res.data || [])).catch(() => setCategories([]));
    try { setSaved(JSON.parse(localStorage.getItem('unimartxWishlistIds') || '[]')); } catch { setSaved([]); }
    try {
      const account = JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string } | null;
      const token = localStorage.getItem('unimartxToken');
      if (account?.role === 'buyer' && token) fetch(`${API_BASE_URL}/wishlist/ids`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((body: { data?: string[] } | null) => { if (body?.data) { setSaved(body.data); localStorage.setItem('unimartxWishlistIds', JSON.stringify(body.data)); } }).catch(() => undefined);
    } catch { /* Keep the cached saved state when storage is unavailable. */ }
    const syncAccountNav = () => {
      try { setBuyerAccountVisible((JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string } | null)?.role === 'buyer'); } catch { setBuyerAccountVisible(false); }
      setBuyerAvatar(readBuyerAvatar());
    };
    window.addEventListener('unimartx:auth-change', syncAccountNav);
    window.addEventListener('storage', syncAccountNav);
    return () => { window.removeEventListener('unimartx:auth-change', syncAccountNav); window.removeEventListener('storage', syncAccountNav); };
  }, []);

  useEffect(() => {
    setProductsOnly(queryParams.get('view') === 'products');
    const requestedSort = queryParams.get('sort');
    if (requestedSort) setSort(requestedSort);
    const requestedSearch = queryParams.get('search') || queryParams.get('q') || '';
    if (requestedSearch !== search) setSearch(requestedSearch);
  }, [queryParams]);

  const categoryFilter = params.slug || queryParams.get('category') || '';
  const productTab = queryParams.get('tab') || '';
  const activeCategory = useMemo(() => categories.find((item) => item.slug.toLowerCase() === categoryFilter.toLowerCase() || item.name.toLowerCase() === categoryFilter.toLowerCase()), [categories, categoryFilter]);
  const categoryName = activeCategory?.name || (params.slug ? decodeURIComponent(params.slug).replaceAll('-', ' ') : '');
  const listingTitle = storesView ? 'Meet the makers' : productsOnly ? 'Products' : categoryName || (search ? `Results for “${search}”` : 'Find your thing');

  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    if (storesView) {
      const query = new URLSearchParams({ limit: '24', sort: 'trending' });
      if (search.trim()) query.set('search', search.trim());
      if (storeFilter === 'campus') query.set('sellerType', 'campus');
      if (storeFilter === 'new') query.set('new', 'true');
      if (storeFilter === 'top') query.set('topRated', 'true');
      getApi<Store[]>(`/public/stores?${query.toString()}`)
        .then((res) => { if (live) setStores(res.data || []); })
        .catch((err: Error) => { if (live) setError(err.message); })
        .finally(() => { if (live) setLoading(false); });
    } else {
      const query = new URLSearchParams({ page: '1', limit: '24', sort });
      const selectedCategory = filters.category || activeCategory?.name;
      if (selectedCategory) query.set('category', selectedCategory);
      if (search.trim()) query.set('search', search.trim());
      if (filters.minPrice) query.set('minPrice', filters.minPrice);
      if (filters.maxPrice) query.set('maxPrice', filters.maxPrice);
      if (filters.minRating) query.set('minRating', filters.minRating);
      if (filters.sellerType) query.set('sellerType', filters.sellerType);
      if (filters.condition) query.set('condition', filters.condition);
      if (filters.inStock) query.set('inStock', 'true');
      getApi<Product[]>(`/public/products?${query.toString()}`)
        .then((res) => { if (live) { setProducts(res.data || []); setTotalProducts(res.total ?? res.data?.length ?? 0); } })
        .catch((err: Error) => { if (live) setError(err.message); })
        .finally(() => { if (live) setLoading(false); });
    }
    return () => { live = false; };
  }, [activeCategory, filters, location.pathname, search, sort, storeFilter, storesView, liveListingVersion]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const basePath = storesView ? '/shop/stores' : '/shop';
    navigate(search.trim() ? `${basePath}?search=${encodeURIComponent(search.trim())}` : basePath);
  }

  async function toggleSaved(id: string) {
    const currentlySaved = saved.includes(id);
    try {
      const account = JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string } | null;
      const token = localStorage.getItem('unimartxToken');
      if (account?.role === 'buyer' && token) {
        const response = await fetch(`${API_BASE_URL}/wishlist/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: id }) });
        const body = await response.json().catch(() => ({})) as { success?: boolean; saved?: boolean; message?: string };
        if (!response.ok || body.success === false) throw new Error(body.message || 'Could not update your saved finds.');
        const next = body.saved ? [...new Set([...saved, id])] : saved.filter((item) => item !== id);
        setSaved(next); localStorage.setItem('unimartxWishlistIds', JSON.stringify(next)); refreshLive(); return;
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update your saved finds.'); return; }
    const next = currentlySaved ? saved.filter((item) => item !== id) : [...saved, id];
    setSaved(next); refreshLive();
    localStorage.setItem('unimartxWishlistIds', JSON.stringify(next));
  }

  function selectProductTab(nextSort: string) {
    setProductsOnly(true);
    setSort(nextSort);
    navigate(`/shop?view=products&sort=${nextSort}&tab=${nextSort}`);
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setFilters(draftFilters);
    setProductsOnly(true);
    setFilterOpen(false);
    navigate(`/shop?view=products&sort=${sort}`);
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setDraftFilters(emptyFilters);
    setProductsOnly(true);
    setFilterOpen(false);
    navigate(`/shop?view=products&sort=${sort}`);
  }

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key === 'inStock' ? value : Boolean(value)).length;

  const categoriesView = categories.length ? categories : [
    { id: 'style', slug: 'style', name: 'Style & accessories' }, { id: 'food', slug: 'food', name: 'Food & treats' },
    { id: 'art', slug: 'art', name: 'Art & handmade' }, { id: 'home', slug: 'home', name: 'Home & living' },
  ];

  return <div className="marketplace">
    <header className="market-topbar">
      <button className="market-mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle category menu">☰</button>
      <Link className="market-logo" to="/shop" aria-label="UniMartX home"><span className="market-logo-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 17h28l-2.5 25h-23L10 17Z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/></svg></span><span>unimart<span>x</span></span></Link>
      <form className="market-search" onSubmit={submitSearch} role="search" aria-label="Search UniMartX">
        <button className="market-search-submit" type="submit" aria-label="Search products and stores"><Icon name="search" size={18}/></button><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products and stores" aria-label="Search marketplace"/><span className="market-visual-search" title="Visual search"><Icon name="visualSearch" size={19}/></span>
      </form>
      <DeliveryLocationPicker />
      <MarketplaceAccountNav />
    </header>

    <div className="market-workspace">
      <MarketplaceSidebar heading="YOUR MARKET" subtitle="Made for finding good things" mobileMode="drawer" open={mobileMenu} onNavigate={() => setMobileMenu(false)} sections={[
        { items: [
          { label: 'Discover', icon: <Icon name="compass" size={17}/>, to: '/shop', active: !activeCategory && !storesView && !productsOnly, trailing: '↗' },
          { label: 'Local stores', icon: <Icon name="shop" size={17}/>, to: '/shop/stores', active: storesView, trailing: '↗' },
        ] },
        { label: 'PRODUCTS', items: [
          { label: 'All products', icon: <Icon name="tag" size={16}/>, to: '/shop?view=products&sort=popular&tab=all', active: productsOnly && (!productTab || productTab === 'all'), trailing: '↗' },
          { label: 'Popular finds', icon: <Icon name="sparkles" size={16}/>, onClick: () => selectProductTab('popular'), active: productsOnly && productTab === 'popular', trailing: '↗' },
          { label: 'New arrivals', icon: <Icon name="tag" size={16}/>, onClick: () => selectProductTab('newest'), active: productsOnly && productTab === 'newest', trailing: '↗' },
        ] },
        { label: 'SHOP BY CATEGORY', items: categoriesView.map((category, index) => ({
          label: category.name, icon: <span aria-hidden="true">📦</span>, iconClassName: `market-category-dot market-dot-${index % 5}`,
          to: `/shop/category/${category.slug}`, active: activeCategory?.id === category.id,
          onClick: () => { if (filters.category) setFilters({ ...filters, category: '' }); }, trailing: '↗',
        })) },
        ...(buyerAccountVisible ? [{ label: 'YOUR ACCOUNT', items: [
          { label: 'Account', icon: <Icon name="user" size={17}/>, avatar: buyerAvatar, to: '/shop/account', trailing: '↗' },
          { label: 'Orders', icon: <Icon name="bag" size={17}/>, to: '/shop/orders', badge: openOrderCount, trailing: '↗' },
          { label: 'Saved finds', icon: <Icon name="heart" size={17}/>, to: '/shop/saved', badge: savedCount, trailing: '↗' },
          { label: 'Settings', icon: <Icon name="sliders" size={17}/>, to: '/shop/settings', trailing: '↗' },
        ] }] : []),
      ]} note={{ icon: <Icon name="shop" size={19}/>, title: 'Your shop could be here.', description: 'Join a community of Ghanaian makers and independent sellers.', action: { label: 'Open a shop', to: '/auth/seller/register', icon: <Icon name="arrow" size={15}/> } }} footer={<><span>Thoughtfully local.</span><span>© UniMartX</span></>}/>

      <main className="market-main">
        <div className="market-mobile-categories">{categoriesView.map((c) => <Link key={c.id} to={`/shop/category/${c.slug}`}>{c.name}</Link>)}</div>
        {!storesView && !productsOnly && !activeCategory && !search && <section className="market-welcome">
          <div className="market-welcome-copy"><div className="market-overline"><span/> A MARKETPLACE WITH A POINT OF VIEW</div><h1>Find the <em>good stuff.</em></h1><p>Good things made, found, and shared by people in your community.</p><div className="market-welcome-actions"><a href="#market-products" className="market-primary-button">Browse everything <Icon name="arrow" size={17}/></a><Link to="/shop/stores" className="market-text-button">Get to know the makers ↗</Link></div></div>
          <div className="market-welcome-art"><div className="market-art-tag">MADE AROUND HERE <span>✳</span></div><img src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1100&q=85" alt="Handmade pottery and creative goods"/><div className="market-art-stamp">GOOD<br/>FINDS<br/><b>GH ✳</b></div><div className="market-art-caption"><span>OBJECTS WITH A STORY</span><b>001 — ACCRA, GHANA</b></div></div>
        </section>}
        <div className="market-content-heading" id="market-products">
          <div><div className="market-overline">{storesView ? 'INDEPENDENT SHOPS · GHANA' : activeCategory ? 'A LITTLE SOMETHING FOR YOU' : search ? 'YOUR SEARCH STARTS HERE' : 'FRESH FROM OUR COMMUNITY'}</div><h2>{storesView ? 'Shops worth knowing' : listingTitle}<span className="market-heading-dot">.</span></h2><p>{storesView ? 'Meet the local businesses, student founders, and makers behind the marketplace.' : activeCategory ? `Thoughtful finds in ${categoryName}.` : 'Thoughtful finds from independent shops, creators, and campus sellers.'}</p>{!storesView && <small className="market-result-count">{totalProducts} {totalProducts === 1 ? 'product' : 'products'}</small>}</div>
          {!storesView && <div className="market-catalog-controls"><button className={`market-filter-toggle ${filterOpen ? 'is-open' : ''}`} onClick={() => { setDraftFilters({ ...filters, category: filters.category || activeCategory?.name || '' }); setFilterOpen(!filterOpen); }} aria-expanded={filterOpen}><Icon name="sliders" size={17}/>Filters{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button><div className="market-sort"><span>Sort by</span><CustomSelect value={sort} onChange={setSort} ariaLabel="Sort products" className="market-sort-select" options={[{ value: 'popular', label: 'Popular' }, { value: 'newest', label: 'New arrivals' }, { value: 'rating', label: 'Top rated' }, { value: 'price-asc', label: 'Price: low to high' }, { value: 'price-desc', label: 'Price: high to low' }]}/></div></div>}
        </div>

        {filterOpen && !storesView && <form className="market-filter-panel" onSubmit={applyFilters}>
          <div className="market-filter-fields">
            <label><span>Category</span><CustomSelect value={draftFilters.category} onChange={(value) => setDraftFilters({ ...draftFilters, category: value })} ariaLabel="Filter by category" options={[{ value: '', label: 'All categories' }, ...categoriesView.map((category) => ({ value: category.name, label: category.name }))]}/></label>
            <fieldset><legend>Price range · GH₵</legend><div className="market-price-fields"><input type="number" min="0" placeholder="Min" value={draftFilters.minPrice} onChange={(e) => setDraftFilters({ ...draftFilters, minPrice: e.target.value })}/><span>to</span><input type="number" min="0" placeholder="Max" value={draftFilters.maxPrice} onChange={(e) => setDraftFilters({ ...draftFilters, maxPrice: e.target.value })}/></div></fieldset>
            <label><span>Rating</span><CustomSelect value={draftFilters.minRating} onChange={(value) => setDraftFilters({ ...draftFilters, minRating: value })} ariaLabel="Filter by rating" options={[{ value: '', label: 'Any rating' }, { value: '4', label: '4 stars & up' }, { value: '3', label: '3 stars & up' }, { value: '2', label: '2 stars & up' }]}/></label>
            <label><span>Seller</span><CustomSelect value={draftFilters.sellerType} onChange={(value) => setDraftFilters({ ...draftFilters, sellerType: value })} ariaLabel="Filter by seller type" options={[{ value: '', label: 'All sellers' }, { value: 'campus', label: 'Campus sellers' }, { value: 'independent', label: 'Independent sellers' }]}/></label>
            <label><span>Condition</span><CustomSelect value={draftFilters.condition} onChange={(value) => setDraftFilters({ ...draftFilters, condition: value })} ariaLabel="Filter by condition" options={[{ value: '', label: 'Any condition' }, { value: 'new', label: 'New' }, { value: 'like-new', label: 'Like new' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }]}/></label>
            <label className="market-stock-check"><input type="checkbox" checked={draftFilters.inStock} onChange={(e) => setDraftFilters({ ...draftFilters, inStock: e.target.checked })}/><span>In stock only</span></label>
          </div>
          <div className="market-filter-actions"><button type="button" className="market-filter-reset" onClick={resetFilters}>Clear all</button><button type="submit" className="market-filter-apply">Apply filters <Icon name="arrow" size={16}/></button></div>
        </form>}

        {storesView && <div className="market-store-toolbar"><div className="market-store-filters" aria-label="Filter stores">{[['all', 'All shops'], ['campus', 'Campus shops'], ['new', 'New shops'], ['top', 'Top rated']].map(([value, label]) => <button key={value} className={storeFilter === value ? 'is-selected' : ''} onClick={() => setStoreFilter(value)}>{label}</button>)}</div><span className="market-store-count"><Icon name="shop" size={16}/>{search ? 'Matching shops' : 'Local shops'}</span></div>}

        {error && <div className="market-message"><span>Couldn’t reach the marketplace</span><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></div>}
        {loading && (storesView ? <div className="market-store-grid">{Array.from({ length: 6 }, (_, i) => <div className="market-store-skeleton" key={i}><i/><b/><span/></div>)}</div> : <div className="market-product-grid">{Array.from({ length: 8 }, (_, i) => <div className="market-product-skeleton" key={i}><div/><i/><i/></div>)}</div>)}
        {!loading && !error && storesView && <div className="market-store-grid">{stores.map((store, i) => <Link className="market-store-card" to={`/shop/store/${encodeURIComponent(store.slug || store.id)}`} key={store.id} aria-label={`Enter ${store.storeName}`}>
          <div className="market-store-banner" style={{ backgroundImage: store.storeBanner ? `url(${store.storeBanner})` : `linear-gradient(135deg, hsl(${130 + i * 27} 24% 28%), hsl(${160 + i * 27} 32% 53%))` }}><span className="market-store-kind"><Icon name="shop" size={14}/>{store.category || 'Independent shop'}</span>{store.isNewStore && <span className="market-store-new">NEW</span>}</div>
          <div className="market-store-info"><div className="market-store-identity"><span className="market-store-avatar">{store.storeAvatar ? <img src={store.storeAvatar} alt=""/> : store.storeName.slice(0, 1)}</span><div><strong>{store.storeName}</strong><small><Icon name="pin" size={13}/> Ghana <span>·</span> {store.isOpen ? 'Open now' : 'Online store'}</small></div></div>
            {store.isVerified && <div className="market-store-verified"><Icon name="check" size={14}/> Verified shop</div>}
            <p>{store.storeDescription || 'A local shop with thoughtful finds and goods made with care.'}</p>
            <div className="market-store-metrics"><span><b>★</b> {Number(store.avgRating || 0).toFixed(1)} <small>({store.totalReviews || 0})</small></span><span><Icon name="shop" size={14}/>{store.productCount ?? 0} products</span></div>
          </div>
        </Link>)}</div>}
        {!loading && !error && !storesView && <div className="market-product-grid">{products.map((product, i) => <article className="market-product-card" key={product.id} style={{ animationDelay: `${(i % 8) * 45}ms` }}>
          <Link to={`/shop/product/${product.id}`} className={`market-product-image market-image-tone-${i % 5}`}>{product.image ? <img src={product.image} alt={product.name} loading="lazy"/> : <span className="market-image-placeholder">✳</span>}<span className="market-product-badge">{i % 4 === 0 ? 'COMMUNITY FIND' : 'MADE LOCALLY'}</span></Link>
          <button className={`market-save-button ${saved.includes(product.id) ? 'is-saved' : ''}`} aria-label={saved.includes(product.id) ? 'Remove saved item' : 'Save item'} onClick={() => toggleSaved(product.id)}><Icon name="heart" size={17}/></button>
          <MarketplaceQuickAdd productId={product.id} productName={product.name} className="market-product-quick-add"/>
          <div className="market-product-info"><div className="market-product-category">{product.category || 'GOODS & FINDS'}</div><Link to={`/shop/product/${product.id}`} className="market-product-name">{product.name}</Link><div className="market-product-store">from <b>{product.storeName || 'Independent seller'}</b></div><div className="market-product-bottom"><strong>{currency(product.price)}</strong>{(product.rating || 0) > 0 && <span>★ {Number(product.rating).toFixed(1)} <small>({product.reviewCount || 0})</small></span>}</div></div>
        </article>)}</div>}
        {!loading && !error && storesView && !stores.length && <div className="market-empty"><span>✳</span><h3>Good shops are on the way.</h3><p>We’re getting local stores ready to meet you.</p></div>}
        {!loading && !error && !storesView && !products.length && <div className="market-empty"><span>⌕</span><h3>No finds just yet.</h3><p>Try another search or explore a different category.</p><Link to="/shop">Back to discover <Icon name="arrow" size={16}/></Link></div>}
        {!storesView && !productsOnly && !activeCategory && !search && <section className="market-community-banner"><div><div className="market-overline">A GOOD PLACE TO BEGIN</div><h3>Small shops.<br/><em>Big personality.</em></h3><p>Every find has a person, a place, and a little story behind it.</p><Link to="/shop/stores">Meet the makers <Icon name="arrow" size={16}/></Link></div><div className="market-community-photos"><img src="https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=500&q=80" alt="Local maker at work"/><img src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=500&q=80" alt="Handmade goods"/></div></section>}
        <footer className="market-footer"><Link className="market-logo" to="/shop"><span className="market-logo-mark">u</span><span>unimart<span>x</span></span></Link><span>Good things, close to home.</span><Link to="/auth/seller/register">Become a seller ↗</Link></footer>
      </main>
    </div>
  </div>;
}
