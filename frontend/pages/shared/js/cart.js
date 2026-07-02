const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const API = API_BASE;

function getToken() {
    try {
        const raw = localStorage.getItem('authData');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.expiry && Date.now() > parsed.expiry) {
                localStorage.removeItem('authData');
                return null;
            }
            const data = parsed.value ? JSON.parse(parsed.value) : parsed;
            return data.token || null;
        }
        return localStorage.getItem('authToken') || null;
    } catch { return null; }
}

function apiFetch(path, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

function updateCartBadge(n) {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = String(n);
}

async function fetchCartCount() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await apiFetch('/api/cart');
        const json = await res.json();
        if (json?.data?.itemCount != null) updateCartBadge(json.data.itemCount);
    } catch { updateCartBadge(0); }
}

async function addToCartAPI(productId, qty = 1) {
    const token = getToken();
    if (!token) {
        return Promise.reject(new Error('Not authenticated'));
    }
    const res = await apiFetch('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: qty }),
    });
    const json = await res.json();
    if (json.cartCount != null) updateCartBadge(json.cartCount);
    return json;
}

window.__addToCartAPI = addToCartAPI;
window.__updateCartBadge = updateCartBadge;
