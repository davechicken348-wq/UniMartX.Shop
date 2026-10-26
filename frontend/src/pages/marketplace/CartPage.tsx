import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketplaceHeader from '../../components/marketplace/MarketplaceHeader';
import MarketIcon from '../../components/marketplace/MarketIcon';
import { cartRequest, money, type CartData, type CartItem } from '../../lib/cart';
import type { AuthUser } from '../../lib/auth';
import './marketplace.css';
import './cart-checkout.css';

function readUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('unimartxUser') || 'null') as AuthUser | null; } catch { return null; }
}

export default function CartPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(readUser);
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setError('');
    try { setCart(await cartRequest<CartData>('/cart')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load your bag.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const syncUser = () => setUser(readUser());
    window.addEventListener('unimartx:auth-change', syncUser);
    window.addEventListener('storage', syncUser);
    return () => { window.removeEventListener('unimartx:auth-change', syncUser); window.removeEventListener('storage', syncUser); };
  }, []);

  useEffect(() => { if (user?.role === 'buyer') void loadCart(); else setLoading(false); }, [loadCart, user?.id, user?.role]);

  useEffect(() => {
    const refreshCart = () => { if (readUser()?.role === 'buyer') void loadCart(); };
    window.addEventListener('unimartx:market-refresh', refreshCart);
    return () => window.removeEventListener('unimartx:market-refresh', refreshCart);
  }, [loadCart]);

  const items = cart?.items || [];
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.product ? Number(item.product.price) * item.quantity : 0), 0), [items]);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasUnavailableItems = items.some((item) => !item.product || !item.product.isActive || item.quantity > item.product.stock);

  async function changeQuantity(item: CartItem, quantity: number) {
    if (!item.product || quantity < 1 || quantity > item.product.stock) return;
    setUpdating(item.id); setError('');
    try {
      await cartRequest(`/cart/update/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
      await loadCart();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this item.'); }
    finally { setUpdating(null); }
  }

  async function removeItem(itemId: string) {
    setRemoving(itemId); setError('');
    await new Promise((resolve) => window.setTimeout(resolve, 230));
    try {
      await cartRequest(`/cart/remove/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
      setCart((current) => current ? { ...current, items: current.items.filter((item) => item.id !== itemId) } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove this item.'); }
    finally { setRemoving(null); }
  }

  return <div className="marketplace cart-checkout-page cart-page">
    <MarketplaceHeader/>
    <main className="cart-checkout-main">
      <div className="cart-stepper" aria-label="Checkout progress"><span className="is-current"><i>1</i>Bag</span><b/><span><i>2</i>Delivery</span><b/><span><i>3</i>Done</span></div>
      <section className="cart-hero"><div className="cart-hero-copy"><div className="market-overline">GOOD THINGS, GATHERED</div><h1>Your bag has<br/><em>a little magic.</em></h1><p>Everything you’ve picked, all in one happy place.</p></div><div className="cart-hero-art" aria-hidden="true"><span className="cart-orbit cart-orbit-one"/><span className="cart-orbit cart-orbit-two"/><span className="cart-spark cart-spark-one">✦</span><span className="cart-spark cart-spark-two">✧</span><span className="cart-bag-illustration"><MarketIcon name="bag" size={78}/></span><span className="cart-floating-dot"/></div></section>

      {error && <div className="cart-feedback is-error" role="alert"><MarketIcon name="sparkle"/>{error}</div>}
      {user?.role !== 'buyer' ? <section className="cart-empty-state"><div className="cart-empty-icon"><MarketIcon name="bag" size={34}/></div><div className="market-overline">YOUR NEXT GREAT FIND</div><h2>Sign in to see your bag.</h2><p>Your shopping bag follows your UniMartX account wherever you go.</p><button className="cart-primary-button" onClick={() => navigate('/auth/login', { state: { from: '/shop/cart' } })}>Sign in to continue <MarketIcon name="arrow"/></button></section> : loading ? <div className="cart-loading"><span className="cart-loader"/><p>Gathering your good things…</p></div> : error && !cart ? <section className="cart-empty-state"><div className="cart-empty-icon"><MarketIcon name="bag" size={34}/></div><div className="market-overline">ONE MOMENT</div><h2>We couldn’t open your bag.</h2><p>Check your connection, then give it another try.</p><button className="cart-primary-button" onClick={() => { setLoading(true); void loadCart(); }}>Try again <MarketIcon name="arrow"/></button></section> : !items.length ? <section className="cart-empty-state is-empty"><div className="cart-empty-icon"><MarketIcon name="bag" size={34}/><span>✦</span></div><div className="market-overline">A LITTLE ROOM FOR SOMETHING LOVELY</div><h2>Your bag is taking a breather.</h2><p>Find something made by your community and it’ll be waiting here.</p><Link className="cart-primary-button" to="/shop">Explore the marketplace <MarketIcon name="arrow"/></Link></section> : <div className="cart-layout">
        <section className="cart-items-column" aria-label="Items in your bag"><div className="cart-list-heading"><div><div className="market-overline">YOUR GOOD FINDS</div><h2>{itemCount} {itemCount === 1 ? 'item' : 'items'} in your bag<span>.</span></h2></div><Link to="/shop"><MarketIcon name="plus" size={16}/>Keep exploring</Link></div>
          <div className="cart-item-list">{items.map((item, index) => <article className={`cart-item-card ${removing === item.id ? 'is-removing' : ''}`} key={item.id} style={{ animationDelay: `${Math.min(index * 65, 390)}ms` }}>
            <Link className="cart-item-image" to={item.product ? `/shop/product/${encodeURIComponent(item.product.id)}` : '/shop'}>{item.product?.image ? <img src={item.product.image} alt={item.product.name}/> : <span><MarketIcon name="package" size={30}/></span>}<i/></Link>
            <div className="cart-item-info">{item.product ? <><div className="cart-item-store"><MarketIcon name="shop" size={13}/>{item.product.seller?.storeName || 'Community shop'}</div><Link to={`/shop/product/${encodeURIComponent(item.product.id)}`} className="cart-item-name">{item.product.name}</Link><div className={`cart-item-stock ${!item.product.isActive || item.product.stock < item.quantity ? 'is-low' : ''}`}><span/> {!item.product.isActive ? 'This listing is unavailable' : item.product.stock < item.quantity ? `Only ${item.product.stock} left — adjust your quantity` : item.product.stock > 0 ? `${item.product.stock} available` : 'Currently unavailable'}</div></> : <><div className="cart-item-store">Community shop</div><span className="cart-item-name">This item is no longer available</span></>}
              <div className="cart-quantity-control"><button type="button" aria-label={`Decrease quantity of ${item.product?.name || 'item'}`} disabled={updating === item.id || item.quantity <= 1} onClick={() => void changeQuantity(item, item.quantity - 1)}><MarketIcon name="minus" size={15}/></button><span>{item.quantity}</span><button type="button" aria-label={`Increase quantity of ${item.product?.name || 'item'}`} disabled={updating === item.id || !item.product || item.quantity >= item.product.stock} onClick={() => void changeQuantity(item, item.quantity + 1)}><MarketIcon name="plus" size={15}/></button></div>
            </div>
            <div className="cart-item-trailing"><b>{money((item.product?.price || 0) * item.quantity)}</b><button className="cart-remove-button" type="button" onClick={() => void removeItem(item.id)} disabled={removing === item.id} aria-label={`Remove ${item.product?.name || 'item'} from bag`}><MarketIcon name="trash" size={16}/><span>Remove</span></button></div>
          </article>)}</div>
          <div className="cart-happy-note"><span><MarketIcon name="sparkle"/></span><p><b>Shopping small makes a big difference.</b><small>Every order supports an independent maker in your community.</small></p><span className="cart-note-doodle">✦</span></div>
        </section>
        <aside className="cart-summary"><div className="cart-summary-top"><span className="cart-summary-icon"><MarketIcon name="bag"/></span><div><small>YOUR CHECKOUT</small><b>Nearly yours.</b></div><span className="cart-summary-spark">✦</span></div><div className="cart-summary-line"><span>Items <small>({itemCount})</small></span><b>{money(subtotal)}</b></div><div className="cart-summary-line"><span>Delivery</span><small>Picked at next step</small></div><div className="cart-summary-total"><span>Subtotal</span><b>{money(subtotal)}</b></div><p className="cart-summary-caption"><MarketIcon name="lock" size={15}/>Delivery and payment details come next.</p>{hasUnavailableItems ? <button type="button" className="cart-primary-button cart-checkout-button" disabled>Adjust unavailable items <MarketIcon name="arrow"/></button> : <Link to="/shop/checkout" className="cart-primary-button cart-checkout-button">Head to checkout <MarketIcon name="arrow"/></Link>}<div className="cart-summary-perk"><MarketIcon name="heart" size={15}/>Good finds. Good people. Always.</div></aside>
      </div>}
      <footer className="market-footer"><Link className="market-logo" to="/shop"><span className="market-logo-mark">u</span><span>unimart<span>x</span></span></Link><span>Good things, close to home.</span><Link to="/auth/seller/register">Become a seller <MarketIcon name="arrow" size={15}/></Link></footer>
    </main>
  </div>;
}
