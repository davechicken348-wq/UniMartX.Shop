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
