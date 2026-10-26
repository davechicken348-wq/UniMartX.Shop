import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketplaceHeader from '../../components/marketplace/MarketplaceHeader';
import MarketIcon from '../../components/marketplace/MarketIcon';
import { cartRequest, getSellerOptions, money, type BuyerAddress, type BuyerProfile, type CartData, type CartItem, type CartSeller } from '../../lib/cart';
import { API_BASE_URL, type AuthUser } from '../../lib/auth';
import './marketplace.css';
import './cart-checkout.css';

type Fulfillment = 'pickup' | 'delivery';
type SellerChoice = { seller: CartSeller; items: CartItem[] };
type AddressForm = { fullName: string; street: string; city: string; state: string; zipCode: string; country: string; notes: string };
type PaymentForm = { momoNetwork: string; momoNumber: string };
type SellerOrderResult = { orderNumber: string; sellerId: string; storeName: string; totalAmount: number; fulfillmentType: Fulfillment; deliveryFee: number };
type OrderResult = { orderNumbers?: string[]; firstOrderDbId?: string; sellerOrders?: SellerOrderResult[] };
type ApiResult<T> = { success?: boolean; data?: T; message?: string; error?: string | { message?: string } };
const emptyItems: CartItem[] = [];

function readUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('unimartxUser') || 'null') as AuthUser | null; } catch { return null; }
}

function savedAddressForm(address: BuyerAddress, profile?: BuyerProfile | null): AddressForm {
  return { fullName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(), street: address.street || '', city: address.city || '', state: address.state || '', zipCode: address.zipCode || '', country: address.country || 'Ghana', notes: address.notes || '' };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [user] = useState<AuthUser | null>(readUser);
  const [cart, setCart] = useState<CartData | null>(null);
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [fulfillments, setFulfillments] = useState<Record<string, Fulfillment>>({});
  const [address, setAddress] = useState<AddressForm>({ fullName: '', street: '', city: '', state: '', zipCode: '', country: 'Ghana', notes: '' });
  const [payment, setPayment] = useState<PaymentForm>({ momoNetwork: 'MTN MoMo', momoNumber: '' });
  const [orderNumbers, setOrderNumbers] = useState<string[]>([]);
  const [sellerOrders, setSellerOrders] = useState<SellerOrderResult[]>([]);

  useEffect(() => {
    if (user?.role !== 'buyer') { setLoading(false); return; }
    let live = true;
    Promise.all([cartRequest<CartData>('/cart'), cartRequest<BuyerProfile>('/auth/me')])
      .then(([nextCart, nextProfile]) => {
        if (!live) return;
        setCart(nextCart); setProfile(nextProfile);
        const defaultAddress = nextProfile.addresses?.find((item) => item.isDefault) || nextProfile.addresses?.[0];
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setAddress(savedAddressForm(defaultAddress, nextProfile));
        } else setUseNewAddress(true);
      })
      .catch((reason) => { if (live) setError(reason instanceof Error ? reason.message : 'Could not prepare checkout.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user?.id, user?.role]);

  const items = cart?.items ?? emptyItems;
  const sellerChoices = useMemo(() => {
    const groups = new Map<string, SellerChoice>();
    for (const item of items) {
      if (!item.product) continue;
      const seller = item.product.seller;
      const group = groups.get(seller.id) || { seller, items: [] };
      group.items.push(item); groups.set(seller.id, group);
    }
    return Array.from(groups.values());
  }, [items]);

  useEffect(() => {
    setFulfillments((current) => {
      const next = { ...current };
      for (const { seller } of sellerChoices) {
        const options = getSellerOptions(seller);
        if (!next[seller.id] || !options.includes(next[seller.id])) next[seller.id] = options[0];
      }
      return next;
    });
  }, [sellerChoices]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.product ? Number(item.product.price) * item.quantity : 0), 0), [items]);
  const deliveryTotal = sellerChoices.reduce((sum, { seller }) => fulfillments[seller.id] === 'delivery' ? sum + Number(seller.deliveryFee || 0) : sum, 0);
  const deliveryFeeNeedsConfirmation = sellerChoices.some(({ seller }) => fulfillments[seller.id] === 'delivery' && seller.deliveryFee == null);
  const total = subtotal + deliveryTotal;
  const addresses = profile?.addresses || [];

  function selectAddress(id: string) {
    setUseNewAddress(false); setSelectedAddressId(id);
    const saved = addresses.find((item) => item.id === id);
    if (saved && profile) setAddress(savedAddressForm(saved, profile));
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!cart || !items.length) { setError('Your bag is empty. Add a find before checking out.'); return; }
    if (items.some((item) => !item.product || !item.product.isActive || item.quantity > item.product.stock)) { setError('One or more items are unavailable. Go back to your bag and adjust or remove them.'); return; }
    if (!useNewAddress && !selectedAddressId) { setError('Choose a delivery address to continue.'); return; }
    setPlacingOrder(true);
    const pickedAddress = useNewAddress ? address : { id: selectedAddressId };
    try {
      const token = localStorage.getItem('unimartxToken');
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          items: items.filter((item) => item.product).map((item) => ({ productId: item.product!.id, quantity: item.quantity })),
          sellerFulfillments: Object.fromEntries(sellerChoices.map(({ seller }) => [seller.id, { fulfillment: fulfillments[seller.id] || 'pickup', deliveryFee: fulfillments[seller.id] === 'delivery' ? Number(seller.deliveryFee || 0) : 0 }])),
          address: pickedAddress,
          payment: { method: 'momo', momoNetwork: payment.momoNetwork, momoNumber: payment.momoNumber },
        }),
      });
      const body = await response.json().catch(() => ({})) as ApiResult<OrderResult>;
      const apiError = typeof body.error === 'string' ? body.error : body.error?.message;
      if (!response.ok || body.success === false || !body.data) throw new Error(body.message || apiError || 'We couldn’t place that order. Please try again.');
      setOrderNumbers(body.data.orderNumbers || (body.data.firstOrderDbId ? [body.data.firstOrderDbId] : []));
      setSellerOrders(body.data.sellerOrders || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t place that order.'); }
    finally { setPlacingOrder(false); }
  }

  if (orderNumbers.length) return <div className="marketplace cart-checkout-page checkout-success-page"><MarketplaceHeader/><main className="cart-checkout-main"><section className="checkout-success"><div className="checkout-success-burst"><MarketIcon name="check" size={42}/><i/><i/><i/><i/></div><div className="market-overline">A LITTLE JOY IS ON THE WAY</div><h1>Order placed.<br/><em>Let the good stuff begin.</em></h1><p>Your order has been split by shop so each seller can prepare their part. You’ll coordinate pickup or delivery with each store.</p>
    <div className="checkout-confirmation-stores">{sellerChoices.map(({ seller, items: sellerItems }) => { const order = sellerOrders.find((entry) => entry.sellerId === seller.id); const fulfillment = order?.fulfillmentType || fulfillments[seller.id] || 'pickup'; const selectedAddress = addresses.find((entry) => entry.id === selectedAddressId); const sellerSubtotal = sellerItems.reduce((sum, item) => sum + Number(item.product?.price || 0) * item.quantity, 0); return <article className="checkout-confirmation-store" key={seller.id}><header><span className="checkout-seller-avatar">{seller.storeAvatar ? <img src={seller.storeAvatar} alt=""/> : seller.storeName.slice(0, 1)}</span><span><small>STORE ORDER</small><b>{seller.storeName}</b></span><strong>{order?.orderNumber || orderNumbers[sellerChoices.findIndex((entry) => entry.seller.id === seller.id)] || 'Order received'}</strong></header><div className="checkout-confirmation-items">{sellerItems.map((item) => <div className="checkout-confirmation-item" key={item.id}><span>{item.product?.image ? <img src={item.product.image} alt=""/> : <MarketIcon name="package" size={16}/>}</span><b>{item.product?.name}</b><small>× {item.quantity}</small><strong>{money((item.product?.price || 0) * item.quantity)}</strong></div>)}</div><footer><span><MarketIcon name={fulfillment === 'pickup' ? 'shop' : 'truck'} size={15}/><b>{fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</b><small>{fulfillment === 'pickup' ? seller.pickupAddress || 'Arrange pickup with this store' : selectedAddress ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}` : `${address.street}, ${address.city}, ${address.state}`}</small></span><strong>Store total {money(order?.totalAmount ?? sellerSubtotal + (fulfillment === 'delivery' ? Number(seller.deliveryFee || 0) : 0))}</strong></footer></article>; })}</div>
    <p className="checkout-confirmation-payment">Payment preference: <b>{payment.momoNetwork}</b> · {payment.momoNumber}</p><div className="checkout-success-actions"><Link className="cart-primary-button" to="/shop">Back to exploring <MarketIcon name="arrow"/></Link><Link className="checkout-text-link" to="/shop/account">Your account <MarketIcon name="arrow" size={15}/></Link></div></section></main></div>;

  return <div className="marketplace cart-checkout-page checkout-page">
    <MarketplaceHeader/>
    <main className="cart-checkout-main">
      <div className="cart-stepper" aria-label="Checkout progress"><Link to="/shop/cart"><i>✓</i>Bag</Link><b/><span className="is-current"><i>2</i>Delivery & payment</span><b/><span><i>3</i>Done</span></div>
      <section className="checkout-intro"><div><div className="market-overline">ALMOST AT THE HAPPY PART</div><h1>Let’s make it<br/><em>official.</em></h1></div><p>Just a few little details, then this lovely find is on its way.</p></section>
      {error && <div className="cart-feedback is-error" role="alert"><MarketIcon name="sparkle"/>{error}</div>}
      {user?.role !== 'buyer' ? <section className="cart-empty-state"><div className="cart-empty-icon"><MarketIcon name="lock" size={34}/></div><div className="market-overline">SECURE CHECKOUT</div><h2>Sign in to finish your order.</h2><p>Your bag and delivery details are saved with your UniMartX account.</p><button className="cart-primary-button" onClick={() => navigate('/auth/login', { state: { from: '/shop/checkout' } })}>Sign in to continue <MarketIcon name="arrow"/></button></section> : loading ? <div className="cart-loading"><span className="cart-loader"/><p>Getting everything ready…</p></div> : !cart && error ? <section className="cart-empty-state"><div className="cart-empty-icon"><MarketIcon name="bag" size={34}/></div><div className="market-overline">ONE MOMENT</div><h2>We couldn’t prepare checkout.</h2><p>Return to your bag and try again.</p><Link className="cart-primary-button" to="/shop/cart">Back to your bag <MarketIcon name="arrow"/></Link></section> : !items.length ? <section className="cart-empty-state is-empty"><div className="cart-empty-icon"><MarketIcon name="bag" size={34}/></div><div className="market-overline">NO FINDS IN YOUR BAG</div><h2>Let’s find something lovely.</h2><p>Your bag is empty right now. Explore independent shops and add a little joy.</p><Link className="cart-primary-button" to="/shop">Explore the marketplace <MarketIcon name="arrow"/></Link></section> : <form className="checkout-layout" onSubmit={placeOrder}>
        <div className="checkout-main-column">
          <section className="checkout-section checkout-address-section"><div className="checkout-section-heading"><span className="checkout-section-icon"><MarketIcon name="location"/></span><div><small>01 · WHERE TO?</small><h2>Delivery details</h2><p>Where should your good things find you?</p></div><span className="checkout-heading-spark">✦</span></div>
            {addresses.length > 0 && <div className="checkout-address-options">{addresses.map((saved) => <label className={`checkout-address-choice ${!useNewAddress && selectedAddressId === saved.id ? 'is-selected' : ''}`} key={saved.id}><input type="radio" name="savedAddress" checked={!useNewAddress && selectedAddressId === saved.id} onChange={() => selectAddress(saved.id)}/><span className="checkout-address-radio"/><span className="checkout-address-copy"><b>{saved.label || (saved.isDefault ? 'Default address' : 'Saved address')}</b><small>{saved.street}, {saved.city}, {saved.state}</small></span>{saved.isDefault && <i>DEFAULT</i>}</label>)}<button type="button" className={`checkout-address-choice checkout-new-address ${useNewAddress ? 'is-selected' : ''}`} onClick={() => { setUseNewAddress(true); setSelectedAddressId(''); }}><span className="checkout-address-radio"/><span className="checkout-address-copy"><b>Use a different address</b><small>Add another delivery address for this order.</small></span><MarketIcon name="plus" size={17}/></button></div>}
            {(useNewAddress || !addresses.length) && <div className="checkout-fields"><label className="checkout-field-wide">Full name<input autoComplete="name" value={address.fullName} onChange={(event) => setAddress({ ...address, fullName: event.target.value })} required/></label><label className="checkout-field-wide">Street address<input autoComplete="street-address" placeholder="House number and street" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} required/></label><label>City<input autoComplete="address-level2" placeholder="Accra" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} required/></label><label>Region<input autoComplete="address-level1" placeholder="Greater Accra" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} required/></label><label>Postcode <small>Optional</small><input autoComplete="postal-code" value={address.zipCode} onChange={(event) => setAddress({ ...address, zipCode: event.target.value })}/></label><label>Country<input autoComplete="country-name" value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} required/></label><label className="checkout-field-wide">Delivery note <small>Optional</small><textarea rows={3} placeholder="Anything helpful for the seller?" value={address.notes} onChange={(event) => setAddress({ ...address, notes: event.target.value })}/></label></div>}
            {profile?.phone && <div className="checkout-contact-note"><MarketIcon name="phone" size={16}/><span>Order updates will go to <b>{profile.phone}</b>.</span><Link to="/shop/account">Edit</Link></div>}
          </section>

          <section className="checkout-section"><div className="checkout-section-heading"><span className="checkout-section-icon"><MarketIcon name="truck"/></span><div><small>02 · THE JOURNEY</small><h2>Choose how it arrives</h2><p>Each shop sets its own pickup and delivery options.</p></div><span className="checkout-heading-spark">✦</span></div><div className="checkout-fulfillment-list">{sellerChoices.map(({ seller, items: sellerItems }, index) => {
              const options = getSellerOptions(seller);
              const choice = fulfillments[seller.id] || options[0];
              return <article className="checkout-seller-card" key={seller.id} style={{ animationDelay: `${index * 90}ms` }}><div className="checkout-seller-heading"><span className="checkout-seller-avatar">{seller.storeAvatar ? <img src={seller.storeAvatar} alt=""/> : seller.storeName.slice(0, 1)}</span><span><small>FROM THIS SHOP</small><b>{seller.storeName}</b></span><span className="checkout-seller-item-count">{sellerItems.length} {sellerItems.length === 1 ? 'item' : 'items'}</span></div><div className="checkout-fulfillment-options">{options.map((option) => <label className={`checkout-fulfillment-choice ${choice === option ? 'is-selected' : ''}`} key={option}><input type="radio" name={`fulfillment-${seller.id}`} checked={choice === option} onChange={() => setFulfillments((current) => ({ ...current, [seller.id]: option }))}/><span className="checkout-address-radio"/><span className="checkout-fulfillment-copy"><b>{option === 'pickup' ? 'Pick up from the shop' : 'Deliver to my address'}</b><small>{option === 'pickup' ? seller.pickupAddress || 'Arrange a convenient pickup with the seller.' : seller.deliveryFee != null ? `Delivery fee ${money(Number(seller.deliveryFee))}` : 'Delivery details to be confirmed with the seller.'}</small></span><span className="checkout-fulfillment-price">{option === 'pickup' ? 'FREE' : seller.deliveryFee != null ? money(Number(seller.deliveryFee)) : '—'}</span></label>)}</div></article>;
            })}</div></section>

          <section className="checkout-section"><div className="checkout-section-heading"><span className="checkout-section-icon"><MarketIcon name="creditCard"/></span><div><small>03 · MAKE IT YOURS</small><h2>Payment details</h2><p>Choose the mobile money number you plan to use.</p></div><span className="checkout-heading-spark">✦</span></div><div className="checkout-payment-card"><div className="checkout-payment-method is-selected"><span className="checkout-payment-radio"/><span className="checkout-payment-method-icon"><MarketIcon name="phone"/></span><span><b>Mobile money</b><small>MTN MoMo, Telecel Cash, or AT Money</small></span><i>GHANA</i></div><div className="checkout-fields checkout-payment-fields"><label>Mobile money network<select value={payment.momoNetwork} onChange={(event) => setPayment({ ...payment, momoNetwork: event.target.value })}><option>MTN MoMo</option><option>Telecel Cash</option><option>AT Money</option></select></label><label>Mobile money number<input type="tel" autoComplete="tel" inputMode="tel" placeholder="024 000 0000" value={payment.momoNumber} onChange={(event) => setPayment({ ...payment, momoNumber: event.target.value })} required/></label></div><p className="checkout-payment-disclaimer">This saves your payment preference with the order. It does not charge your mobile money wallet; the shop will confirm the next step.</p></div></section>
        </div>
        <aside className="checkout-summary"><div className="checkout-summary-heading"><span className="checkout-summary-confetti">✦</span><div><small>THE GOOD STUFF</small><h2>Your order</h2></div><span className="checkout-summary-bag"><MarketIcon name="bag"/></span></div><div className="checkout-summary-sellers">{sellerChoices.map(({ seller, items: sellerItems }) => <section className="checkout-summary-store" key={seller.id}><header><MarketIcon name="shop" size={14}/><b>{seller.storeName}</b><small>{sellerItems.length} {sellerItems.length === 1 ? 'item' : 'items'}</small></header>{sellerItems.map((item) => <div className="checkout-summary-item" key={item.id}><span className="checkout-summary-thumb">{item.product?.image ? <img src={item.product.image} alt=""/> : <MarketIcon name="package" size={18}/>}<i>{item.quantity}</i></span><span><b>{item.product?.name}</b><small>{money(item.product?.price || 0)} each</small></span><strong>{money((item.product?.price || 0) * item.quantity)}</strong></div>)}<footer><span>{fulfillments[seller.id] === 'delivery' ? 'Delivery' : 'Pickup'}</span><b>{fulfillments[seller.id] === 'delivery' ? seller.deliveryFee != null ? money(Number(seller.deliveryFee)) : 'Confirm with shop' : 'FREE'}</b></footer></section>)}</div><div className="checkout-summary-breakdown"><div><span>Items</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{deliveryFeeNeedsConfirmation ? 'Confirm with shop' : deliveryTotal ? money(deliveryTotal) : 'FREE'}</b></div><div className="checkout-summary-total"><span>Total</span><b>{money(total)}</b></div></div><button className="cart-primary-button checkout-place-order" type="submit" disabled={placingOrder || loading}>{placingOrder ? <><span className="checkout-button-spinner"/>Placing your order…</> : <>Place my order <MarketIcon name="arrow"/></>}</button><p className="checkout-secure-note"><MarketIcon name="lock" size={15}/>Your order is saved with your account.</p><div className="checkout-summary-footnote">Each shop receives a separate order with its own pickup or delivery selection.</div><Link className="checkout-back-link" to="/shop/cart"><MarketIcon name="arrow" size={15}/>Back to your bag</Link></aside>
      </form>}
      <footer className="market-footer"><Link className="market-logo" to="/shop"><span className="market-logo-mark">u</span><span>unimart<span>x</span></span></Link><span>Good things, close to home.</span><Link to="/auth/seller/register">Become a seller <MarketIcon name="arrow" size={15}/></Link></footer>
    </main>
  </div>;
}
