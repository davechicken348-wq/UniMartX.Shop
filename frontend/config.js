// ── Production Config ──────────────────────────────────────────────────────
// Set BACKEND_URL to your deployed backend URL before hosting.
// Example: 'https://api.unimartx.com'  or  'https://unimartx-backend.onrender.com'
// Leave empty string '' to auto-detect (same origin, useful if backend serves frontend).

window.APP_CONFIG = {
  BACKEND_URL: 'https://unimartx-shop.onrender.com',
};

if (!window.APP_CONFIG.BACKEND_URL) {
  const h = window.location.hostname;
  window.APP_CONFIG.BACKEND_URL =
    h === 'localhost' || h === '127.0.0.1'
      ? 'http://localhost:5000'
      : '';
}

// ── Keep-alive ping (prevents Render free tier cold starts) ──
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
