import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketplaceHeader from '../../components/marketplace/MarketplaceHeader';
import MarketIcon from '../../components/marketplace/MarketIcon';
import MarketplaceSidebar from '../../components/marketplace/MarketplaceSidebar';
import { cartRequest, money } from '../../lib/cart';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import type { AuthUser } from '../../lib/auth';
import './marketplace.css';
import './buyer-collection.css';
import '../../components/marketplace/marketplace-sidebar.css';

type SavedProduct = { id: string; name: string; price: number; comparePrice?: number | null; image?: string | null; rating?: number; reviewCount?: number; stock: number; isActive: boolean; seller: { id: string; storeName: string; deliveryFee?: number | null } };
type SavedItem = { id: string; productId: string; createdAt: string; product: SavedProduct };
type OrderItem = { quantity: number; price: number; product: { id: string; name: string; image?: string | null; seller?: { storeName: string } } };
type BuyerOrder = { id: string; orderNumber: string; status: string; totalAmount: number; sellerDeliveryFee: number; fulfillmentType?: string | null; createdAt: string; seller?: { id: string; storeName: string; slug?: string | null; storeAvatar?: string | null; pickupAddress?: string | null }; items: OrderItem[] };
type Props = { page: 'saved' | 'orders' };
const statusFilters = [
  { value: 'all', label: 'All orders' }, { value: 'pending', label: 'Pending' }, { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' }, { value: 'delivered', label: 'Delivered' }, { value: 'cancelled', label: 'Cancelled' },
  { value: 'refund_requested', label: 'Refund requested' }, { value: 'disputed', label: 'Disputed' }, { value: 'refunded', label: 'Refunded' },
];

function readUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('unimartxUser') || 'null') as AuthUser | null; } catch { return null; }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function BuyerCollectionPage({ page }: Props) {
  const { orders: openOrderCount, saved: savedCount, refresh: refreshLive } = useMarketplaceLive();
  const navigate = useNavigate();
  const isSaved = page === 'saved';
  const [user] = useState<AuthUser | null>(readUser);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [liveDataVersion, setLiveDataVersion] = useState(0);

  useEffect(() => {
    const handleLiveUpdate = () => setLiveDataVersion((version) => version + 1);
    window.addEventListener('unimartx:market-refresh', handleLiveUpdate);
    return () => window.removeEventListener('unimartx:market-refresh', handleLiveUpdate);
  }, []);

  useEffect(() => {
    let active = true;
    if (user?.role !== 'buyer') { setLoading(false); return () => { active = false; }; }
    setLoading(true); setError('');
    const load = isSaved
      ? cartRequest<SavedItem[]>('/wishlist').then((data) => { if (active) setSavedItems(data); })
      : cartRequest<{ orders: BuyerOrder[] }>('/buyer/orders?limit=100').then((data) => { if (active) setOrders(data.orders || []); });
    load.catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : `Could not load your ${isSaved ? 'saved finds' : 'orders'}.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?.role, isSaved, liveDataVersion]);

  const filteredOrders = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.status === filter), [filter, orders]);

  async function removeSaved(item: SavedItem) {
    setBusyId(item.productId); setError('');
    try {
      await cartRequest('/wishlist/toggle', { method: 'POST', body: JSON.stringify({ productId: item.productId }) });
      setSavedItems((current) => current.filter((entry) => entry.productId !== item.productId));
      refreshLive();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove this saved find.'); }
    finally { setBusyId(''); }
  }

  async function addToBag(product: SavedProduct) {
    if (product.stock < 1 || !product.isActive) return;
    setBusyId(product.id); setError('');
    try {
      await cartRequest('/cart/add', { method: 'POST', body: JSON.stringify({ productId: product.id, quantity: 1 }) });
      refreshLive();
      navigate('/shop/cart');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add this find to your bag.'); }
    finally { setBusyId(''); }
  }

  return <div className="marketplace buyer-collection-page"><MarketplaceHeader/><div className="buyer-collection-layout">
    <MarketplaceSidebar heading="YOUR MARKET" sections={[
      { items: [{ label: 'Discover', icon: <MarketIcon name="compass"/>, to: '/shop' }, { label: 'Local stores', icon: <MarketIcon name="shop"/>, to: '/shop/stores' }] },
      { label: 'YOUR ACCOUNT', items: [
        { label: 'Account', icon: <MarketIcon name="user"/>, avatar: user?.avatar, to: '/shop/account' },
        { label: 'Orders', icon: <MarketIcon name="package"/>, to: '/shop/orders', active: !isSaved, badge: openOrderCount },
        { label: 'Saved finds', icon: <MarketIcon name="heart"/>, to: '/shop/saved', active: isSaved, badge: savedCount },
        { label: 'Settings', icon: <MarketIcon name="settings"/>, to: '/shop/settings' },
      ] },
    ]} note={{ icon: <MarketIcon name={isSaved ? 'heart' : 'package'}/>, title: isSaved ? 'Keep the good ones close.' : 'Every shop, one place.', description: isSaved ? 'Your saved finds will be waiting when you are ready.' : 'Each store order has its own fulfillment details and progress.' }}/> 
    <main className="buyer-collection-main">
      {user?.role !== 'buyer' ? <section className="buyer-collection-gate"><span className="buyer-collection-hero-icon"><MarketIcon name={isSaved ? 'heart' : 'package'} size={28}/></span><div className="market-overline">YOUR UNIMARTX ACCOUNT</div><h1>Sign in to see your {isSaved ? 'saved finds' : 'orders'}.</h1><p>Keep your marketplace activity together in one place.</p><button className="buyer-collection-primary" onClick={() => navigate('/auth/login', { state: { from: isSaved ? '/shop/saved' : '/shop/orders' } })}>Sign in to continue <MarketIcon name="arrow"/></button></section> : <>
        <header className="buyer-collection-heading"><div className="buyer-collection-heading-mark"><MarketIcon name={isSaved ? 'heart' : 'package'} size={21}/></div><div><div className="market-overline">YOUR UNIMARTX · {isSaved ? 'WISHLIST' : 'PURCHASE HISTORY'}</div><h1>{isSaved ? 'Saved finds' : 'Your orders'}<span>.</span></h1><p>{isSaved ? 'A little collection of things you love.' : 'Follow every store order from placed to delivered.'}</p></div><Link to="/shop" className="buyer-collection-browse">Keep exploring <MarketIcon name="arrow" size={15}/></Link></header>
        <nav className="buyer-collection-tabs" aria-label="Buyer account pages"><Link to="/shop/account"><MarketIcon name="user"/>Profile</Link><Link to="/shop/orders" className={!isSaved ? 'is-active' : ''}><MarketIcon name="package"/>Orders</Link><Link to="/shop/saved" className={isSaved ? 'is-active' : ''}><MarketIcon name="heart"/>Saved finds</Link><Link to="/shop/settings"><MarketIcon name="settings"/>Settings</Link></nav>
        {error && <div className="buyer-collection-error" role="alert">{error}<button onClick={() => window.location.reload()}>Try again</button></div>}
        {loading ? <div className="buyer-collection-loading"><span/><p>Gathering your {isSaved ? 'saved finds' : 'orders'}…</p></div> : isSaved ? savedItems.length ? <>
          <div className="buyer-collection-results"><span>{savedItems.length} {savedItems.length === 1 ? 'find' : 'finds'} saved</span><span>Made by local stores</span></div><div className="buyer-saved-grid">{savedItems.map(({ product, productId }, index) => { const available = product.isActive && product.stock > 0; return <article className="buyer-saved-card" key={productId} style={{ animationDelay: `${Math.min(index * 55, 330)}ms` }}><Link className="buyer-saved-image" to={`/shop/product/${encodeURIComponent(product.id)}`}>{product.image ? <img src={product.image} alt={product.name}/> : <span><MarketIcon name="package" size={35}/></span>}<i>{available ? 'A GOOD FIND' : 'SOLD OUT'}</i></Link><button className="buyer-saved-remove" aria-label={`Remove ${product.name} from saved finds`} disabled={busyId === product.id} onClick={() => void removeSaved(savedItems[index])}><MarketIcon name="heart" size={17}/></button><div className="buyer-saved-info"><span>{product.seller?.storeName || 'Community store'}</span><Link to={`/shop/product/${encodeURIComponent(product.id)}`}>{product.name}</Link><div><strong>{money(Number(product.price))}</strong>{product.comparePrice && <del>{money(Number(product.comparePrice))}</del>}</div><button className="buyer-collection-primary" disabled={!available || busyId === product.id} onClick={() => void addToBag(product)}>{!available ? 'Currently unavailable' : busyId === product.id ? 'Adding…' : 'Add to bag'} <MarketIcon name="bag" size={16}/></button></div></article>; })}</div>
        </> : <section className="buyer-collection-empty"><span className="buyer-collection-hero-icon"><MarketIcon name="heart" size={29}/></span><div className="market-overline">NOTHING SAVED JUST YET</div><h2>Your next favourite is out there.</h2><p>Tap the heart on anything you love and it’ll be saved here for later.</p><Link to="/shop" className="buyer-collection-primary">Explore the marketplace <MarketIcon name="arrow"/></Link></section> : <>
          <div className="buyer-order-filters" aria-label="Filter orders">{statusFilters.map((option) => <button key={option.value} className={filter === option.value ? 'is-active' : ''} onClick={() => setFilter(option.value)}>{option.label}{option.value === 'all' && <i>{orders.length}</i>}</button>)}</div>
          {filteredOrders.length ? <div className="buyer-order-list">{filteredOrders.map((order, index) => { const status = order.status.replaceAll('_', ' '); const isPickup = !order.fulfillmentType || order.fulfillmentType === 'pickup'; return <article className="buyer-order-card" key={order.id} style={{ animationDelay: `${Math.min(index * 65, 390)}ms` }}><header className="buyer-order-heading"><span className="buyer-order-store-avatar">{order.seller?.storeAvatar ? <img src={order.seller.storeAvatar} alt=""/> : <MarketIcon name="shop"/>}</span><span className="buyer-order-store"><small>STORE ORDER</small><b>{order.seller?.storeName || order.items[0]?.product?.seller?.storeName || 'Community store'}</b></span><span className={`buyer-order-status is-${order.status}`}>{status}</span></header><div className="buyer-order-meta"><span>Order <b>{order.orderNumber}</b></span><i/><span>Placed {formatDate(order.createdAt)}</span><span className="buyer-order-total">{money(Number(order.totalAmount))}</span></div><div className="buyer-order-items">{order.items.map((item, itemIndex) => <Link className="buyer-order-item" key={`${order.id}-${itemIndex}`} to={`/shop/product/${encodeURIComponent(item.product.id)}`}><span>{item.product.image ? <img src={item.product.image} alt=""/> : <MarketIcon name="package" size={19}/>}</span><b>{item.product.name}</b><small>Qty {item.quantity}</small><strong>{money(Number(item.price) * item.quantity)}</strong></Link>)}</div><footer className="buyer-order-footer"><span><MarketIcon name={isPickup ? 'shop' : 'truck'} size={16}/><b>{isPickup ? 'Pickup' : 'Delivery'}</b><small>{isPickup ? order.seller?.pickupAddress || 'Coordinate pickup with the store' : 'To your saved delivery address'}</small></span><span>Store total <b>{money(Number(order.totalAmount))}</b></span><Link to={`/shop/orders/${encodeURIComponent(order.id)}`}>Order details <MarketIcon name="arrow" size={14}/></Link>{order.seller?.slug && <Link to={`/shop/store/${encodeURIComponent(order.seller.slug)}`}>Visit store <MarketIcon name="arrow" size={14}/></Link>}</footer></article>; })}</div> : <section className="buyer-collection-empty buyer-order-empty"><span className="buyer-collection-hero-icon"><MarketIcon name="package" size={29}/></span><div className="market-overline">{filter === 'all' ? 'NO ORDERS YET' : `NO ${filter.toUpperCase()} ORDERS`}</div><h2>{filter === 'all' ? 'Your next great find starts here.' : 'Nothing in this part of the journey.'}</h2><p>{filter === 'all' ? 'When you order from a store, its progress will show up here.' : 'Try another order status to see what’s happening.'}</p>{filter === 'all' && <Link to="/shop" className="buyer-collection-primary">Explore the marketplace <MarketIcon name="arrow"/></Link>}</section>}
        </>}
      </>}
      <footer className="market-footer"><Link className="market-logo" to="/shop"><span className="market-logo-mark">u</span><span>unimart<span>x</span></span></Link><span>Good things, close to home.</span><Link to="/marketing/contact">Need a hand? <MarketIcon name="arrow" size={15}/></Link></footer>
    </main>
  </div></div>;
}
