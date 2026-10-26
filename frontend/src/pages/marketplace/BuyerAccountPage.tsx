import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DeliveryLocationPicker from '../../components/marketplace/DeliveryLocationPicker';
import MarketplaceAccountNav from '../../components/marketplace/MarketplaceAccountNav';
import MarketplaceSidebar from '../../components/marketplace/MarketplaceSidebar';
import MarketIcon from '../../components/marketplace/MarketIcon';
import { API_BASE_URL, type AuthUser } from '../../lib/auth';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import './marketplace.css';
import './product-details.css';
import './buyer-account.css';
import '../../components/marketplace/marketplace-sidebar.css';

type Address = { street?: string; city?: string; state?: string; zipCode?: string; country?: string; label?: string; notes?: string | null };
type Profile = { id: string; firstName: string; lastName: string; email: string; phone?: string; avatar?: string | null; profileBanner?: string | null; emailVerified?: boolean; memberSince?: string; stats?: { orders: number; wishlist: number }; addresses?: Address[] };
type Preferences = { orderUpdates: boolean; wishlistAlerts: boolean; promotions: boolean; accountActivity: boolean; emailNotifications: boolean; personalizedRecommendations: boolean };
type ApiResult<T> = { success?: boolean; data?: T; message?: string; error?: string };
type ImageEdit = { type: 'avatar' | 'profileBanner'; source: string };
const defaultPreferences: Preferences = { orderUpdates: true, wishlistAlerts: true, promotions: true, accountActivity: true, emailNotifications: true, personalizedRecommendations: true };

function readAccountUser(): AuthUser | null {
  try { const raw = localStorage.getItem('unimartxUser'); return raw ? JSON.parse(raw) as AuthUser : null; } catch { return null; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const token = localStorage.getItem('unimartxToken');
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({})) as ApiResult<T>;
  if (!response.ok || body.success === false) throw new Error(body.message || body.error || 'Could not save your changes. Please try again.');
  return body;
}

async function cropProfileImage(edit: ImageEdit, zoom: number, offsetX: number, offsetY: number, brightness: number) {
  const image = await createImageBitmap(await (await fetch(edit.source)).blob());
  const size = edit.type === 'avatar' ? { width: 512, height: 512 } : { width: 1600, height: 600 };
  const baseScale = Math.max(size.width / image.width, size.height / image.height);
  const scale = baseScale * zoom;
  const cropWidth = size.width / scale;
  const cropHeight = size.height / scale;
  const maxX = Math.max(0, image.width - cropWidth);
  const maxY = Math.max(0, image.height - cropHeight);
  const sourceX = Math.max(0, Math.min(maxX, (maxX / 2) + offsetX * maxX / 2));
  const sourceY = Math.max(0, Math.min(maxY, (maxY / 2) + offsetY * maxY / 2));
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) { image.close(); throw new Error('This image could not be prepared. Try another one.'); }
  context.filter = `brightness(${brightness}%)`;
  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, size.width, size.height);
  image.close();
  return canvas.toDataURL('image/jpeg', 0.84);
}

function AccountSidebar({ settings, avatar }: { settings: boolean; avatar?: string | null }) {
  const { orders, saved } = useMarketplaceLive();
  return <MarketplaceSidebar heading="YOUR MARKET" sections={[
    { items: [{ label: 'Discover', icon: <MarketIcon name="compass"/>, to: '/shop' }, { label: 'Local stores', icon: <MarketIcon name="shop"/>, to: '/shop/stores' }] },
    { label: 'YOUR ACCOUNT', items: [
      { label: 'Account', icon: <MarketIcon name="user"/>, avatar, to: '/shop/account', active: !settings },
      { label: 'Orders', icon: <MarketIcon name="package"/>, to: '/shop/orders', badge: orders },
      { label: 'Saved finds', icon: <MarketIcon name="heart"/>, to: '/shop/saved', badge: saved },
      { label: 'Settings', icon: <MarketIcon name="settings"/>, to: '/shop/settings', active: settings },
    ] },
  ]} note={{ icon: <MarketIcon name="sparkle"/>, title: 'Your little corner.', description: 'Manage your details and make UniMartX feel like yours.' }} className={settings ? 'is-settings' : ''}/>;
}

export default function BuyerAccountPage({ settings = false }: { settings?: boolean }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(readAccountUser);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'avatar' | 'profileBanner' | null>(null);
  const [imageEdit, setImageEdit] = useState<ImageEdit | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageBrightness, setImageBrightness] = useState(100);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const refresh = () => setUser(readAccountUser());
    window.addEventListener('unimartx:auth-change', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('unimartx:auth-change', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  useEffect(() => {
    let live = true;
    setError('');
    if (user?.role !== 'buyer') { setLoading(false); return () => { live = false; }; }
    setLoading(true);
    const path = settings ? '/users/notification-preferences' : '/auth/me';
    request<Profile | Preferences>(path).then((result) => {
      if (!live || !result.data) return;
      if (settings) setPreferences({ ...defaultPreferences, ...(result.data as Partial<Preferences>) });
      else setProfile(result.data as Profile);
    }).catch((reason: Error) => { if (live) setError(reason.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [settings, user?.id, user?.role]);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await request<Profile>('/auth/me', { method: 'PATCH', body: JSON.stringify({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone || '' }) });
      const updated = result.data || profile;
      setProfile(updated);
      try {
        const stored = readAccountUser();
        if (stored) {
          localStorage.setItem('unimartxUser', JSON.stringify({ ...stored, firstName: updated.firstName, lastName: updated.lastName }));
          window.dispatchEvent(new CustomEvent('unimartx:auth-change'));
        }
      } catch { /* Keep the saved profile visible for this session if storage is unavailable. */ }
      setNotice('Your account details have been saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your account.'); }
    finally { setSaving(false); }
  }

  async function changeProfileImage(type: 'avatar' | 'profileBanner', file?: File) {
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file to continue.'); return; }
    if (file.size > 12 * 1024 * 1024) { setError('Choose an image smaller than 12 MB.'); return; }
    setError(''); setNotice('');
    try {
      const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.')); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(file); });
      setImageEdit({ type, source }); setImageZoom(1); setImageOffset({ x: 0, y: 0 }); setImageBrightness(100);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this image.'); }
  }

  async function saveProfileImageEdit() {
    if (!imageEdit || !profile) return;
    const { type } = imageEdit;
    setUploadingImage(type); setError(''); setNotice('');
    try {
      const imageData = await cropProfileImage(imageEdit, imageZoom, imageOffset.x, imageOffset.y, imageBrightness);
      const result = await request<Profile>('/auth/me', { method: 'PATCH', body: JSON.stringify({ [type]: imageData }) });
      if (result.data) setProfile((current) => current ? { ...current, ...result.data } : result.data || current);
      if (type === 'avatar') {
        const stored = readAccountUser();
        if (stored) {
          localStorage.setItem('unimartxUser', JSON.stringify({ ...stored, avatar: result.data?.avatar || imageData }));
          window.dispatchEvent(new CustomEvent('unimartx:auth-change'));
        }
      }
      setNotice(type === 'avatar' ? 'Your profile photo has been updated.' : 'Your profile banner has been updated.');
      setImageEdit(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this image.'); }
    finally { setUploadingImage(null); }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    setSaving(true); setError(''); setNotice('');
    try {
      await request<Address>('/auth/me/address', { method: 'PATCH', body: JSON.stringify(payload) });
      setNotice('Your delivery address has been saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your address.'); }
    finally { setSaving(false); }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await request<Preferences>('/users/notification-preferences', { method: 'PATCH', body: JSON.stringify(preferences) });
      if (result.data) setPreferences({ ...defaultPreferences, ...result.data });
      setNotice('Your preferences have been saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save preferences.'); }
    finally { setSaving(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    if (passwords.newPassword !== passwords.confirmPassword) { setError('Your new passwords do not match.'); return; }
    setSaving(true);
    try {
      const result = await request<unknown>('/users/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }) });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice(result.message || 'Your password has been updated.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update your password.'); }
    finally { setSaving(false); }
  }

  const signedInAsBuyer = Boolean(user?.role === 'buyer');
  const address = profile?.addresses?.[0] || {};

  return <div className={`marketplace buyer-account-page ${settings ? 'is-settings' : 'is-profile'}`}>
    {imageEdit && <div className="buyer-image-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploadingImage) setImageEdit(null); }}><section className="buyer-image-editor" role="dialog" aria-modal="true" aria-labelledby="buyer-image-editor-title"><div className="buyer-image-editor-heading"><div><span>PROFILE CUSTOMISATION</span><h2 id="buyer-image-editor-title">Adjust your {imageEdit.type === 'avatar' ? 'photo' : 'banner'}</h2><p>Move, zoom and brighten the image until it feels right.</p></div><button type="button" aria-label="Close image editor" disabled={Boolean(uploadingImage)} onClick={() => setImageEdit(null)}>×</button></div><div className={`buyer-image-editor-preview ${imageEdit.type === 'avatar' ? 'is-avatar' : 'is-banner'}`}><img src={imageEdit.source} alt="Image crop preview" style={{ transform: `translate(${imageOffset.x * 12}%, ${imageOffset.y * 12}%) scale(${imageZoom})`, filter: `brightness(${imageBrightness}%)` }}/></div><div className="buyer-image-editor-controls"><label>Zoom <input type="range" min="1" max="3" step="0.01" value={imageZoom} onChange={(event) => setImageZoom(Number(event.target.value))}/><output>{imageZoom.toFixed(1)}×</output></label><label>Horizontal position <input type="range" min="-1" max="1" step="0.01" value={imageOffset.x} onChange={(event) => setImageOffset({ ...imageOffset, x: Number(event.target.value) })}/></label><label>Vertical position <input type="range" min="-1" max="1" step="0.01" value={imageOffset.y} onChange={(event) => setImageOffset({ ...imageOffset, y: Number(event.target.value) })}/></label><label>Brightness <input type="range" min="60" max="140" step="1" value={imageBrightness} onChange={(event) => setImageBrightness(Number(event.target.value))}/><output>{imageBrightness}%</output></label></div><div className="buyer-image-editor-actions"><button type="button" className="buyer-image-editor-reset" onClick={() => { setImageZoom(1); setImageOffset({ x: 0, y: 0 }); setImageBrightness(100); }}>Reset adjustments</button><div><button type="button" className="buyer-image-editor-cancel" disabled={Boolean(uploadingImage)} onClick={() => setImageEdit(null)}>Cancel</button><button type="button" className="buyer-account-save" disabled={Boolean(uploadingImage)} onClick={() => void saveProfileImageEdit()}>{uploadingImage ? 'Saving…' : 'Save image'} <MarketIcon name="arrow" size={16}/></button></div></div></section></div>}
    <header className="market-topbar"><button className="market-mobile-toggle" type="button" onClick={() => navigate('/shop')} aria-label="Back to marketplace"><MarketIcon name="arrow"/></button><Link className="market-logo" to="/shop" aria-label="UniMartX marketplace"><span className="market-logo-mark"><svg viewBox="0 0 48 48"><path d="M10 17h28l-2.5 25h-23L10 17Z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/></svg></span><span>unimart<span>x</span></span></Link><form className="market-search" onSubmit={(event) => { event.preventDefault(); navigate('/shop'); }}><span className="buyer-search-icon"><MarketIcon name="search"/></span><input aria-label="Search marketplace" placeholder="Search products and stores"/></form><DeliveryLocationPicker/><MarketplaceAccountNav/></header>
    <div className="buyer-account-layout"><AccountSidebar settings={settings} avatar={user?.avatar}/><main className="buyer-account-main">
      {!signedInAsBuyer ? <div className="buyer-account-gate"><div className="buyer-account-gate-mark">u</div><div className="market-overline">YOUR UNIMARTX ACCOUNT</div><h1>Sign in to see your {settings ? 'settings' : 'account'}.</h1><p>These pages are for buyer accounts. Sign in or head back to the marketplace to keep browsing.</p><div><Link className="market-detail-back" to="/auth/login" state={{ from: settings ? '/shop/settings' : '/shop/account' }}>Sign in to continue <MarketIcon name="arrow" size={16}/></Link><Link to="/shop">Back to the marketplace</Link></div></div> : <>
        {!settings && profile && <section className="buyer-profile-cover" aria-label="Your buyer profile">
          <div className="buyer-profile-cover-art" style={profile.profileBanner ? { backgroundImage: `linear-gradient(0deg,#0b213b99 0%,#10283d12 76%),url("${profile.profileBanner}")` } : undefined}><span className="buyer-profile-sun"/><span className="buyer-profile-hill buyer-profile-hill-back"/><span className="buyer-profile-hill buyer-profile-hill-front"/><span className="buyer-profile-cover-caption">GOOD THINGS, CLOSE TO HOME</span><label className="buyer-profile-cover-change"><input type="file" accept="image/*" aria-label="Choose a profile banner" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void changeProfileImage('profileBanner', file); }}/><MarketIcon name="sparkle" size={15}/>{uploadingImage === 'profileBanner' ? 'Uploading…' : 'Change banner'}</label></div>
          <div className="buyer-profile-identity"><div className="buyer-profile-avatar">{profile.avatar ? <img src={profile.avatar} alt={`${profile.firstName} ${profile.lastName}`}/> : <span>{profile.firstName?.[0]}{profile.lastName?.[0]}</span>}<label className="buyer-profile-avatar-change"><input type="file" accept="image/*" aria-label="Choose a profile photo" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void changeProfileImage('avatar', file); }}/><MarketIcon name="plus" size={16}/></label></div><div className="buyer-profile-name"><span>YOUR UNIMARTX PROFILE</span><h1>{profile?.firstName} {profile?.lastName}</h1><p>Buyer · Member since {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString('en-GH', { month: 'long', year: 'numeric' }) : 'joining UniMartX'}</p></div></div>
          <nav className="buyer-profile-tabs" aria-label="Profile sections"><Link to="/shop/account" className={!settings ? 'is-active' : ''}><MarketIcon name="user"/>Profile</Link><Link to="/shop/settings" className={settings ? 'is-active' : ''}><MarketIcon name="settings"/>Settings</Link><Link to="/shop"><MarketIcon name="compass"/>Discover <MarketIcon name="arrow" size={14}/></Link></nav>
        </section>}
        <div className="buyer-account-page-heading"><div><div className="market-overline">{settings ? 'MAKE IT YOURS' : 'ACCOUNT DETAILS'}</div><h2>{settings ? 'Your settings' : 'Your account'}<span>.</span></h2><p>{settings ? 'Make your UniMartX experience work for you.' : 'Keep your details up to date and your favourite finds close.'}</p></div>{profile && !settings && <Link className="buyer-account-edit-link" to="/shop/settings"><MarketIcon name="settings" size={16}/>Account settings <MarketIcon name="arrow" size={16}/></Link>}</div>
        {settings && <nav className="buyer-settings-tabs" aria-label="Settings sections"><a href="#account-updates" className="is-active"><MarketIcon name="sliders"/>Your updates</a><a href="#password-security"><MarketIcon name="lock"/>Password & security</a></nav>}
        {error && <div className="buyer-account-feedback is-error" role="status">{error}</div>}{notice && <div className="buyer-account-feedback is-success" role="status">{notice}</div>}
        {loading ? <div className="buyer-account-loading"><span className="market-detail-loader"/><p>Loading your account…</p></div> : settings ? <div className="buyer-account-settings-grid">
          <form id="account-updates" className="buyer-account-card buyer-preferences-form" onSubmit={savePreferences}><div className="buyer-account-card-heading"><span className="buyer-account-card-icon"><MarketIcon name="sparkle"/></span><div><h2>Your updates</h2><p>Choose what you’d like to hear about.</p></div></div>
            {([["orderUpdates", "Order updates", "Hear when an order changes status."], ["wishlistAlerts", "Saved finds", "Updates for items you’ve saved."], ["promotions", "Offers & community news", "New drops, offers, and marketplace highlights."], ["accountActivity", "Account activity", "Important updates about your account."], ["emailNotifications", "Email notifications", "Send your selected updates by email."], ["personalizedRecommendations", "Personalised picks", "Suggestions based on what you enjoy."]] as [keyof Preferences, string, string][]).map(([key, title, description]) => <label className="buyer-setting-row" key={key}><span><b>{title}</b><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })}/></label>)}
            <button className="buyer-account-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'} <MarketIcon name="arrow" size={16}/></button>
          </form>
          <form id="password-security" className="buyer-account-card buyer-password-form" onSubmit={changePassword}><div className="buyer-account-card-heading"><span className="buyer-account-card-icon"><MarketIcon name="lock"/></span><div><h2>Password & security</h2><p>Choose a strong password to help protect your account.</p></div></div><label>Current password<input type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}/></label><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}/><small>Use at least 8 characters, with uppercase, lowercase, number, and symbol.</small></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}/></label><button className="buyer-account-save" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update password'} <MarketIcon name="arrow" size={16}/></button></form>
        </div> : <div className="buyer-account-content-grid">
          <div className="buyer-account-main-column">
            <form className="buyer-account-card" onSubmit={saveAccount}><div className="buyer-account-card-heading"><span className="buyer-account-card-icon"><MarketIcon name="user"/></span><div><h2>Personal details</h2><p>Your information is only used to make shopping and delivery easier.</p></div></div><div className="buyer-account-fields"><label>First name<input required value={profile?.firstName || ''} onChange={(event) => setProfile(profile ? { ...profile, firstName: event.target.value } : profile)}/></label><label>Last name<input required value={profile?.lastName || ''} onChange={(event) => setProfile(profile ? { ...profile, lastName: event.target.value } : profile)}/></label><label>Email address<div className="buyer-account-email-field"><input value={profile?.email || ''} readOnly/><span>{profile?.emailVerified ? <><MarketIcon name="check" size={12}/>Verified</> : 'Account email'}</span></div></label><label>Phone number<input type="tel" autoComplete="tel" placeholder="024 000 0000" value={profile?.phone || ''} onChange={(event) => setProfile(profile ? { ...profile, phone: event.target.value } : profile)}/></label></div><button className="buyer-account-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save details'} <MarketIcon name="arrow" size={16}/></button></form>
            <form className="buyer-account-card buyer-address-form" key={`${profile?.id || ''}-${profile?.addresses?.length || 0}`} onSubmit={saveAddress}><div className="buyer-account-card-heading"><span className="buyer-account-card-icon"><MarketIcon name="location"/></span><div><h2>Delivery address</h2><p>Keep a preferred address ready for checkout.</p></div></div><div className="buyer-account-fields"><label className="buyer-account-field-wide">Street address<input name="street" autoComplete="street-address" defaultValue={address.street || ''} placeholder="House number and street" required/></label><label>City<input name="city" autoComplete="address-level2" defaultValue={address.city || ''} placeholder="Accra" required/></label><label>Region<input name="state" autoComplete="address-level1" defaultValue={address.state || ''} placeholder="Greater Accra" required/></label><label>Postcode<input name="zipCode" autoComplete="postal-code" defaultValue={address.zipCode || ''} placeholder="Optional"/></label><label>Country<input name="country" autoComplete="country-name" defaultValue={address.country || 'Ghana'} required/></label><input type="hidden" name="label" value={address.label || 'Home'}/></div><button className="buyer-account-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save address'} <MarketIcon name="arrow" size={16}/></button></form>
          </div>
          <aside className="buyer-account-summary-column"><div className="buyer-account-stats"><div className="market-overline">YOUR UNI MARTX</div><h2>Good finds<br/><em>start here.</em></h2><div className="buyer-account-stat-row"><span><b>{profile?.stats?.orders ?? 0}</b><small><MarketIcon name="bag" size={13}/>Orders placed</small></span><i/><span><b>{profile?.stats?.wishlist ?? 0}</b><small><MarketIcon name="heart" size={13}/>Saved finds</small></span></div></div><div className="buyer-account-help"><MarketIcon name="sparkle"/><b>Need a hand?</b><p>Our team is happy to help with your account or an order.</p><Link to="/marketing/contact">Talk to our team <MarketIcon name="arrow" size={15}/></Link></div></aside>
        </div>}
      </>}
      <footer className="market-footer"><Link className="market-logo" to="/shop"><span className="market-logo-mark">u</span><span>unimart<span>x</span></span></Link><span>Good things, close to home.</span><Link to="/auth/seller/register">Become a seller <MarketIcon name="arrow" size={15}/></Link></footer>
    </main></div>
  </div>;
}
