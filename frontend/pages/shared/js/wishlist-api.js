// WISHLIST API — shared by all public pages
// Usage: include this script, then call WishlistAPI.init() after rendering product cards.

(function (global) {
    const API = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    function getAuth() {
        try {
            const raw = localStorage.getItem('authData');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.expiry && Date.now() > parsed.expiry) { localStorage.removeItem('authData'); return null; }
                const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (authData.token) return authData;
            }
            const token = localStorage.getItem('authToken');
            if (token && token !== 'undefined' && token !== 'null') return { token };
            return null;
        } catch { return null; }
    }

    function authHeaders() {
        const auth = getAuth();
        return auth?.token
            ? { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' };
    }

    // Cached set of saved product IDs
    let savedIds = new Set();
    let loaded   = false;

    async function loadSavedIds() {
        const auth = getAuth();
        if (!auth) { loaded = true; return; }
        try {
            const res  = await fetch(`${API}/api/wishlist/ids`, { headers: authHeaders() });
            if (!res.ok) throw new Error();
            const json = await res.json();
            savedIds = new Set(json.data || []);
        } catch { /* silent */ }
        loaded = true;
    }

    // Apply saved state to all .product-save buttons that have data-product-id
    function hydrateButtons() {
        document.querySelectorAll('.product-save[data-product-id]').forEach(btn => {
            const id = btn.dataset.productId;
            setSaved(btn, savedIds.has(id));
        });
    }

    function setSaved(btn, isSaved) {
        btn.classList.toggle('saved', isSaved);
        const icon = btn.querySelector('i[data-lucide]');
        if (icon) {
            icon.setAttribute('data-lucide', isSaved ? 'heart' : 'heart');
            icon.style.fill = isSaved ? '#ef4444' : 'none';
        }
        btn.style.color      = isSaved ? '#ef4444' : '';
        btn.style.background = isSaved ? 'rgba(239,68,68,0.15)' : '';
    }

    // Apply state to every button bound to a given productId
    function setSavedAll(productId, isSaved) {
        document.querySelectorAll(`.product-save[data-product-id="${productId}"]`).forEach(b => setSaved(b, isSaved));
    }

    async function toggle(btn, productId) {
        const auth = getAuth();
        if (!auth) {
            window.location.href = window.location.pathname.includes('/public/')
                ? '../../auth/login.html'
                : '../auth/login.html';
            return;
        }

        // Optimistic update — all buttons for this product
        const nowSaved = !btn.classList.contains('saved');
        setSavedAll(productId, nowSaved);
        if (nowSaved) savedIds.add(productId); else savedIds.delete(productId);

        try {
            const res  = await fetch(`${API}/api/wishlist/toggle`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ productId }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error();
            setSavedAll(productId, json.saved);
            if (json.saved) savedIds.add(productId); else savedIds.delete(productId);
        } catch {
            // Revert
            setSavedAll(productId, !nowSaved);
            if (!nowSaved) savedIds.add(productId); else savedIds.delete(productId);
        }
    }

    function bindButtons(container) {
        const scope = container || document;
        scope.querySelectorAll('.product-save[data-product-id]').forEach(btn => {
            if (btn.dataset.wishlistBound) return;
            btn.dataset.wishlistBound = '1';

            const productId = btn.dataset.productId;
            setSaved(btn, savedIds.has(productId));

            btn.addEventListener('click', async e => {
                e.preventDefault();
                e.stopPropagation();
                await toggle(btn, productId);
            });
        });
    }

    // Full init: load IDs then bind
    async function init(container) {
        if (!loaded) await loadSavedIds();
        bindButtons(container);
    }

    global.WishlistAPI = { init, bindButtons, loadSavedIds, hydrateButtons, toggle };
})(window);
