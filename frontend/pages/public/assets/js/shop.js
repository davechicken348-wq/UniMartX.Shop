// ── Shop Page ──────────────────────────────────────
const SHOP_API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── Auth ──────────────────────────────────────────
function getAuthToken() {
    const raw = localStorage.getItem('authData');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.expiry && Date.now() > parsed.expiry) {
                localStorage.removeItem('authData');
            } else {
                const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (authData.token) return authData.token;
            }
        } catch {}
    }
    const fallback = localStorage.getItem('authToken');
    if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
    return fallback;
}

function authHeaders() {
    const token = getAuthToken();
    return token
        ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

async function apiFetch(path, opts = {}) {
    const res = await fetch(`${SHOP_API_BASE}${path}`, {
        ...opts,
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}), ...authHeaders() },
        body: opts.body,
        credentials: 'include',
    });
    if (!res.ok && res.status !== 404) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res;
}

function getToken() { return getAuthToken(); }

// Lucide icons
if (typeof lucide !== 'undefined') lucide.createIcons();

function updateCartBadge(count) {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = String(count);
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

window.__updateCartBadge = updateCartBadge;

async function fetchCartCount() {
    try {
        const res = await apiFetch('/api/cart');
        const json = await res.json();
        if (json?.data?.itemCount != null) updateCartBadge(json.data.itemCount);
    } catch { updateCartBadge(0); }
}

async function addToCartAPI(productId, qty = 1) {
    const res = await apiFetch('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: qty }),
    });
    const json = await res.json();
    if (json.cartCount != null) updateCartBadge(json.cartCount);
    return json;
}

window.__addToCartAPI = addToCartAPI;

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
    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
    }
});

// ── Mobile Sidebar ──────────────────────────────────
const filterTrigger = document.getElementById('filter-trigger');
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    trapFocus(sidebar);
    setTimeout(() => sidebar.querySelector('button')?.focus(), 100);
}

function closeSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

function trapFocus(element) {
    const focusable = element.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    element.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
}

if (filterTrigger) filterTrigger.addEventListener('click', openSidebar);
if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
    }
});

// ── Grid / List View Toggle ────────────────────────────
const btnGrid = document.getElementById('btn-grid');
const btnList = document.getElementById('btn-list');
const productsWrap = document.getElementById('products-wrap');

function setView(view) {
    if (!productsWrap || !btnGrid || !btnList) return;
    if (view === 'grid') {
        productsWrap.classList.remove('list-view');
        productsWrap.classList.add('grid-view');
        btnGrid.classList.add('active');
        btnList.classList.remove('active');
    } else if (view === 'list') {
        productsWrap.classList.remove('grid-view');
        productsWrap.classList.add('list-view');
        btnGrid.classList.remove('active');
        btnList.classList.add('active');
    }
}

if (btnGrid && btnList && productsWrap) {
    btnGrid.addEventListener('click', () => setView('grid'));
    btnList.addEventListener('click', () => setView('list'));
}

// ── Dual Range Price Slider ────────────────────────────
const rangeMin = document.getElementById('range-min');
const rangeMax = document.getElementById('range-max');
const priceMin = document.getElementById('price-min');
const priceMax = document.getElementById('price-max');
const priceFill = document.getElementById('price-fill');

const MIN_PRICE = 0;
const MAX_PRICE = 1000;

function updatePriceSlider() {
    if (!rangeMin || !rangeMax || !priceMin || !priceMax || !priceFill) return;
    let minVal = parseInt(rangeMin.value, 10);
    let maxVal = parseInt(rangeMax.value, 10);
    if (minVal > maxVal) {
        minVal = maxVal;
        rangeMin.value = maxVal;
    }
    const safeMin = Math.max(MIN_PRICE, Math.min(minVal, MAX_PRICE));
    const safeMax = Math.max(MIN_PRICE, Math.min(maxVal, MAX_PRICE));
    const percentLeft = (safeMin / MAX_PRICE) * 100;
    const percentWidth = ((safeMax - safeMin) / MAX_PRICE) * 100;
    priceFill.style.left = percentLeft + '%';
    priceFill.style.width = percentWidth + '%';
    priceMin.value = safeMin;
    priceMax.value = safeMax;
}

function updateFromPriceInputs() {
    if (!rangeMin || !rangeMax || !priceMin || !priceMax) return;
    let minVal = parseInt(priceMin.value, 10) || 0;
    let maxVal = parseInt(priceMax.value, 10) || MAX_PRICE;
    minVal = Math.max(MIN_PRICE, Math.min(minVal, MAX_PRICE));
    maxVal = Math.max(MIN_PRICE, Math.min(maxVal, MAX_PRICE));
    if (minVal > maxVal) minVal = maxVal;
    rangeMin.value = minVal;
    rangeMax.value = maxVal;
    updatePriceSlider();
}

if (rangeMin && rangeMax && priceMin && priceMax && priceFill) updatePriceSlider();

// ════════════════════════════════════════════
// STATE — single source of truth for filters
// ════════════════════════════════════════════
const filterState = {
    category: 'all',
    subcategory: 'all',
    sellerType: 'all',
    condition: 'all',
    rating: '0',
    sort: 'newest',
    search: '',
    inStock: false,
    minPrice: 0,
    maxPrice: 1000,
};

function syncStateFromDOM() {
    filterState.category    = document.querySelector('input[name="category"]:checked')?.value    || 'all';
    filterState.subcategory = document.querySelector('input[name="subcategory"]:checked')?.value || 'all';
    filterState.sellerType  = document.querySelector('input[name="seller-type"]:checked')?.value  || 'all';
    filterState.condition   = document.querySelector('input[name="condition"]:checked')?.value    || 'all';
    filterState.rating      = document.querySelector('input[name="rating"]:checked')?.value       || '0';
    filterState.sort        = document.getElementById('sort-select')?.value                       || 'newest';
    filterState.search      = document.getElementById('nav-search-input')?.value.trim()           || '';
    filterState.inStock     = inStockToggle ? inStockToggle.checked : false;
    filterState.minPrice    = priceMin ? parseInt(priceMin.value, 10) : 0;
    filterState.maxPrice    = priceMax ? parseInt(priceMax.value, 10) : MAX_PRICE;
}

function normalizeSubcategory(value) {
    if (!value || value === 'all') return 'all';
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildApiParams() {
    const normSub = filterState.subcategory !== 'all'
        ? normalizeSubcategory(filterState.subcategory)
        : 'all';
    const params = new URLSearchParams({ sort: filterState.sort, page: currentPage, limit: 24 });
    if (filterState.category    !== 'all') params.set('category',    filterState.category);
    if (normSub !== 'all')               params.set('subcategory', normSub);
    if (filterState.sellerType  !== 'all') params.set('sellerType',  filterState.sellerType);
    if (filterState.condition   !== 'all') params.set('condition',   filterState.condition);
    if (filterState.rating      !== '0')   params.set('minRating',   filterState.rating);
    if (filterState.search)                params.set('search',      filterState.search);
    if (filterState.inStock)               params.set('inStock',     'true');
    if (filterState.minPrice    > 0)       params.set('minPrice',    filterState.minPrice);
    if (filterState.maxPrice    < MAX_PRICE) params.set('maxPrice',  filterState.maxPrice);
    return params;
}

function buildFilterLabels() {
    const labels = [];
    if (filterState.category    !== 'all') labels.push('category ' + filterState.category);
    if (filterState.subcategory !== 'all') labels.push('subcategory ' + filterState.subcategory);
    if (filterState.sellerType  !== 'all') labels.push('seller ' + filterState.sellerType);
    if (filterState.condition   !== 'all') labels.push('condition ' + filterState.condition);
    if (filterState.rating      !== '0')   labels.push('minimum rating ' + filterState.rating);
    if (filterState.search)                labels.push('search ' + filterState.search);
    if (filterState.inStock)               labels.push('in stock');
    if (filterState.minPrice > 0 || filterState.maxPrice < MAX_PRICE) labels.push('price ' + filterState.minPrice + ' to ' + filterState.maxPrice);
    return labels;
}

// ════════════════════════════════════════════
// SUBCATEGORY MAP & DYNAMIC PANEL
// ════════════════════════════════════════════
const SUBCATEGORIES = {
    electronics:   ['Phones & Accessories', 'Laptops & Computers', 'Audio', 'Cameras', 'Gaming', 'Cables', 'Other'],
    books:         ['Textbooks', 'Novels', 'Stationery', 'Study Guides', 'Other'],
    fashion:       ["Men's Clothing", "Women's Clothing", 'Shoes', 'Bags', 'Accessories', 'Other'],
    food:          ['Snacks', 'Other'],
    beauty:        ['Skincare', 'Hair Care', 'Makeup', 'Fragrances', 'Other'],
    sports:        ['Gym Equipment', 'Sportswear', 'Outdoor Gear', 'Other'],
    home:          ['Furniture', 'Bedding', 'Kitchen', 'Decor', 'Cleaning', 'Other'],
    art:           ['Paintings', 'Crafts', 'Photography', 'Digital Art', 'Other'],
    other:         ['Other'],
};

const subcategoryGroup   = document.getElementById('subcategory-group');
const subcategoryOptions = document.getElementById('subcategory-options');

function renderSubcategories(category) {
    if (!subcategoryGroup || !subcategoryOptions) return;
    const subs = SUBCATEGORIES[category];
    if (!subs) {
        subcategoryGroup.classList.add('hidden');
        filterState.subcategory = 'all';
        return;
    }
    subcategoryGroup.classList.remove('hidden');
    subcategoryOptions.innerHTML = [
        `<label class="filter-option"><input type="radio" name="subcategory" value="all" checked><span>All</span></label>`,
        ...subs.map(s => `<label class="filter-option"><input type="radio" name="subcategory" value="${s}"><span>${s}</span></label>`),
    ].join('');
    filterState.subcategory = 'all';
}

// ════════════════════════════════════════════
// FILTERS CHIPS & ACTIVE FILTERS
// ════════════════════════════════════════════
const activeFiltersContainer = document.getElementById('active-filters');
const filterChipsContainer   = document.getElementById('filter-chips');
const filterGroups           = document.querySelectorAll('.filter-group input[type="radio"]');
const clearFiltersBtn        = document.getElementById('clear-filters');
const inStockToggle          = document.getElementById('in-stock-toggle');

function getActiveFilters() {
    const filters = {};
    document.querySelectorAll('.filter-group input[type="radio"]:checked').forEach(input => {
        const name  = input.name;
        const value = input.value;
        if (value !== 'all' && value !== '0') filters[name] = value;
    });
    if (inStockToggle && inStockToggle.checked) filters.inStock = true;
    const min = priceMin ? parseInt(priceMin.value, 10) : 0;
    const max = priceMax ? parseInt(priceMax.value, 10) : MAX_PRICE;
    if (min > 0 || max < MAX_PRICE) filters.price = { min, max };
    return filters;
}

function renderFilterChips() {
    const filters = getActiveFilters();
    const count = Object.keys(filters).length;

    const filterCount = document.getElementById('filter-count');
    if (filterCount) {
        if (count > 0) {
            filterCount.textContent = count;
            filterCount.classList.remove('hidden');
        } else {
            filterCount.classList.add('hidden');
        }
    }

    if (activeFiltersContainer) {
        activeFiltersContainer.innerHTML = '';
        Object.entries(filters).forEach(([name, val]) => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            let label = '';
            if (name === 'price') {
                label = `GH₵${val.min}–GH₵${val.max}`;
            } else if (name === 'inStock') {
                label = 'In Stock Only';
            } else if (typeof val === 'string') {
                label = val.charAt(0).toUpperCase() + val.slice(1);
            }
            if (!label) return;
            chip.innerHTML = `${label}<button class="chip-remove" data-filter="${name}"><i data-lucide="x"></i></button>`;
            activeFiltersContainer.appendChild(chip);
        });
        lucide.createIcons();

        activeFiltersContainer.querySelectorAll('.chip-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filterName = btn.dataset.filter;
                if (filterName === 'price') {
                    if (rangeMin) rangeMin.value = 0;
                    if (rangeMax) rangeMax.value = MAX_PRICE;
                    updatePriceSlider();
                } else if (filterName === 'inStock') {
                    if (inStockToggle) inStockToggle.checked = false;
                    const radio = document.querySelector(`input[name="${filterName}"][value="all"], input[name="${filterName}"][value="0"]`);
                    if (radio) radio.checked = true;
                }
                resetPageAndFetch();
            });
        });
    }

    if (filterChipsContainer) {
        filterChipsContainer.innerHTML = '';
        Object.entries(filters).forEach(([name, val]) => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            let label = '';
            if (name === 'price') {
                label = `GH₵${val.min}–GH₵${val.max}`;
            } else if (name === 'inStock') {
                label = 'In Stock Only';
            } else if (typeof val === 'string') {
                label = val.charAt(0).toUpperCase() + val.slice(1);
            }
            if (!label) return;
            chip.innerHTML = `${label}<button class="chip-remove" data-filter="${name}"><i data-lucide="x"></i></button>`;
            filterChipsContainer.appendChild(chip);
        });
        lucide.createIcons();

        filterChipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filterName = btn.dataset.filter;
                if (filterName === 'price') {
                    if (rangeMin) rangeMin.value = 0;
                    if (rangeMax) rangeMax.value = MAX_PRICE;
                    updatePriceSlider();
                } else if (filterName === 'inStock') {
                    if (inStockToggle) inStockToggle.checked = false;
                    const radio = document.querySelector(`input[name="${filterName}"][value="all"], input[name="${filterName}"][value="0"]`);
                    if (radio) radio.checked = true;
                }
                resetPageAndFetch();
            });
        });
    }
}

// ════════════════════════════════════════════
// PRODUCTS RENDER & EMPTY STATE
// ════════════════════════════════════════════
const emptyState   = document.getElementById('empty-state');
const resultsCount = document.getElementById('results-count');
const pagination   = document.getElementById('pagination');
const cartCount    = document.getElementById('cart-count');
let currentPage    = 1;
let totalPages     = 1;

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function buildProductCard(p) {
    const isPlaceholder = !p.image || p.image.startsWith('data:');
    const imgHtml = isPlaceholder
        ? `<div class="img-placeholder"><i data-lucide="package" aria-hidden="true"></i></div>`
        : `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`;

    const badge = p.comparePrice
        ? `<div class="product-badge product-badge--sale">Sale</div>` : '';

    const fee = parseFloat(p.deliveryFee);
    const deliveryBadge = (!isNaN(fee) && fee > 0)
        ? `<div class="product-badge product-badge--delivery">Delivery GH₵ ${fee.toFixed(2)}</div>` : '';

    const stars = '★'.repeat(Math.round(p.rating || 0)) + '☆'.repeat(5 - Math.round(p.rating || 0));
    const stockStatus = p.stock != null ? (p.stock > 0 ? `${p.stock} in stock` : 'Out of stock') : null;
    const stockHtml = stockStatus ? `<div class="product-stock${p.stock === 0 ? ' out-of-stock' : ''}">${stockStatus}</div>` : '';

    const priceHtml = p.comparePrice
        ? `<div><span class="product-price">GH₵ ${Number(p.price).toFixed(2)}</span><span class="product-price-old">GH₵ ${Number(p.comparePrice).toFixed(2)}</span></div>`
        : `<span class="product-price">GH₵ ${Number(p.price).toFixed(2)}</span>`;

    return `
    <a class="product-card" href="product-details.html?id=${escapeHtml(p.id)}">
        <div class="product-img-wrap">
            ${imgHtml}${badge}${deliveryBadge}${stockHtml}
            <button class="product-save" data-product-id="${escapeHtml(p.id)}" aria-label="Save" type="button"><i data-lucide="heart" aria-hidden="true"></i></button>
        </div>
        <div class="product-info">
            <p class="product-store">${escapeHtml(p.storeName || '')}</p>
            <h3 class="product-name">${escapeHtml(p.name)}</h3>
            <div class="product-rating">
                <span class="stars-filled">${stars}</span>
                <span class="rating-count">(${escapeHtml(String(p.reviewCount || 0))})</span>
            </div>
            <p class="product-desc">${escapeHtml(p.description || '')}</p>
            <div class="product-bottom">
                ${priceHtml}
                <button class="product-cart-btn" aria-label="Add to cart" type="button"><i data-lucide="shopping-cart" aria-hidden="true"></i></button>
            </div>
        </div>
    </a>`;
}

function renderProducts(products, total) {
    if (!productsWrap) return;

    if (!products || products.length === 0) {
        productsWrap.innerHTML = '';
        if (emptyState)   emptyState.classList.remove('hidden');
        if (pagination)   pagination.classList.add('hidden');
        if (resultsCount) resultsCount.innerHTML = 'Showing <strong>0</strong> products';
        return;
    }

    if (emptyState)   emptyState.classList.add('hidden');
    if (pagination)   pagination.classList.remove('hidden');
    if (resultsCount) resultsCount.innerHTML = `Showing <strong>${total}</strong> products`;

    productsWrap.innerHTML = products.map(buildProductCard).join('');
    lucide.createIcons();
    bindCardButtons();
    WishlistAPI.init(productsWrap);
}

function bindCardButtons() {
    productsWrap.querySelectorAll('.product-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (btn.classList.contains('added')) return;
            const card = btn.closest('.product-card');
            const href = card?.getAttribute('href') || '';
            const id = href.split('id=')[1];
            if (!id) return;
            try {
                btn.classList.add('added');
                btn.style.background = '#34d399';
                btn.style.color = '#0a0a0f';
                await window.__addToCartAPI(id, 1);
                showToast('Added to cart!');
            } catch {
                btn.classList.remove('added');
                btn.style.background = '';
                btn.style.color = '';
                const auth = getToken();
                if (!auth) window.location.href = '../../auth/login.html';
            }
        });
    });
}

// ════════════════════════════════════════════
// PAGINATION
// ════════════════════════════════════════════
const prevPage   = document.getElementById('prev-page');
const nextPage   = document.getElementById('next-page');
const pageNumbers = document.getElementById('page-numbers');

function renderPagination(total) {
    if (!pageNumbers) return;
    totalPages = total;
    pageNumbers.innerHTML = '';

    const delta = 2;
    const pages = [];
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= currentPage - delta && i <= currentPage + delta)) {
            pages.push(i);
        }
    }

    let prev = null;
    pages.forEach(i => {
        if (prev && i - prev > 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '…';
            pageNumbers.appendChild(ellipsis);
        }
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => { currentPage = i; fetchProducts(); });
        pageNumbers.appendChild(btn);
        prev = i;
    });

    if (prevPage) prevPage.disabled = currentPage <= 1;
    if (nextPage) nextPage.disabled = currentPage >= totalPages;
}

if (prevPage) prevPage.addEventListener('click', () => { if (currentPage > 1)            { currentPage--; fetchProducts(); } });
if (nextPage) nextPage.addEventListener('click', () => { if (currentPage < totalPages)   { currentPage++; fetchProducts(); } });

function showSkeletons() {
    if (!productsWrap) return;
    productsWrap.innerHTML = Array(8).fill(`
        <div class="product-card skeleton-card">
            <div class="product-img-wrap"><div class="product-img-placeholder"></div></div>
            <div class="product-info">
                <div class="skel skel-sm"></div>
                <div class="skel skel-md"></div>
                <div class="product-bottom"><div class="skel skel-sm"></div><div class="skel skel-icon"></div></div>
            </div>
        </div>`).join('');
    if (emptyState) emptyState.classList.add('hidden');
    if (pagination) pagination.classList.add('hidden');
    if (pageNumbers) pageNumbers.innerHTML = '';
}

let fetchAbortController = null;

async function fetchProducts() {
    showSkeletons();
    syncStateFromDOM();

    if (fetchAbortController) fetchAbortController.abort();
    fetchAbortController = new AbortController();

    const params = buildApiParams();
    const filterLabels = buildFilterLabels();

    try {
        const res  = await fetch(`${SHOP_API_BASE}/api/public/products?${params}`, {
            credentials: 'include',
            signal: fetchAbortController.signal,
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        renderProducts(json.data, json.total);
        renderPagination(json.totalPages || 1);
        announceFilters(filterLabels, json.total);
    } catch (err) {
        if (err.name === 'AbortError') return;
        if (productsWrap) productsWrap.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            const h3 = emptyState.querySelector('h3');
            const p  = emptyState.querySelector('p');
            if (h3) h3.textContent = 'Failed to load products';
            if (p)  p.textContent  = 'Check your connection and try again.';
        }
        if (pagination) pagination.classList.add('hidden');
        announceFilters(filterLabels, 0);
    }
}

// ════════════════════════════════════════════
// FILTER & SORT LISTENERS
// ════════════════════════════════════════════
function resetPageAndFetch() {
    currentPage = 1;
    syncStateFromDOM();
    renderFilterChips();
    fetchProducts();
}

function announceFilters(filterLabels, totalResults) {
    const liveRegion = document.getElementById('filter-announcements');
    if (!liveRegion) return;
    const message = filterLabels.length > 0
        ? `Filters applied: ${filterLabels.join(', ')}. Showing ${totalResults} products.`
        : `All filters cleared. Showing ${totalResults} products.`;
    liveRegion.textContent = message;
}

filterGroups.forEach(input => {
    input.addEventListener('change', (e) => {
        if (e.target.name === 'category') {
            renderSubcategories(e.target.value);
            resetSubcategory();
        }
        resetPageAndFetch();
    });
});

function resetSubcategory() {
    const allSub = document.querySelector('input[name="subcategory"][value="all"]');
    if (allSub) allSub.checked = true;
}

if (subcategoryOptions) {
    subcategoryOptions.addEventListener('change', (e) => {
        if (e.target.name === 'subcategory') resetPageAndFetch();
    });
}

if (inStockToggle) inStockToggle.addEventListener('change', resetPageAndFetch);

let priceDebounce;
function onPriceChange() {
    renderFilterChips();
    clearTimeout(priceDebounce);
    priceDebounce = setTimeout(() => { currentPage = 1; fetchProducts(); }, 400);
}
if (rangeMin) rangeMin.addEventListener('input',  () => { updatePriceSlider(); onPriceChange(); });
if (rangeMax) rangeMax.addEventListener('input',  () => { updatePriceSlider(); onPriceChange(); });
if (priceMin) priceMin.addEventListener('change', () => { updateFromPriceInputs(); onPriceChange(); });
if (priceMax) priceMax.addEventListener('change', () => { updateFromPriceInputs(); onPriceChange(); });

const sortSelect = document.getElementById('sort-select');
if (sortSelect) sortSelect.addEventListener('change', resetPageAndFetch);

const navSearchBtn   = document.getElementById('nav-search-btn');
const navSearchInput = document.getElementById('nav-search-input');
if (navSearchBtn)   navSearchBtn.addEventListener('click',   resetPageAndFetch);
if (navSearchInput) navSearchInput.addEventListener('keydown', e => { if (e.key === 'Enter') resetPageAndFetch(); });

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        const allCat    = document.querySelector('input[name="category"][value="all"]');
        const allSeller = document.querySelector('input[name="seller-type"][value="all"]');
        const allRating = document.querySelector('input[name="rating"][value="0"]');
        const allCond   = document.querySelector('input[name="condition"][value="all"]');
        if (allCat)    allCat.checked    = true;
        if (allSeller) allSeller.checked = true;
        if (allRating) allRating.checked = true;
        if (allCond)   allCond.checked   = true;
        if (inStockToggle) inStockToggle.checked = false;
        if (rangeMin)  rangeMin.value    = 0;
        if (rangeMax)  rangeMax.value    = MAX_PRICE;
        updatePriceSlider();
        resetSubcategory();
        if (subcategoryGroup) {
            subcategoryGroup.classList.add('hidden');
            if (subcategoryOptions) subcategoryOptions.innerHTML = '';
        }
        resetPageAndFetch();
    });
}

const emptyClearBtn = document.getElementById('empty-clear-filters');
if (emptyClearBtn && clearFiltersBtn) emptyClearBtn.addEventListener('click', () => clearFiltersBtn.click());

// ════════════════════════════════════════════
// INIT — read URL params then fetch
// ════════════════════════════════════════════
function applyUrlParams() {
    const params      = new URLSearchParams(window.location.search);
    const category    = params.get('category');
    const subcategory = params.get('subcategory');
    const search      = params.get('search');

    if (category) {
        const radio = document.querySelector(`input[name="category"][value="${category}"]`);
        if (radio) {
            radio.checked = true;
            renderSubcategories(category);
        }
    }

    if (subcategory && subcategoryOptions) {
        const trySetSubcategory = () => {
            const radio = document.querySelector(`input[name="subcategory"][value="${subcategory}"]`);
            if (radio) { radio.checked = true; return true; }
            return false;
        };

        if (!trySetSubcategory()) {
            const observer = new MutationObserver(() => {
                if (trySetSubcategory()) observer.disconnect();
            });
            observer.observe(subcategoryOptions, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 1000);
        }
    }

    if (search && navSearchInput) navSearchInput.value = search;
}

applyUrlParams();
renderFilterChips();
fetchProducts();
fetchCartCount();

// ── Live carts / stock on focus ───────────────
let _shopBusy = false;
const productIndex = new Map();

function buildProductIndex(products) {
    productIndex.clear();
    products.forEach(p => productIndex.set(p.id, p));
}

async function tickCart() {
    try {
        const token = getAuthToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${SHOP_API_BASE}/api/cart`, {
            credentials: 'include',
            headers,
            cache: 'no-store',
        });
        const json = await res.json();
        if (json?.data?.itemCount != null) updateCartBadge(json.data.itemCount);
    } catch { /* ignore */ }
}

async function tickStock() {
    if (_shopBusy) return;
    _shopBusy = true;
    try {
        const params = new URLSearchParams({ limit: 100, sort: 'newest' });
        const res = await fetch(`${SHOP_API_BASE}/api/public/products?${params}`, {
            credentials: 'include',
            cache: 'no-store',
        });
        if (!res.ok) { _shopBusy = false; return; }
        const json = await res.json();
        if (!json.success) { _shopBusy = false; return; }
        buildProductIndex(json.data || []);

        document.querySelectorAll('.product-card').forEach(card => {
            const id = new URL(card.href).searchParams.get('id');
            const p = productIndex.get(id);
            if (!p) return;
            const stockEl = card.querySelector('.product-stock');
            if (stockEl) {
                stockEl.textContent = p.stock > 0 ? `${p.stock} in stock` : 'Out of stock';
                stockEl.className = `product-stock ${p.stock > 0 ? '' : 'out-of-stock'}`;
            }
            const availBtn = card.querySelector('.product-cart-btn');
            if (availBtn) availBtn.disabled = p.stock === 0;
        });
        _shopBusy = false;
    } catch { _shopBusy = false; }
}

window.addEventListener('focus', () => {
    _shopBusy = false;
    tickCart();
    tickStock();
});

window.addEventListener('online', () => {
    _shopBusy = false;
    tickCart();
    tickStock();
});
