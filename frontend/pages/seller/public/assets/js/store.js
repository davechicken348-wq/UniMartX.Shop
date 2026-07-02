// STORE.JS — Products & reviews rendering, fed by profile.js via window.initStore()

(function () {
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

function apiFetchWithTimeout(url, options = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    fetch(url, { ...options, signal: controller.signal })
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

    const state = {
        products: [],
        currentFilter: 'all',
        currentView: 'grid',
        searchQuery: '',
        sellerId: null,
        pagination: { page: 1, limit: 10, total: 0, hasMore: false },
        loadingMore: false,
        isPreview: false,
    };

    const badgeColors = {
        'Best Seller': '#059669',
        New: '#10b981',
        Popular: '#f59e0b',
        'Hot Deal': '#ef4444',
        Free: '#8b5cf6',
        default: '#059669',
    };

    // ── DOM refs ─────────────────────────────────────────────────────────────
    const navbar         = document.querySelector('#navbar');
    const navHamburger   = document.querySelector('#nav-hamburger');
    const navMobile      = document.querySelector('#nav-mobile');
    const storeProducts  = document.querySelector('#store-products');
    const filterTabsContainer = document.querySelector('#store-filter-tabs');
    let filterTabs = Array.from(document.querySelectorAll('.store-tab[data-filter]'));

    function bindTabListeners() {
        filterTabs = Array.from(filterTabsContainer.querySelectorAll('.store-tab[data-filter]'));
        filterTabs.forEach(tab => tab.addEventListener('click', () => setActiveFilter(tab.dataset.filter || 'all')));
    }
    const storeSearch    = document.querySelector('#store-search');
    const btnGrid        = document.querySelector('#btn-grid');
    const btnList        = document.querySelector('#btn-list');
    const noResults      = document.querySelector('#no-results');
    const contactBtn     = document.querySelector('#contact-btn');
    const contactModal   = document.querySelector('#contact-modal');
    const modalClose     = document.querySelector('#modal-close');
    const modalCancel    = document.querySelector('#modal-cancel');
    const modalSend      = document.querySelector('#modal-send');
    const contactMsg     = document.querySelector('#contact-msg');

    function createIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // ── Public init — called by profile.js ───────────────────────────────────
    window.initStore = function ({ products, reviews, categorycounts, pagination, sellerId, isPreview = false }) {
        state.products   = products || [];
        state.sellerId   = sellerId;
        state.pagination = pagination || state.pagination;
        state.isPreview  = isPreview;

        window._storeProducts = state.products;
        if (typeof reviews !== 'undefined') {
            window._storeReviews = reviews || [];
        }

        if (isPreview) {
            const toolbar = document.querySelector('.store-toolbar');
            if (toolbar) toolbar.classList.add('hidden');
            const filterTabs = document.querySelector('.store-filter-tabs');
            if (filterTabs) filterTabs.classList.add('hidden');
            renderPreviewProducts();
        } else {
            updateFilterTabs(categorycounts || {});
            setView(state.currentView);
            renderProducts();
        }
        renderMarquee();

        const skeleton = document.getElementById('loading-skeleton');
        if (skeleton) skeleton.classList.add('hidden');
    };

    function renderPreviewProducts() {
        if (!storeProducts) return;
        if (!state.products.length) {
            storeProducts.innerHTML = '';
            if (noResults) noResults.classList.remove('hidden');
            return;
        }
        if (noResults) noResults.classList.add('hidden');
        storeProducts.classList.add('grid-view');
        storeProducts.classList.remove('list-view');
        storeProducts.innerHTML = state.products.map(renderPreviewCard).join('');
        createIcons();
        if (typeof window.observeNewElements === 'function') window.observeNewElements();
    }

    function renderPreviewCard(product) {
        const imgSrc = product.image || '';
        const isPlaceholder = !imgSrc || imgSrc.startsWith('data:');
        const imgHtml = isPlaceholder
            ? `<div class="product-card-img-wrap"><div class="img-placeholder"><i data-lucide="package"></i></div></div>`
            : `<div class="product-card-img-wrap"><img src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'"></div>`;

        const filledStars = Math.round(product.rating || 0);
        const starMarkup = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);
        const reviewCount = product.reviewCount || 0;

        return `
            <a class="product-card product-card--preview" href="../../../public/shop/product-details.html?id=${product.id}">
                ${imgHtml}
                <div class="product-card-body">
                    <h3 class="product-card-title">${product.name}</h3>
                    <div class="product-card-price">
                        <span>GH₵${product.price.toFixed(2)}</span>
                        ${product.comparePrice ? `<span class="product-card-original">GH₵${product.comparePrice.toFixed(2)}</span>` : ''}
                    </div>
                    <div class="product-card-rating" aria-label="Rating: ${product.rating || 0}">
                        <span>${starMarkup}</span>
                        <span>${reviewCount > 0 ? (product.rating || 0).toFixed(1) : 'No reviews'}</span>
                    </div>
                </div>
            </a>`;
    }

    // ── Filter tab counts ─────────────────────────────────────────────────────
    const CAT_LABELS = {
        electronics: 'Electronics', fashion: 'Fashion', books: 'Books',
        beauty: 'Beauty', food: 'Food & Snacks',
        sports: 'Sports', home: 'Home & Living',
        art: 'Art & Crafts', other: 'Other',
    };

    function updateFilterTabs(categorycounts) {
        const total = state.products.length;
        const allTab = filterTabsContainer.querySelector('[data-filter="all"] .tab-num') ||
                       filterTabsContainer.querySelector('#tab-count-all');
        if (allTab) allTab.textContent = total;

        // Remove old dynamic tabs
        filterTabsContainer.querySelectorAll('.store-tab:not([data-filter="all"])').forEach(t => t.remove());

        // Build a tab for each category that has products
        Object.entries(categorycounts)
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, count]) => {
                const btn = document.createElement('button');
                btn.className = 'store-tab';
                btn.dataset.filter = cat;
                btn.innerHTML = `${CAT_LABELS[cat] || cat} <span class="tab-num">${count}</span>`;
                filterTabsContainer.appendChild(btn);
            });

        bindTabListeners();
    }

    function renderProductCard(product) {
        const comparePrice = product.comparePrice;
        const originalMarkup = comparePrice
            ? `<span class="product-card-original">GH₵${comparePrice.toFixed(2)}</span>`
            : '';

        const priceMarkup = product.price === 0
            ? '<span>Free</span>'
            : `<span>GH₵${product.price.toFixed(2)}</span>`;

        const filledStars = Math.round(product.rating || 0);
        const starMarkup = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);

        const imgSrc = product.image || '';
        const isPlaceholder = !imgSrc || imgSrc.startsWith('data:');
        const imgHtml = isPlaceholder
            ? `<div class="img-placeholder"><i data-lucide="package"></i></div>`
            : `<img src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'">`;
        const reviewCount = product.reviewCount || 0;

        const descMarkup = product.description
            ? `<p class="product-card-desc">${product.description.slice(0, 120)}${product.description.length > 120 ? '…' : ''}</p>`
            : '';
        const categoryMarkup = product.category
            ? `<span class="product-card-cat">${product.category.replace(/_/g, ' ')}</span>`
            : '';
        const stockMarkup = product.stock != null
            ? `<span class="product-card-stock ${product.stock === 0 ? 'out-stock' : ''}">${product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}</span>`
            : '';
        const canAddToCart = product.stock !== 0 && product.price > 0;
        const cartBtnDisabled = !canAddToCart ? 'disabled' : '';
        const cartBtnTitle = !canAddToCart
            ? (product.stock === 0 ? 'Out of stock' : 'Unavailable')
            : 'Add to cart';
        const cartBtnClass = canAddToCart ? 'product-card-cart-btn' : 'product-card-cart-btn product-card-cart-btn--disabled';

        return `
            <a class="product-card" href="../../../public/shop/product-details.html?id=${product.id}" data-category="${product.category}">
                <div class="product-card-img-wrap">
                    ${imgHtml}
                    <button class="${cartBtnClass}" data-product-id="${product.id}" title="${cartBtnTitle}" ${cartBtnDisabled} aria-label="Add to cart" type="button">
                        <i data-lucide="shopping-cart"></i>
                    </button>
                    ${categoryMarkup ? `<span class="product-card-badge">${categoryMarkup}</span>` : ''}
                </div>
                <div class="product-card-body">
                    <h3 class="product-card-title">${product.name}</h3>
                    <div class="product-card-price">
                        ${priceMarkup}
                        ${originalMarkup}
                    </div>
                    <p class="product-card-desc">${descMarkup}</p>
                    <div class="product-card-meta">
                        <div class="product-card-rating" aria-label="Rating: ${product.rating || 0}">
                            <span>${starMarkup}</span>
                            <span>${reviewCount > 0 ? (product.rating || 0).toFixed(1) : 'No reviews'}</span>
                        </div>
                        <div class="product-card-stock">${stockMarkup}</div>
                    </div>
                </div>
            </a>`;
    }

    function renderProducts() {
        if (!storeProducts) return;

        const query = state.searchQuery.toLowerCase();
        const filtered = state.products.filter(p => {
            const matchFilter = state.currentFilter === 'all' || p.category === state.currentFilter;
            const matchSearch = p.name.toLowerCase().includes(query);
            return matchFilter && matchSearch;
        });

        storeProducts.classList.toggle('grid-view', state.currentView === 'grid');
        storeProducts.classList.toggle('list-view', state.currentView === 'list');

        if (state.products.length === 0) {
            storeProducts.innerHTML = '';
            if (noResults) {
                noResults.querySelector('h3').textContent = 'No products yet';
                noResults.querySelector('p').textContent = 'This seller has not listed any products.';
                noResults.classList.remove('hidden');
            }
            if (typeof window.observeNewElements === 'function') window.observeNewElements();
            return;
        }

        if (filtered.length === 0) {
            storeProducts.innerHTML = '';
            if (noResults) {
                noResults.querySelector('h3').textContent = 'No products found';
                noResults.querySelector('p').textContent = 'Try a different search or category.';
                noResults.classList.remove('hidden');
            }
            if (typeof window.observeNewElements === 'function') window.observeNewElements();
            return;
        }

        if (noResults) noResults.classList.add('hidden');
        storeProducts.innerHTML = filtered.map(renderProductCard).join('');
        createIcons();
        if (typeof window.observeNewElements === 'function') window.observeNewElements();
    }

    // ── Review marquee ────────────────────────────────────────────────────────
    function renderMarquee() {
        const track = document.getElementById('reviews-marquee-track');
        if (!track) return;

        const reviews = window._storeReviews || [];
        if (reviews.length === 0) {
            const wrap = document.getElementById('reviews-marquee-wrap');
            if (wrap) wrap.classList.add('hidden');
            return;
        }

        if (track.children.length > 0) {
            track.innerHTML = '';
        }

        const cards = reviews.map(r => {
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            const initials = (r.buyer?.name || 'B').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const avatarHtml = r.buyer?.avatar
                ? `<img src="${r.buyer.avatar}" alt="${r.buyer?.name || 'Buyer'}" class="review-marquee-avatar-img" loading="lazy">`
                : `<div class="review-marquee-avatar">${initials}</div>`;
            return `
                <div class="review-marquee-card">
                    ${avatarHtml}
                    <div class="review-marquee-body">
                        <div class="review-marquee-header">
                            <span class="review-marquee-author">${r.buyer?.name || 'Buyer'}</span>
                            <span class="review-marquee-stars">${stars}</span>
                        </div>
                        <p class="review-marquee-text">${r.comment || ''}</p>
                        <span class="review-marquee-product">${r.productName || ''}</span>
                    </div>
                </div>`;
        }).join('');

        track.innerHTML = cards + cards; // duplicate for seamless loop
        createIcons();
    }

    // ── Filter & view ─────────────────────────────────────────────────────────
    function setActiveFilter(filter) {
        state.currentFilter = filter;
        filterTabs = Array.from(filterTabsContainer.querySelectorAll('.store-tab[data-filter]'));
        filterTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.filter === filter));
        renderProducts();
    }

    function setView(view) {
        state.currentView = view;
        if (btnGrid) {
            btnGrid.classList.toggle('active', view === 'grid');
            btnGrid.setAttribute('aria-pressed', view === 'grid');
        }
        if (btnList) {
            btnList.classList.toggle('active', view === 'list');
            btnList.setAttribute('aria-pressed', view === 'list');
        }
        if (storeProducts) {
            storeProducts.classList.toggle('grid-view', view === 'grid');
            storeProducts.classList.toggle('list-view', view === 'list');
        }
    }

    // ── Event listeners ───────────────────────────────────────────────────────
    if (navHamburger) {
        navHamburger.addEventListener('click', () => {
            navMobile?.classList.toggle('open');
            const isOpen = navMobile?.classList.contains('open');
            navHamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
            createIcons();
        });
    }

    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(0,0,0,0.08)' : 'none';
        });
    }

    bindTabListeners();

    let searchTimeout = null;
    if (storeSearch) {
        storeSearch.addEventListener('input', e => {
            state.searchQuery = e.target.value.trim();
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(renderProducts, 300);
        });
    }

    if (btnGrid) btnGrid.addEventListener('click', () => setView('grid'));
    if (btnList) btnList.addEventListener('click', () => setView('list'));

    // Contact modal
    if (contactBtn && contactModal) contactBtn.addEventListener('click', () => {
        contactModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    function closeContactModal() {
        if (!contactModal) return;
        contactModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (modalClose)  modalClose.addEventListener('click', closeContactModal);
    if (modalCancel) modalCancel.addEventListener('click', closeContactModal);
    if (contactModal) contactModal.addEventListener('click', e => { if (e.target === contactModal) closeContactModal(); });

    // Contact form submission
    if (modalSend && contactMsg && contactModal) {
        modalSend.addEventListener('click', async () => {
            const message = contactMsg.value.trim();
            if (!message) { alert('Please write a message.'); return; }

            if (!state.sellerId) { alert('Seller not identified.'); return; }

            modalSend.disabled = true;
            const originalHtml = modalSend.innerHTML;
            modalSend.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Sending...';
            createIcons();

            try {
                const headers = { 'Content-Type': 'application/json' };
                const token = null;
                let authToken = null;
                try {
                    const parsed = JSON.parse(token);
                    authToken = parsed.value ? JSON.parse(parsed.value).token : parsed.token;
                } catch { /* not logged in */ }

                const res = await apiFetchWithTimeout(`${API_BASE}/api/public/seller/${state.sellerId}/contact`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ message }),
                });
                const json = await res.json();

                if (res.ok && json.success) {
                    contactMsg.value = '';
                    closeContactModal();
                    alert('Your message has been sent to the seller!');

                }
            } catch (err) {
                console.error('Failed to send message:', err);
                alert('Network error. Please try again.');
            } finally {
                modalSend.disabled = false;
                modalSend.innerHTML = originalHtml;
                createIcons();
            }
        });
    }

    // Event listeners set up — rendering deferred until initStore() is called
    setView(state.currentView);
    createIcons();

    if (storeProducts) {
        storeProducts.addEventListener('click', async (e) => {
            const btn = e.target.closest('.product-card-cart-btn');
            if (!btn || btn.disabled) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const productId = btn.dataset.productId;
            if (!productId) return;
            btn.disabled = true;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2"></i>';
            createIcons();
            try {
                const result = await window.__addToCartAPI(productId, 1);
                if (result && result.cartCount != null && window.__updateCartBadge) {
                    window.__updateCartBadge(result.cartCount);
                }
                btn.classList.add('product-card-cart-btn--added');
                btn.innerHTML = '<i data-lucide="check"></i>';
                createIcons();
                setTimeout(() => {
                    btn.classList.remove('product-card-cart-btn--added');
                    btn.innerHTML = originalHtml;
                    createIcons();
                }, 1500);
            } catch {
                btn.innerHTML = originalHtml;
                createIcons();
                const cartBadge = document.getElementById('cart-count');
                if (!cartBadge || cartBadge.textContent === '0') {
                    window.location.href = '../../../auth/login.html';
                }
            } finally {
                btn.disabled = false;
            }
        });
    }
})();
