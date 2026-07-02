// ── Home Page ──────────────────────────────────────
// (API_BASE, apiFetch, fetchCartCount, addToCartAPI, updateCartBadge
//  are all provided by pages/shared/js/cart.js — loaded before this script)

lucide.createIcons();

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showToast(message, type = 'info') {
    document.querySelector('.toast')?.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    const hide = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    };
    setTimeout(hide, 2500);
}

// ── Navbar ──────────────────────────────────
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
    document.getElementById('navbar').style.boxShadow =
        window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
});

// ── Skeleton builders ────────────────────────
function productSkeleton() {
    return `<div class="product-card skeleton-card"><div class="product-img-wrap"><div class="product-img-placeholder"></div></div><div class="product-info"><div class="skel skel-sm"></div><div class="skel skel-md"></div><div class="product-bottom"><div class="skel skel-sm"></div><div class="skel skel-icon"></div></div></div></div>`;
}
function storeSkeleton() {
    return `<div class="store-card skeleton-card"><div class="store-card-top skel-banner"></div><div class="store-info" style="padding:1.25rem"><div class="skel skel-md" style="margin-bottom:0.5rem"></div><div class="skel skel-sm" style="margin-bottom:0.85rem"></div><div class="store-meta"><div class="skel skel-sm"></div><div class="skel skel-sm"></div></div></div></div>`;
}
document.getElementById('products-grid').innerHTML = Array(4).fill(productSkeleton()).join('');
document.getElementById('stores-grid').innerHTML   = Array(4).fill(storeSkeleton()).join('');

// ── Card builders ────────────────────────────
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

function buildStoreCard(s) {
    const gradient = s.storeColor || 'linear-gradient(135deg,#6366f1,#a78bfa)';
    const avatarStyle = s.storeAvatar ? `background-image:url('${s.storeAvatar}');background-size:cover` : `background:${gradient}`;
    const stars = s.avgRating > 0 ? `<span><i data-lucide="star"></i> ${s.avgRating}</span>` : '';
    return `<a href="../seller/public/store/store.html?id=${s.id}" class="store-card"><div class="store-card-top" style="background:${gradient}"><div class="store-avatar" style="${avatarStyle}"></div></div><div class="store-info"><h3 class="store-name">${esc(s.storeName)}</h3><p class="store-category">${esc(s.category || 'General')}</p><div class="store-meta"><span><i data-lucide="package"></i> ${s.productCount} products</span>${stars}</div></div></a>`;
}

// ── Fetch platform stats ──────────────────
async function loadHeroStats() {
    const els = {
        products: document.getElementById('hero-products'),
        sellers: document.getElementById('hero-sellers'),
        buyers: document.getElementById('hero-buyers'),
    };
    if (!els.products || !els.sellers || !els.buyers) return;

    try {
        const res = await apiFetch('/api/public/stats');
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !json.data) return;
        if (json.data.products) els.products.textContent = json.data.products;
        if (json.data.sellers) els.sellers.textContent = json.data.sellers;
        if (json.data.buyers) els.buyers.textContent = json.data.buyers;
    } catch {
        // leave as — if fetch fails
    }
}

// ── Fetch trending products ──────────────────
async function loadProducts() {
    try {
        const res = await apiFetch('/api/public/products/trending');
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        const grid = document.getElementById('products-grid');
        if (!data.length) { grid.innerHTML = '<p class="empty-msg">No products yet.</p>'; return; }
        grid.innerHTML = data.slice(0, 4).map(buildProductCard).join('');
        lucide.createIcons();
    } catch {
        document.getElementById('products-grid').innerHTML = '<p class="empty-msg">Could not load products.</p>';
    }
}

// ── Fetch featured stores ────────────────────
async function loadStores() {
    try {
        const res = await apiFetch('/api/public/stores?limit=4&sort=featured');
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        const grid = document.getElementById('stores-grid');
        if (!data.length) { grid.innerHTML = '<p class="empty-msg">No shops yet.</p>'; return; }
        grid.innerHTML = data.map(buildStoreCard).join('');
        lucide.createIcons();
    } catch {
        document.getElementById('stores-grid').innerHTML = '<p class="empty-msg">Could not load shops.</p>';
    }
}

// ── Init ─────────────────────────────────────
(function init() {
    document.querySelectorAll('.hero-anim').forEach(el => el.classList.add('in-view'));

    try {
        fetchCartCount();
        loadProducts();
        loadStores();
        loadHeroStats();

        document.getElementById('products-grid')?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.product-cart-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
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
                setTimeout(() => {
                    btn.disabled = false;
                    btn.classList.remove('added');
                }, 1500);
            }
        });
    } catch (err) {
        console.error('[Home] Init error:', err);
        document.querySelectorAll('.hero-anim').forEach(el => el.classList.add('in-view'));
    }
})();
