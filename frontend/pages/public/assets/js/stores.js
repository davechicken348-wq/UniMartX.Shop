lucide.createIcons();

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const API_URL = window.APP_CONFIG.BACKEND_URL;

function storeHref(store) {
    return `/pages/seller/public/store/store.html?sellerId=${encodeURIComponent(store.id)}&slug=${encodeURIComponent(store.slug || '')}`;
}

// ═══════════════════════════════════════════
// STATE — discovery first
// ═══════════════════════════════════════════
const state = {
    query:    '',
    category: 'all',
    filter:   'all',
    sort:     'trending',
    page:     1,
    total:    0,
    data:     [],
    loading:  false,
};

const PAGE_SIZE = 12;
const storeProductsCache = new Map();
let _enriching = false;

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const CATEGORY_MAP = window.APP_CONFIG.CATEGORY_MAP || {};
function categoryLabel(cat) { return CATEGORY_MAP[cat] || cat || 'Store'; }

const CATEGORY_ICON = window.APP_CONFIG.CATEGORY_ICON || {};
function categoryIcon(cat) { return CATEGORY_ICON[cat] || 'store'; }

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
    const key = s.id || s.storeName || 'x';
    const idx = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK_GRADIENTS.length;
    return FALLBACK_GRADIENTS[idx];
}
function bannerStyle(s) {
    return s.storeBanner ? `background-image:url('${escapeHtml(s.storeBanner)}');background-size:cover;background-position:center` : `background:${storeGradient(s)}`;
}
function logoStyle(s) {
    return s.storeAvatar ? `background-image:url('${escapeHtml(s.storeAvatar)}');background-size:cover;background-position:center` : `background:${storeGradient(s)}`;
}
function logoFallback(s) {
    return `<span class="store-logo-fallback">${escapeHtml((s.storeName || '?').charAt(0).toUpperCase())}</span>`;
}
function discLogoFallback(s) {
    return `<span class="disc-logo-fallback">${escapeHtml((s.storeName || '?').charAt(0).toUpperCase())}</span>`;
}

// Trust derivation (kept minimal — only 1-2 indicators shown)
// Now driven by real backend flags (isVerified / isOpen / isNewStore / avgRating).
function isVerified(s) { return !!s.isVerified; }
function isTopSeller(s) { return (s.avgRating && s.avgRating >= 4.8 && (s.totalReviews || 0) >= 3); }
function isOpen(s) { return !!s.isOpen; }
function isNew(s) { return !!s.isNewStore; }

// ═══════════════════════════════════════════
// SKELETONS
// ═══════════════════════════════════════════
function storeSkeleton() {
    return `<div class="store-card skeleton-card" aria-hidden="true">
        <div class="store-skeleton-banner skel"></div>
        <div class="store-skeleton-body">
            <div class="store-skeleton-logo skel"></div>
            <div class="store-skeleton-line lg skel"></div>
            <div class="store-skeleton-line sm skel"></div>
            <div class="store-skeleton-line md skel"></div>
            <div class="store-skeleton-line sm skel" style="width:60%"></div>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════
// CARD BUILDERS
// ══════════════════════════════════════════
function trustIndicators(s) {
    const out = [];
    if (isVerified(s)) out.push(`<span class="trust-pill verified"><i data-lucide="badge-check"></i> Verified Student</span>`);
    if (s.avgRating) out.push(`<span class="trust-pill rating"><i data-lucide="star"></i> ${s.avgRating}</span>`);
    else if (isTopSeller(s)) out.push(`<span class="trust-pill top"><i data-lucide="crown"></i> Top Seller</span>`);
    if (s.peerCount > 0) out.push(`<span class="trust-pill peers"><i data-lucide="users"></i> ${s.peerCount} sold</span>`);
    if (s.productCount) out.push(`<span class="trust-pill fresh"><i data-lucide="package"></i> ${s.productCount} items</span>`);
    return out.slice(0, 3).join('');
}

function productPreview(s) {
    const items = (s.featuredProducts && s.featuredProducts.slice(0, 4)) || [];
    const count = Math.max(3, Math.min(4, items.length || 3));
    let html = '';
    for (let i = 0; i < count; i++) {
        const p = items[i];
        if (p && p.image) {
            html += `<div class="preview-thumb" aria-hidden="true"><img src="${escapeHtml(p.image)}" alt="" loading="lazy"></div>`;
        } else if (p && p.name) {
            html += `<div class="preview-thumb" aria-hidden="true"><span style="font-size:0.6rem;font-weight:700;color:var(--text-3)">${escapeHtml(p.name.slice(0,2))}</span></div>`;
        } else {
            html += `<div class="preview-thumb" aria-hidden="true"><i data-lucide="package"></i></div>`;
        }
    }
    return html;
}

function buildStoreCard(store) {
    const av = store.storeAvatar
        ? `<img src="${escapeHtml(store.storeAvatar)}" alt="${escapeHtml(store.storeName)} logo" loading="lazy">`
        : logoFallback(store);

    const tagline = store.tagline
        ? `<p class="store-tagline">${escapeHtml(store.tagline)}</p>`
        : '';

    return `
    <a class="store-card reveal" href="${storeHref(store)}" aria-label="Visit ${escapeHtml(store.storeName)} store">
        <div class="store-card-banner" aria-hidden="true">
            <div class="store-banner-bg" style="${bannerStyle(store)}"></div>
            <div class="store-banner-overlay"></div>
        </div>
        <div class="store-identity">
            <div class="store-logo-row">
                <div class="store-logo">${av}</div>
                <div class="store-verified ${isVerified(store) ? '' : 'hidden'}" aria-hidden="true"><i data-lucide="badge-check"></i></div>
            </div>
            <h3 class="store-name">${escapeHtml(store.storeName)}</h3>
            ${tagline}
            <span class="store-cat"><i data-lucide="${categoryIcon(store.category)}"></i> ${escapeHtml(categoryLabel(store.category))}</span>
            ${trustIndicators(store) ? `<div class="store-trust">${trustIndicators(store)}</div>` : ''}
            <div class="store-products" data-store-id="${escapeHtml(store.id)}">${productPreview(store)}</div>
            <span class="store-cta" aria-hidden="true">Visit Store <i data-lucide="arrow-right"></i></span>
        </div>
    </a>`;
}

function buildFeaturedCard(store) {
    const av = store.storeAvatar
        ? `<img src="${escapeHtml(store.storeAvatar)}" alt="${escapeHtml(store.storeName)} logo" loading="lazy">`
        : `<span class="featured-logo-fallback">${escapeHtml((store.storeName||'?').charAt(0).toUpperCase())}</span>`;

    const trust = [];
    if (isVerified(store)) trust.push(`<span class="feat-trust-item verified"><i data-lucide="badge-check"></i> Verified</span>`);
    if (store.avgRating) trust.push(`<span class="feat-trust-item star"><i data-lucide="star"></i> ${store.avgRating}</span>`);
    else if (isTopSeller(store)) trust.push(`<span class="feat-trust-item"><i data-lucide="crown"></i> Top Seller</span>`);

    return `
    <a class="featured-single-card reveal" href="${storeHref(store)}" aria-label="Visit featured store ${escapeHtml(store.storeName)}">
        <div class="featured-single-banner" aria-hidden="true">
            <div class="featured-banner-bg" style="${bannerStyle(store)}"></div>
            <div class="featured-banner-overlay"></div>
        </div>
        <div class="featured-single-body">
            <div class="featured-single-brand">
                <div class="featured-logo">${av}</div>
                ${isVerified(store) ? '<span class="feat-verified-badge"><i data-lucide="badge-check"></i></span>' : ''}
            </div>
            <h3 class="featured-single-name">${escapeHtml(store.storeName)}</h3>
            ${store.tagline ? `<p class="featured-single-tagline">${escapeHtml(store.tagline)}</p>` : ''}
            <div class="featured-single-meta">
                <span class="featured-single-cat"><i data-lucide="${categoryIcon(store.category)}"></i> ${escapeHtml(categoryLabel(store.category))}</span>
                ${trust.length ? `<div class="featured-single-trust">${trust.join('')}</div>` : ''}
            </div>
            ${store.shortDesc ? `<p class="featured-single-desc">${escapeHtml(store.shortDesc)}</p>` : ''}
        </div>
    </a>`;
}

function buildFeaturedSingle(store) {
    return buildFeaturedCard(store);
}

function buildDiscCard(store) {
    const av = store.storeAvatar
        ? `<img src="${escapeHtml(store.storeAvatar)}" alt="" loading="lazy">`
        : discLogoFallback(store);

    const trust = store.avgRating
        ? `<span class="star"><i data-lucide="star"></i> ${store.avgRating}</span>`
        : (isVerified(store) ? `<span><i data-lucide="badge-check"></i> Verified</span>` : '');

    return `
    <a class="shelf-card" href="${storeHref(store)}" aria-label="Visit ${escapeHtml(store.storeName)} store">
        <div class="shelf-card-banner" aria-hidden="true">
            <div class="shelf-banner-bg" style="${bannerStyle(store)}"></div>
            ${isVerified(store) ? '<span class="store-verified" aria-label="Verified student"><i data-lucide="badge-check"></i></span>' : ''}
        </div>
        <div class="shelf-card-logo">${av}</div>
        <div class="shelf-card-body">
            <span class="shelf-card-name">${escapeHtml(store.storeName)}</span>
            ${store.tagline ? `<span class="shelf-card-tag">${escapeHtml(store.tagline)}</span>` : ''}
            <span class="shelf-card-cat"><i data-lucide="${categoryIcon(store.category)}"></i> ${escapeHtml(categoryLabel(store.category))}</span>
            ${trust ? `<span class="shelf-card-trust">${trust}</span>` : ''}
        </div>
    </a>`;
}

// ═══════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════
function buildParams(extra = {}) {
    const p = new URLSearchParams({
        page: state.page,
        limit: PAGE_SIZE,
        sort: state.sort,
        ...extra,
    });
    if (state.category !== 'all') p.set('category', state.category);
    if (state.query) p.set('search', state.query);
    if (state.filter !== 'all') p.set(state.filter === 'top' ? 'topRated' : state.filter, 'true');
    return p;
}

async function fetchStores(append = false) {
    if (state.loading) return;
    state.loading = true;

    const gridEl = document.getElementById('stores-grid');
    const emptyEl = document.getElementById('empty-state');
    const loadWrap = document.getElementById('load-more-wrap');

    if (!append) {
        gridEl.innerHTML = Array(PAGE_SIZE).fill(storeSkeleton()).join('');
        emptyEl.classList.add('hidden');
        loadWrap.classList.add('hidden');
    }

    try {
        const res = await fetch(`${API_URL}/api/public/stores?${buildParams()}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        state.data = append ? [...state.data, ...json.data] : json.data;
        state.total = json.total;
        renderGrid();
    } catch {
        gridEl.innerHTML = '<p class="empty-msg" style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:3rem">Could not load stores. Is the server running?</p>';
    } finally {
        state.loading = false;
    }
}

async function fetchFeatured() {
    const grid = document.getElementById('featured-grid');
    try {
        const res = await fetch(`${API_URL}/api/public/stores?limit=1&sort=featured`);
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        if (!data.length) { grid.closest('.featured-section').classList.add('hidden'); return; }
        grid.innerHTML = buildFeaturedSingle(data[0]);
        lucide.createIcons();
        observeReveal(grid);
    } catch (e) {
        grid.closest('.featured-section').classList.add('hidden');
    }
}

async function fetchShelf(id, sort, limit = 8) {
    const grid = document.getElementById(id);
    if (!grid) return;
    try {
        const p = new URLSearchParams({ limit, sort });
        const res = await fetch(`${API_URL}/api/public/stores?${p}`);
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        if (!data.length) { grid.closest('.shelf-section').classList.add('hidden'); return; }
        grid.innerHTML = data.map(buildDiscCard).join('');
        lucide.createIcons();
    } catch (e) {
        grid.closest('.shelf-section').classList.add('hidden');
    }
}

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════
function renderGrid() {
    const gridEl = document.getElementById('stores-grid');
    const emptyEl = document.getElementById('empty-state');
    const loadWrap = document.getElementById('load-more-wrap');
    const countEl = document.getElementById('results-count');

    countEl.textContent = state.total;

    if (!state.data.length) {
        gridEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        loadWrap.classList.add('hidden');
        renderEmptySuggestions();
        return;
    }

    emptyEl.classList.add('hidden');
    gridEl.innerHTML = state.data.map(buildStoreCard).join('');
    loadWrap.classList.toggle('hidden', state.data.length >= state.total);
    lucide.createIcons();

    const cards = gridEl.querySelectorAll('.store-card.reveal');
    cards.forEach((card, i) => {
        card.classList.remove('delay-100', 'delay-200', 'delay-300');
        if (i % 4 === 0) card.classList.add('delay-100');
        else if (i % 4 === 1) card.classList.add('delay-200');
        else if (i % 4 === 2) card.classList.add('delay-300');
    });

    observeReveal(gridEl);
    enrichStoreProducts();
}

function renderEmptySuggestions() {
    const box = document.getElementById('empty-suggestions');
    const cats = ['Electronics', 'Fashion', 'Food', 'Beauty', 'Books'];
    box.innerHTML = cats.map(c => `<button class="suggestion-chip" data-cat="${escapeHtml(c.toLowerCase())}">${c}</button>`).join('');
    box.querySelectorAll('.suggestion-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const pill = document.querySelector(`.cat-pill[data-cat="${btn.dataset.cat}"]`);
            if (pill) pill.click();
        });
    });
}

// ═══════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════
const searchInput   = document.getElementById('store-search-input');
const searchClear   = document.getElementById('store-search-clear');
const mobileInput   = document.getElementById('mobile-search-input');
const mobileClear   = document.getElementById('mobile-search-clear');

let searchTimer = null;
function getActiveSearch() {
    if (document.activeElement === mobileInput) return mobileInput;
    return searchInput;
}
function applySearch(source) {
    const q = (source || getActiveSearch()).value.trim();
    state.query = q;
    if (searchInput && searchInput !== source) searchInput.value = q;
    if (mobileInput && mobileInput !== source) mobileInput.value = q;
    searchClear.classList.toggle('hidden', !q);
    if (mobileClear) mobileClear.classList.toggle('hidden', !q);
    state.page = 1;
    fetchStores();
}
if (searchInput) {
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => applySearch(searchInput), 220);
    });
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applySearch(searchInput); } });
}
if (searchClear) searchClear.addEventListener('click', () => { searchInput.value = ''; searchInput.focus(); applySearch(searchInput); });
if (mobileInput) {
    mobileInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => applySearch(mobileInput), 220);
    });
    mobileInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applySearch(mobileInput); } });
}
if (mobileClear) mobileClear.addEventListener('click', () => { mobileInput.value = ''; mobileInput.focus(); applySearch(mobileInput); });

// Category pills
document.getElementById('category-rail').addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.category = pill.dataset.cat;
    state.page = 1;
    fetchStores();
});

// Filter chips
document.getElementById('filter-chips').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.filter = chip.dataset.filter;
    state.page = 1;
    fetchStores();
});

// Sort
document.getElementById('sort-select').addEventListener('change', e => {
    state.sort = e.target.value;
    state.page = 1;
    fetchStores();
});

// Load more
document.getElementById('load-more-btn').addEventListener('click', () => {
    state.page++;
    fetchStores(true);
});

// Empty reset
document.getElementById('empty-reset').addEventListener('click', () => {
    state.query = ''; state.category = 'all'; state.filter = 'all'; state.page = 1; state.sort = 'trending';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.classList.add('hidden');
    if (mobileInput) mobileInput.value = '';
    if (mobileClear) mobileClear.classList.add('hidden');
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.cat-pill[data-cat="all"]').classList.add('active');
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    document.getElementById('sort-select').value = 'trending';
    fetchStores();
    fetchFeatured();
});

// Sidebar toggle (mobile)
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarEl = document.getElementById('stores-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarClose = document.getElementById('sidebar-close');

function openSidebar() {
    sidebarEl.classList.add('open');
    sidebarOverlay.classList.add('active');
    sidebarToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebarEl.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    // Only restore scroll if the mobile nav isn't also open
    if (!document.getElementById('nav-mobile')?.classList.contains('open')) {
        document.body.style.overflow = '';
    }
}

if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// View toggle
const btnGrid = document.getElementById('btn-grid');
const btnList = document.getElementById('btn-list');
function setView(mode) {
    const grid = document.getElementById('stores-grid');
    if (!grid) return;
    grid.classList.toggle('stores-grid-list', mode === 'list');
    grid.classList.toggle('stores-grid', mode === 'grid');
    btnGrid.classList.toggle('active', mode === 'grid');
    btnList.classList.toggle('active', mode === 'list');
}
if (btnGrid) btnGrid.addEventListener('click', () => setView('grid'));
if (btnList) btnList.addEventListener('click', () => setView('list'));

// ═══════════════════════════════════════════
// PRODUCT PREVIEW ENRICHMENT (only images)
// ═══════════════════════════════════════════
// Product previews are returned directly by /api/public/stores (featuredProducts).
// Only fall back to the per-store endpoint when a store has no preview data.
async function enrichStoreProducts() {
    const missing = state.data.filter(s =>
        (s.productCount > 0) && (!s.featuredProducts || !s.featuredProducts.length) && !storeProductsCache.has(s.id)
    );
    if (!missing.length) return;
    if (_enriching) return;
    _enriching = true;
    try {
        const results = await Promise.allSettled(
            missing.map(s => fetch(`${API_URL}/api/public/seller/${encodeURIComponent(s.id)}?limit=4`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(j => ({ store: s, products: (j?.data?.products || []).slice(0, 4) }))
                .catch(() => null))
        );
        results.forEach(r => {
            if (!r || r.status !== 'fulfilled' || !r.value) return;
            const { store, products } = r.value;
            storeProductsCache.set(store.id, products);
            const container = document.querySelector(`.store-products[data-store-id="${store.id}"]`);
            if (!container || products.length === 0) return;
            container.innerHTML = products.map(p => p.image
                ? `<div class="preview-thumb" aria-hidden="true"><img src="${escapeHtml(p.image)}" alt="" loading="lazy"></div>`
                : `<div class="preview-thumb" aria-hidden="true"><span style="font-size:0.6rem;font-weight:700;color:var(--text-3)">${escapeHtml((p.name||'?').slice(0,2))}</span></div>`
            ).join('');
            lucide.createIcons();
        });
    } catch (e) { /* silent */ } finally { _enriching = false; }
}

// ═══════════════════════════════════════════
// REVEAL OBSERVER
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
function observeReveal(container) {
    if (!revealObserver) return;
    container.querySelectorAll('.reveal:not(.in-view)').forEach(el => revealObserver.observe(el));
}
setupRevealObserver();

// ═══════════════════════════════════════════
// CART BADGE (optional on this page)
// ═══════════════════════════════════════════
function updateCartBadge(count) {
    const el = document.getElementById('cart-count');
    if (el) {
        el.textContent = String(count);
        el.classList.toggle('hidden', count <= 0);
    }
}
async function fetchCartCount() {
    try {
        const res = await fetch(`${API_URL}/api/cart`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.data?.itemCount != null) updateCartBadge(json.data.itemCount);
    } catch { /* ignore — cart badge is optional here */ }
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
const urlParams = new URLSearchParams(location.search);
const urlCat = urlParams.get('category');
if (urlCat) {
    state.category = urlCat;
    const pill = document.querySelector(`.cat-pill[data-cat="${urlCat}"]`);
    if (pill) {
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
    }
}

fetchStores();
fetchFeatured();
fetchShelf('shelf-new-grid', 'newest');
fetchShelf('shelf-popular-grid', 'popular');
fetchCartCount();
