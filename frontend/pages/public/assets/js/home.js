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

const CATEGORY_MAP = {
    electronics: 'Electronics', fashion: 'Fashion', food: 'Food & Drinks', beauty: 'Beauty',
    books: 'Books', accessories: 'Accessories', services: 'Services', home: 'Home & Living',
    clothing: 'Fashion', other: 'Other',
};
function categoryLabel(cat) { return CATEGORY_MAP[cat] || cat || 'Store'; }
const CATEGORY_ICON = {
    electronics: 'cpu', fashion: 'shirt', clothing: 'shirt', food: 'utensils', beauty: 'sparkles',
    books: 'book-open', services: 'wrench', accessories: 'watch', home: 'sofa', other: 'store',
};
function categoryIcon(cat) { return CATEGORY_ICON[cat] || 'store'; }

function storeHref(s) {
    return `/pages/seller/public/store/store.html?sellerId=${esc(s.id)}&slug=${esc(s.slug || '')}`;
}

/* ── Navbar (mobile) ── */
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
window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
});

/* ── Skeleton builders ── */
function productSkeleton() {
    return `<div class="product-card skeleton-card"><div class="product-img-wrap"><div class="product-img-placeholder"></div></div><div class="product-info"><div class="skel skel-sm"></div><div class="skel skel-md"></div><div class="product-bottom"><div class="skel skel-sm"></div><div class="skel skel-icon"></div></div></div></div>`;
}
function storeSkeleton() {
    return `<div class="store-card skeleton-card"><div class="store-card-top skel-banner"></div><div class="store-info" style="padding:1.25rem"><div class="skel skel-md" style="margin-bottom:0.5rem"></div><div class="skel skel-sm" style="margin-bottom:0.85rem"></div><div class="store-meta"><div class="skel skel-sm"></div><div class="skel skel-sm"></div></div></div></div>`;
}

/* ── Product card (reused from old home) ── */
function buildProductCard(p) {
    const img = p.image && !p.image.startsWith('data:')
        ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
        : `<div class="product-img-placeholder"></div>`;
    const badge = p.comparePrice ? `<div class="product-badge product-badge--sale">Sale</div>` : '';
    const fee = parseFloat(p.deliveryFee);
    const deliveryBadge = (!isNaN(fee) && fee > 0) ? `<div class="product-badge product-badge--delivery">Delivery</div>` : '';
    const priceNum = parseFloat(p.price);
    const safePrice = isNaN(priceNum) ? null : priceNum.toFixed(2);
    const priceHtml = safePrice === null
        ? '<span class="product-price">Price unavailable</span>'
        : (p.comparePrice
            ? `<span class="product-price-old">GH₵ ${parseFloat(p.comparePrice).toFixed(2)}</span><span class="product-price">GH₵ ${safePrice}</span>`
            : `<span class="product-price">GH₵ ${safePrice}</span>`);
    return `<a href="shop/product-details.html?id=${esc(p.id)}" class="product-card"><div class="product-img-wrap">${img}${badge}${deliveryBadge}</div><div class="product-info"><span class="product-store">${esc(p.storeName || 'UnimartX')}</span><span class="product-name">${esc(p.name || 'Untitled Product')}</span><div class="product-bottom">${priceHtml}<button class="product-cart-btn" data-product-id="${esc(p.id)}" aria-label="Add to cart" type="button"${safePrice === null ? ' disabled' : ''}><i data-lucide="shopping-cart" aria-hidden="true"></i></button></div></div></a>`;
}

/* ── Featured business card (Section 1) ── */
function buildBizCard(s) {
    const av = s.storeAvatar
        ? `<img src="${esc(s.storeAvatar)}" alt="${esc(s.storeName)} logo" loading="lazy">`
        : logoFallback(s);
    const badge = s.isVerified
        ? `<span class="biz-badge"><i data-lucide="badge-check"></i> Verified</span>`
        : '';
    const previews = (s.featuredProducts && s.featuredProducts.slice(0, 3) || []).map(p =>
        p.image
            ? `<div class="biz-preview"><img src="${esc(p.image)}" alt="" loading="lazy"></div>`
            : `<div class="biz-preview"><span style="font-size:0.6rem;font-weight:800;color:var(--text-3)">${esc((p.name || '?').slice(0,2))}</span></div>`
    ).join('');
    return `<a class="biz-card" href="${storeHref(s)}" aria-label="Visit ${esc(s.storeName)}">
        <div class="biz-banner">
            <div class="biz-banner-bg" style="${bannerStyle(s)}"></div>
            <div class="biz-banner-overlay"></div>
            ${badge}
            <div class="biz-logo">${av}</div>
        </div>
        <div class="biz-body">
            <h3 class="biz-name">${esc(s.storeName)}</h3>
            <span class="biz-cat"><i data-lucide="${categoryIcon(s.category)}"></i> ${esc(categoryLabel(s.category))}</span>
            <div class="biz-previews">${previews}</div>
            <span class="biz-cta">Visit Store <i data-lucide="arrow-right"></i></span>
        </div>
    </a>`;
}

/* ── New store card (Section 5) ── */
function buildNewStoreCard(s) {
    const av = s.storeAvatar
        ? `<img src="${esc(s.storeAvatar)}" alt="" loading="lazy">`
        : logoFallback(s);
    return `<a class="newstore-card" href="${storeHref(s)}" aria-label="Visit ${esc(s.storeName)}">
        <div class="newstore-banner"><div class="newstore-banner-bg" style="${bannerStyle(s)}"></div></div>
        <div class="newstore-logo-row"><div class="newstore-logo">${av}</div></div>
        <div class="newstore-body">
            <span class="newstore-name">${esc(s.storeName)}</span>
            <span class="newstore-cat">${esc(categoryLabel(s.category))}</span>
            <span class="newstore-fresh"><i data-lucide="sparkles"></i> New this week</span>
        </div>
    </a>`;
}

/* ═══════════════════════════════════════════
   SECTION 1 — Featured businesses
═══════════════════════════════════════════ */
async function loadFeaturedBusinesses() {
    const grid = document.getElementById('featured-business-grid');
    if (!grid) return;
    grid.innerHTML = Array(6).fill(storeSkeleton()).join('');
    try {
        const res = await apiFetch('/api/public/stores?limit=6&sort=featured');
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        if (!data.length) { grid.innerHTML = '<p class="section-fallback">No businesses featured yet.</p>'; return; }
        grid.innerHTML = data.map(buildBizCard).join('');
        lucide.createIcons();
        observeReveal(grid);
    } catch {
        grid.innerHTML = '<p class="section-fallback">Could not load featured businesses.</p>';
        lucide.createIcons();
    }
}

/* ═══════════════════════════════════════════
   SECTION 2 — Category grid
═══════════════════════════════════════════ */
const CATEGORIES = [
    { key: 'electronics', name: 'Electronics', color: '#0ea5e9' },
    { key: 'fashion', name: 'Fashion', color: '#ec4899' },
    { key: 'food', name: 'Food & Drinks', color: '#f59e0b' },
    { key: 'beauty', name: 'Beauty', color: '#d946ef' },
    { key: 'books', name: 'Books', color: '#6366f1' },
    { key: 'accessories', name: 'Accessories', color: '#14b8a6' },
    { key: 'services', name: 'Services', color: '#8b5cf6' },
    { key: 'home', name: 'Home & Living', color: '#10b981' },
];
function renderCategoryGrid() {
    const grid = document.getElementById('category-grid');
    if (!grid) return;
    grid.innerHTML = CATEGORIES.map(c => `
        <a class="cat-tile" href="stores/stores.html?category=${c.key}" style="--tile-color:${c.color}">
            <span class="cat-tile-icon"><i data-lucide="${categoryIcon(c.key)}"></i></span>
            <span class="cat-tile-name">${c.name}</span>
            <span class="cat-tile-meta">Explore student shops</span>
        </a>`).join('');
    lucide.createIcons();
}

/* ═══════════════════════════════════════════
   SECTION 3 — Trending products (tabbed)
═══════════════════════════════════════════ */
async function loadProducts(sort = 'trending') {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = Array(8).fill(productSkeleton()).join('');
    try {
        const q = sort === 'trending' ? 'rating' : sort === 'newest' ? 'newest' : sort === 'popular' ? 'popular' : 'rating';
        const res = await apiFetch(`/api/public/products?sort=${q}&limit=8`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        const data = json.data || [];
        if (!data.length) { grid.innerHTML = '<div class="empty-msg"><div class="empty-msg-icon"><i data-lucide="package-open"></i></div><span>No products yet.</span></div>'; lucide.createIcons(); return; }
        grid.innerHTML = data.slice(0, 8).map(buildProductCard).join('');
        lucide.createIcons();
        observeReveal(grid);
    } catch {
        grid.innerHTML = '<div class="empty-msg"><div class="empty-msg-icon"><i data-lucide="alert-circle"></i></div><span>Could not load products.</span></div>';
        lucide.createIcons();
    }
}
function initProductTabs() {
    const tabs = document.getElementById('product-tabs');
    if (!tabs) return;
    tabs.addEventListener('click', e => {
        const btn = e.target.closest('.product-tab');
        if (!btn) return;
        tabs.querySelectorAll('.product-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        loadProducts(btn.dataset.sort);
    });
}

/* ═══════════════════════════════════════════
   SECTION 4 — Entrepreneur spotlight
═══════════════════════════════════════════ */
async function loadSpotlight() {
    const card = document.getElementById('spotlight-card');
    if (!card) return;
    try {
        const res = await apiFetch('/api/public/stores?limit=12&sort=rating');
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        if (!data.length) { card.innerHTML = ''; return; }
        // rotate by hour so it changes regularly
        const pick = data[new Date().getHours() % data.length];
        const av = pick.storeAvatar
            ? `<img src="${esc(pick.storeAvatar)}" alt="${esc(pick.storeName)}" loading="lazy">`
            : logoFallback(pick);
        const uni = pick.universityAffiliation || pick.campus || 'a Ghanaian university';
        const story = pick.storeDescription
            ? esc(pick.storeDescription)
            : `${esc(pick.storeName)} is a student-run business on UniMartX, turning a campus idea into a real storefront — proving that students can build, sell and grow right from their dorm.`;
        card.innerHTML = `
            <div class="spotlight-avatar">${av}</div>
            <div class="spotlight-body">
                <span class="spotlight-tag"><i data-lucide="award"></i> Featured Entrepreneur</span>
                <h3 class="spotlight-name">${esc(pick.storeName)}</h3>
                <span class="spotlight-uni"><i data-lucide="graduation-cap"></i> ${esc(uni)}</span>
                <p class="spotlight-story">${story}</p>
                <a class="spotlight-link" href="${storeHref(pick)}">Visit ${esc(pick.storeName)} <i data-lucide="arrow-right"></i></a>
            </div>`;
        lucide.createIcons();
    } catch { card.innerHTML = ''; }
}

/* ═══════════════════════════════════════════
   SECTION 5 — Recently opened stores
═══════════════════════════════════════════ */
async function loadNewStores() {
    const grid = document.getElementById('newstores-grid');
    if (!grid) return;
    grid.innerHTML = Array(5).fill(storeSkeleton()).join('');
    try {
        const res = await apiFetch('/api/public/stores?limit=10&sort=newest');
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        if (!data.length) { grid.innerHTML = ''; return; }
        grid.innerHTML = data.slice(0, 10).map(buildNewStoreCard).join('');
        lucide.createIcons();
    } catch { grid.innerHTML = ''; }
}

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
   SECTION 8 — Testimonials (static, community voice)
═══════════════════════════════════════════ */
const TESTIMONIALS = [
    { quote: 'I found a tailor and a bakery run by students on my own campus. Shopping here feels personal and I know my money stays in the student community.', name: 'Ama K.', role: 'Buyer', roleCls: 'buyer' },
    { quote: 'UniMartX let me turn my bake sales into a real storefront. I reached hundreds of students without building a website from scratch.', name: 'Kofi M.', role: 'Student Seller', roleCls: 'seller' },
    { quote: 'Our computing club sells merch and event tickets through UniMartX. It is the easiest way to fundraise and reach every student on campus.', name: 'LESA Exec', role: 'Student Org', roleCls: 'club' },
];
function renderTestimonials() {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;
    grid.innerHTML = TESTIMONIALS.map(t => `
        <div class="testimonial-card">
            <p class="testimonial-quote">${esc(t.quote)}</p>
            <div class="testimonial-person">
                <div class="testimonial-avatar">${esc(t.name.charAt(0))}</div>
                <div class="testimonial-meta">
                    <span class="testimonial-name">${esc(t.name)}</span>
                    <span class="testimonial-role ${t.roleCls}">${esc(t.role)}</span>
                </div>
            </div>
        </div>`).join('');
}

/* ═══════════════════════════════════════════
   SECTION 9 — Community & trust
═══════════════════════════════════════════ */
const TRUST = [
    { icon: 'badge-check', title: 'Verified Student Sellers', text: 'Every seller is verified as a real student, so you know who you are buying from.' },
    { icon: 'users', title: 'Campus Community', text: 'A marketplace built around universities — support the students around you.' },
    { icon: 'shield-check', title: 'Secure Marketplace', text: 'Safe payments and real reviews keep every transaction trustworthy.' },
    { icon: 'heart-handshake', title: 'Support Local Students', text: 'Every purchase directly backs a student entrepreneur building their dream.' },
];
function renderTrust() {
    const grid = document.getElementById('trust-grid');
    if (!grid) return;
    grid.innerHTML = TRUST.map(t => `
        <div class="trust-card-v3">
            <span class="trust-icon"><i data-lucide="${t.icon}"></i></span>
            <h3>${esc(t.title)}</h3>
            <p>${esc(t.text)}</p>
        </div>`).join('');
    lucide.createIcons();
}

/* ═══════════════════════════════════════════
   HERO — living marketplace + activity ticker
═══════════════════════════════════════════ */
async function loadHeroMarket() {
    const market = document.getElementById('hero-market');
    if (!market) return;
    try {
        const res = await apiFetch('/api/public/stores?limit=4&sort=featured');
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        const stores = data.length ? data : [];
        market.innerHTML = stores.map(s => {
            const av = s.storeAvatar ? `<img src="${esc(s.storeAvatar)}" alt="">` : logoFallback(s);
            return `<div class="hero-market-card">
                <div class="hero-market-banner" style="${bannerStyle(s)}"></div>
                <span class="hero-market-name">${esc(s.storeName)}</span>
                <div class="hero-market-logo">${av}</div>
            </div>`;
        }).join('') || defaultHeroMarket();
        lucide.createIcons();
    } catch { market.innerHTML = defaultHeroMarket(); }
}
function defaultHeroMarket() {
    return Array(4).fill(0).map((_, i) => `
        <div class="hero-market-card">
            <div class="hero-market-banner" style="background:${FALLBACK_GRADIENTS[i]}"></div>
            <span class="hero-market-name">Student Store</span>
            <div class="hero-market-logo">${'US'[i % 2]}</div>
        </div>`).join('');
}
function startActivityTicker() {
    const el = document.getElementById('hero-activity-text');
    if (!el) return;
    const messages = [
        'A student just opened a new store',
        'Someone just discovered a campus business',
        'A student seller just made a sale',
        'New products were just listed nearby',
        'A buyer just supported a student entrepreneur',
    ];
    let i = 0;
    setInterval(() => {
        i = (i + 1) % messages.length;
        el.textContent = messages[i];
    }, 3200);
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

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
(function init() {
    document.querySelectorAll('.hero-anim, .reveal').forEach(el => {
        if (el.closest('.hero')) el.classList.add('in-view');
    });

    try {
        fetchCartCount();
        renderCategoryGrid();
        renderTestimonials();
        renderTrust();
        loadFeaturedBusinesses();
        loadProducts('trending');
        loadSpotlight();
        loadNewStores();
        loadStats();
        loadHeroMarket();
        startActivityTicker();
        initProductTabs();
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
