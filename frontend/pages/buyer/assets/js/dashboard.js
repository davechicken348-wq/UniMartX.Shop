// ═══════════════════════════════════════════
//  DASHBOARD — Buyer "Campus Shopping Hub"
// ═══════════════════════════════════════════

// ── Helpers ──────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getBaseUrl() {
  return (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
}

function getAuthToken() {
  const raw = localStorage.getItem('authData');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('authData');
      } else {
        const data = parsed.value ? JSON.parse(parsed.value) : parsed;
        if (data.token) return data.token;
      }
    } catch {}
  }
  const fallback = localStorage.getItem('authToken');
  if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
  return fallback;
}

function authHeaders() {
  const token = getAuthToken();
  return token
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function formatPrice(n) {
  const v = Number(n || 0);
  return `GH¢ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending': return 'status-badge status-badge--warning';
    case 'processing': return 'status-badge status-badge--info';
    case 'shipped': return 'status-badge status-badge--primary';
    case 'delivered': return 'status-badge status-badge--success';
    case 'cancelled': return 'status-badge status-badge--danger';
    case 'refunded': return 'status-badge status-badge--muted';
    default: return 'status-badge';
  }
}

function prettyCategory(cat) {
  return (cat || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Greeting ──────────────────────────────────
const _hour = new Date().getHours();
const _timeWord = _hour < 12 ? 'morning' : _hour < 17 ? 'afternoon' : 'evening';
const _greeting = `Good ${_timeWord}`;

function setGreetings(firstName) {
  const name = firstName || 'there';
  const tg = document.getElementById('topnav-greeting');
  if (tg) tg.textContent = `${_greeting}, ${name} 👋`;
  const hf = document.getElementById('hero-firstname');
  if (hf) hf.textContent = name;
  const ht = document.getElementById('hero-greeting-time');
  if (ht) ht.textContent = _timeWord;
}

// ── Mirror topnav user (name + avatar) into the hero ──
function mirrorTopnavToHero() {
  const heroName = document.getElementById('hero-firstname');
  const heroAvatar = document.getElementById('hero-avatar');
  const userName = document.getElementById('topnav-username');
  const userAvatar = document.getElementById('topnav-avatar');

  if (heroName && userName) {
    const sync = () => {
      const full = (userName.textContent || '').trim();
      const first = full ? full.split(' ')[0] : '';
      if (first) heroName.textContent = first;
    };
    sync();
    new MutationObserver(sync).observe(userName, { childList: true, characterData: true, subtree: true });
  }
  if (heroAvatar && userAvatar) {
    const sync = () => { heroAvatar.innerHTML = userAvatar.innerHTML; };
    sync();
    new MutationObserver(sync).observe(userAvatar, { childList: true, subtree: true });
  }
}

// ── Card renderers ────────────────────────────
function productCardHTML(p) {
  const img = p.image || (p.images && p.images[0]) || '';
  const cat = prettyCategory(p.category);
  const rating = p.rating ? Number(p.rating).toFixed(1) : '0.0';
  return `
    <a class="prod-card" href="../../public/shop/product-details.html?id=${encodeURIComponent(p.id)}">
      <div class="prod-card-media">
        ${img ? `<img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">` : '<div class="prod-card-cat" style="position:static;background:none;color:var(--text-3)">No image</div>'}
        <span class="prod-card-cat">${escapeHtml(cat)}</span>
      </div>
      <div class="prod-card-body">
        <p class="prod-card-store"><i data-lucide="store"></i> ${escapeHtml(p.storeName || 'Campus Store')}</p>
        <h3 class="prod-card-name">${escapeHtml(p.name)}</h3>
        <div class="prod-card-foot">
          <span class="prod-card-price">${formatPrice(p.price)}</span>
          <span class="prod-card-rating"><i data-lucide="star"></i> ${rating}</span>
        </div>
      </div>
    </a>`;
}

function storeCardHTML(s) {
  const avatarStyle = s.storeAvatar
    ? `background-image:url('${s.storeAvatar}');background-size:cover;background-position:center;`
    : `background:${s.storeColor || 'linear-gradient(135deg,#10b981,#34d399)'};`;
  const initial = (s.storeName || 'S').charAt(0).toUpperCase();
  const rating = s.avgRating ? Number(s.avgRating).toFixed(1) : '0.0';
  const items = s.productCount || 0;
  return `
    <a class="store-card" href="../../seller/public/profile/profile.html?sellerId=${encodeURIComponent(s.id)}">
      <div class="store-card-banner" style="background:${s.storeColor || 'linear-gradient(135deg,#3b82f6,#2563eb)'}"></div>
      <div class="store-card-avatar" style="${avatarStyle}">${s.storeAvatar ? '' : escapeHtml(initial)}</div>
      <div class="store-card-body">
        <div class="store-card-top">
          <h3 class="store-card-name">${escapeHtml(s.storeName)}</h3>
          <span class="store-card-status"><i data-lucide="circle"></i> Open</span>
        </div>
        <p class="store-card-cat">${escapeHtml(prettyCategory(s.category))}</p>
        <p class="store-card-meta"><i data-lucide="star"></i> ${rating} · ${items} item${items === 1 ? '' : 's'}</p>
        <span class="store-card-cta">View Store <i data-lucide="arrow-right"></i></span>
      </div>
    </a>`;
}

const DISCOVERY_CATS = [
  ['Electronics', 'electronics'],
  ['Fashion', 'fashion'],
  ['Clothing', 'clothing'],
  ['Books', 'books'],
  ['Food', 'food'],
  ['Beauty', 'beauty'],
  ['Sports', 'sports'],
  ['Home', 'home'],
  ['Art', 'art'],
];

function discoveryHTML(title) {
  const chips = DISCOVERY_CATS.map(([label, cat]) =>
    `<a href="../../public/shop/shop.html?category=${cat}">${label}</a>`).join('');
  return `<p class="discovery-title">${title}</p><div class="discovery-chips">${chips}</div>`;
}

function renderProductGrid(gridEl, emptyEl, products, emptyTitle) {
  if (!gridEl) return;
  if (products && products.length) {
    gridEl.innerHTML = products.map(productCardHTML).join('');
    gridEl.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';
  } else {
    gridEl.innerHTML = '';
    gridEl.style.display = 'none';
    if (emptyEl) { emptyEl.innerHTML = discoveryHTML(emptyTitle); emptyEl.style.display = ''; }
  }
  lucide.createIcons();
}

function renderStoreGrid(gridEl, emptyEl, sellers) {
  if (!gridEl) return;
  const card = document.getElementById('followed-sellers-card');
  if (sellers && sellers.length) {
    gridEl.innerHTML = sellers.map(storeCardHTML).join('');
    gridEl.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';
    if (card) card.style.display = '';
  } else {
    gridEl.innerHTML = '';
    gridEl.style.display = 'none';
    if (emptyEl) { emptyEl.innerHTML = discoveryHTML("You're not following any stores yet — discover campus sellers"); emptyEl.style.display = ''; }
    if (card) card.style.display = '';
  }
  lucide.createIcons();
}

// ── Recent orders ─────────────────────────────
function renderRecentOrders(orders) {
  const container = document.querySelector('.orders-list');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2rem 1rem;text-align:center;">
        <i data-lucide="package" style="width:40px;height:40px;color:var(--text-3);margin-bottom:0.75rem;"></i>
        <p style="color:var(--text-2);font-size:0.9rem;">No orders yet</p>
        <a href="../../public/shop/shop.html" class="btn btn-ghost btn-sm" style="margin-top:0.5rem;">Start Shopping</a>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = orders.map(order => {
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const firstItem = order.items[0];
    const productName = firstItem?.product?.name || 'Item';
    const orderUrl = `../orders/order-details.html?id=${order.id}`;
    return `
      <a class="order-row" href="${orderUrl}" data-order-id="${order.id}">
        <div class="order-img">
          ${firstItem?.product?.image
            ? `<img src="${firstItem.product.image}" alt="${escapeHtml(productName)}">`
            : '<i data-lucide="package"></i>'}
        </div>
        <div class="order-info">
          <div class="order-name">Order #${order.orderNumber}</div>
          <div class="order-meta">
            <span>${itemCount} item${itemCount > 1 ? 's' : ''}</span>
            <span class="${getStatusBadgeClass(order.status)}">${order.status.replace('_', ' ')}</span>
          </div>
        </div>
        <div class="order-action"><i data-lucide="chevron-right"></i></div>
      </a>`;
  }).join('');
  lucide.createIcons();
}

// ── Current order tracking preview ────────────
const TRACK_STEPS = ['pending', 'processing', 'shipped', 'delivered'];
function renderCurrentOrder(order) {
  const wrap = document.getElementById('current-order');
  if (!wrap) return;
  if (!order || !TRACK_STEPS.includes(order.status)) { wrap.innerHTML = ''; return; }

  const idx = TRACK_STEPS.indexOf(order.status);
  const step2Label = { pending: 'Confirmed', processing: 'Preparing', shipped: 'Shipped' }[order.status] || 'Confirmed';
  const item = (order.items && order.items[0]) || {};
  const product = item.product || {};
  const img = product.image || '';
  const name = product.name || 'Order';
  const store = order.seller?.storeName || 'Campus Seller';
  const amount = order.totalAmount != null ? formatPrice(order.totalAmount) : '';

  const orderedDone = 'done';
  const deliveredDone = order.status === 'delivered' ? 'done' : '';
  const step2State = idx >= 3 ? 'done' : 'active';
  const line1Done = idx >= 1 ? 'done' : '';
  const line2Done = idx >= 3 ? 'done' : '';

  wrap.innerHTML = `
    <div class="track-card">
      <div class="track-head">
        <div>
          <p class="track-eyebrow">Current Order</p>
          <h3 class="track-title">#${order.orderNumber}</h3>
        </div>
        <span class="${getStatusBadgeClass(order.status)}">${order.status.replace('_', ' ')}</span>
      </div>
      <div class="track-product">
        ${img ? `<img src="${img}" alt="${escapeHtml(name)}">` : ''}
        <div>
          <p class="track-name">${escapeHtml(name)}</p>
          <p class="track-seller">Seller: ${escapeHtml(store)}</p>
        </div>
        <span class="track-amount">${amount}</span>
      </div>
      <div class="track-steps">
        <div class="track-step ${orderedDone}"><span class="dot"><i data-lucide="check"></i></span><span class="lbl">Ordered</span></div>
        <div class="track-line ${line1Done}"></div>
        <div class="track-step ${step2State}"><span class="dot"><i data-lucide="circle"></i></span><span class="lbl">${step2Label}</span></div>
        <div class="track-line ${line2Done}"></div>
        <div class="track-step ${deliveredDone}"><span class="dot"><i data-lucide="check"></i></span><span class="lbl">Delivered</span></div>
      </div>
      <a class="btn btn-primary btn-sm" href="../orders/order-details.html?id=${order.id}">Track Order</a>
    </div>`;
  lucide.createIcons();
}

// ── Profile completion ───────────────────────
function updateProfileCompletion(completion) {
  if (!completion) return;
  const pctEl = document.querySelector('.completion-pct');
  const barEl = document.querySelector('.completion-bar');
  if (pctEl) pctEl.textContent = `${completion.percentage}%`;
  if (barEl) barEl.style.width = `${completion.percentage}%`;
  const listItems = document.querySelectorAll('.completion-item');
  const items = completion.items || [];
  listItems.forEach((item, index) => {
    if (index < items.length) {
      const { done, label } = items[index];
      item.classList.toggle('done', done);
      const iconName = done ? 'check-circle' : 'circle';
      item.innerHTML = `<i data-lucide="${iconName}"></i><span>${label}</span>`;
    }
  });
  lucide.createIcons();
}

// ── Data fetchers ─────────────────────────────
async function fetchJSON(url, withAuth = true) {
  const res = await fetch(`${getBaseUrl()}${url}`, {
    credentials: 'include',
    headers: withAuth ? authHeaders() : { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

async function loadMarketplaceContent() {
  // Trending + Recommended (public, no auth needed)
  try {
    const trending = await fetchJSON('/api/public/products/trending', false);
    renderProductGrid(
      document.getElementById('trending-grid'),
      document.getElementById('trending-empty'),
      (trending && trending.data) || [],
      "Trending data is loading — explore what students love"
    );
  } catch (e) {
    renderProductGrid(document.getElementById('trending-grid'), document.getElementById('trending-empty'), [], "Couldn't load trending — explore the shop");
  }

  try {
    const recommended = await fetchJSON('/api/public/products?sort=popular&limit=8', false);
    renderProductGrid(
      document.getElementById('recommended-grid'),
      document.getElementById('recommended-empty'),
      (recommended && recommended.data) || [],
      "We'll personalize recommendations as you shop"
    );
  } catch (e) {
    renderProductGrid(document.getElementById('recommended-grid'), document.getElementById('recommended-empty'), [], "Explore the shop to get recommendations");
  }

  // Recently viewed (localStorage)
  try {
    const raw = localStorage.getItem('unimartx_recently_viewed');
    const list = raw ? JSON.parse(raw) : [];
    renderProductGrid(
      document.getElementById('recent-grid'),
      document.getElementById('recent-empty'),
      Array.isArray(list) ? list : [],
      "You haven't viewed anything yet — start exploring"
    );
  } catch (e) {
    renderProductGrid(document.getElementById('recent-grid'), document.getElementById('recent-empty'), [], "You haven't viewed anything yet");
  }
}

async function loadFollowedSellers() {
  const token = getAuthToken();
  if (!token) return;
  try {
    const json = await fetchJSON('/api/follow/sellers');
    renderStoreGrid(
      document.getElementById('followed-grid'),
      document.getElementById('followed-empty'),
      (json && json.data) || []
    );
    const fc = document.getElementById('stat-following-count');
    if (fc && json && json.data) fc.textContent = json.data.length;
  } catch (e) {
    renderStoreGrid(document.getElementById('followed-grid'), document.getElementById('followed-empty'), []);
  }
}

async function loadCurrentOrder() {
  try {
    const order = await fetchJSON('/api/buyer/orders/latest');
    renderCurrentOrder(order);
  } catch (e) {
    const wrap = document.getElementById('current-order');
    if (wrap) wrap.innerHTML = '';
  }
}

async function loadMessagesCount() {
  try {
    const json = await fetchJSON('/api/notifications/unread-count');
    const el = document.getElementById('chip-messages');
    if (el && json && typeof json.count === 'number') el.textContent = json.count;
  } catch (e) {}
}

// ── Main dashboard render ─────────────────────
function renderDashboard(data) {
  const { stats, recentOrders, profileCompletion, liveStats } = data;

  // chips
  const setChip = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? 0; };
  setChip('chip-orders', stats.totalOrders);
  setChip('chip-wishlist', stats.wishlistItems);
  setChip('chip-following', stats.followingSellers);

  // live stats
  if (liveStats) {
    const np = document.getElementById('live-new-products');
    const fa = document.getElementById('live-follow-active');
    if (np) np.textContent = liveStats.newProductsToday ?? 0;
    if (fa) fa.textContent = liveStats.followedSellersActive ?? 0;
  }

  const firstName = document.getElementById('topnav-username')?.textContent?.split(' ')[0];
  setGreetings(firstName);

  updateProfileCompletion(profileCompletion);
  renderRecentOrders(recentOrders);
}

// ── Init ──────────────────────────────────────
let _pollId = null;

async function fetchDashboard(skipLoading = false) {
  try {
    const data = await fetchJSON('/api/buyer/dashboard');
    renderDashboard(data);
    return data;
  } catch (err) {
    if (!skipLoading) console.error('Dashboard fetch error:', err);
    return null;
  }
}

async function init() {
  lucide.createIcons();
  mirrorTopnavToHero();

  await fetchDashboard();
  await Promise.allSettled([
    loadMarketplaceContent(),
    loadFollowedSellers(),
    loadCurrentOrder(),
    loadMessagesCount(),
  ]);

  // keep marketplace content fresh when returning to the tab
  window.addEventListener('focus', () => {
    fetchDashboard(true);
    loadMarketplaceContent();
    loadFollowedSellers();
    loadCurrentOrder();
  });

  // lightweight live sync for stats / orders
  _pollId = setInterval(() => {
    fetchDashboard(true);
    loadCurrentOrder();
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fetchDashboard(true);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => { if (_pollId) clearInterval(_pollId); });
