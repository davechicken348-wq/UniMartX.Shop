const API = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

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

// ── State ──────────────────────────────────────
let wishlistData = [];
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
    if (!auth) {
        updateMeta();
        return;
    }
    if (!skipRerender) _isFetching = true;

    try {
        const res  = await fetch(`${API}/api/wishlist`, { credentials: 'include', 
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        const items = json.data || [];

        const snapshot = getSnapshot(items);
        if (snapshot !== _lastSnapshot || !skipRerender) {
            _lastSnapshot = snapshot;
            wishlistData = items;
            renderGrid(wishlistData);
        }
    } catch {
        if (!skipRerender) {
            document.getElementById('wishlist-grid').innerHTML =
                '<p style="color:var(--text-3);padding:2rem">Could not load wishlist. Please try again.</p>';
        }
    }
    if (!skipRerender) _isFetching = false;
    updateMeta();
}

// ── Render grid ────────────────────────────────
function renderGrid(items) {
    const grid = document.getElementById('wishlist-grid');
    grid.innerHTML = items.map(buildCard).join('');
    lucide.createIcons();
    bindCardEvents();
}

// ── Bind events on rendered cards ─────────────
function bindCardEvents() {
    document.querySelectorAll('.wishlist-remove').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const card      = btn.closest('.wishlist-card');
            const productId = card.dataset.productId;
            card.classList.add('removing');
            await toggleWishlistAPI(productId);
            setTimeout(() => {
                wishlistData = wishlistData.filter(i => i.product.id !== productId);
                card.remove();
                updateMeta();
            }, 300);
        });
    });

    document.querySelectorAll('.wishlist-cart-btn').forEach(btn => {
        if (btn.disabled) return;
        btn.addEventListener('click', async () => {
            if (btn.classList.contains('added')) return;
            const productId = btn.dataset.productId;
            try {
                const res  = await fetch(`${API}/api/cart/add`, { credentials: 'include', 
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ productId, quantity: 1 }),
                });
                if (!res.ok) throw new Error();
                btn.classList.add('added');
                btn.innerHTML = '<i data-lucide="check"></i> Added!';
                lucide.createIcons();
                setTimeout(() => {
                    btn.classList.remove('added');
                    btn.innerHTML = '<i data-lucide="shopping-cart"></i> Add to Cart';
                    lucide.createIcons();
                }, 2000);
            } catch {
                btn.innerHTML = 'Failed — retry';
                setTimeout(() => {
                    btn.innerHTML = '<i data-lucide="shopping-cart"></i> Add to Cart';
                    lucide.createIcons();
                }, 2000);
            }
        });
    });
}

// ── Build card HTML ────────────────────────────
function buildCard(item) {
    const p     = item.product;
    const img   = p.image && !p.image.startsWith('data:')
        ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div style="width:100%;height:100%;background:var(--bg-3);"></div>`;

    const badge = p.comparePrice
        ? `<div class="wishlist-badge wishlist-badge--sale">Sale</div>` : '';

    const fee = parseFloat(p.deliveryFee);
    const deliveryBadge = (!isNaN(fee) && fee > 0)
        ? `<div class="wishlist-badge wishlist-badge--delivery">Delivery GH₵ ${fee.toFixed(2)}</div>` : '';

    const stars = '★'.repeat(Math.round(p.rating || 0)) + '☆'.repeat(5 - Math.round(p.rating || 0));

    const priceHtml = p.comparePrice
        ? `<span class="wishlist-price">GH₵ ${p.price.toFixed(2)}</span>
           <span class="wishlist-price-old">GH₵ ${p.comparePrice.toFixed(2)}</span>`
        : `<span class="wishlist-price">GH₵ ${p.price.toFixed(2)}</span>`;

    const outOfStock = p.stock === 0;
    const cartLabel  = outOfStock ? 'Out of Stock' : '<i data-lucide="shopping-cart"></i> Add to Cart';

    return `
    <div class="wishlist-card" data-id="${item.id}" data-product-id="${p.id}" data-name="${p.name.toLowerCase()}">
        <div class="wishlist-card-img">
            ${img}
            ${badge}
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
            <button class="wishlist-cart-btn" data-product-id="${p.id}" ${outOfStock ? 'disabled' : ''}>
                ${cartLabel}
            </button>
        </div>
    </div>`;
}

// ── API calls ──────────────────────────────────
async function toggleWishlistAPI(productId) {
    try {
        await fetch(`${API}/api/wishlist/toggle`, { credentials: 'include', 
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ productId }),
        });
    } catch { /* silent */ }
}

// ── Clear all ──────────────────────────────────
document.getElementById('clear-all-btn')?.addEventListener('click', async () => {
    if (!confirm('Remove all items from your wishlist?')) return;
    const ids = wishlistData.map(i => i.product.id);
    document.querySelectorAll('.wishlist-card').forEach(card => card.classList.add('removing'));
    await Promise.all(ids.map(toggleWishlistAPI));
    setTimeout(() => {
        wishlistData = [];
        _lastSnapshot = getSnapshot([]);
        document.querySelectorAll('.wishlist-card').forEach(c => c.remove());
        updateMeta();
    }, 350);
});

// ── Search ─────────────────────────────────────
const searchDesktop = document.getElementById('wishlist-search');
const searchMobile  = document.getElementById('wishlist-search-mobile');
const noResults     = document.getElementById('no-results');

function filterWishlist(query) {
    query = query.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('.wishlist-card').forEach(card => {
        const name  = card.dataset.name || '';
        const store = card.querySelector('.wishlist-store')?.textContent.toLowerCase() || '';
        const match = !query || name.includes(query) || store.includes(query);
        card.classList.toggle('hidden', !match);
        if (match) visible++;
    });
    noResults.classList.toggle('hidden', visible > 0 || wishlistData.length === 0);
}

[searchDesktop, searchMobile].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => {
        const val = input.value;
        if (searchDesktop && input !== searchDesktop) searchDesktop.value = val;
        if (searchMobile  && input !== searchMobile)  searchMobile.value  = val;
        filterWishlist(val);
    });
});

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadWishlist();
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

window.addEventListener('focus', () => {
    loadWishlist(true);
});

// ── Live sync ──────────────────────────────────
function startWishlistLiveSync() {
    let initialized = false;
    _pollId = setInterval(async () => {
        if (_isFetching) return;
        if (!initialized) {
            initialized = true;
            await loadWishlist(true);
            return;
        }
        await loadWishlist(true);
    }, 30000);
}

function stopWishlistLiveSync() {
    if (_pollId) {
        clearInterval(_pollId);
        _pollId = null;
    }
}

window.addEventListener('beforeunload', stopWishlistLiveSync);

function updateMeta() {
    const total  = wishlistData.length;
    const onSale = wishlistData.filter(i => i.product.comparePrice).length;

    document.getElementById('wishlist-count').textContent  = `${total} item${total !== 1 ? 's' : ''}`;

    const saleEl  = document.getElementById('on-sale-count');
    const sepEl   = document.getElementById('wishlist-meta-sep');
    if (onSale > 0) {
        saleEl.textContent = `${onSale} on sale`;
        saleEl.style.display = '';
        if (sepEl) sepEl.style.display = '';
    }

    const isEmpty = total === 0;
    document.getElementById('wishlist-grid').style.display  = isEmpty ? 'none' : '';
    document.getElementById('wishlist-empty').classList.toggle('hidden', !isEmpty);
}
