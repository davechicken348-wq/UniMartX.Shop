// ── Backend URL Resolution ─────────────────────────────────────────────────
// Priority:
//  1. URL hash override:   http://localhost:5500/index.html#api=http://localhost:5001
//  2. Hostname auto-detect: localhost / 127.0.0.1 → http://localhost:5000
//  3. Default production:   https://unimartx-shop.onrender.com

window.APP_CONFIG = {
  BACKEND_URL: '',
};

(function () {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const apiFromHash = params.get('api');
  if (apiFromHash) {
    window.APP_CONFIG.BACKEND_URL = apiFromHash.replace(/\/$/, '');
    return;
  }

  const hostname = window.location.hostname;
  if (!window.APP_CONFIG.BACKEND_URL) {
    window.APP_CONFIG.BACKEND_URL =
      hostname === 'localhost' || hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://unimartx-shop.onrender.com';
  }
})();

// ── Keep-alive ping (prevents Render free tier cold starts) ─────────────────
// Pings /health every 13 minutes so the server never sleeps during active use.
(function () {
  const base = window.APP_CONFIG.BACKEND_URL;
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) return;
  function ping() {
    fetch(base + '/health', { method: 'GET', cache: 'no-store' }).catch(function () {});
  }
  ping();
  setInterval(ping, 13 * 60 * 1000);
})();

// ── Canonical category map ───────────────────────────────────────────────────
// Single source of truth for category display names and icons across the app.
window.APP_CONFIG.CATEGORY_MAP = {
  electronics: 'Electronics & Gadgets',
  fashion: 'Fashion & Apparel',
  home: 'Home & Dorm Essentials',
  beauty: 'Beauty & Personal Care',
  sports: 'Sports & Fitness',
  books: 'Books & Study Supplies',
  services: 'Tutoring & Services',
  food: 'Food & Drinks',
  other: 'Other',
};

window.APP_CONFIG.CATEGORY_ICON = {
  electronics: 'cpu',
  fashion: 'shirt',
  home: 'sofa',
  beauty: 'sparkles',
  sports: 'dumbbell',
  books: 'book-open',
  services: 'wrench',
  food: 'utensils',
  other: 'store',
};

function categoryLabel(cat) {
  return (window.APP_CONFIG.CATEGORY_MAP && window.APP_CONFIG.CATEGORY_MAP[cat]) || cat || 'Store';
}

function categoryIcon(cat) {
  return (window.APP_CONFIG.CATEGORY_ICON && window.APP_CONFIG.CATEGORY_ICON[cat]) || 'store';
}
