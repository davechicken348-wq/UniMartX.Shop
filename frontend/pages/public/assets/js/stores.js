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

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let state = {
    query:    '',
    category: 'all',
    sort:     'featured',
    view:     'grid',
    page:     1,
    total:    0,
    data:     [],
    loading:  false,
};

const PAGE_SIZE = 9;

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function stars(rating) {
    if (!rating) return '';
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function categoryLabel(cat) {
    const map = { electronics:'Electronics', fashion:'Fashion', books:'Books', beauty:'Beauty',
                  food:'Food & Snacks',
                  sports:'Sports', home:'Home & Living', clothing:'Fashion', other:'Other' };
    return map[cat] || cat;
}

function categoryIcon(cat) {
    const map = { electronics:'cpu', fashion:'shirt', clothing:'shirt', books:'book-open',
                  beauty:'sparkles', food:'utensils',
                  sports:'dumbbell', home:'sofa', other:'more-horizontal' };
    return map[cat] || 'store';
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
    const idx = s.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK_GRADIENTS.length;
    return FALLBACK_GRADIENTS[idx];
}

function avatarStyle(s) {
    if (s.storeAvatar) return `background-image:url('${s.storeAvatar}');background-size:cover;background-position:center`;
    return `background:${storeGradient(s)}`;
}

function avatarStyle(s) {
    if (s.storeAvatar) return `background-image:url('${s.storeAvatar}');background-size:cover;background-position:center`;
    return `background:${storeGradient(s)}`;
}

function bannerStyle(s) {
    if (s.storeBanner) return `background-image:url('${s.storeBanner}');background-size:cover;background-position:center`;
    return `background:${storeGradient(s)}`;
}

function bannerUrl(s) {
    return s.storeBanner || '';
}

function colorizeName(name, storeColor) {
    const chars = (name || '').split('');
    return chars.map((ch, i) => {
        const safe = ch.replace(/[<>&'"]/g, m => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&#39;', '"':'&quot;' })[m]);
        if (i % 3 === 0 && i !== 0) return `<span style="color:${storeColor || 'var(--primary)'}">${safe}</span>`;
        return safe;
    }).join('');
}

// ═══════════════════════════════════════════
// SKELETONS
// ═══════════════════════════════════════════
function spotlightSkeleton() {
    return `<div class="spotlight-card" style="pointer-events:none">
        <div class="spotlight-skeleton-avatar skel-banner"></div>
        <div class="spotlight-skeleton-name skel"></div>
    </div>`;
}

function storeSkeleton() {
    return `<div class="store-card skeleton-card" style="pointer-events:none">
        <div class="store-card-top skel-banner"></div>
        <div class="store-card-body">
            <div class="skel skel-md" style="margin-bottom:0.5rem"></div>
            <div class="skel skel-sm" style="margin-bottom:0.85rem"></div>
            <div class="skel skel-sm"></div>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════
// CARD BUILDERS
// ═══════════════════════════════════════════
function buildSpotlightCard(store, rank) {
    const initial = (store.storeName || '?').charAt(0).toUpperCase();
    const avatarInner = store.storeAvatar
        ? `<img src="${escapeHtml(store.storeAvatar)}" alt="${escapeHtml(store.storeName)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="spotlight-avatar-fallback" style="display:none">${initial}</span>`
        : `<span class="spotlight-avatar-fallback">${initial}</span>`;

    return `
    <a class="spotlight-card" href="../../seller/public/store/store.html?id=${escapeHtml(store.id)}" aria-label="Store ${escapeHtml(store.storeName)}, rank ${rank}">
        <div class="spotlight-avatar-ring">
            <div class="spotlight-avatar" style="${store.storeAvatar ? `background-image:url('${escapeHtml(store.storeAvatar)}');background-size:cover;background-position:center` : `background:${storeGradient(store)}`}">
                ${avatarInner}
            </div>
        </div>
        <span class="spotlight-store-name">${escapeHtml(store.storeName)}</span>
    </a>`;
}

function buildStoreCard(store) {
    const storeColor = store.storeColor || null;
    return `
    <a class="store-card" href="../../seller/public/store/store.html?id=${escapeHtml(store.id)}">
        <div class="store-card-top" style="${bannerStyle(store)}">
            <div class="store-avatar-wrap">
                <div class="store-avatar" style="${avatarStyle(store)}"></div>
                <div class="store-verified-dot" title="Verified"><i data-lucide="badge-check" aria-hidden="true"></i></div>
            </div>
        </div>
        <div class="store-card-body">
            <div class="store-name-row"><h3>${colorizeName(store.storeName, storeColor)}</h3></div>
            <p class="store-cat-label"><i data-lucide="${categoryIcon(store.category)}" aria-hidden="true"></i> ${escapeHtml(categoryLabel(store.category))}</p>
            <p class="store-bio">${escapeHtml(store.storeDescription) || 'Student entrepreneur building their brand.'}</p>
            <div class="store-card-footer">
                <div class="store-rating">
                    <span class="store-stars">${stars(store.avgRating)}</span>
                    <span class="store-rating-val">${store.avgRating || '—'}</span>
                    <span class="store-reviews">(${store.totalReviews || 0})</span>
                </div>
                <div class="store-products-count">
                    <i data-lucide="package" aria-hidden="true"></i> ${store.productCount || 0}
                </div>
            </div>
            <div class="store-card-cta">
                Visit shop <i data-lucide="arrow-right" aria-hidden="true"></i>
            </div>
        </div>
    </a>`;
}

// ═══════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════
async function fetchStores(append = false) {
    if (state.loading) return;
    state.loading = true;

    const params = new URLSearchParams({
        page:  state.page,
        limit: PAGE_SIZE,
        sort:  state.sort,
    });
    if (state.category !== 'all') params.set('category', state.category);
    if (state.query)              params.set('search',   state.query);

    if (!append) {
        document.getElementById('stores-grid').innerHTML = Array(PAGE_SIZE).fill(storeSkeleton()).join('');
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('load-more-wrap').classList.add('hidden');
    }

    try {
        const res = await fetch(`${API}/api/public/stores?${params}`);
        if (!res.ok) throw new Error();
        const json = await res.json();

        state.data  = append ? [...state.data, ...json.data] : json.data;
        state.total = json.total;

        renderGrid();
    } catch {
        document.getElementById('stores-grid').innerHTML =
            '<p class="empty-msg" style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:3rem">Could not load stores. Is the server running?</p>';
    } finally {
        state.loading = false;
    }
}


async function fetchSpotlight() {
    const grid = document.getElementById('spotlight-grid');
    grid.innerHTML = Array(3).fill(spotlightSkeleton()).join('');

    try {
        const res = await fetch(`${API}/api/public/stores?limit=3&sort=featured`);
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        grid.innerHTML = data.slice(0, 3).map((s, i) => buildSpotlightCard(s, i + 1)).join('');
        lucide.createIcons();
    } catch(e) {}
}


async function fetchHeroStats() {
    const mpSellersEl = document.getElementById('mp-stat-sellers');
    const mpProductsEl = document.getElementById('mp-stat-products');
    const mpReviewsEl = document.getElementById('mp-stat-reviews');

    if (!mpSellersEl && !mpProductsEl && !mpReviewsEl) return;

    const FALLBACKS = {
        sellers: '0',
        products: '0',
        reviews: '0',
    };

    const apply = (sellers, products, reviews) => {
        if (mpSellersEl) mpSellersEl.textContent = sellers ?? FALLBACKS.sellers;
        if (mpProductsEl) mpProductsEl.textContent = products ?? FALLBACKS.products;
        if (mpReviewsEl) mpReviewsEl.textContent = reviews ?? FALLBACKS.reviews;
    };

    try {
        const res = await fetch(`${API}/api/public/stats`);
        const json = (await res.json()) || {};
        const s = json.data || json;

        apply(
            s.totalSellers || s.sellers || null,
            s.totalProducts || s.products || null,
            s.totalReviews || s.reviews || null,
        );
    } catch(e) {}
}

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════
function renderGrid() {
    const gridEl   = document.getElementById('stores-grid');
    const emptyEl  = document.getElementById('empty-state');
    const loadWrap = document.getElementById('load-more-wrap');
    const countEl  = document.getElementById('results-count');

    countEl.textContent = state.total;

    if (!state.data.length) {
        gridEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        loadWrap.classList.add('hidden');
        return;
    }

    emptyEl.classList.add('hidden');
    gridEl.innerHTML = state.data.map(buildStoreCard).join('');
    loadWrap.classList.toggle('hidden', state.data.length >= state.total);
    lucide.createIcons();
}

// ═══════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════

// Hero search
const heroInput = document.getElementById('hero-search-input');
const heroBtn   = document.getElementById('hero-search-btn');

function applySearch() {
    state.query = heroInput.value.trim();
    state.page  = 1;
    if (state.query) document.querySelector('.stores-main').scrollIntoView({ behavior: 'smooth' });
    fetchStores();
}
heroInput.addEventListener('keydown', e => { if (e.key === 'Enter') applySearch(); });
heroBtn.addEventListener('click', applySearch);

// Category pills
document.getElementById('category-rail').addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.category = pill.dataset.cat;
    state.page = 1;

    const showSpotlight = state.category === 'all' && !state.query;
    document.getElementById('spotlight-section').classList.toggle('hidden', !showSpotlight);

    fetchStores();
});

// Sort
document.getElementById('sort-select').addEventListener('change', e => {
    state.sort = e.target.value;
    state.page = 1;
    fetchStores();
});

// View toggle
document.getElementById('btn-grid').addEventListener('click', () => {
    state.view = 'grid';
    document.getElementById('stores-grid').className = 'stores-grid grid-view';
    document.getElementById('btn-grid').classList.add('active');
    document.getElementById('btn-list').classList.remove('active');
});

document.getElementById('btn-list').addEventListener('click', () => {
    state.view = 'list';
    document.getElementById('stores-grid').className = 'stores-grid list-view';
    document.getElementById('btn-list').classList.add('active');
    document.getElementById('btn-grid').classList.remove('active');
});

// Load more
document.getElementById('load-more-btn').addEventListener('click', () => {
    state.page++;
    fetchStores(true);
});

// Empty state reset
document.getElementById('empty-reset').addEventListener('click', () => {
    state.query    = '';
    state.category = 'all';
    state.page     = 1;
    heroInput.value = '';
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.cat-pill[data-cat="all"]').classList.add('active');
    document.getElementById('spotlight-section').classList.remove('hidden');
    fetchStores();
    fetchSpotlight();
});

// Navbar + category rail: shadow lives on the rail so both feel unified
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 10;
    const navbar = document.getElementById('navbar');
    const catRail = document.querySelector('.category-rail-wrap');
    if (navbar) navbar.style.boxShadow = 'none';
    if (catRail) catRail.style.boxShadow = scrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
});

const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('nav-mobile');
if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
        const isOpen = mobileNav.classList.contains('open');
        hamburger.setAttribute('aria-expanded', String(isOpen));
        hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}" aria-hidden="true"></i>`;
        lucide.createIcons();
    });
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
const urlParams = new URLSearchParams(location.search);
const urlCat    = urlParams.get('category');

if (urlCat) {
    state.category = urlCat;
    const pill = document.querySelector(`.cat-pill[data-cat="${urlCat}"]`);
    if (pill) {
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
    }
    document.getElementById('spotlight-section').classList.add('hidden');
}

fetchStores();
if (!urlCat) fetchSpotlight();
fetchHeroStats();
fetchCartCount();

// ── Live sync ─────────────────────────────────
let _isFetching = false;

function getSnapshot(ids) { return ids && ids.length ? ids.join(',') : '__empty__'; }

async function liveFetchStores() {
    if (_isFetching) return;
    _isFetching = true;
    try {
        const token = getToken && getToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const [statsRes, spotRes, storesRes, cartRes] = await Promise.all([
            fetch(`${API}/api/public/stats`, { credentials: 'include',  cache: 'no-store' }),
            fetch(`${API}/api/public/stores?limit=3&sort=featured`, { credentials: 'include',  cache: 'no-store' }),
            fetch(`${API}/api/public/stores?${new URLSearchParams({
                page: state.page, limit: PAGE_SIZE, sort: state.sort,
                ...(state.category !== 'all' ? { category: state.category } : {}),
                ...(state.query ? { search: state.query } : {}),
            })}`, { credentials: 'include',  cache: 'no-store' }),
            token ? fetch(`${API}/api/cart`, { credentials: 'include',  headers, cache: 'no-store' }) : Promise.resolve(null),
        ]);

        if (statsRes.ok) {
            const s = (await statsRes.json()).data;
            if (s && Object.values(s).some(v => v !== null && v !== undefined && v !== '' && v !== 0)) {
                fetchHeroStatsFromData(s);
            }
        }

        if (spotRes.ok) {
            const { data } = await spotRes.json();
            const grid = document.getElementById('spotlight-grid');
            grid.innerHTML = data.slice(0, 3).map((s, i) => buildSpotlightCard(s, i + 1)).join('');
            lucide.createIcons();
        }

        if (storesRes.ok) {
            const { data, total } = await storesRes.json();
            state.data  = data;
            state.total = total;
            renderGridQuiet();
        }

        if (cartRes && cartRes.ok) {
            const json = await cartRes.json();
            if (json?.data?.itemCount != null && window.__updateCartBadge) {
                window.__updateCartBadge(json.data.itemCount);
            }
        }
    } catch(e) {}
    _isFetching = false;
}

function fetchHeroStatsFromData(s) {
    const mpSellersEl = document.getElementById('mp-stat-sellers');
    const mpProductsEl = document.getElementById('mp-stat-products');
    const mpReviewsEl = document.getElementById('mp-stat-reviews');

    if (mpSellersEl) mpSellersEl.textContent = s.totalSellers || s.sellers || mpSellersEl.textContent;
    if (mpProductsEl) mpProductsEl.textContent = s.totalProducts || s.products || mpProductsEl.textContent;
    if (mpReviewsEl) mpReviewsEl.textContent = s.totalReviews || s.reviews || mpReviewsEl.textContent;
}

function renderGridQuiet() {
    const gridEl   = document.getElementById('stores-grid');
    const emptyEl  = document.getElementById('empty-state');
    const loadWrap = document.getElementById('load-more-wrap');
    const countEl  = document.getElementById('results-count');

    countEl.textContent = state.total ?? gridEl.querySelectorAll('.store-card').length;
    lucide.createIcons();

    if (!state.data.length) {
        gridEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        loadWrap.classList.add('hidden');
        return;
    }

    emptyEl.classList.add('hidden');
    gridEl.innerHTML = state.data.map(buildStoreCard).join('');
    loadWrap.classList.toggle('hidden', state.data.length >= state.total);
    lucide.createIcons();
}

function startStoresLiveSync() {
    let initialized = false;
    _pollId = setInterval(async () => {
        if (state.loading || _isFetching) return;
        if (!initialized) {
            initialized = true;
            return;
        }
        await liveFetchStores();
    }, 5000);
}

function stopStoresLiveSync() {
    if (_pollId) { clearInterval(_pollId); _pollId = null; }
}

window.addEventListener('focus', () => {
    _isFetching = false;
    liveFetchStores();
});

window.addEventListener('online', () => {
    _isFetching = false;
    liveFetchStores();
});

liveFetchStores();
