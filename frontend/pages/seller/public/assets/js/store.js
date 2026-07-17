// PUBLIC SELLER STORE PAGE — UnimartX
// Also provides window.initStore for the public seller profile page product preview.

const STORE_API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

function apiFetchWithTimeout(url, options = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    fetch(url, { ...options, signal: controller.signal, credentials: 'include' })
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

function getCurrentUser() {
  const raw = localStorage.getItem('authData');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('authData');
      } else {
        const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
        if (authData.token) return authData;
      }
    } catch {}
  }
  const token = localStorage.getItem('authToken');
  if (token && token !== 'undefined' && token !== 'null') return { token };
  return null;
}

function getToken() {
  const user = getCurrentUser();
  return user?.token || null;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:var(--bg-2);border:1px solid var(--primary);color:var(--text);padding:1rem 1.5rem;border-radius:var(--radius);box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:999;transform:translateY(120%);opacity:0;transition:transform 0.3s,opacity 0.3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#6366f1,#a78bfa)',
  'linear-gradient(135deg,#f59e0b,#fcd34d)',
  'linear-gradient(135deg,#ec4899,#f9a8d4)',
  'linear-gradient(135deg,#0ea5e9,#38bdf8)',
  'linear-gradient(135deg,#f97316,#fb923c)',
  'linear-gradient(135deg,#84cc16,#bef264)',
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
];

function storeGradient(s) {
  if (s.storeColor) return s.storeColor;
  const idx = (s.id || s.sellerId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[idx];
}

// ── Color helpers (so the seller's custom store color themes the page) ──
function hexToRgb(hex) {
  let h = (hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const int = parseInt(h, 16);
  if (isNaN(int)) return null;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function darkenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = 1 - (percent || 0) / 100;
  const r = Math.max(0, Math.round(rgb.r * f));
  const g = Math.max(0, Math.round(rgb.g * f));
  const b = Math.max(0, Math.round(rgb.b * f));
  return `rgb(${r}, ${g}, ${b})`;
}

function mixHex(hex1, hex2, weight) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return hex1;
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(a.r + (b.r - a.r) * w);
  const g = Math.round(a.g + (b.g - a.g) * w);
  const bl = Math.round(a.b + (b.b - a.b) * w);
  return `rgb(${r}, ${g}, ${bl})`;
}

function applyStoreTheme(profile) {
  if (!profile) return;
  const root = document.documentElement;
  // Fall back to the brand default so the page is always tinted (never plain white)
  const color = profile.storeColor || '#f59e0b';
  root.style.setProperty('--primary', color);
  root.style.setProperty('--primary-d', darkenColor(color, 12));
  root.style.setProperty('--primary-l', hexToRgba(color, 0.15));
  // Tint the white surfaces with the store color so the page is themed per-seller
  root.style.setProperty('--bg', mixHex(color, '#ffffff', 0.82));
  root.style.setProperty('--bg-2', mixHex(color, '#ffffff', 0.90));
  root.style.setProperty('--bg-3', mixHex(color, '#ffffff', 0.74));
  root.style.setProperty('--bg-4', mixHex(color, '#ffffff', 0.66));
  root.style.setProperty('--border', mixHex(color, '#e7e5e4', 0.72));
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function stars(rating) {
  if (rating == null || isNaN(rating)) return '';
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function categoryLabel(cat) {
  const map = { electronics:'Electronics', fashion:'Fashion', books:'Books', beauty:'Beauty',
                food:'Food & Snacks', sports:'Sports', home:'Home & Living', clothing:'Fashion', other:'Other' };
  return map[cat] || cat || 'Other';
}

function categoryIcon(cat) {
  const map = { electronics:'💻', fashion:'👕', clothing:'👕', books:'📚',
                beauty:'💄', food:'🍔', sports:'⚽', home:'🛋️', other:'📦' };
  return map[cat] || '📦';
}

function formatPrice(price) {
  return 'GH₵' + Number(price).toFixed(2);
}

function formatRelativeDate(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}

function formatJoinDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function businessHoursLabel(v) {
  const map = {
    'mon-fri-9-17': 'Mon–Fri, 9:00–17:00',
    'mon-sat-8-18': 'Mon–Sat, 8:00–18:00',
    'flexible': 'Flexible / By appointment',
    '247': '24 / 7',
  };
  return map[v] || v || '';
}

const DELIVERY_OPTION_LABELS = {
  pickup: 'Pickup',
  campus_delivery: 'Campus Delivery',
  standard: 'Delivery',
};

function parseDeliveryOptions(raw) {
  if (!raw) return [];
  let arr = [];
  try { arr = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.map(o => DELIVERY_OPTION_LABELS[o] || o).filter(Boolean);
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function calcDiscount(price, comparePrice) {
  if (!comparePrice || comparePrice <= price) return null;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ═══════════════════════════════════════════
// PRODUCT CARD BUILDER (shared)
// ═══════════════════════════════════════════
function buildProductCard(product) {
  const discount = calcDiscount(product.price, product.comparePrice);
  const stockLabel = product.stock > 0 ? (product.stock <= 5 ? `Only ${product.stock} left` : 'In stock') : 'Out of stock';
  const stockClass = product.stock > 0 ? (product.stock <= 5 ? 'low' : '') : 'out';
  const isNew = product.createdAt ? (Date.now() - new Date(product.createdAt).getTime() < 7 * 86400000) : false;

  const badges = [];
  if (discount) badges.push(`<span class="product-badge product-badge--sale">-${discount}%</span>`);
  if (isNew) badges.push(`<span class="product-badge product-badge--new">New</span>`);

  return `
  <a class="product-card reveal" href="../../../public/shop/product-details.html?id=${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)}">
    <div class="product-card-img">
      ${product.image
        ? `<img class="product-card-img-el" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none';this.parentNode.querySelector('.img-placeholder').style.display='flex';">`
        : ''}
      <div class="img-placeholder"${product.image ? ' style="display:none"' : ''}><i data-lucide="package"></i></div>
      ${badges.length ? `<div class="product-card-badges">${badges.join('')}</div>` : ''}
      <button class="product-card-save product-save" data-product-id="${escapeHtml(product.id)}" aria-label="Save product"><i data-lucide="heart"></i></button>
    </div>
    <div class="product-card-body">
      <span class="product-card-category">${escapeHtml(categoryLabel(product.category))}</span>
      <h3 class="product-card-title">${escapeHtml(product.name)}</h3>
      <div class="product-card-rating">
        <span class="stars">${product.rating ? stars(product.rating) : ''}</span>
        ${product.rating ? `<span class="rating-count">${product.rating.toFixed(1)} (${product.reviewCount || 0})</span>` : ''}
      </div>
      <div class="product-card-price-row">
        <span class="product-card-price">${formatPrice(product.price)}</span>
        ${product.comparePrice ? `<span class="product-card-price-old">${formatPrice(product.comparePrice)}</span>` : ''}
        ${discount ? `<span class="product-card-discount">-${discount}%</span>` : ''}
      </div>
      <span class="product-card-stock ${stockClass}">${stockLabel}</span>
    </div>
  </a>`;
}

// ═══════════════════════════════════════════
// SHARED: render products into a grid
// ═══════════════════════════════════════════
function renderProductsInto(containerId, products, total, emptyId, loadMoreId) {
  const grid = document.getElementById(containerId);
  const emptyEl = emptyId ? document.getElementById(emptyId) : null;
  const loadWrap = loadMoreId ? document.getElementById(loadMoreId) : null;

  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (loadWrap) loadWrap.classList.add('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');
  grid.innerHTML = products.map(buildProductCard).join('');
  if (loadWrap) loadWrap.classList.toggle('hidden', products.length >= total);

  if (window.lucide) lucide.createIcons();
  observeRevealElements(grid);
  if (window.WishlistAPI) window.WishlistAPI.init();
}

// ═══════════════════════════════════════════
// SHARED: review rendering
// ═══════════════════════════════════════════
function renderReviewsInto(reviews, ratingBreakdown, totalReviews, pagination, opts = {}) {
  const {
    scoreBigId = 'score-big',
    scoreStarsId = 'score-stars',
    reviewsBarsId = 'reviews-bars',
    reviewsListId = 'reviews-list',
    reviewsCountSubId = 'reviews-count-sub',
    loadMoreBtnId = 'load-more-reviews',
    avgRating,
  } = opts;

  const scoreBig = document.getElementById(scoreBigId);
  const scoreStars = document.getElementById(scoreStarsId);
  const reviewsBars = document.getElementById(reviewsBarsId);
  const reviewsList = document.getElementById(reviewsListId);
  const reviewsCountSub = document.getElementById(reviewsCountSubId);
  const loadMoreBtn = document.getElementById(loadMoreBtnId);

  const displayAvg = avgRating != null ? avgRating : (
    ratingBreakdown && totalReviews > 0
      ? Object.entries(ratingBreakdown).reduce((sum, [k, v]) => sum + (Number(k) * Number(v)), 0) / totalReviews
      : null
  );

  if (scoreBig) scoreBig.textContent = displayAvg != null ? Number(displayAvg).toFixed(1) : '—';
  if (scoreStars) scoreStars.textContent = displayAvg != null ? stars(displayAvg) : '☆☆☆☆☆';
  if (reviewsCountSub) reviewsCountSub.textContent = `${totalReviews} review${totalReviews !== 1 ? 's' : ''}`;

  if (reviewsBars && ratingBreakdown) {
    reviewsBars.innerHTML = [5, 4, 3, 2, 1].map(n => `
      <div class="rating-bar-row">
        <span>${n}★</span>
        <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${ratingBreakdown[n] ?? 0}%"></div></div>
        <span>${ratingBreakdown[n] ?? 0}%</span>
      </div>`).join('');
  }

  if (!reviewsList) return;

  if (!reviews.length) {
    reviewsList.innerHTML = '<p class="reviews-empty">No reviews yet.</p>';
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    return;
  }

  reviewsList.innerHTML = reviews.map(r => {
    const initials = (r.buyer?.name || 'B').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const avatarContent = r.buyer?.avatar
      ? `<img src="${escapeHtml(r.buyer.avatar)}" alt="${escapeHtml(r.buyer?.name || 'Buyer')}" loading="lazy">`
      : initials;

    return `
    <article class="review-item">
      <div class="review-avatar">${avatarContent}</div>
      <div class="review-body">
        <div class="review-header">
          <span class="review-author">${escapeHtml(r.buyer?.name || 'Buyer')}</span>
          <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          <span class="review-date">${formatRelativeDate(r.createdAt)}</span>
        </div>
        <p class="review-text">${escapeHtml(r.comment || '')}</p>
        <span class="review-product-name">${escapeHtml(r.productName || '')}</span>
      </div>
    </article>`;
  }).join('');

  if (window.lucide) lucide.createIcons();
  if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', !pagination.hasMore);
}

// ═══════════════════════════════════════════
// PROFILE PAGE EXPORT: initStore
// ═══════════════════════════════════════════
window.initStore = function({ products, reviews, categorycounts, pagination, sellerId, isPreview }) {
  const grid = document.getElementById('store-products');
  if (!grid) return;

  const previewProducts = products || [];
  renderProductsInto('store-products', previewProducts, previewProducts.length, 'no-results', null);

  if (reviews && reviews.length && typeof renderReviewsInto === 'function') {
    const totalReviews = (reviews || []).length;
    renderReviewsInto(reviews, {}, totalReviews, pagination || { hasMore: false }, {
      reviewsListId: 'reviews-list',
      loadMoreBtnId: 'load-more-reviews',
    });
  }
};

// ═══════════════════════════════════════════
// STORE PAGE: full initialization
// ═══════════════════════════════════════════
const state = {
  sellerId: null,
  slug: '',
  profile: null,
  stats: null,
  products: [],
  categoryCounts: {},
  search: '',
  category: 'all',
  sort: 'newest',
  view: 'grid',
  page: 1,
  total: 0,
  limit: 12,
  loading: false,
};

const profileReviewState = {
  reviews: [],
  pagination: { page: 1, limit: 5, total: 0, hasMore: false },
  loadingMore: false,
};

// ═══════════════════════════════════════════
// RENDER: Store Hero
// ═══════════════════════════════════════════
function renderStoreHero(profile, stats) {
  applyStoreTheme(profile);

  const banner = document.getElementById('store-hero-bg');
  if (banner) {
    if (profile.storeBanner) {
      banner.style.backgroundImage = `url('${escapeHtml(profile.storeBanner)}')`;
      banner.style.backgroundSize = 'cover';
      banner.style.backgroundPosition = 'center';
    } else {
      banner.style.background = storeGradient(profile);
    }
  }

  const avatarEl = document.getElementById('store-avatar');
  if (avatarEl) {
    if (profile.storeAvatar) {
      avatarEl.innerHTML = `<img src="${escapeHtml(profile.storeAvatar)}" alt="${escapeHtml(profile.storeName)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentNode.textContent='${getInitials(profile.storeName)}'">`;
    } else {
      avatarEl.textContent = getInitials(profile.storeName);
      avatarEl.style.background = storeGradient(profile);
      avatarEl.style.color = '#fff';
    }
  }

  const nameEl = document.getElementById('store-hero-name');
  if (nameEl) nameEl.textContent = profile.storeName || 'Store';

  const descEl = document.getElementById('store-hero-desc');
  const descToggle = document.getElementById('store-desc-toggle');
  const fullDesc = profile.storeDescription || '';
  const DESC_LIMIT = 160;
  if (descEl) {
    descEl.textContent = fullDesc;
    if (descToggle) descToggle.classList.toggle('hidden', fullDesc.length <= DESC_LIMIT);
  }

  const taglineEl = document.getElementById('store-hero-tagline');
  if (taglineEl) {
    taglineEl.textContent = profile.storeTagline || '';
    taglineEl.classList.toggle('hidden', !profile.storeTagline);
  }

  const badgesEl = document.getElementById('store-hero-badges');
  if (badgesEl) {
    let badgesHtml = '';
    if (profile.verified) badgesHtml += `<span class="store-hero-badge store-hero-badge--verified"><i data-lucide="badge-check"></i> Verified</span>`;
    if (stats && stats.avgRating >= 4.8) badgesHtml += `<span class="store-hero-badge store-hero-badge--top"><i data-lucide="star"></i> Top Rated</span>`;
    badgesEl.innerHTML = badgesHtml;
  }

  const tagsEl = document.getElementById('store-hero-tags');
  if (tagsEl) {
    const tags = [];
    if (profile.category) tags.push(`<span class="store-hero-tag"><i data-lucide="tag"></i> ${escapeHtml(categoryLabel(profile.category))}</span>`);
    if (profile.city) tags.push(`<span class="store-hero-tag"><i data-lucide="map-pin"></i> ${escapeHtml(profile.city)}${profile.country ? ', ' + escapeHtml(profile.country) : ''}</span>`);
    if (profile.joinedDate) tags.push(`<span class="store-hero-tag"><i data-lucide="calendar"></i> Joined ${formatJoinDate(profile.joinedDate)}</span>`);
    tagsEl.innerHTML = tags.join('');
  }

  const statsEl = document.getElementById('store-hero-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="store-hero-stat">
        <strong>${stats.productCount ?? 0}</strong>
        <span>Products</span>
      </div>
      <div class="store-hero-stat">
        <strong>${stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'}</strong>
        <span>Rating</span>
      </div>
      <div class="store-hero-stat">
        <strong>${stats.totalReviews ?? 0}</strong>
        <span>Reviews</span>
      </div>
      <div class="store-hero-stat">
        <strong>${stats.totalSales ?? 0}</strong>
        <span>Sales</span>
      </div>
    `;
  }

  document.title = `${profile.storeName || 'Store'} | UnimartX`;
  storeProfile = profile;
}

let storeProfile = null;

function showStoreAbout(profile) {
  const aboutEl = document.getElementById('store-about');
  const bodyEl = document.getElementById('store-about-body');
  const titleEl = document.getElementById('store-about-title');
  if (!aboutEl || !bodyEl) return;
  bodyEl.textContent = profile.storeDescription || '';
  if (titleEl) titleEl.innerHTML = `About <span>${escapeHtml(profile.storeName || 'the store')}</span>`;
  aboutEl.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
  aboutEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════
// RENDER: Store Policies
// ═══════════════════════════════════════════
const POLICY_FIELDS = [
  { key: 'processingTime', icon: 'clock', title: 'Processing Time' },
  { key: 'shippingPolicy', icon: 'truck', title: 'Shipping Policy' },
  { key: 'returnPolicy', icon: 'rotate-ccw', title: 'Return Policy' },
  { key: 'refundPolicy', icon: 'badge-dollar-sign', title: 'Refund Policy' },
  { key: 'exchangePolicy', icon: 'repeat', title: 'Exchange Policy' },
  { key: 'cancellationPolicy', icon: 'x-circle', title: 'Cancellation Policy' },
];

function renderStorePolicies(profile) {
  const section = document.getElementById('store-policies');
  const list = document.getElementById('store-policies-list');
  if (!section || !list) return;

  const items = POLICY_FIELDS
    .filter(f => profile[f.key])
    .map((f, i) => ({ ...f, value: profile[f.key], open: i === 0 }));

  if (!items.length) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  list.innerHTML = items.map(it => `
    <div class="policy-accordion ${it.open ? 'open' : ''}">
      <button type="button" class="policy-accordion-header" aria-expanded="${it.open}">
        <span class="policy-icon"><i data-lucide="${it.icon}"></i></span>
        <span class="policy-title">${escapeHtml(it.title)}</span>
        <i data-lucide="chevron-down" class="policy-chevron"></i>
      </button>
      <div class="policy-accordion-body">
        <p>${escapeHtml(it.value)}</p>
      </div>
    </div>`).join('');

  list.querySelectorAll('.policy-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const accordion = header.closest('.policy-accordion');
      const isOpen = accordion.classList.toggle('open');
      header.setAttribute('aria-expanded', String(isOpen));
    });
  });

  if (window.lucide) lucide.createIcons();
}

// ═══════════════════════════════════════════
// RENDER: Category Tabs
// ═══════════════════════════════════════════
function renderCategoryTabs(products, categoryCounts) {
  const tabsEl = document.getElementById('store-filter-tabs');
  if (!tabsEl) return;

  const allCount = products.length;
  let html = `<button class="store-tab active" data-filter="all"><span class="tab-emoji">🛍️</span>All <span class="tab-num" id="tab-count-all">${allCount}</span></button>`;

  const catOrder = ['electronics', 'fashion', 'books', 'beauty', 'food', 'sports', 'home', 'other'];
  const cats = Object.entries(categoryCounts || {}).sort((a, b) => {
    const ia = catOrder.indexOf(a[0]);
    const ib = catOrder.indexOf(b[0]);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  cats.forEach(([cat, count]) => {
    html += `<button class="store-tab" data-filter="${escapeHtml(cat)}"><span class="tab-emoji">${categoryIcon(cat)}</span>${escapeHtml(categoryLabel(cat))} <span class="tab-num">${count}</span></button>`;
  });

  tabsEl.innerHTML = html;
}

// ═══════════════════════════════════════════
// RENDER: Products
// ═══════════════════════════════════════════
function renderProducts(products) {
  renderProductsInto('store-products', products, state.total, 'no-results', 'load-more-wrap');
  document.getElementById('results-count').textContent = state.total;
}

function applyFiltersAndRender() {
  let filtered = [...state.products];

  if (state.category !== 'all') {
    filtered = filtered.filter(p => p.category === state.category);
  }

  if (state.search) {
    const q = state.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  switch (state.sort) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'popular':
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  state.total = filtered.length;
  renderProducts(filtered);
}

// ═══════════════════════════════════════════
// BROWSE MORE SHOPS
// ═══════════════════════════════════════════
function buildMiniStoreCard(store) {
  const gradient = store.storeColor || storeGradient(store);
  const bannerStyle = store.storeBanner
    ? `background-image:url('${escapeHtml(store.storeBanner)}');background-size:cover;background-position:center`
    : `background:${gradient}`;

  const avatarInitial = (store.storeName || '?').charAt(0).toUpperCase();
  const avatarStyle = store.storeAvatar
    ? `background-image:url('${escapeHtml(store.storeAvatar)}');background-size:cover;background-position:center`
    : `background:${gradient}`;

  const ratingStars = store.avgRating ? stars(store.avgRating) : '';
  const storeUrl = `/pages/seller/public/store/store.html?sellerId=${escapeHtml(store.id)}&slug=${escapeHtml(store.slug || '')}`;

  return `
  <a class="mini-store-card reveal" href="${storeUrl}" aria-label="Store ${escapeHtml(store.storeName)}">
    <div class="mini-store-banner" style="${bannerStyle}" aria-hidden="true"></div>
    <div class="mini-store-body">
      <h3 class="mini-store-name">${escapeHtml(store.storeName)}</h3>
      <div class="mini-store-meta">
        ${store.avgRating ? `<span><i data-lucide="star" aria-hidden="true"></i> ${store.avgRating.toFixed(1)}</span>` : ''}
        <span><i data-lucide="package" aria-hidden="true"></i> ${store.productCount || 0} products</span>
      </div>
    </div>
  </a>`;
}

function renderMiniStoreSkeletons() {
  const grid = document.getElementById('more-shops-grid');
  if (!grid) return;
  grid.innerHTML = Array(3).fill(`
    <div class="store-skeleton-card">
      <div class="store-skeleton-banner skel-banner"></div>
      <div class="store-skeleton-body">
        <div class="store-skeleton-line skel sm"></div>
        <div class="store-skeleton-line skel md"></div>
        <div class="store-skeleton-line skel sm"></div>
      </div>
    </div>`).join('');
}

async function loadBrowseMoreShops() {
  const grid = document.getElementById('more-shops-grid');
  if (!grid) return;

  renderMiniStoreSkeletons();

  try {
    const res = await apiFetchWithTimeout(`${STORE_API_BASE}/api/public/stores?limit=12&sort=featured`);
    const json = await res.json();
    if (!res.ok || !json.success) return;

    const otherStores = (json.data || []).filter(s => s.id !== state.sellerId).slice(0, 3);
    if (!otherStores.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:2rem">No other shops available right now.</p>';
      return;
    }

    grid.innerHTML = otherStores.map(buildMiniStoreCard).join('');
    if (window.lucide) lucide.createIcons();
    observeRevealElements(grid);
  } catch (e) {
    console.error('Failed to load browse-more shops:', e);
  }
}

// ═══════════════════════════════════════════
// FETCH: Load full store data
// ═══════════════════════════════════════════
async function loadStoreData() {
  const urlParams = new URLSearchParams(window.location.search);
  const sellerId = urlParams.get('sellerId');
  const slug = urlParams.get('slug') || '';

  if (!sellerId) {
    showErrorBanner('No seller specified in URL.');
    return;
  }

  state.sellerId = sellerId;
  state.slug = slug;
  window._currentSellerId = sellerId;

  try {
    const res = await apiFetchWithTimeout(`${STORE_API_BASE}/api/public/seller/${encodeURIComponent(sellerId)}`);
    const json = await res.json();

    if (!res.ok || !json.success) {
      showErrorBanner(json.error || 'Failed to load store.');
      return;
    }

    const { profile, stats, products, reviews, ratingBreakdown, pagination, categorycounts } = json.data;

    state.profile = profile;
    state.stats = stats;
    state.products = products || [];
    state.categoryCounts = categorycounts || {};
    state.total = products.length;

    profileReviewState.sellerId = sellerId;
    profileReviewState.reviews = reviews || [];
    profileReviewState.pagination = pagination || profileReviewState.pagination;

    renderStoreHero(profile, stats);
    renderCategoryTabs(products, categorycounts);
    applyFiltersAndRender();
    renderReviewsInto(reviews, ratingBreakdown, stats.totalReviews, pagination, { avgRating: stats.avgRating });

    initViewProfileLink(profile);
    renderSellerSnapshot(profile, stats);
    renderStorePolicies(profile);
    initShareModal();

    const moreShops = document.getElementById('more-shops-section');
    if (stats && stats.productCount > 0) {
      loadBrowseMoreShops();
    } else if (moreShops) {
      moreShops.hidden = true;
    }

    setupStoreLiveSync();

  } catch (err) {
    console.error('Failed to load store:', err);
    showErrorBanner('Could not connect to the server. Please try again later.');
  }
}

// ═══════════════════════════════════════════
// REVIEWS: Load more (store page only)
// ═══════════════════════════════════════════
async function loadStorePageReviews() {
  if (!profileReviewState.sellerId || profileReviewState.loadingMore || !profileReviewState.pagination.hasMore) return;

  profileReviewState.loadingMore = true;
  const btn = document.getElementById('load-more-reviews');
  if (btn) btn.innerHTML = 'Loading…';

  try {
    const nextPage = profileReviewState.pagination.page + 1;
    const res = await apiFetchWithTimeout(`${STORE_API_BASE}/api/public/seller/${profileReviewState.sellerId}?page=${nextPage}&limit=${profileReviewState.pagination.limit}`);
    const json = await res.json();

    if (res.ok && json.success) {
      const newReviews = json.data.reviews || [];
      profileReviewState.reviews = [...profileReviewState.reviews, ...newReviews];
      profileReviewState.pagination = json.data.pagination;
      renderReviewsInto(profileReviewState.reviews, json.data.ratingBreakdown, json.data.stats.totalReviews, json.data.pagination);
    }
  } catch (err) {
    console.error('Failed to load more reviews:', err);
  } finally {
    profileReviewState.loadingMore = false;
    if (btn) {
      btn.innerHTML = 'Load More Reviews <i data-lucide="chevron-down"></i>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

// ═══════════════════════════════════════════
// VIEW SELLER PROFILE LINK
// ═══════════════════════════════════════════
function initViewProfileLink(profile) {
  const btn = document.getElementById('view-profile-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!state.sellerId) return;
    const url = `../profile/profile.html?sellerId=${encodeURIComponent(state.sellerId)}`;
    window.location.href = url;
  });
}

// ═══════════════════════════════════════════
// SHARE MODAL
// ═══════════════════════════════════════════
function initShareModal() {
  const shareBtn = document.getElementById('share-btn');
  const modal = document.getElementById('share-modal');
  const modalClose = document.getElementById('share-modal-close');
  const linkInput = document.getElementById('share-link-input');
  const copyBtn = document.getElementById('share-copy-btn');
  const socialsWrap = document.getElementById('share-socials');
  if (!shareBtn || !modal) return;

  const storeUrl = window.location.href;
  const shareText = 'Check out this store on UniMartX';
  const encoded = encodeURIComponent(storeUrl);

  if (linkInput) linkInput.value = storeUrl;

  const socials = [
    { icon: 'WHATSAPP', label: 'WhatsApp', href: `https://wa.me/?text=${encoded}` },
    { icon: 'twitter', label: 'Twitter', href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(shareText)}` },
    { icon: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { icon: 'mail', label: 'Email', href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encoded}` },
  ];

  if (socialsWrap) {
    socialsWrap.innerHTML = socials.map(s => {
      const inner = s.icon === 'WHATSAPP' ? WHATSAPP_SVG : `<i data-lucide="${s.icon}"></i>`;
      return `<a class="share-social" href="${escapeHtml(s.href)}" target="_blank" rel="noopener noreferrer" aria-label="Share on ${escapeHtml(s.label)}">${inner}</a>`;
    }).join('');
  }

  const openModal = () => {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (linkInput) linkInput.focus();
    if (window.lucide) lucide.createIcons();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  shareBtn.addEventListener('click', openModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  if (copyBtn && linkInput) {
    copyBtn.addEventListener('click', async () => {
      const text = linkInput.value;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        linkInput.select();
        document.execCommand('copy');
      }
      const original = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
      if (window.lucide) lucide.createIcons();
      setTimeout(() => { copyBtn.innerHTML = original; if (window.lucide) lucide.createIcons(); }, 1800);
    });
  }
}

// ═══════════════════════════════════════════
// SELLER SNAPSHOT (left grided rail)
// ═══════════════════════════════════════════
function snapshotInfoTile(icon, label, value) {
  return `
    <div class="snapshot-tile">
      <span class="snapshot-tile-icon"><i data-lucide="${icon}"></i></span>
      <span class="snapshot-tile-text">
        <span class="snapshot-tile-label">${escapeHtml(label)}</span>
        <span class="snapshot-tile-value">${escapeHtml(value)}</span>
      </span>
    </div>`;
}

// Official WhatsApp glyph (lucide 0.468.0 has no brand icon)
const WHATSAPP_SVG = `<svg class="wa-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.083 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`;

function renderSellerSnapshot(profile, stats) {
  const grid = document.getElementById('seller-snapshot-grid');
  const aside = document.getElementById('seller-snapshot');
  if (!grid || !aside) return;

  const tiles = [];

  if (profile.city || profile.country) {
    tiles.push(snapshotInfoTile('map-pin', 'Based in', [profile.city, profile.country].filter(Boolean).join(', ')));
  }
  if (profile.universityAffiliation || profile.campus) {
    const affiliation = [profile.universityAffiliation, profile.campus].filter(Boolean).join(' · ');
    tiles.push(snapshotInfoTile('graduation-cap', 'Affiliation', affiliation));
  }
  if (profile.joinedDate) {
    tiles.push(snapshotInfoTile('calendar', 'Joined', formatJoinDate(profile.joinedDate)));
  }
  if (typeof stats.followerCount === 'number') {
    tiles.push(snapshotInfoTile('users', 'Followers', stats.followerCount.toLocaleString()));
  }
  if (profile.verified) {
    tiles.push(snapshotInfoTile('badge-check', 'Verified', 'Seller'));
  }
  if (profile.deliveryFee != null) {
    const fee = profile.deliveryFee === 0 ? 'Free' : `$${profile.deliveryFee.toFixed(2)}`;
    tiles.push(snapshotInfoTile('truck', 'Delivery Fee', fee));
  }
  if (profile.processingTime) {
    tiles.push(snapshotInfoTile('clock', 'Processing', profile.processingTime));
  }
  if (profile.businessHours) {
    tiles.push(snapshotInfoTile('clock', 'Hours', businessHoursLabel(profile.businessHours)));
  }
  const deliveryOpts = parseDeliveryOptions(profile.deliveryOptions);
  if (deliveryOpts.length) {
    tiles.push(snapshotInfoTile('package', 'Options', deliveryOpts.join(', ')));
  }
  if (profile.pickupAddress) {
    tiles.push(snapshotInfoTile('store', 'Pickup', profile.pickupAddress));
  }

  grid.innerHTML = tiles.join('');

  // Bio + contact + socials live as siblings of the grid (full-width)
  let extra = '';

  if (profile.bio) {
    const bioUrl = `../profile/profile.html?sellerId=${encodeURIComponent(state.sellerId)}`;
    extra += `
      <div class="snapshot-bio">
        <p class="snapshot-bio-text">${escapeHtml(truncateText(profile.bio, 140))}</p>
        <a class="snapshot-bio-link" href="${bioUrl}">Want to read more about the seller? Click this link <i data-lucide="arrow-right"></i></a>
      </div>`;
  }

  // Contact the seller — WhatsApp, email, phone
  const contactItems = [];
  if (profile.whatsapp) {
    const wa = String(profile.whatsapp).replace(/\D/g, '');
    contactItems.push(`<a class="snapshot-contact-item" href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer" aria-label="Reach out on WhatsApp">${WHATSAPP_SVG}<span>WhatsApp</span></a>`);
  }
  if (profile.email) {
    contactItems.push(`<a class="snapshot-contact-item" href="mailto:${escapeHtml(profile.email)}"><i data-lucide="mail"></i><span>${escapeHtml(profile.email)}</span></a>`);
  }
  if (profile.phone) {
    const tel = String(profile.phone).replace(/\D/g, '');
    contactItems.push(`<a class="snapshot-contact-item" href="tel:${tel}"><i data-lucide="phone"></i><span>${escapeHtml(profile.phone)}</span></a>`);
  }
  if (contactItems.length) {
    extra += `
      <div class="snapshot-contact">
        <p class="snapshot-contact-label">You can reach out</p>
        <div class="snapshot-contact-links">${contactItems.join('')}</div>
      </div>`;
  }

  // Social profiles (excluding WhatsApp, handled in contact)
  const socials = [];
  if (profile.website) socials.push({ icon: 'globe', href: profile.website, label: 'Website' });
  if (profile.instagram) socials.push({ icon: 'instagram', href: `https://instagram.com/${profile.instagram}`, label: 'Instagram' });
  if (profile.twitter) socials.push({ icon: 'twitter', href: `https://twitter.com/${profile.twitter}`, label: 'Twitter' });
  if (profile.tiktok) socials.push({ icon: 'music', href: `https://tiktok.com/@${profile.tiktok}`, label: 'TikTok' });

  if (socials.length) {
    extra += `<div class="seller-snapshot-socials">` + socials.map(s =>
      `<a class="seller-snapshot-social" href="${escapeHtml(s.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.label)}"><i data-lucide="${s.icon}"></i></a>`
    ).join('') + `</div>`;
  }

  aside.querySelectorAll('.snapshot-bio, .snapshot-contact, .seller-snapshot-socials').forEach(el => el.remove());
  grid.insertAdjacentHTML('afterend', extra);

  if (window.lucide) lucide.createIcons();
}

function truncateText(str, max) {
  if (!str || str.length <= max) return str || '';
  const slice = str.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + '…';
}

// ═══════════════════════════════════════════
// LIVE SYNC
// ═══════════════════════════════════════════
let _isFetching = false;
let _pollId = null;

async function liveFetchStore() {
  if (!state.sellerId || _isFetching) return;
  _isFetching = true;

  try {
    const res = await apiFetchWithTimeout(`${STORE_API_BASE}/api/public/seller/${state.sellerId}`);
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success) return;

    const { profile, stats, products, reviews, ratingBreakdown, pagination, categorycounts } = json.data;

    const currentProductIds = (products || []).map(p => p.id).join(',');
    const currentReviewIds = (reviews || []).map(r => r.id).join(',');

    if (currentProductIds === window._lastProductIds && currentReviewIds === window._lastReviewIds) return;
    window._lastProductIds = currentProductIds;
    window._lastReviewIds = currentReviewIds;

    state.profile = profile;
    state.stats = stats;
    state.products = products || [];
    state.categoryCounts = categorycounts || {};
    state.total = products.length;

    renderStoreHero(profile, stats);
    renderCategoryTabs(products, categorycounts);
    applyFiltersAndRender();

    profileReviewState.reviews = reviews || [];
    profileReviewState.pagination = pagination || profileReviewState.pagination;
    renderReviewsInto(reviews, ratingBreakdown, stats.totalReviews, pagination, { avgRating: stats.avgRating });
    renderStorePolicies(profile);

    const moreShops = document.getElementById('more-shops-section');
    if (stats && stats.productCount > 0) {
      loadBrowseMoreShops().catch(() => {});
    } else if (moreShops) {
      moreShops.hidden = true;
    }

    if (window.lucide) window.lucide.createIcons();
    const grid = document.getElementById('store-products');
    if (grid) observeRevealElements(grid);
  } catch (e) {
    // silently fail
  } finally {
    _isFetching = false;
  }
}

function startStoreLiveSync() {
  if (_pollId) return;
  let initialized = false;
  _pollId = setInterval(async () => {
    if (state.loading || _isFetching) return;
    if (!initialized) { initialized = true; return; }
    await liveFetchStore();
  }, 120000);
  window.addEventListener('beforeunload', () => { if (_pollId) { clearInterval(_pollId); _pollId = null; } });
}

function setupStoreLiveSync() {
  startStoreLiveSync();

  let _visibilityTimeout = null;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      clearTimeout(_visibilityTimeout);
      _visibilityTimeout = setTimeout(() => {
        _isFetching = false;
        liveFetchStore();
      }, 500);
    }
  });

  window.addEventListener('online', () => {
    _isFetching = false;
    liveFetchStore();
  });
}

// ═══════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════
let revealObserver = null;

function setupRevealObserver() {
  if (revealObserver) return;
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    return;
  }
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

function observeRevealElements(container) {
  if (!revealObserver || !container) return;
  const els = container.querySelectorAll('.reveal:not(.in-view)');
  els.forEach(el => revealObserver.observe(el));
}

// ═══════════════════════════════════════════
// ERROR BANNER
// ═══════════════════════════════════════════
function showErrorBanner(message) {
  const existing = document.getElementById('store-error-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'store-error-banner';
  banner.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;z-index:9999;font-size:0.9rem;font-weight:700;';
  banner.textContent = message;
  document.body.appendChild(banner);
}

// ═══════════════════════════════════════════
// STORE PAGE EVENTS (only when #store-hero exists)
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Only initialize full store page if store-hero exists (not profile preview)
  if (!document.getElementById('store-hero')) return;

  setupRevealObserver();

  await loadStoreData();

  // Review load-more
  const loadMoreReviewsBtn = document.getElementById('load-more-reviews');
  if (loadMoreReviewsBtn) loadMoreReviewsBtn.addEventListener('click', loadStorePageReviews);

  // Store search
  const storeSearch = document.getElementById('store-search');
  if (storeSearch) {
    storeSearch.addEventListener('input', debounce(() => {
      state.search = storeSearch.value.trim();
      state.page = 1;
      applyFiltersAndRender();
    }, 300));
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      state.page = 1;
      applyFiltersAndRender();
    });
  }

  // View full description toggle
  const descToggle = document.getElementById('store-desc-toggle');
  if (descToggle) {
    descToggle.addEventListener('click', () => {
      if (storeProfile) showStoreAbout(storeProfile);
    });
  }

  // Category tabs
  const tabsEl = document.getElementById('store-filter-tabs');
  if (tabsEl) {
    tabsEl.addEventListener('click', e => {
      const tab = e.target.closest('.store-tab');
      if (!tab) return;
      tabsEl.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.category = tab.dataset.filter;
      state.page = 1;
      applyFiltersAndRender();
    });
  }

  // View toggle
  const btnGrid = document.getElementById('btn-grid');
  const btnList = document.getElementById('btn-list');
  const productsGrid = document.getElementById('store-products');

  if (btnGrid) {
    btnGrid.addEventListener('click', () => {
      state.view = 'grid';
      if (productsGrid) productsGrid.className = 'store-products grid-view';
      btnGrid.classList.add('active');
      btnList.classList.remove('active');
    });
  }
  if (btnList) {
    btnList.addEventListener('click', () => {
      state.view = 'list';
      if (productsGrid) productsGrid.className = 'store-products list-view';
      btnList.classList.add('active');
      btnGrid.classList.remove('active');
    });
  }

  // Empty state reset
  const emptyReset = document.getElementById('empty-reset');
  if (emptyReset) {
    emptyReset.addEventListener('click', () => {
      state.search = '';
      state.category = 'all';
      state.page = 1;
      if (storeSearch) storeSearch.value = '';
      tabsEl.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
      const allTab = tabsEl.querySelector('.store-tab[data-filter="all"]');
      if (allTab) allTab.classList.add('active');
      applyFiltersAndRender();
    });
  }

  // Hamburger menu
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('nav-mobile');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      const isOpen = mobileNav.classList.contains('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}" aria-hidden="true"></i>`;
      if (window.lucide) lucide.createIcons();
    });
  }

  // Scroll shadow on navbar
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
  });

  // Extra observer passes for late-rendered cards
  setTimeout(observeRevealElements, 200);
  setTimeout(observeRevealElements, 800);
  setTimeout(observeRevealElements, 1600);
});
