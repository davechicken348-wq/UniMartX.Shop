const API = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const LOW_STOCK = 5;

function getAuth() {
    try {
        const raw = localStorage.getItem('authData');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.expiry && Date.now() > parsed.expiry) { localStorage.removeItem('authData'); }
            else {
                const data = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (data?.token) return data;
            }
        }
        const token = localStorage.getItem('authToken');
        if (token) return { token };
    } catch {}
    return null;
}

function authHeaders() {
    const auth = getAuth();
    return auth?.token
        ? { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

const fmt = n => `GH₵ ${Number(n || 0).toFixed(2)}`;
const stockClass = p => (p.stock <= 0 ? 'out' : (p.stock <= LOW_STOCK ? 'low' : 'in'));

// ── State ──────────────────────────────────────
let wishlistData = [];
let activeFilter = 'all';
let activeSort = 'recent';
let searchQuery = '';
const addedIds = new Set();
let _isFetching = false;
let _lastSnapshot = null;
let _pollId = null;

function getSnapshot(items) {
    if (!items || !items.length) return '__empty__';
    return items.map(i => `${i.product?.id}:${i.product?.price}:${i.product?.stock}`).join('|');
}

// ── Load from API ──────────────────────────────
async function loadWishlist(skipRerender = false) {
    const auth = getAuth();
    if (!auth) { applyView(); return; }
    if (!skipRerender) _isFetching = true;

    try {
        const res = await fetch(`${API}/api/wishlist`, { credentials: 'include', headers: authHeaders() });
        if (!res.ok) throw new Error();
        const json = await res.json();
        const items = json.data || [];

        const snapshot = getSnapshot(items);
        if (snapshot !== _lastSnapshot || !skipRerender) {
            _lastSnapshot = snapshot;
            wishlistData = items;
        }
    } catch {
        if (!skipRerender) {
            document.getElementById('wishlist-grid').innerHTML =
                '<p style="color:var(--text-3);padding:2rem">Could not load your wishlist. Please try again.</p>';
        }
    }
    if (!skipRerender) _isFetching = false;
    applyView();
}

// ── Derived data ───────────────────────────────
function getVisibleItems() {
    let items = wishlistData.slice();

    if (activeFilter === 'instock') items = items.filter(i => stockClass(i.product) === 'in');
    else if (activeFilter === 'sale') items = items.filter(i => i.product.comparePrice > i.product.price);
    else if (activeFilter === 'out') items = items.filter(i => stockClass(i.product) === 'out');

    if (searchQuery) {
        items = items.filter(i => {
            const name = i.product.name.toLowerCase();
            const store = (i.product.seller?.storeName || '').toLowerCase();
            return name.includes(searchQuery) || store.includes(searchQuery);
        });
    }

    const saving = i => Math.max(0, (i.product.comparePrice || 0) - i.product.price);
    if (activeSort === 'price-asc') items.sort((a, b) => a.product.price - b.product.price);
    else if (activeSort === 'price-desc') items.sort((a, b) => b.product.price - a.product.price);
    else if (activeSort === 'name') items.sort((a, b) => a.product.name.localeCompare(b.product.name));
    else if (activeSort === 'saving') items.sort((a, b) => saving(b) - saving(a));

    return items;
}

// ── Render ─────────────────────────────────────
function applyView() {
    computeSummary();
    updateTabs();
    const items = getVisibleItems();
    const grid = document.getElementById('wishlist-grid');
    const isEmpty = wishlistData.length === 0;

    document.getElementById('wishlist-empty').classList.toggle('hidden', !isEmpty);
    document.getElementById('no-results').classList.toggle('hidden', !(wishlistData.length > 0 && items.length === 0));
    grid.style.display = isEmpty ? 'none' : '';

    if (!isEmpty) {
        grid.innerHTML = items.map(buildCard).join('');
        lucide.createIcons();
        bindCardEvents();
    }
    updateResultMeta(items.length);
}

function buildCard(item) {
    const p = item.product;
    const sc = stockClass(p);
    const out = sc === 'out';
    const onSale = p.comparePrice > p.price;
    const discount = onSale ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
    const saveAmt = onSale ? (p.comparePrice - p.price) : 0;

    const img = p.image && !p.image.startsWith('data:')
        ? `<img src="${p.image}" alt="${p.name}">`
        : `<div style="width:100%;height:100%;background:var(--bg-3);"></div>`;

    const saleBadge = (!out && onSale) ? `<div class="wishlist-badge wishlist-badge--sale">-${discount}%</div>` : '';
    const outBadge = out ? `<div class="wishlist-badge wishlist-badge--out">Sold Out</div>` : '';
    const fee = parseFloat(p.deliveryFee);
    const deliveryBadge = (!isNaN(fee) && fee > 0 && !out)
        ? `<div class="wishlist-badge wishlist-badge--delivery">Delivery ${fmt(fee)}</div>` : '';

    const stars = '★'.repeat(Math.round(p.rating || 0)) + '☆'.repeat(5 - Math.round(p.rating || 0));

    const priceHtml = onSale
        ? `<span class="wishlist-price">${fmt(p.price)}</span>
           <span class="wishlist-price-old">${fmt(p.comparePrice)}</span>`
        : `<span class="wishlist-price">${fmt(p.price)}</span>`;

    const saveHtml = onSale
        ? `<span class="wishlist-save"><i data-lucide="badge-percent"></i> You save ${fmt(saveAmt)}</span>` : '';

    const stockHtml = out
        ? `<span class="wishlist-stock wishlist-stock--out"><i data-lucide="x-circle"></i> Out of Stock</span>`
        : sc === 'low'
            ? `<span class="wishlist-stock wishlist-stock--low"><i data-lucide="alert-triangle"></i> Only ${p.stock} left</span>`
            : `<span class="wishlist-stock wishlist-stock--in"><i data-lucide="check-circle-2"></i> In Stock</span>`;

    const added = addedIds.has(p.id);
    const foot = out
        ? `<button class="wishlist-cart-btn" disabled>Out of Stock</button>`
        : `<div class="wishlist-qty">
               <button type="button" data-step="-1" aria-label="Decrease">−</button>
               <input type="number" value="1" min="1" max="${p.stock}" aria-label="Quantity">
               <button type="button" data-step="1" aria-label="Increase">+</button>
           </div>
           <button class="wishlist-cart-btn${added ? ' added' : ''}" data-product-id="${p.id}">
               ${added ? '<i data-lucide="check"></i> Added' : '<i data-lucide="shopping-cart"></i> Add to Cart'}
           </button>`;

    return `
    <div class="wishlist-card${out ? ' is-out' : ''}" data-product-id="${p.id}" data-name="${p.name.toLowerCase()}" data-store="${(p.seller?.storeName || '').toLowerCase()}">
        <div class="wishlist-card-img">
            ${img}
            ${saleBadge}
            ${outBadge}
            ${deliveryBadge}
            <button class="wishlist-remove" aria-label="Remove from wishlist"><i data-lucide="x"></i></button>
        </div>
        <div class="wishlist-card-info">
            <p class="wishlist-store">${p.seller?.storeName || ''}</p>
            <a href="../../public/shop/product-details.html?id=${p.id}" class="wishlist-name">${p.name}</a>
            <div class="wishlist-rating">
                <span class="stars">${stars}</span>
                <span class="rating-num">(${p.reviewCount || 0})</span>
            </div>
            <div class="wishlist-price-row">${priceHtml}</div>
            ${saveHtml}
            ${stockHtml}
            <div class="wishlist-card-foot">${foot}</div>
        </div>
    </div>`;
}

// ── Summary + tabs ─────────────────────────────
function computeSummary() {
    const total = wishlistData.length;
    const onSale = wishlistData.filter(i => i.product.comparePrice > i.product.price).length;
    const inStock = wishlistData.filter(i => stockClass(i.product) === 'in').length;
    const value = wishlistData.reduce((s, i) => s + i.product.price, 0);
    const savings = wishlistData.reduce((s, i) => s + Math.max(0, (i.product.comparePrice || 0) - i.product.price), 0);

    document.getElementById('wl-total').textContent = total;
    document.getElementById('wl-sale').textContent = onSale;
    document.getElementById('wl-stock').textContent = inStock;
    document.getElementById('wl-value').textContent = fmt(value);
    document.getElementById('wl-savings').textContent = savings > 0 ? fmt(savings) : 'GH₵ 0';
}

function updateTabs() {
    const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
    set('count-all', wishlistData.length);
    set('count-instock', wishlistData.filter(i => stockClass(i.product) === 'in').length);
    set('count-sale', wishlistData.filter(i => i.product.comparePrice > i.product.price).length);
    set('count-out', wishlistData.filter(i => stockClass(i.product) === 'out').length);
}

function updateResultMeta(visible) {
    const meta = document.getElementById('result-meta');
    const total = wishlistData.length;
    if (total === 0) { meta.textContent = ''; return; }
    const labels = { all: 'All items', instock: 'In stock', sale: 'On sale', out: 'Sold out' };
    let txt = `Showing <b>${visible}</b> of <b>${total}</b> saved item${total !== 1 ? 's' : ''}`;
    if (activeFilter !== 'all') txt += ` · ${labels[activeFilter]}`;
    if (searchQuery) txt += ` · “${searchQuery}”`;
    meta.innerHTML = txt;
}

// ── Card events ────────────────────────────────
function bindCardEvents() {
    document.querySelectorAll('.wishlist-remove').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const card = btn.closest('.wishlist-card');
            const productId = card.dataset.productId;
            card.classList.add('removing');
            await toggleWishlistAPI(productId);
            setTimeout(() => {
                wishlistData = wishlistData.filter(i => i.product.id !== productId);
                addedIds.delete(productId);
                card.remove();
                applyView();
            }, 300);
        });
    });

    document.querySelectorAll('.wishlist-qty button').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const max = parseInt(input.max, 10) || 99;
            let v = parseInt(input.value, 10) || 1;
            v += parseInt(btn.dataset.step, 10);
            v = Math.max(1, Math.min(max, v));
            input.value = v;
        });
    });

    document.querySelectorAll('.wishlist-cart-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.classList.contains('added')) return;
            const card = btn.closest('.wishlist-card');
            const productId = btn.dataset.productId;
            const qtyInput = card.querySelector('.wishlist-qty input');
            const qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
            await addToCart(productId, qty, btn);
        });
    });
}

async function addToCart(productId, qty, btn) {
    try {
        const res = await fetch(`${API}/api/cart/add`, {
            credentials: 'include',
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ productId, quantity: qty }),
        });
        if (!res.ok) throw new Error();
        addedIds.add(productId);
        if (btn) {
            btn.classList.add('added');
            btn.innerHTML = '<i data-lucide="check"></i> Added';
            lucide.createIcons();
        }
        window.dispatchEvent(new CustomEvent('cart:updated'));
    } catch {
        if (btn) {
            const prev = btn.innerHTML;
            btn.innerHTML = 'Failed — retry';
            setTimeout(() => { btn.innerHTML = prev; lucide.createIcons(); }, 2000);
        }
    }
}

// ── Recommendations ────────────────────────────
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function productCardHTML(p) {
    const img = p.image || (p.images && p.images[0]) || '';
    const cat = (p.category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const rating = p.rating ? Number(p.rating).toFixed(1) : '0.0';
    return `
        <a class="prod-card" href="../../public/shop/product-details.html?id=${encodeURIComponent(p.id)}">
            <div class="prod-card-media">
                ${img ? `<img src="${img}" alt="${esc(p.name)}" loading="lazy">` : ''}
                <span class="prod-card-cat">${esc(cat)}</span>
            </div>
            <div class="prod-card-body">
                <p class="prod-card-store"><i data-lucide="store"></i> ${esc(p.storeName || 'Campus Store')}</p>
                <h3 class="prod-card-name">${esc(p.name)}</h3>
                <div class="prod-card-foot">
                    <span class="prod-card-price">GH₵ ${Number(p.price || 0).toFixed(2)}</span>
                    <span class="prod-card-rating"><i data-lucide="star"></i> ${rating}</span>
                </div>
            </div>
        </a>`;
}

async function loadRecommended() {
    const grid = document.getElementById('recommended-grid');
    const empty = document.getElementById('recommended-empty');
    const section = document.getElementById('recommended-section');
    if (!grid) return;
    try {
        const res = await fetch(`${API}/api/public/products?sort=popular&limit=8`, { credentials: 'include' });
        const json = await res.json();
        const products = (json && json.data) || [];
        if (products.length) {
            grid.innerHTML = products.map(productCardHTML).join('');
            grid.style.display = '';
            if (empty) empty.style.display = 'none';
            lucide.createIcons();
        } else {
            grid.innerHTML = '';
            grid.style.display = 'none';
            if (empty) { empty.innerHTML = '<p class="discovery-title">Explore the shop to discover more campus products</p>'; empty.style.display = ''; }
        }
    } catch {
        if (section) section.style.display = 'none';
    }
}

// ── API calls ──────────────────────────────────
async function toggleWishlistAPI(productId) {
    try {
        await fetch(`${API}/api/wishlist/toggle`, {
            credentials: 'include', method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ productId }),
        });
    } catch { /* silent */ }
}

// ── Bulk actions ───────────────────────────────
document.getElementById('add-all-btn')?.addEventListener('click', async function () {
    const visible = getVisibleItems().filter(i => stockClass(i.product) !== 'out');
    if (!visible.length) return;
    this.disabled = true;
    const original = this.innerHTML;
    this.innerHTML = '<i data-lucide="loader"></i> Adding…';
    lucide.createIcons();
    let added = 0;
    for (const i of visible) {
        await addToCart(i.product.id, 1);
        added++;
    }
    this.innerHTML = `<i data-lucide="check"></i> Added ${added} item${added !== 1 ? 's' : ''}`;
    lucide.createIcons();
    setTimeout(() => { this.innerHTML = original; lucide.createIcons(); this.disabled = false; }, 2200);
});

document.getElementById('clear-all-btn')?.addEventListener('click', async () => {
    if (!wishlistData.length) return;
    if (!confirm('Remove all items from your wishlist?')) return;
    const ids = wishlistData.map(i => i.product.id);
    document.querySelectorAll('.wishlist-card').forEach(c => c.classList.add('removing'));
    await Promise.all(ids.map(toggleWishlistAPI));
    setTimeout(() => {
        wishlistData = [];
        _lastSnapshot = getSnapshot([]);
        addedIds.clear();
        applyView();
    }, 350);
});

document.getElementById('share-btn')?.addEventListener('click', async function () {
    const url = location.href;
    const original = this.innerHTML;
    const done = msg => {
        this.innerHTML = `<i data-lucide="check"></i> ${msg}`;
        lucide.createIcons();
        setTimeout(() => { this.innerHTML = original; lucide.createIcons(); }, 2000);
    };
    if (navigator.share) {
        try { await navigator.share({ title: 'My UnimartX Wishlist', text: 'Check out what I saved on UnimartX', url }); }
        catch {}
    } else {
        try { await navigator.clipboard.writeText(url); done('Link copied'); }
        catch { done('Copy failed'); }
    }
});

document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
    activeFilter = 'all';
    searchQuery = '';
    document.querySelectorAll('#filter-tabs .filter-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === 'all'));
    const d = document.getElementById('wishlist-search'); if (d) d.value = '';
    const m = document.getElementById('wishlist-search-mobile'); if (m) m.value = '';
    applyView();
});

// ── Filters / sort / search ────────────────────
document.getElementById('filter-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    activeFilter = tab.dataset.filter;
    document.querySelectorAll('#filter-tabs .filter-tab').forEach(t => t.classList.toggle('active', t === tab));
    applyView();
});

document.getElementById('sort-select')?.addEventListener('change', e => {
    activeSort = e.target.value;
    applyView();
});

const searchDesktop = document.getElementById('wishlist-search');
const searchMobile = document.getElementById('wishlist-search-mobile');

function onSearch(val) {
    searchQuery = val.trim().toLowerCase();
    if (searchDesktop && searchDesktop.value !== val) searchDesktop.value = val;
    if (searchMobile && searchMobile.value !== val) searchMobile.value = val;
    applyView();
}

[searchDesktop, searchMobile].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => onSearch(input.value));
});

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadWishlist();
    loadRecommended();
    startWishlistLiveSync();

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            stopWishlistLiveSync();
            loadWishlist(true).then(() => startWishlistLiveSync());
        }
    });

    window.addEventListener('online', () => {
        stopWishlistLiveSync();
        loadWishlist(true).then(() => startWishlistLiveSync());
    });
});

window.addEventListener('focus', () => loadWishlist(true));

// ── Live sync ──────────────────────────────────
function startWishlistLiveSync() {
    let initialized = false;
    _pollId = setInterval(async () => {
        if (_isFetching) return;
        if (!initialized) { initialized = true; await loadWishlist(true); return; }
        await loadWishlist(true);
    }, 30000);
}

function stopWishlistLiveSync() {
    if (_pollId) { clearInterval(_pollId); _pollId = null; }
}

window.addEventListener('beforeunload', stopWishlistLiveSync);
