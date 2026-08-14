// ── Home Page V3 — Student Entrepreneurship ──────
// API_BASE, apiFetch, fetchCartCount, addToCartAPI, updateCartBadge
// provided by pages/shared/js/cart.js (loaded before this script).

lucide.createIcons();

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(message, type = 'info') {
    document.querySelector('.toast')?.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
}

/* ── Shared store helpers (mirrors stores page) ── */
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
    return s.storeBanner ? `background-image:url('${esc(s.storeBanner)}');background-size:cover;background-position:center` : `background:${storeGradient(s)}`;
}
function logoFallback(s) {
    return `<span>${esc((s.storeName || '?').charAt(0).toUpperCase())}</span>`;
}

function categoryLabel(cat) {
  return (window.APP_CONFIG.CATEGORY_MAP && window.APP_CONFIG.CATEGORY_MAP[cat]) || cat || 'Store';
}
const CATEGORY_ICON = window.APP_CONFIG.CATEGORY_ICON || {};
function categoryIcon(cat) {
  return CATEGORY_ICON[cat] || 'store';
}

function storeHref(s) {
    return `/pages/seller/public/store/store.html?sellerId=${esc(s.id)}&slug=${esc(s.slug || '')}`;
}

/* ── Navbar (mobile) — handled by public-nav.js ── */
window._closeMenu = window._closeMenu || function() {};


/* ═══════════════════════════════════════════
   SECTION 6 — Marketplace statistics
═══════════════════════════════════════════ */
async function loadStats() {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;
    try {
        const res = await apiFetch('/api/public/stats');
        if (!res.ok) throw new Error();
        const json = await res.json();
        const d = json.data || {};
        const tiles = [
            { num: d.sellers || '—', label: 'Student Businesses' },
            { num: d.products || '—', label: 'Products Listed' },
            { num: '8', label: 'Categories' },
            { num: d.orders || '—', label: 'Orders Completed' },
            { num: d.universities || '12+', label: 'Universities Served' },
        ];
        grid.innerHTML = tiles.map(t => `
            <div class="stat-tile">
                <span class="stat-num" data-count="${esc(t.num)}">${esc(t.num)}</span>
                <span class="stat-label">${esc(t.label)}</span>
            </div>`).join('');
    } catch { grid.innerHTML = ''; }
}


/* ═══════════════════════════════════════════
     HERO — premium illustration system
    ═══════════════════════════════════════════ */
function loadHeroIllustration() {
    const el = document.getElementById('hero-illustration');
    if (!el || !window.Illustrations) return;
    window.Illustrations.hero(el);
    // showcase starts opacity:0 via illu-entrance — force visible immediately
    el.classList.add('in-view');
}

/* ═══════════════════════════════════════════
    SCROLL REVEAL
   ═══════════════════════════════════════════ */
let revealObserver = null;
function setupRevealObserver() {
    if (revealObserver) return;
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
        return;
    }
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}
function observeReveal(container) {
    if (!revealObserver) return;
    container.querySelectorAll('.reveal:not(.in-view)').forEach(el => revealObserver.observe(el));
}

/* Trust / ecosystem stats */
async function loadTrustStats() {
    const storesEl = document.getElementById('stat-stores');
    const productsEl = document.getElementById('stat-products');
    const ordersEl = document.getElementById('stat-orders');
    const campusesEl = document.getElementById('stat-campuses');
    if (!storesEl) return;

    const spinner = '<span class="stat-spinner"></span>';
    [storesEl, productsEl, ordersEl, campusesEl].forEach(el => { el.innerHTML = spinner; });

    try {
        const res = await apiFetch('/api/public/stats');
        if (!res.ok) throw new Error();
        const json = await res.json();
        const data = json.data || {};
        const sellers = data.sellers || data.totalSellers || 0;
        const products = data.products || data.totalProducts || 0;
        const orders = data.orders || data.totalOrders || 0;
        animateCount(storesEl, sellers);
        animateCount(productsEl, products);
        animateCount(ordersEl, orders);
        animateCount(campusesEl, 12);
    } catch {
        animateCount(storesEl, 0);
        animateCount(productsEl, 0);
        animateCount(ordersEl, 0);
        animateCount(campusesEl, 0);
    }
}

function animateCount(el, target) {
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (target - from) * ease).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

/* Growth features - no API needed, static */
function renderGrowthFeatures() {
    const grid = document.getElementById('features-grid');
    if (!grid) return;
    observeReveal(grid);
}

/* ═══════════════════════════════════════════
    INIT
   ═══════════════════════════════════════════ */
(function init() {
    document.querySelectorAll('.hero-anim, .reveal').forEach(el => {
        if (el.closest('.hero')) el.classList.add('in-view');
    });

    try {
        loadStats();
        loadHeroIllustration();
        setupRevealObserver();

        const productsGridEl = document.getElementById('products-grid');
        productsGridEl?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.product-cart-btn');
            if (!btn) return;
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            const productId = btn.dataset.productId;
            if (!productId || btn.disabled) return;
            btn.disabled = true;
            try {
                await window.__addToCartAPI(productId, 1);
                btn.classList.add('added');
                showToast('Added to cart!', 'success');
            } catch {
                showToast('Please log in to add items to cart', 'danger');
                setTimeout(() => window.location.href = '../../auth/login.html', 800);
            } finally {
                setTimeout(() => { btn.disabled = false; btn.classList.remove('added'); }, 1500);
            }
        });
    } catch (err) {
        console.error('[Home] Init error:', err);
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    }
})();
