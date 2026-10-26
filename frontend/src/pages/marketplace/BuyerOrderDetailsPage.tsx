import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MarketplaceHeader from '../../components/marketplace/MarketplaceHeader';
import MarketIcon from '../../components/marketplace/MarketIcon';
import { cartRequest, money } from '../../lib/cart';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import type { AuthUser } from '../../lib/auth';
import './marketplace.css';
import './buyer-order-details.css';

type OrderItem = { quantity: number; price: number; product: { id?: string; name: string; image?: string | null } };
type OrderDetails = {
  id: string; orderNumber: string; status: string; totalAmount: number; sellerDeliveryFee?: number | null;
  fulfillmentType?: string | null; createdAt: string; notes?: string | null; paymentMethod?: string | null;
  seller?: { storeName: string; slug?: string | null; storeAvatar?: string | null; pickupAddress?: string | null; user?: { firstName?: string; lastName?: string; email?: string; phone?: string | null } };
  address?: { street: string; city: string; state: string; country: string; notes?: string | null } | null;
  items: OrderItem[];
};

function readUser(): AuthUser | null { try { return JSON.parse(localStorage.getItem('unimartxUser') || 'null') as AuthUser | null; } catch { return null; } }
function date(value: string) { return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)); }
const stages = ['Order confirmed', 'Preparing', 'On the way', 'Delivered'];

export default function BuyerOrderDetailsPage() {
  const { id = '' } = useParams();
  const { refresh: refreshLive } = useMarketplaceLive();
  const [user] = useState<AuthUser | null>(readUser);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveVersion, setLiveVersion] = useState(0);

  useEffect(() => {
    if (user?.role !== 'buyer') { setLoading(false); return; }
    let active = true;
    setLoading(true); setError('');
    cartRequest<OrderDetails>(`/buyer/orders/${encodeURIComponent(id)}`)
      .then((data) => { if (active) setOrder(data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load this store order.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user?.role, liveVersion]);

  useEffect(() => {
    const refreshOrder = () => { setLiveVersion((version) => version + 1); refreshLive(); };
    window.addEventListener('unimartx:market-refresh', refreshOrder);
    return () => window.removeEventListener('unimartx:market-refresh', refreshOrder);
  }, [refreshLive]);

  const subtotal = useMemo(() => (order?.items || []).reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [order]);
  const status = order?.status || 'pending';
  const isPickup = !order?.fulfillmentType || order.fulfillmentType === 'pickup';
  const currentStage = status === 'pending' ? 0 : status === 'processing' ? 1 : status === 'shipped' ? 2 : status === 'delivered' ? 3 : -1;

  return <div className="marketplace buyer-order-details-page"><MarketplaceHeader/><main className="buyer-order-details-main">
    <nav className="buyer-order-breadcrumb" aria-label="Breadcrumb"><Link to="/shop">Marketplace</Link><span>›</span><Link to="/shop/account">Your account</Link><span>›</span><Link to="/shop/orders">Orders</Link><span>›</span><b>{order ? order.orderNumber : 'Order details'}</b></nav>
    {user?.role !== 'buyer' ? <section className="buyer-order-details-state"><span><MarketIcon name="lock" size={27}/></span><h1>Sign in to view this order.</h1><p>Your store orders and delivery progress are kept in your account.</p><Link to="/auth/login" state={{ from: `/shop/orders/${id}` }} className="buyer-order-action">Sign in <MarketIcon name="arrow" size={16}/></Link></section>
      : loading ? <section className="buyer-order-details-state"><span className="buyer-order-details-loader"/><h1>Gathering your order details…</h1></section>
      : error || !order ? <section className="buyer-order-details-state"><span><MarketIcon name="package" size={27}/></span><h1>We couldn’t find this order.</h1><p>{error || 'This order may have been removed or is unavailable to this account.'}</p><Link to="/shop/orders" className="buyer-order-action">Back to orders <MarketIcon name="arrow" size={16}/></Link></section>
      : <>
        <header className="buyer-order-details-heading"><div><div className="market-overline">YOUR UNIMARTX · STORE ORDER</div><h1>Order details<span>.</span></h1><p>Placed {date(order.createdAt)} · {order.seller?.storeName || 'Community store'}</p></div><Link to="/shop/orders" className="buyer-order-back"><MarketIcon name="arrow" size={16}/> All orders</Link></header>
        <section className="buyer-order-summary"><div><small>ORDER ID</small><b>{order.orderNumber}</b><span>{order.items.reduce((count, item) => count + item.quantity, 0)} {order.items.reduce((count, item) => count + item.quantity, 0) === 1 ? 'item' : 'items'}</span></div><i/><div><small>STORE TOTAL</small><b>{money(Number(order.totalAmount))}</b><span className={`buyer-order-detail-status is-${status}`}>{status.replaceAll('_', ' ')}</span></div><i/><div><small>ORDER DATE</small><b>{date(order.createdAt)}</b><span>{isPickup ? 'Store pickup' : 'Delivery'}</span></div></section>
        <div className="buyer-order-details-grid"><section className="buyer-order-detail-main"><div className="buyer-order-section-title"><div><small>ORDER PROGRESS</small><h2>Items ordered &amp; delivery</h2></div><span className={`buyer-order-detail-status is-${status}`}>{status.replaceAll('_', ' ')}</span></div>
          {currentStage >= 0 ? <div className="buyer-order-timeline">{stages.map((label, index) => <div key={label} className={`buyer-order-timeline-step ${index <= currentStage ? 'is-complete' : ''} ${index === currentStage ? 'is-current' : ''}`}><span>{index < currentStage ? <MarketIcon name="check" size={15}/> : index + 1}</span><b>{label}</b>{index === 0 && <small>{date(order.createdAt)}</small>}{index === 3 && status === 'delivered' && <small>Completed</small>}</div>)}</div> : <div className="buyer-order-status-note"><MarketIcon name="package" size={18}/><span>This order is {status.replaceAll('_', ' ')}. Contact the store if you need help.</span></div>}
          <div className="buyer-order-detail-items">{order.items.map((item, index) => <article className="buyer-order-detail-item" key={`${order.id}-${index}`}><span className="buyer-order-detail-image">{item.product.image ? <img src={item.product.image} alt={item.product.name}/> : <MarketIcon name="package" size={25}/>}</span><div className="buyer-order-detail-product"><b>{item.product.name}</b><small>Qty: {item.quantity}</small><strong>{money(Number(item.price))} <small>each</small></strong></div><span className={`buyer-order-item-state is-${status}`}>{status.replaceAll('_', ' ')}</span></article>)}</div>
          {order.notes && <div className="buyer-order-note"><b>Note for the store</b><p>{order.notes}</p></div>}
          <div className="buyer-order-store-contact"><span className="buyer-order-detail-store-avatar">{order.seller?.storeAvatar ? <img src={order.seller.storeAvatar} alt=""/> : <MarketIcon name="shop"/>}</span><span><small>FULFILLED BY</small><b>{order.seller?.storeName || 'Community store'}</b></span>{order.seller?.user?.email && <a href={`mailto:${order.seller.user.email}`}><MarketIcon name="mail" size={15}/> Contact store</a>}{order.seller?.slug && <Link to={`/shop/store/${encodeURIComponent(order.seller.slug)}`}>Visit store <MarketIcon name="arrow" size={14}/></Link>}</div>
        </section>
        <aside className="buyer-order-detail-aside"><section className="buyer-order-detail-panel"><div className="buyer-order-panel-heading"><span><MarketIcon name={isPickup ? 'shop' : 'location'} size={17}/></span><h2>{isPickup ? 'Pickup details' : 'Delivery address'}</h2></div>{isPickup ? <><b>{order.seller?.storeName || 'Store pickup'}</b><p>{order.seller?.pickupAddress || 'The store will contact you to coordinate a convenient pickup.'}</p></> : order.address ? <><b>{order.address.city}, {order.address.country}</b><p>{[order.address.street, order.address.city, order.address.state, order.address.country].filter(Boolean).join(', ')}</p>{order.address.notes && <small>{order.address.notes}</small>}</> : <p>Delivery address details are not available.</p>}</section>
          <section className="buyer-order-detail-panel"><div className="buyer-order-panel-heading"><span><MarketIcon name="creditCard" size={17}/></span><h2>Payment details</h2></div><div className="buyer-order-price-line"><span>Items subtotal</span><b>{money(subtotal)}</b></div><div className="buyer-order-price-line"><span>{isPickup ? 'Pickup' : 'Delivery'}</span><b>{Number(order.sellerDeliveryFee || 0) ? money(Number(order.sellerDeliveryFee)) : 'Free'}</b></div><div className="buyer-order-payment-method"><span>Payment method</span><b>{order.paymentMethod ? order.paymentMethod.replaceAll('_', ' ') : 'Payment at checkout'}</b></div><div className="buyer-order-price-total"><span>Store total</span><b>{money(Number(order.totalAmount))}</b></div></section>
          <section className="buyer-order-help"><MarketIcon name="sparkle" size={19}/><b>Need a hand?</b><p>Questions about this store order? Our team is happy to help.</p><Link to="/marketing/contact">Get support <MarketIcon name="arrow" size={14}/></Link></section>
        </aside></div>
      </>}
    <footer className="market-footer"><Link className="market-logo" to="/shop"><span className="market-logo-mark">u</span><span>unimart<span>x</span></span></Link><span>Good things, close to home.</span><Link to="/marketing/contact">Need a hand? <MarketIcon name="arrow" size={15}/></Link></footer>
  </main></div>;
}
