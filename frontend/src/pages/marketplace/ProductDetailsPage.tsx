import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../lib/auth';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import DeliveryLocationPicker from '../../components/marketplace/DeliveryLocationPicker';
import MarketplaceAccountNav from '../../components/marketplace/MarketplaceAccountNav';
import './marketplace.css';
import './product-details.css';

type Review = { id: string; rating: number; comment: string; createdAt: string; user: { name: string; initials: string; avatar?: string | null } };
type Seller = { id: string; slug?: string | null; storeName: string; storeDescription?: string | null; storeAvatar?: string | null; city?: string | null; country?: string | null; verified?: boolean; productCount?: number; avgRating?: number; totalReviews?: number };
type RelatedProduct = { id: string; name: string; price: number; image?: string | null; rating?: number; reviewCount?: number; storeName?: string; category?: string };
type Product = {
  id: string; name: string; description?: string; price: number; comparePrice?: number | null; images: string[];
  category?: string; subcategory?: string | null; condition?: string | null; tags?: string[]; stock: number;
  rating?: number; reviewCount?: number; unitsSold?: number; deliveryFee?: number | null; details?: unknown;
  seller: Seller; reviews: Review[]; ratingBreakdown: Record<number, number>; related: RelatedProduct[];
};
type ApiResult<T> = { success?: boolean; data?: T; message?: string; error?: string };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    heart: <path d="M20.8 8.8c0 5.3-8.8 10-8.8 10s-8.8-4.7-8.8-10A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z"/>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    check: <><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></>,
    truck: <><path d="M3 6h11v12H3zM14 10h4l3 3v5h-7"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function money(value: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(value);
}

async function getProduct(id: string) {
  const response = await fetch(`${API_BASE_URL}/public/products/${encodeURIComponent(id)}`);
  const body = await response.json().catch(() => ({})) as ApiResult<Product>;
  if (!response.ok || !body.data) throw new Error(body.message || body.error || 'This product could not be found.');
  return body.data;
}

export default function ProductDetailsPage() {
  const { refresh: refreshLive } = useMarketplaceLive();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [sellerTemplateId, setSellerTemplateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [deliveryArea, setDeliveryArea] = useState(() => {
    try { return localStorage.getItem('unimartxDeliveryLocation') || 'Accra, Ghana'; } catch { return 'Accra, Ghana'; }
  });
  const [liveProductVersion, setLiveProductVersion] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true); setError(''); setProduct(null); setSelectedImage(0); setQuantity(1);
    getProduct(id).then((item) => { if (current) setProduct(item); }).catch((reason: Error) => { if (current) setError(reason.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id, liveProductVersion]);

  useEffect(() => {
    const refreshProduct = () => setLiveProductVersion((version) => version + 1);
    window.addEventListener('unimartx:market-refresh', refreshProduct);
    return () => window.removeEventListener('unimartx:market-refresh', refreshProduct);
  }, []);

  useEffect(() => {
    if (!product) return;
    let current = true;
    setSellerTemplateId('');
    fetch(`${API_BASE_URL}/public/store-config/${encodeURIComponent(product.seller.id)}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then((response) => response.ok ? response.json() : null)
      .then((body: { data?: { templateId?: string } | null } | null) => { if (current) setSellerTemplateId(body?.data?.templateId || ''); })
      .catch(() => { if (current) setSellerTemplateId(''); });
    return () => { current = false; };
  }, [product]);

  useEffect(() => {
    if (!product) return;
    let active = true;
    try {
      const ids = JSON.parse(localStorage.getItem('unimartxWishlistIds') || '[]') as string[];
      setSaved(ids.includes(product.id));
      const account = JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string } | null;
      const token = localStorage.getItem('unimartxToken');
      if (account?.role === 'buyer' && token) fetch(`${API_BASE_URL}/wishlist/ids`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((body: { data?: string[] } | null) => { if (active && body?.data) { setSaved(body.data.includes(product.id)); localStorage.setItem('unimartxWishlistIds', JSON.stringify(body.data)); } }).catch(() => undefined);
    } catch { setSaved(false); }
    return () => { active = false; };
  }, [product]);

  useEffect(() => {
    function updateDeliveryArea(event: Event) {
      const detail = (event as CustomEvent<{ location?: string }>).detail;
      if (detail?.location) setDeliveryArea(detail.location);
    }
    window.addEventListener('unimartx:delivery-location-change', updateDeliveryArea);
    return () => window.removeEventListener('unimartx:delivery-location-change', updateDeliveryArea);
  }, []);

  const savings = useMemo(() => product?.comparePrice && product.comparePrice > product.price ? product.comparePrice - product.price : 0, [product]);

  async function toggleSaved() {
    if (!product) return;
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem('unimartxWishlistIds') || '[]'); } catch { ids = []; }
    try {
      const account = JSON.parse(localStorage.getItem('unimartxUser') || 'null') as { role?: string } | null;
      const token = localStorage.getItem('unimartxToken');
      if (account?.role === 'buyer' && token) {
        const response = await fetch(`${API_BASE_URL}/wishlist/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: product.id }) });
        const body = await response.json().catch(() => ({})) as { success?: boolean; saved?: boolean; message?: string };
        if (!response.ok || body.success === false) throw new Error(body.message || 'Could not update your saved finds.');
        const next = body.saved ? [...new Set([...ids, product.id])] : ids.filter((item) => item !== product.id);
        localStorage.setItem('unimartxWishlistIds', JSON.stringify(next)); setSaved(!!body.saved); refreshLive(); setNotice(body.saved ? 'Saved for later.' : 'Removed from your saved finds.'); return;
      }
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Could not update your saved finds.'); return; }
    const next = saved ? ids.filter((item) => item !== product.id) : [...new Set([...ids, product.id])];
    localStorage.setItem('unimartxWishlistIds', JSON.stringify(next));
    setSaved(!saved);
    refreshLive();
    setNotice(saved ? 'Removed from your saved finds.' : 'Saved for later.');
  }

  async function addToBag() {
    if (!product) return;
    const token = localStorage.getItem('unimartxToken');
    if (!token) {
      navigate('/auth/login', { state: { from: `/shop/product/${product.id}` } });
      return;
    }
    setAdding(true); setNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: product.id, quantity }) });
      const body = await response.json().catch(() => ({})) as ApiResult<unknown>;
      if (!response.ok || body.success === false) throw new Error(body.message || body.error || 'Could not add this item to your bag.');
      refreshLive();
      setNotice('Added to your bag.');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not add this item to your bag.');
    } finally { setAdding(false); }
  }

  if (loading) return <div className="marketplace"><div className="market-detail-state"><span className="market-detail-loader"/><p>Finding the details…</p></div></div>;
  if (error || !product) return <div className="marketplace"><div className="market-detail-state"><span className="market-detail-state-icon">⌕</span><h1>We couldn’t find that good thing.</h1><p>{error || 'This product may have been moved or is no longer available.'}</p><Link to="/shop" className="market-detail-back">Back to the marketplace <Icon name="arrow" size={16}/></Link></div></div>;

  const images = product.images?.length ? product.images : [];
  const image = images[selectedImage];
  const inStock = product.stock > 0;
  const location = [product.seller.city, product.seller.country || 'Ghana'].filter(Boolean).join(', ');

  return <div className={`marketplace market-product-detail-page${sellerTemplateId ? ` is-store-template-${sellerTemplateId}` : ''}`}>
    <header className="market-topbar">
      <Link className="market-logo" to="/shop" aria-label="UniMartX home"><span className="market-logo-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 17h28l-2.5 25h-23L10 17Z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/></svg></span><span>unimart<span>x</span></span></Link>
      <form className="market-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate('/shop'); }}><button className="market-search-submit" type="submit" aria-label="Search marketplace"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button><input aria-label="Search marketplace" placeholder="Search products and stores"/></form>
      <DeliveryLocationPicker /><MarketplaceAccountNav />
    </header>
    <main className="market-detail-main">
      <nav className="market-detail-breadcrumb" aria-label="Breadcrumb"><Link to="/shop">Marketplace</Link><span>/</span><Link to={`/shop/store/${encodeURIComponent(product.seller.slug || product.seller.id)}`}>{product.seller.storeName}</Link><span>/</span><span>{product.name}</span></nav>
      <section className="market-detail-layout">
        <div className="market-detail-gallery">
          <div className="market-detail-main-image">{image ? <img src={image} alt={product.name}/> : <div className="market-detail-no-image">✳<span>Product image coming soon</span></div>}<button className={`market-detail-save ${saved ? 'is-saved' : ''}`} onClick={toggleSaved} aria-label={saved ? 'Remove from saved items' : 'Save item'}><Icon name="heart" size={20}/></button>{savings > 0 && <span className="market-detail-sale">SAVE {money(savings)}</span>}</div>
          {images.length > 1 && <div className="market-detail-thumbnails" aria-label="Product images">{images.map((src, index) => <button key={`${src}-${index}`} className={selectedImage === index ? 'is-selected' : ''} onClick={() => setSelectedImage(index)} aria-label={`Show product image ${index + 1}`}><img src={src} alt=""/></button>)}</div>}
        </div>
        <div className="market-detail-info">
          <div className="market-detail-eyebrow">{product.category || 'COMMUNITY FIND'}{product.subcategory && <><span>·</span>{product.subcategory}</>}</div>
          <h1>{product.name}</h1>
          <div className="market-detail-rating"><span className="market-detail-stars" aria-label={`${product.rating || 0} out of 5 stars`}>★★★★★</span><b>{Number(product.rating || 0).toFixed(1)}</b><a href="#market-reviews" onClick={() => setActiveTab('reviews')}>{product.reviewCount || 0} reviews</a>{product.unitsSold ? <span>· {product.unitsSold} sold</span> : null}</div>
          <div className="market-detail-prices"><strong>{money(product.price)}</strong>{product.comparePrice && product.comparePrice > product.price && <del>{money(product.comparePrice)}</del>}{product.condition && <span>{product.condition}</span>}</div>
          {product.description && <p className="market-detail-summary">{product.description}</p>}
          <div className={`market-detail-stock ${inStock ? '' : 'is-out'}`}><i/>{inStock ? `${product.stock} available` : 'Currently out of stock'}</div>
          <div className="market-detail-purchase"><div className="market-detail-quantity"><button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Icon name="minus" size={16}/></button><span>{quantity}</span><button aria-label="Increase quantity" disabled={quantity >= product.stock} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Icon name="plus" size={16}/></button></div><button className="market-detail-add" onClick={addToBag} disabled={!inStock || adding}><Icon name="bag" size={18}/>{adding ? 'Adding…' : inStock ? 'Add to bag' : 'Out of stock'}</button></div>
          {notice && <div className="market-detail-notice" role="status">{notice}</div>}
          <div className="market-detail-perks"><div><Icon name="truck" size={18}/><span><b>Delivering to {deliveryArea}</b><small>{product.deliveryFee != null ? `Delivery fee ${money(product.deliveryFee)}` : 'Delivery options confirmed at checkout'}{location ? ` · Seller in ${location}` : ''}</small></span></div><div><Icon name="check" size={18}/><span><b>Shop local, shop direct</b><small>Supporting independent Ghanaian sellers</small></span></div></div>
          <Link className="market-detail-seller" to={`/shop/store/${encodeURIComponent(product.seller.slug || product.seller.id)}`}><span className="market-detail-seller-avatar">{product.seller.storeAvatar ? <img src={product.seller.storeAvatar} alt=""/> : product.seller.storeName.slice(0, 1)}</span><span className="market-detail-seller-copy"><small>SOLD BY</small><b>{product.seller.storeName}{product.seller.verified && <i><Icon name="check" size={12}/></i>}</b><span>{location} · {product.seller.productCount || 0} products</span></span><span className="market-detail-seller-arrow"><Icon name="arrow" size={17}/></span></Link>
        </div>
      </section>

      <section className="market-detail-lower">
        <div className="market-detail-tabs" role="tablist"><button className={activeTab === 'description' ? 'is-active' : ''} role="tab" aria-selected={activeTab === 'description'} onClick={() => setActiveTab('description')}>Details</button><button id="market-reviews" className={activeTab === 'reviews' ? 'is-active' : ''} role="tab" aria-selected={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>Reviews <span>({product.reviewCount || 0})</span></button></div>
        {activeTab === 'description' ? <div className="market-detail-description"><div><div className="market-detail-eyebrow">A LITTLE MORE ABOUT IT</div><h2>Good things have a story.</h2></div><div><p>{product.description || 'A thoughtful find from one of our independent sellers. Reach out to the shop for more details about this item.'}</p>{product.tags?.length ? <div className="market-detail-tags">{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}</div></div> : <div className="market-detail-reviews">{product.reviews.length ? product.reviews.map((review) => <article className="market-detail-review" key={review.id}><div className="market-review-avatar">{review.user.avatar ? <img src={review.user.avatar} alt=""/> : review.user.initials}</div><div><div className="market-review-heading"><b>{review.user.name || 'UniMartX buyer'}</b><span>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</span><time>{new Date(review.createdAt).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' })}</time></div><p>{review.comment || 'A lovely find.'}</p></div></article>) : <div className="market-detail-no-reviews"><span>★★★★★</span><b>No reviews yet</b><p>Be the first to share what you think about this find.</p></div>}</div>}
      </section>

      {product.related?.length > 0 && <section className="market-detail-related"><div className="market-overline">MORE GOOD FINDS</div><h2>You might like these<span>.</span></h2><div className="market-product-grid">{product.related.map((related) => <Link className="market-product-card" key={related.id} to={`/shop/product/${related.id}`}><div className="market-product-image">{related.image ? <img src={related.image} alt={related.name} loading="lazy"/> : <span className="market-image-placeholder">✳</span>}</div><div className="market-product-info"><div className="market-product-category">{related.category || 'GOODS & FINDS'}</div><span className="market-product-name">{related.name}</span><div className="market-product-store">from <b>{related.storeName || 'Independent seller'}</b></div><div className="market-product-bottom"><strong>{money(related.price)}</strong>{(related.rating || 0) > 0 && <span>★ {Number(related.rating).toFixed(1)} <small>({related.reviewCount || 0})</small></span>}</div></div></Link>)}</div></section>}
      <footer className="market-footer"><Link className="market-logo" to="/shop"><span className="market-logo-mark">u</span><span>unimart<span>x</span></span></Link><span>Good things, close to home.</span><Link to="/auth/seller/register">Become a seller ↗</Link></footer>
    </main>
  </div>;
}
