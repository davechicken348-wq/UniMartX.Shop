import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/auth';
import MarketIcon from '../../components/marketplace/MarketIcon';
import MarketplaceQuickAdd from '../../components/marketplace/MarketplaceQuickAdd';
import DeliveryLocationPicker from '../../components/marketplace/DeliveryLocationPicker';
import StoreProductImage from '../../components/marketplace/StoreProductImage';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import { storefrontFontStack } from '../../lib/storefront-typography';
import { storefrontPageLayout, type StorefrontPageKey } from '../../lib/storefront-page-layouts';
import './marketplace.css';
import './product-details.css';
import '../seller/seller-workspace.css';
import './seller-storefront.css';
import '../seller/storefront-template-compositions.css';
import '../seller/product-card-customization.css';

type StoreProduct = { id: string; name: string; price: number; comparePrice?: number | null; image?: string | null; images?: (string | null)[]; category?: string; rating?: number; reviewCount?: number; stock?: number };
type StoreProfile = { sellerId: string; storeName: string; storeDescription?: string | null; storeTagline?: string | null; storeBanner?: string | null; storeAvatar?: string | null; storeColor?: string | null; city?: string | null; country?: string | null; category?: string | null; email?: string | null; phone?: string | null; pickupAddress?: string | null; businessHours?: string | null; verified?: boolean; slug?: string | null };
type StoreReview = { id: string; rating: number; comment: string; createdAt: string; buyer: { name: string; initials: string; avatar?: string | null } };
type StoreData = { profile: StoreProfile; stats: { totalSales: number; avgRating?: number | null; totalReviews: number; sellerRating?: number | null; sellerReviewCount?: number; productCount: number; followerCount: number }; products: StoreProduct[]; sellerReviews?: StoreReview[] };
type ApiResult = { success?: boolean; data?: StoreData; message?: string; error?: string };
type PublishedStoreSection = { id: string; type: string; heading?: string; description?: string; body?: string; buttonText?: string; buttonLink?: string; image?: string; visible?: boolean; alignment?: string; maxProducts?: number; productSelectionMode?: unknown; selectedProductIds?: unknown; shopCategories?: unknown; [key: string]: unknown };
type StorePageKey = 'products' | 'categories' | 'about' | 'contact' | 'reviews';
type PublishedStoreConfig = { templateId?: string; colors?: { primary?: string; accent?: string; background?: string; text?: string; muted?: string }; layout?: { productGrid?: number; productCardPositions?: Record<string, { x: number; y: number }>; productCardStyles?: Record<string, Record<string, unknown>>; storeWidth?: string | number; sectionSpacing?: string; paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number; contentAlignment?: 'left' | 'center' | 'right'; x?: number; y?: number; alignment?: string | number; showPrices?: boolean; productClick?: boolean; primaryAction?: string; footerMessage?: string; navShowLogo?: boolean; navBrandMode?: string; navShowLinks?: boolean; navShowSearch?: boolean; navShowLocation?: boolean; navShowActions?: boolean; navSticky?: boolean; navLayout?: string; navHeight?: string; navLogoSize?: number; navLinkGap?: number; navDecoration?: string; navBackground?: string; navTextColor?: string; navAccentColor?: string; navHomeLabel?: string; navShopLabel?: string; navAboutLabel?: string; footerVisible?: boolean; footerShowBrand?: boolean; footerShowSellerLink?: boolean; footerLinkText?: string; footerLinkUrl?: string; footerBackground?: string; footerTextColor?: string; footerAccentColor?: string }; typography?: { headingFont?: string; bodyFont?: string; textScale?: string }; sections?: PublishedStoreSection[]; pageSections?: Partial<Record<StorePageKey, PublishedStoreSection[]>>; pageLayouts?: Partial<Record<StorefrontPageKey, string>>; pageConnections?: { from: 'home'; to: StorePageKey }[]; template?: string };

function money(value: number) { return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(value); }
function storefrontNavHeight(template: string, setting: unknown) { return setting === 'compact' ? '52px' : setting === 'spacious' ? '76px' : setting === 'standard' ? '64px' : template === 'minimal' ? '50px' : template === 'editorial' ? '70px' : '66px'; }
function sectionProducts<T extends { id: string }>(products: T[], section: { productSelectionMode?: unknown; selectedProductIds?: unknown }) { if (section.productSelectionMode !== 'manual' || !Array.isArray(section.selectedProductIds)) return products; const byId = new Map(products.map((product) => [product.id, product])); return section.selectedProductIds.map((id) => byId.get(String(id))).filter((product): product is T => Boolean(product)); }
function sectionCategories(section: { shopCategories?: unknown }, products: StoreProduct[]): string[] { const categories = Array.isArray(section.shopCategories) ? section.shopCategories.map(String).map((item) => item.trim()) : [...new Set(products.map((product) => product.category).filter(Boolean))].slice(0, 4); return categories.filter((name): name is string => Boolean(name)); }
function safeStoreLink(value: unknown, fallback: string) {
  const link = typeof value === 'string' ? value.trim() : '';
  if (!link) return fallback;
  if (link.startsWith('/') || link.startsWith('#')) return link;
  try { const parsed = new URL(link); return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? link : fallback; } catch { return fallback; }
}
const fallbackSections: PublishedStoreSection[] = [{ id: 'hero-default', type: 'hero' }, { id: 'about-default', type: 'about' }, { id: 'products-default', type: 'featured-products' }];
const instrumentShopCategoryDefaults = ['New & Trending', 'Electric Guitars', 'Electric Basses', 'Acoustic Instruments', 'Amps & Effects', 'Parts'];
function instrumentShopCategories(section: PublishedStoreSection) { return Array.isArray(section.shopCategories) ? section.shopCategories.map((item) => String(item).trim()).filter(Boolean) : instrumentShopCategoryDefaults; }
const electronicsCategoryArtwork: Record<string, string> = {
  Audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
  Screens: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85',
  Camera: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85',
};
const defaultPageSections: Record<StorePageKey, PublishedStoreSection[]> = {
  products: [{ id: 'products-page-intro', type: 'collection-intro', heading: 'Shop all products' }, { id: 'products-page-filters', type: 'filters', heading: 'Filter products' }, { id: 'products-page-catalog', type: 'catalog', heading: 'All products', maxProducts: 100 }],
  categories: [{ id: 'categories-page-intro', type: 'collection-intro', heading: 'Shop by category' }, { id: 'categories-page-list', type: 'categories', heading: 'All collections' }, { id: 'categories-page-products', type: 'category-products', heading: 'Popular in our collections' }],
  about: [{ id: 'about-page-intro', type: 'story-intro', heading: 'Our story' }, { id: 'about-page-story', type: 'about', heading: 'Made with care' }, { id: 'about-page-values', type: 'values', heading: 'What matters to us' }],
  contact: [{ id: 'contact-page-intro', type: 'contact-intro', heading: 'How can we help?' }, { id: 'contact-page-form', type: 'contact-form', heading: 'Send us a message' }, { id: 'contact-page-details', type: 'store-details', heading: 'Store details' }, { id: 'contact-page-faq', type: 'faq', heading: 'Common questions' }],
  reviews: [{ id: 'reviews-page-summary', type: 'review-summary', heading: 'Customer reviews' }, { id: 'reviews-page-feed', type: 'review-feed', heading: 'Words from our customers' }, { id: 'reviews-page-invite', type: 'review-invite', heading: 'Have you shopped with us?' }],
};

export default function SellerStorefrontPage() {
  const { slug = '', page: pageParam = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPage = (['products', 'categories', 'about', 'contact', 'reviews'].includes(pageParam) ? pageParam : 'home') as 'home' | StorePageKey;
  const storeHomePath = `/shop/store/${encodeURIComponent(slug)}`;
  const storePagePath = (page: 'home' | StorePageKey) => page === 'home' ? storeHomePath : `${storeHomePath}/${page}`;
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState('');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [category, setCategory] = useState('All products');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'name'>('featured');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [liveStoreVersion, setLiveStoreVersion] = useState(0);
  const [publishedConfig, setPublishedConfig] = useState<PublishedStoreConfig | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const storeSearchRef = useRef<HTMLInputElement>(null);
  const { cart: cartItemCount } = useMarketplaceLive();

  useEffect(() => { setQuery(searchParams.get('q') || ''); }, [searchParams]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', updateViewportWidth, { passive: true });
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true); setError(''); setConfigError(''); setStore(null); setPublishedConfig(null);
    fetch(`${API_BASE_URL}/public/seller/${encodeURIComponent(slug)}?limit=100`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as ApiResult;
        if (!response.ok || !body.data) throw new Error(body.message || body.error || 'This store could not be found.');
        return body.data;
      })
      .then(async (data) => {
        if (!current) return;
        setStore(data);
        try {
          const response = await fetch(`${API_BASE_URL}/public/store-config/${encodeURIComponent(data.profile.sellerId)}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
          const body = await response.json().catch(() => ({})) as { success?: boolean; data?: PublishedStoreConfig | null; message?: string; error?: string };
          if (!response.ok || body.success === false) throw new Error(body.message || body.error || 'Could not load the published storefront design.');
          if (!Object.prototype.hasOwnProperty.call(body, 'data')) throw new Error('The storefront design service returned no configuration data.');
          let resolvedConfig = body.data || null;
          if (new URLSearchParams(window.location.search).get('preview') === 'draft') {
            try {
              const draft = localStorage.getItem(`unimartx-builder-draft:${slug}`);
              if (draft) resolvedConfig = JSON.parse(draft) as PublishedStoreConfig;
            } catch { /* Show the published copy if this browser has no readable draft snapshot. */ }
          }
          if (current && resolvedConfig) setPublishedConfig(resolvedConfig);
        } catch (reason) {
          if (current) setConfigError(reason instanceof Error ? reason.message : 'The published storefront design could not be loaded.');
        }
      })
      .catch((reason: Error) => { if (current) setError(reason.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [slug, liveStoreVersion]);

  useEffect(() => {
    const refreshStore = () => setLiveStoreVersion((version) => version + 1);
    const refreshPublishedStore = (event: StorageEvent) => { if (event.key === 'unimartx-store-published' || event.key === `unimartx-builder-draft:${slug}`) refreshStore(); };
    const refreshDraftStore = (event: Event) => {
      const custom = event as CustomEvent<{ slug?: string }>;
      if (!custom.detail?.slug || custom.detail.slug === slug) refreshStore();
    };
    window.addEventListener('unimartx:market-refresh', refreshStore);
    window.addEventListener('unimartx:store-published', refreshStore);
    window.addEventListener('unimartx:store-draft-saved', refreshDraftStore);
    window.addEventListener('storage', refreshPublishedStore);
    return () => {
      window.removeEventListener('unimartx:market-refresh', refreshStore);
      window.removeEventListener('unimartx:store-published', refreshStore);
      window.removeEventListener('unimartx:store-draft-saved', refreshDraftStore);
      window.removeEventListener('storage', refreshPublishedStore);
    };
  }, [slug]);

  const categories = useMemo(() => ['All products', ...new Set((store?.products || []).map((item) => item.category).filter((item): item is string => Boolean(item)))], [store]);
  const products = useMemo(() => (store?.products || []).filter((item) => (category === 'All products' || item.category === category) && item.name.toLowerCase().includes(query.trim().toLowerCase()) && (!availableOnly || Number(item.stock || 0) > 0) && (!minimumPrice || item.price >= Number(minimumPrice)) && (!maximumPrice || item.price <= Number(maximumPrice))).sort((a, b) => sortBy === 'price-low' ? a.price - b.price : sortBy === 'price-high' ? b.price - a.price : sortBy === 'name' ? a.name.localeCompare(b.name) : 0), [availableOnly, category, maximumPrice, minimumPrice, query, sortBy, store]);
  const sections = requestedPage === 'home' ? publishedConfig?.sections ?? fallbackSections : publishedConfig?.pageSections?.[requestedPage] ?? defaultPageSections[requestedPage];
  const pageLayout = storefrontPageLayout(requestedPage, publishedConfig?.pageLayouts);
  const widthSetting = String(publishedConfig?.layout?.storeWidth || 'comfortable');
  const width = widthSetting === 'full' ? '100%' : widthSetting === 'comfortable' ? '1200px' : `${Number(widthSetting) || 1200}px`;
  // The builder's expanded preview is an 820px canvas. Scale saved heading sizes
  // to the live storefront's content width so their visual proportions match.
  const storefrontWidth = Math.min(viewportWidth, width === '100%' ? 1440 : Number.parseFloat(width) || 1200);
  const headingScale = Math.min(1.5, Math.max(0.75, storefrontWidth / 820));
  const font = storefrontFontStack(publishedConfig?.typography?.headingFont, '"DM Sans",sans-serif');
  const bodyFont = storefrontFontStack(publishedConfig?.typography?.bodyFont, '"DM Sans",sans-serif');
  const spacing = publishedConfig?.layout?.sectionSpacing === 'compact' ? '22px' : publishedConfig?.layout?.sectionSpacing === 'spacious' ? '54px' : '38px';
  const pageStyle = {
    '--seller-store-color': publishedConfig?.colors?.primary || '#486648',
    '--seller-store-accent': publishedConfig?.colors?.accent || '#d6a74f',
    '--seller-store-background': publishedConfig?.colors?.background || '#fff',
    '--seller-store-ink': publishedConfig?.colors?.text || '#202720',
    '--seller-store-muted': publishedConfig?.colors?.muted || '#797f77',
    '--seller-product-grid': Math.min(4, Math.max(2, Number(publishedConfig?.layout?.productGrid) || 4)),
    '--seller-store-width': width,
    '--seller-section-spacing': spacing,
    '--seller-heading-font': font,
    '--seller-body-font': bodyFont,
    '--seller-alignment': ['left','center','right'][Number(publishedConfig?.layout?.alignment || 0) % 3] || 'left',
    '--seller-main-x': `${Number(publishedConfig?.layout?.x || 0)}px`,
    '--seller-main-y': `${Number(publishedConfig?.layout?.y || 0)}px`,
    '--seller-main-pad-top': `${Number(publishedConfig?.layout?.paddingTop ?? 24)}px`,
    '--seller-main-pad-right': `${Number(publishedConfig?.layout?.paddingRight ?? 24)}px`,
    '--seller-main-pad-bottom': `${Number(publishedConfig?.layout?.paddingBottom ?? 24)}px`,
    '--seller-main-pad-left': `${Number(publishedConfig?.layout?.paddingLeft ?? 24)}px`,
  } as CSSProperties;

  const sectionStyle = (block: PublishedStoreSection): CSSProperties => ({
    backgroundColor: typeof block.backgroundColor === 'string' ? block.backgroundColor : undefined,
    backgroundImage: typeof block.backgroundImage === 'string' && block.backgroundImage ? `linear-gradient(rgba(0,0,0,${Math.max(0, Math.min(80, Number(block.backgroundImageOverlay ?? 18))) / 100}),rgba(0,0,0,${Math.max(0, Math.min(80, Number(block.backgroundImageOverlay ?? 18))) / 100})),url("${block.backgroundImage}")` : undefined,
    backgroundPosition: `${Number(block.backgroundImagePositionX ?? 50)}% ${Number(block.backgroundImagePositionY ?? 50)}%`,
    backgroundSize: String(block.backgroundImageFit || 'cover') as CSSProperties['backgroundSize'],
    color: typeof block.textColor === 'string' ? block.textColor : undefined,
    textAlign: block.alignment === 'center' || block.alignment === 'right' ? block.alignment : 'left',
    minHeight: block.sectionHeightMode === 'viewport' ? '100vh' : block.sectionHeightMode === 'custom' && Number(block.sectionHeight) > 0 ? `${Number(block.sectionHeight)}px` : !block.sectionHeightMode && Number(block.sectionHeight) > 0 ? `${Number(block.sectionHeight)}px` : undefined,
    padding: Number(block.sectionPadding) >= 0 ? `${Number(block.sectionPadding)}px` : undefined,
    borderRadius: block.type === 'hero' ? `${Math.max(0, Number(block.edgeRadius ?? 0))}px` : undefined,
    border: Number(block.edgeWidth) > 0 ? `${Number(block.edgeWidth)}px solid ${String(block.edgeColor || '#202720')}` : undefined,
    overflow: Number(block.edgeRadius) > 0 ? 'hidden' : undefined,
    '--section-background': String(block.backgroundColor || 'transparent'),
    '--section-text': String(block.textColor || 'inherit'),
    '--section-accent': String(block.accentColor || publishedConfig?.colors?.accent || '#d6a74f'),
    '--section-heading-font': block.headingFont ? storefrontFontStack(block.headingFont, 'var(--seller-heading-font,inherit)') : 'var(--seller-heading-font,inherit)',
    '--section-body-font': block.bodyFont ? storefrontFontStack(block.bodyFont, 'var(--seller-body-font,inherit)') : 'var(--seller-body-font,inherit)',
    '--section-heading-size': Number(block.headingSize) > 0 ? `${Math.round(Number(block.headingSize) * headingScale)}px` : undefined,
    '--section-alignment': String(block.alignment || 'left'),
  } as CSSProperties);

  const sectionHeadingStyle = (block: PublishedStoreSection): CSSProperties => Number(block.headingSize) > 0
    ? { fontSize: `${Math.round(Number(block.headingSize) * headingScale)}px`, lineHeight: block.type === 'hero' ? '.92' : '1.02' }
    : publishedConfig?.templateId
      ? { fontSize: block.type === 'hero' ? '72px' : '48px', lineHeight: block.type === 'hero' ? '.92' : '1.02' }
      : {};

  const canvasSectionStyle = (block: PublishedStoreSection): CSSProperties => ({
    ...sectionStyle(block),
    '--section-heading-size': Number(block.headingSize) > 0 ? `${Math.round(Number(block.headingSize) * headingScale)}px` : undefined,
  } as CSSProperties);

  const renderCanvasSection = (block: PublishedStoreSection) => {
    if (block.visible === false) return null;
    if (block.type === 'hero') {
      const heroImage = String(block.image || '');
      const heroTarget = block.buttonAction === 'custom' ? safeStoreLink(block.buttonLink, storePagePath('products')) : storePagePath(block.buttonAction === 'categories' ? 'categories' : 'products');
      const instrumentHero = publishedConfig?.templateId === 'highlife-sound' && requestedPage === 'home';
      const electronicsHero = publishedConfig?.templateId === 'coastline-tech' && requestedPage === 'home';
      const porcelainHero = publishedConfig?.templateId === 'kente-and-craft' && requestedPage === 'home';
      const foodHero = publishedConfig?.templateId === 'market-day' && requestedPage === 'home';
      const lifestyleHero = publishedConfig?.templateId === 'gold-coast-collective' && requestedPage === 'home';
      const heroFeaturedProduct = store?.products.find((product) => product.id === String(block.featuredProductId || '')) || products[0];
      const heroFlowCards = requestedPage === 'home' ? Object.entries(publishedConfig?.layout?.productCardPositions || {}).filter(([, position]) => position.y <= 28) : [];
      return <div key={block.id} className={`seller-store-canvas-hero${heroFlowCards.length ? ' has-product-flow' : ''}${electronicsHero ? ' is-electronics-hero' : ''}${porcelainHero ? ' is-grand-porcelain' : ''}${foodHero ? ' is-flavo-food' : ''}${lifestyleHero ? ' is-gold-coast-lifestyle' : ''}`} style={{ ...canvasSectionStyle(block), backgroundImage: block.backgroundImage ? sectionStyle(block).backgroundImage : porcelainHero || foodHero || lifestyleHero ? undefined : heroImage ? instrumentHero ? `linear-gradient(90deg,#d9dac2 0 34%,rgb(217 218 194 / 88%) 44%,transparent 68%),url("${heroImage}")` : `${publishedConfig?.templateId === 'accra-edit' && requestedPage === 'home' ? 'linear-gradient(90deg,transparent 0 48%,#fffaf3 48% 100%),' : electronicsHero ? 'linear-gradient(90deg,rgb(8 15 19 / 12%),rgb(8 15 19 / 25%)),' : ''}linear-gradient(90deg,rgb(16 26 23 / ${Number(block.overlayOpacity ?? 45) / 100}),rgb(16 26 23 / ${Number(block.overlayOpacity ?? 45) / 500})),${block.backgroundColor ? `linear-gradient(0deg,color-mix(in srgb,${String(block.backgroundColor)} 38%,transparent),color-mix(in srgb,${String(block.backgroundColor)} 38%,transparent)),` : ''}url("${heroImage}")` : undefined, backgroundPosition: block.backgroundImage ? `${Number(block.backgroundImagePositionX ?? 50)}% ${Number(block.backgroundImagePositionY ?? 50)}%` : instrumentHero ? 'right center' : String(block.imagePosition || 'center'), backgroundSize: block.backgroundImage ? String(block.backgroundImageFit || 'cover') : String(block.imageFit || 'cover') }}>
        {foodHero && <div className="food-template-hero-art"><img src={heroImage} alt="A colorful selection of spices"/><span>{String(block.mediaCaption || block.eyebrow || 'FLAVO · BLENDS FOR EVERY TABLE')}</span></div>}
        {lifestyleHero && <div className="gold-coast-hero-image"><img src={heroImage} alt="A scenic destination at golden hour"/><span>{String(block.locationLabel || `${store?.profile.city || 'CAPE COAST'} · GHANA`)}</span>{heroFeaturedProduct && <Link className="gold-coast-feature-card" to={`/shop/product/${heroFeaturedProduct.id}`}><span><StoreProductImage sources={[heroFeaturedProduct.image, ...(heroFeaturedProduct.images || [])]} alt={heroFeaturedProduct.name}/></span><div><small>{String(block.featureEyebrow || 'CURATED FOR YOU')}</small><b>{heroFeaturedProduct.name}</b><p>{heroFeaturedProduct.category || 'A thoughtful find for your everyday'}</p><i>{String(block.featureLinkText || 'Discover more')} <MarketIcon name="arrow" size={13}/></i></div></Link>}</div>}
        <div><small>{String(block.eyebrow || `${store?.profile.city || 'GHANA'} · INDEPENDENT SHOP`)}</small>{heroFlowCards.map(([productId, position]) => { const product = store?.products.find((entry) => entry.id === productId); if (!product) return null; const cardStyle = publishedConfig?.layout?.productCardStyles?.[productId] || {}; return <Link key={`hero-flow-${productId}`} className={`seller-canvas-floating-product is-hero-flow floats-${position.x < 50 ? 'left' : 'right'}`} to={`/shop/product/${product.id}`} style={{ '--hero-card-offset': `${Math.max(0, (position.y - 4) * 4)}px`, '--product-card-bg': String(cardStyle.background || '#ffffff'), '--product-card-ink': String(cardStyle.text || '#263126'), '--product-card-accent': String(cardStyle.accent || publishedConfig?.colors?.primary || '#55764e'), '--product-card-radius': `${Number(cardStyle.radius ?? 9)}px`, '--product-card-layout': String(cardStyle.layout || 'vertical') } as CSSProperties}><span><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><div><small>{product.category || 'FEATURED'}</small><b>{product.name}</b><strong>{money(product.price)}</strong></div></Link>; })}<h1 style={sectionHeadingStyle(block)}>{String(block.heading || store?.profile.storeName || 'Good things, close to home.')}</h1><p>{String(block.description || store?.profile.storeTagline || 'Thoughtfully chosen pieces for everyday life.')}</p>{(!porcelainHero || foodHero || lifestyleHero) && <a href={heroTarget}>{String(block.buttonText || 'Explore the shop')} <MarketIcon name="arrow" size={15}/></a>}</div>
        {porcelainHero && <div className="grand-porcelain-hero-gallery">{sectionProducts(store?.products || [], block).slice(0, Number(block.heroProductCount) || 5).map((product, index) => <Link className={`grand-porcelain-hero-product is-item-${index + 1}`} to={`/shop/product/${product.id}`} key={product.id}><span><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><small>{product.category || 'TABLEWARE'}</small><b>{product.name}</b></Link>)}{(store?.products || []).length === 0 && <div className="grand-porcelain-hero-note">{String(block.emptyStateText || 'Objects for slow mornings, shared meals, and all the moments in between.')}</div>}</div>}
        {!block.image && <div className="seller-canvas-hero-art"><span>{store?.profile.storeAvatar ? <img src={store.profile.storeAvatar} alt=""/> : (store?.profile.storeName[0] || 'U')}</span><i/><i/><i/></div>}
      </div>;
    }
    if (block.type === 'about') return <div id="store-about" key={block.id} className="seller-store-canvas-feature" style={canvasSectionStyle(block)}><div className="seller-store-canvas-about"><small>{String(block.eyebrow || 'THE STORY')}</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'A little story about our shop.')}</h2><p>{String(block.description || block.body || store?.profile.storeDescription || 'We bring together thoughtful pieces, made with care and chosen to make everyday moments feel special.')}</p><a className="seller-store-about-action" href={safeStoreLink(block.linkUrl, '#store-about')}>{String(block.linkText || 'Our story')} <MarketIcon name="arrow" size={13}/></a></div><div className="seller-store-canvas-image" style={block.image ? { backgroundImage: `url("${String(block.image)}")`, backgroundPosition: String(block.imagePosition || 'center'), backgroundSize: String(block.imageFit || 'cover') as CSSProperties['backgroundSize'] } : {}}><span>{String(block.imageCaption || 'MADE WITH CARE')}</span></div></div>;
    if (['featured-products', 'products', 'catalog'].includes(block.type)) {
      const instrumentShop = publishedConfig?.templateId === 'highlife-sound' && requestedPage === 'home';
      const electronicsShop = publishedConfig?.templateId === 'coastline-tech';
      const sectionProductList = sectionProducts(store?.products || [], block);
      const floatingIds = Object.keys(publishedConfig?.layout?.productCardPositions || {});
      const cardStyles = publishedConfig?.layout?.productCardStyles || {};
      return <section id="store-products" key={block.id} className={`seller-store-canvas-products ${instrumentShop ? 'is-instrument-shop' : ''} ${electronicsShop ? 'is-electronics-products' : ''}`} style={canvasSectionStyle(block)}>{instrumentShop && block.showShopSidebar !== false && <aside className="seller-instrument-shop-sidebar"><h2>{String(block.shopSidebarHeading || 'SHOP')}</h2>{instrumentShopCategories(block).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</aside>}<div><span><small>{String(block.eyebrow || (instrumentShop ? 'TONE FORGE / SELECTED GEAR' : block.type === 'catalog' ? 'THE LATEST AND GREATEST' : 'THE COLLECTION'))}</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Good finds, picked for you.')}</h2></span><a href="#store-products">{String(block.buttonText || 'Shop all')} <MarketIcon name="arrow" size={13}/></a></div><div className="seller-canvas-product-grid" style={{ '--seller-preview-columns': Number(block.productColumns || publishedConfig?.layout?.productGrid || 3) } as CSSProperties}>{sectionProductList.slice(0, Number(block.maxProducts) || 3).filter((product) => !floatingIds.includes(product.id)).map((product) => { const style = cardStyles[product.id] || {}; return <article key={product.id} data-product-card-layout={String(style.layout || 'vertical')} style={{ '--product-card-bg': String(style.background || '#ffffff'), '--product-card-ink': String(style.text || '#263126'), '--product-card-accent': String(style.accent || publishedConfig?.colors?.primary || '#55764e'), '--product-card-radius': `${Number(style.radius ?? 9)}px` } as CSSProperties}><Link className="seller-canvas-product-media" to={`/shop/product/${product.id}`} aria-label={`View ${product.name}`}><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></Link><b><Link to={`/shop/product/${product.id}`}>{product.name}</Link></b>{(block.showPrices ?? publishedConfig?.layout?.showPrices) !== false && <small>{money(product.price)}</small>}<MarketplaceQuickAdd productId={product.id} productName={product.name} stock={product.stock} className="market-product-quick-add"/></article>; })}{sectionProductList.length === 0 && <div className="seller-canvas-empty-products"><MarketIcon name="package" size={22}/><span>{block.productSelectionMode === 'manual' ? 'Choose products for this section' : 'Your products will appear here'}</span></div>}</div></section>;
    }
    if (block.type === 'filters') return <section key={block.id} className="seller-store-canvas-added seller-store-page-filters" style={canvasSectionStyle(block)}><div className="seller-storefront-filters"><div className="market-storefront-categories">{categories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}{item !== 'All products' && <small>{store?.products.filter((product) => product.category === item).length || 0}</small>}</button>)}</div><label className="seller-storefront-search"><MarketIcon name="search" size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products"/></label><label className="seller-price-filter">Price <input aria-label="Minimum price" type="number" min="0" placeholder="Min" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)}/> – <input aria-label="Maximum price" type="number" min="0" placeholder="Max" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)}/></label><select aria-label="Sort products" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select><label className="seller-stock-filter"><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)}/> In stock</label></div><small>{products.length} products</small></section>;
    if (block.type === 'collection-intro' || block.type === 'story-intro' || block.type === 'contact-intro') return <section key={block.id} className={`seller-store-canvas-added seller-store-page-intro is-${block.type}`} style={canvasSectionStyle(block)}><small>{String(block.eyebrow || (block.type === 'contact-intro' ? 'CUSTOMER CARE' : block.type === 'story-intro' ? 'THE STORY' : 'THE COLLECTION'))}</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Welcome to our store')}</h2><p>{String(block.description || '')}</p></section>;
    if (block.type === 'contact-form') return <section key={block.id} className="seller-store-canvas-added seller-store-contact-form" style={canvasSectionStyle(block)}><small>CONTACT OUR STORE</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Send us a message')}</h2><p>{String(block.description || 'Tell us how we can help. We will get back to you as soon as we can.')}</p>{contactSent ? <div className="seller-contact-success" role="status">Your message has been sent to the store. Thank you for getting in touch.</div> : <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; setContactSending(true); setContactError(''); const data = new FormData(form); const message = `Subject: ${String(data.get('subject') || 'Store enquiry')}\n\n${String(data.get('message') || '')}\n\nFrom: ${String(data.get('name') || '')} (${String(data.get('email') || '')})`; try { const response = await fetch(`${API_BASE_URL}/public/seller/${encodeURIComponent(store?.profile.sellerId || '')}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }); const result = await response.json().catch(() => ({})) as { success?: boolean; message?: string; error?: string }; if (!response.ok || result.success === false) throw new Error(result.message || result.error || 'We could not send your message. Please try again.'); setContactSent(true); form.reset(); } catch (reason) { setContactError(reason instanceof Error ? reason.message : 'We could not send your message. Please try again.'); } finally { setContactSending(false); } }}><label>Your name<input name="name" required autoComplete="name"/></label><label>Email address<input name="email" type="email" required autoComplete="email"/></label><label>Subject<input name="subject" required/></label><label>Your message<textarea name="message" rows={4} required/></label>{contactError && <p className="seller-contact-error" role="alert">{contactError}</p>}<button type="submit" disabled={contactSending}>{contactSending ? 'Sending…' : 'Send message'} <MarketIcon name="arrow" size={14}/></button></form>}</section>;
    if (block.type === 'store-details') return <section key={block.id} className="seller-store-canvas-added seller-store-contact-details" style={canvasSectionStyle(block)}><small>STORE DETAILS</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Reach our store')}</h2>{store?.profile.email && <a href={`mailto:${store.profile.email}`}>{store.profile.email} ↗</a>}{store?.profile.phone && <a href={`tel:${store.profile.phone}`}>{store.profile.phone}</a>}<p><MarketIcon name="location" size={15}/> {store?.profile.pickupAddress || [store?.profile.city, store?.profile.country].filter(Boolean).join(', ') || 'Ghana'}</p>{store?.profile.businessHours && <p>{store.profile.businessHours}</p>}<p>We are here to help with products, delivery, and orders.</p></section>;
    if (block.type === 'faq') return <section key={block.id} className="seller-store-canvas-added seller-store-faq" style={canvasSectionStyle(block)}><small>HELPFUL INFORMATION</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Common questions')}</h2>{['How can I ask about a product?','When will I hear back?','Where can I find my order details?'].map((question, index) => <details key={question}><summary>{question}</summary><p>{['Use the contact form and include the product name.','The store will respond using the email address you provide.','Open Orders in your UniMartX account to view order status.'][index]}</p></details>)}</section>;
    if (block.type === 'hours') return <section key={block.id} className="seller-store-canvas-added seller-store-hours" style={canvasSectionStyle(block)}><small>RESPONSE TIMES</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'When you can reach us')}</h2><p>{String(block.description || 'Send us a message any time. We will reply as soon as our store team is available.')}</p></section>;
    if (block.type === 'values') return <section key={block.id} className="seller-store-canvas-added seller-store-values" style={canvasSectionStyle(block)}><small>WHAT GUIDES US</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'What matters to us')}</h2><p>{String(block.description || store?.profile.storeDescription || 'Thoughtful choices, good service, and a little care in every order.')}</p><div><article><b>Thoughtfully chosen</b><span>Products selected with care</span></article><article><b>Close to home</b><span>Independent Ghanaian sellers</span></article><article><b>Here to help</b><span>Support from our store team</span></article></div></section>;
    if (block.type === 'timeline') return <section key={block.id} className="seller-store-canvas-added seller-store-timeline" style={canvasSectionStyle(block)}><small>OUR JOURNEY</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'How we got here')}</h2><p>{String(block.description || 'A few moments that shaped our store.')}</p><ol><li><b>Started with an idea</b><span>A simple idea for a better local shopping experience.</span></li><li><b>Found our community</b><span>Building relationships with shoppers and makers.</span></li><li><b>Growing together</b><span>Finding new ways to bring good things closer to home.</span></li></ol></section>;
    if (block.type === 'review-summary') return <section key={block.id} className="seller-store-canvas-added seller-store-review-summary" style={canvasSectionStyle(block)}><small>FROM OUR COMMUNITY</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Customer reviews')}</h2><div><b>{Number(store?.stats.sellerRating || 0).toFixed(1)} <span aria-label="stars">★</span></b><span>{Number(store?.stats.sellerReviewCount || 0)} store reviews</span><small>Ratings are shared by UniMartX shoppers.</small></div></section>;
    if (block.type === 'review-quotes' || block.type === 'review-feed') return <section key={block.id} className={`seller-store-canvas-added seller-store-review-feed is-${block.type}`} style={canvasSectionStyle(block)}><small>SHOPPER FEEDBACK</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Words from our customers')}</h2>{store?.sellerReviews?.length ? <div className="seller-store-review-list">{store.sellerReviews.slice(0, block.type === 'review-quotes' ? 3 : 10).map((review) => <article key={review.id}><span aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</span><p>{review.comment || 'A shopper shared a rating for this store.'}</p><small>{review.buyer.name} · {new Date(review.createdAt).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}</small></article>)}</div> : <p>Customer reviews will appear here as shoppers share their experience.</p>}</section>;
    if (block.type === 'review-invite') return <section key={block.id} className="seller-store-canvas-added seller-store-review-invite" style={canvasSectionStyle(block)}><small>YOUR EXPERIENCE MATTERS</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Have you shopped with us?')}</h2><p>{String(block.description || 'Share your experience to help other shoppers.')}</p>{reviewSent ? <div className="seller-contact-success" role="status">Thank you. Your store review has been submitted.</div> : localStorage.getItem('unimartxToken') ? <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; setReviewSending(true); setReviewError(''); const data = new FormData(form); try { const response = await fetch(`${API_BASE_URL}/public/seller/${encodeURIComponent(store?.profile.sellerId || '')}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('unimartxToken') || ''}` }, body: JSON.stringify({ rating: Number(data.get('rating')), comment: String(data.get('comment') || '') }) }); const result = await response.json().catch(() => ({})) as { success?: boolean; message?: string; error?: string }; if (!response.ok || result.success === false) throw new Error(result.message || result.error || 'We could not submit your review. Please try again.'); setReviewSent(true); form.reset(); } catch (reason) { setReviewError(reason instanceof Error ? reason.message : 'We could not submit your review. Please try again.'); } finally { setReviewSending(false); } }}><label>Your rating<select name="rating" defaultValue="5"><option value="5">★★★★★ · Loved it</option><option value="4">★★★★ · Very good</option><option value="3">★★★ · Good</option><option value="2">★★ · Could be better</option><option value="1">★ · Needs improvement</option></select></label><label>Your review<textarea name="comment" rows={3} placeholder="Tell other shoppers about your experience"/></label>{reviewError && <p className="seller-contact-error" role="alert">{reviewError}</p>}<button type="submit" disabled={reviewSending}>{reviewSending ? 'Submitting…' : 'Share review'} <MarketIcon name="arrow" size={14}/></button></form> : <Link to="/auth/login">Sign in to leave a review <MarketIcon name="arrow" size={13}/></Link>}</section>;
    if (block.type === 'category-products') return <section key={block.id} className="seller-store-canvas-added seller-store-category-products" style={canvasSectionStyle(block)}><small>GOOD FINDS</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Popular in our collections')}</h2><div className="seller-canvas-category-chips">{categories.slice(1).map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item} <span>{store?.products.filter((product) => product.category === item).length}</span></button>)}</div><div className="seller-canvas-product-grid" style={{ '--seller-preview-columns': 3 } as CSSProperties}>{products.slice(0, 6).map((product) => <article key={product.id}><Link className="seller-canvas-product-media" to={`/shop/product/${product.id}`}><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></Link><b><Link to={`/shop/product/${product.id}`}>{product.name}</Link></b><small>{money(product.price)}</small></article>)}</div></section>;
    if (block.type === 'categories' && publishedConfig?.templateId === 'coastline-tech') { const categoryNames = sectionCategories(block, store?.products || []); return <section id="store-categories" key={block.id} style={canvasSectionStyle(block)} className="seller-store-canvas-added seller-store-category-directory is-electronics-categories"><small>{String(block.eyebrow || 'FIND YOUR NEXT FAVOURITE')}</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Shop By Category')}</h2>{block.description && <p>{String(block.description)}</p>}<div className="electronics-category-grid">{categoryNames.map((name, index) => { const product = store?.products.find((item) => item.category === name); const fallbackName = ['Audio', 'Screens', 'Camera'][index % 3] || 'Audio'; return <Link key={`${name}-${index}`} to={storePagePath('products')} onClick={() => setCategory(name)}><span>{product ? <StoreProductImage sources={[product.image, ...(product.images || []), electronicsCategoryArtwork[fallbackName]]} alt={name}/> : <img src={electronicsCategoryArtwork[name] || electronicsCategoryArtwork[fallbackName]} alt=""/>}</span><b>{name.toUpperCase()}</b></Link>; })}</div></section>; }
    if (block.type === 'categories') { const names = sectionCategories(block, store?.products || []); return <section id="store-categories" key={block.id} style={canvasSectionStyle(block)} className="seller-store-canvas-added seller-store-category-directory"><small>{String(block.eyebrow || 'BROWSE THE SHOP')}</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'Shop by category')}</h2><p>{String(block.description || 'Find something lovely in every collection.')}</p><div className="seller-canvas-category-chips">{names.map((item, index) => <Link key={`${item}-${index}`} to={storePagePath('products')} onClick={() => setCategory(item)}><span>{item}</span><small>{store?.products.filter((product) => product.category === item).length || 0} products ↗</small></Link>)}{!names.length && <span>Your product categories will appear here</span>}</div></section>; }
    if (block.type === 'announcement') return <section key={block.id} style={canvasSectionStyle(block)} className="seller-store-canvas-added seller-canvas-announcement"><small>✳ &nbsp; STORE ANNOUNCEMENT</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'A note from our store')}</h2><p>{String(block.description || block.body || 'Take a look at what is new this week.')}</p>{Boolean(block.linkText) && <a href={safeStoreLink(block.linkUrl, '#store-products')}>{String(block.linkText)} ↗</a>}</section>;
    return <section key={block.id} style={canvasSectionStyle(block)} className="seller-store-canvas-added"><small>{String(block.eyebrow || block.type.replaceAll('-', ' ').toUpperCase())}</small><h2 style={sectionHeadingStyle(block)}>{String(block.heading || 'A little more to discover')}</h2><p>{String(block.description || block.body || 'A new part of your storefront, ready for you to make it yours.')}</p>{block.type === 'image' && block.image && <img src={String(block.image)} alt={String(block.heading || '')} style={{ objectFit: String(block.imageFit || 'cover') as CSSProperties['objectFit'], objectPosition: String(block.imagePosition || 'center') }}/ >}{Boolean(block.linkText) && <a href={safeStoreLink(block.linkUrl, '#store-products')}>{String(block.linkText)} ↗</a>}</section>;
  };

  const canvasStyle = {
    backgroundColor: publishedConfig?.colors?.background || '#ffffff',
    '--seller-store-color': publishedConfig?.colors?.primary || store?.profile.storeColor || '#55764e',
    '--seller-store-accent': publishedConfig?.colors?.accent || '#d6a74f',
    '--seller-store-background': publishedConfig?.colors?.background || '#ffffff',
    '--seller-store-ink': publishedConfig?.colors?.text || '#20291f',
    '--seller-heading-font': font,
    '--seller-body-font': bodyFont,
    '--builder-canvas-x': `${Number(publishedConfig?.layout?.x || 0)}px`,
    '--builder-canvas-y': `${Number(publishedConfig?.layout?.y || 0)}px`,
    '--seller-content-width': width,
    '--seller-content-margin-left': publishedConfig?.layout?.contentAlignment === 'left' ? `${Number(publishedConfig?.layout?.paddingLeft ?? 24)}px` : 'auto',
    '--seller-content-margin-right': publishedConfig?.layout?.contentAlignment === 'right' ? `${Number(publishedConfig?.layout?.paddingRight ?? 24)}px` : 'auto',
    '--seller-content-pad-top': `${Number(publishedConfig?.layout?.paddingTop ?? 24)}px`,
    '--seller-content-pad-right': `${Number(publishedConfig?.layout?.paddingRight ?? 24)}px`,
    '--seller-content-pad-bottom': `${Number(publishedConfig?.layout?.paddingBottom ?? 24)}px`,
    '--seller-content-pad-left': `${Number(publishedConfig?.layout?.paddingLeft ?? 24)}px`,
    '--builder-section-gap': spacing === '22px' ? '14px' : spacing === '54px' ? '42px' : '26px',
    '--builder-align': ['left','center','right'][Number(publishedConfig?.layout?.alignment || 0) % 3] || 'left',
    background: publishedConfig?.colors?.background || '#ffffff',
  } as CSSProperties;
  return <div className={`marketplace market-storefront-page is-${publishedConfig?.template || 'minimal'} is-store-template-${publishedConfig?.templateId || 'default'}`} style={pageStyle}>
    <div className="market-storefront-live-canvas">
      <div className={`seller-store-canvas is-${publishedConfig?.template || 'minimal'} is-store-template-${publishedConfig?.templateId || 'default'} seller-page-layout-${requestedPage} seller-page-style-${pageLayout}`} style={canvasStyle}>
        <div id="store-home" className={`seller-store-canvas-nav is-layout-${publishedConfig?.layout?.navLayout || 'standard'} is-decoration-${publishedConfig?.layout?.navDecoration || 'plain'}`} style={{ position: publishedConfig?.layout?.navSticky === true ? 'sticky' : 'relative', backgroundColor: String(publishedConfig?.layout?.navBackground || '#ffffff'), color: String(publishedConfig?.layout?.navTextColor || '#303832'), '--builder-nav-accent': String(publishedConfig?.layout?.navAccentColor || '#55764e'), '--seller-nav-height': storefrontNavHeight(publishedConfig?.template || 'minimal', publishedConfig?.layout?.navHeight), '--seller-nav-logo-size': `${Number(publishedConfig?.layout?.navLogoSize) || 32}px`, '--seller-nav-link-gap': `${Number(publishedConfig?.layout?.navLinkGap) || 24}px` } as CSSProperties}>
          <div className="seller-store-nav-brand">{publishedConfig?.layout?.navShowLogo !== false && <><Link to={storePagePath('home')} aria-label={`${store?.profile.storeName || 'Store'} home`}><b>{publishedConfig?.layout?.navBrandMode === 'platform' ? 'u' : store?.profile.storeAvatar ? <img src={store.profile.storeAvatar} alt=""/> : (store?.profile.storeName[0] || 'S')}</b></Link>{publishedConfig?.layout?.navBrandMode !== 'platform' && <strong>{store?.profile.storeName || 'Your store'}</strong>}</>}</div>
          {publishedConfig?.layout?.navShowLinks !== false && <nav className="seller-store-nav-links" aria-label="Store navigation"><Link to={storePagePath('home')}>{publishedConfig?.layout?.navHomeLabel || 'Home'}</Link>{(publishedConfig?.pageConnections || []).filter((connection) => connection.from === 'home').map(({ to: page }) => <Link key={page} to={storePagePath(page)}>{page === 'products' ? publishedConfig?.layout?.navShopLabel || 'Shop' : page === 'about' ? publishedConfig?.layout?.navAboutLabel || 'About' : page[0].toUpperCase() + page.slice(1)}</Link>)}</nav>}
          <div className="seller-store-nav-tools">{publishedConfig?.layout?.navShowSearch !== false && <form className="seller-storefront-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate(`${storePagePath('products')}${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`); }}><button className="seller-storefront-search-trigger" type="button" aria-label="Focus store search" title="Search this store" onClick={() => storeSearchRef.current?.focus()}><MarketIcon name="search" size={15}/></button><input ref={storeSearchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this store" aria-label="Search this store"/></form>}{publishedConfig?.layout?.navShowLocation !== false && <DeliveryLocationPicker/>}{publishedConfig?.layout?.navShowActions !== false && <Link className="seller-storefront-cart" to="/shop/cart" aria-label={`Shopping bag${cartItemCount ? `, ${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}` : ''}`} title="Shopping bag"><MarketIcon name="bag" size={15}/>{cartItemCount > 0 && <i className="seller-storefront-cart-badge">{cartItemCount > 99 ? '99+' : cartItemCount}</i>}</Link>}</div>
        </div>
        {configError && <div className="seller-store-config-warning" role="status">The published store design could not be loaded, so this page is showing its default layout. {configError}</div>}
        {loading && <div className="seller-canvas-empty-products">Opening the store…</div>}
        {!loading && error && <section className="seller-store-canvas-added"><h2>This store is unavailable</h2><p>{error}</p><Link to="/shop/stores">Explore local stores ↗</Link></section>}
        {!loading && store && <><div className="seller-store-content">{sections.map(renderCanvasSection)}</div>{requestedPage === 'home' && Object.entries(publishedConfig?.layout?.productCardPositions || {}).filter(([, position]) => position.y > 28).map(([productId, position]) => { const product = store.products.find((entry) => entry.id === productId); if (!product) return null; const cardStyle = publishedConfig?.layout?.productCardStyles?.[productId] || {}; return <Link key={`floating-${product.id}`} className="seller-canvas-floating-product" to={`/shop/product/${product.id}`} style={{ left: `${position.x}%`, top: `${position.y}%`, '--product-card-bg': String(cardStyle.background || '#ffffff'), '--product-card-ink': String(cardStyle.text || '#263126'), '--product-card-accent': String(cardStyle.accent || publishedConfig?.colors?.primary || '#55764e'), '--product-card-radius': `${Number(cardStyle.radius ?? 9)}px`, '--product-card-layout': String(cardStyle.layout || 'vertical') } as CSSProperties}><span><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><div><small>{product.category || 'FEATURED'}</small><b>{product.name}</b><strong>{money(product.price)}</strong></div></Link>; })}{publishedConfig?.layout?.footerVisible !== false && <footer className="seller-store-canvas-footer" style={{ backgroundColor: String(publishedConfig?.layout?.footerBackground || '#f5f6f2'), color: String(publishedConfig?.layout?.footerTextColor || '#596258'), '--builder-footer-accent': String(publishedConfig?.layout?.footerAccentColor || '#55764e') } as CSSProperties}>{publishedConfig?.layout?.footerShowBrand !== false && <b>{publishedConfig?.layout?.navBrandMode === 'platform' ? 'UniMartX' : store.profile.storeName || 'Your store'}</b>}<span>{String(publishedConfig?.layout?.footerMessage || `Made with care in ${store.profile.country || 'Ghana'}`)}</span>{publishedConfig?.layout?.footerLinkText && <a href={safeStoreLink(publishedConfig.layout.footerLinkUrl, '/marketing/contact')}>{String(publishedConfig.layout.footerLinkText)} ↗</a>}{publishedConfig?.layout?.footerShowSellerLink !== false && <small>Sell with UniMartX</small>}</footer>}</>}
      </div>
    </div>
  </div>;
}
