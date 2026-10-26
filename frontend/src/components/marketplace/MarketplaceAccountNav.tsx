import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, clearSession, type AuthUser } from '../../lib/auth';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import './market-account-nav.css';

type ExtendedUser = AuthUser & { role: 'buyer' | 'seller' | 'admin' };
type ProfileResponse = { success?: boolean; data?: { slug?: string; storeName?: string } };

function readUser(): ExtendedUser | null {
  try {
    const value = localStorage.getItem('unimartxUser');
    if (!value) return null;
    const user = JSON.parse(value) as ExtendedUser;
    return ['buyer', 'seller', 'admin'].includes(user.role) ? user : null;
  } catch { return null; }
}

function UserIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>;
}

function BagIcon({ heart = false }: { heart?: boolean }) {
  return heart
    ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 8.8c0 5.3-8.8 10-8.8 10s-8.8-4.7-8.8-10A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z"/></svg>
    : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
}

export default function MarketplaceAccountNav() {
  const [user, setUser] = useState<ExtendedUser | null>(readUser);
  const { cart, saved } = useMarketplaceLive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('unimartxToken');

  useEffect(() => {
    const refresh = () => { setUser(readUser()); setMenuOpen(false); };
    window.addEventListener('unimartx:auth-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('unimartx:auth-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (user?.role !== 'seller' || !token) { setStoreSlug(''); return; }
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/seller/profile`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((response) => response.json())
      .then((body: ProfileResponse) => { if (body.success && body.data?.slug) setStoreSlug(body.data.slug); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [user?.id, user?.role, token]);

  useEffect(() => {
    function outside(event: MouseEvent) { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); }
    function keydown(event: KeyboardEvent) { if (event.key === 'Escape') setMenuOpen(false); }
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', keydown); };
  }, []);

  async function signOut() {
    const currentToken = localStorage.getItem('unimartxToken');
    if (currentToken) {
      try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${currentToken}` } }); } catch { /* Local session is still cleared if the server cannot be reached. */ }
    }
    clearSession();
    setStoreSlug('');
    navigate('/shop');
  }

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '';
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
  const roleName = user?.role === 'admin' ? 'Administrator' : user?.role === 'seller' ? 'Seller account' : 'Buyer account';
  const showBuyerLinks = !user || user.role === 'buyer';

  return <>
    <nav className="market-actions" aria-label="Marketplace account navigation">
      {showBuyerLinks && <><Link className="market-icon-link" to="/shop/saved" aria-label={`Saved items${saved ? `, ${saved}` : ''}`}><BagIcon heart/><span>Saved</span>{saved > 0 && <i>{saved > 99 ? '99+' : saved}</i>}</Link><Link className="market-icon-link" to="/shop/cart" aria-label={`Shopping bag${cart ? `, ${cart}` : ''}`}><BagIcon/><span>Bag</span>{cart > 0 && <i>{cart > 99 ? '99+' : cart}</i>}</Link></>}
      {user?.role === 'seller' && storeSlug && <Link className="market-icon-link market-own-store-link" to={`/shop/store/${encodeURIComponent(storeSlug)}`} aria-label="View your storefront"><BagIcon/><span>Your store</span></Link>}
      {!user ? <Link className="market-account" to="/auth/login"><UserIcon/><span>Sign in</span></Link> : <div className="market-account-menu" ref={menuRef}>
        <button className="market-account market-account-trigger" type="button" aria-label={`${fullName || 'Account'} menu`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span className="market-account-avatar">{user.avatar ? <img src={user.avatar} alt=""/> : initials}</span>
        </button>
        {menuOpen && <div className="market-account-popover" role="menu">
          <div className="market-account-summary"><span className="market-account-avatar">{user.avatar ? <img src={user.avatar} alt=""/> : initials}</span><span><b>{fullName}</b><small>{user.email}</small><i>{roleName}</i></span></div>
          <div className="market-account-menu-links">
            {user.role === 'buyer' && <><Link to="/shop/account" role="menuitem" onClick={() => setMenuOpen(false)}><UserIcon/>Your account</Link><Link to="/shop/settings" role="menuitem" onClick={() => setMenuOpen(false)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/></svg>Settings</Link><Link to="/shop/saved" role="menuitem" onClick={() => setMenuOpen(false)}><BagIcon heart/>Saved items</Link><Link to="/shop/cart" role="menuitem" onClick={() => setMenuOpen(false)}><BagIcon/>Shopping bag</Link></>}
            {user.role === 'seller' && <><Link to="/seller/builder" role="menuitem" onClick={() => setMenuOpen(false)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h4m-4 4h8"/></svg>Seller workspace</Link>{storeSlug && <Link to={`/shop/store/${encodeURIComponent(storeSlug)}`} role="menuitem" onClick={() => setMenuOpen(false)}><BagIcon/>View your storefront</Link>}</>}
            {user.role === 'admin' && <div className="market-account-admin-note"><b>Marketplace administrator</b><span>You’re browsing the public marketplace with admin access.</span></div>}
          </div>
          <button className="market-account-signout" type="button" role="menuitem" onClick={signOut}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>Sign out</button>
        </div>}
      </div>}
    </nav>
  </>;
}
