const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('nav-mobile');
hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const isOpen = mobileNav.classList.contains('open');
    hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
    lucide.createIcons();
});
window.addEventListener('scroll', () => {
    document.getElementById('navbar').style.boxShadow =
        window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function stars(rating) {
    const full  = Math.round(rating || 0);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function fmt(n) { return Number(n).toFixed(2); }

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast--${type || 'error'}`;
  t.textContent = msg;
  Object.assign(t.style, {
    padding: '0.7rem 1.1rem', borderRadius: '10px',
    fontFamily: "'Quicksand',sans-serif", fontWeight: '700', fontSize: '0.82rem',
    animation: 'fadeInUp 0.25s ease both', pointerEvents: 'auto',
    background: type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
    color: type === 'success' ? '#10b981' : '#ef4444',
    border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
  });
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-8px)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

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

const apiBase = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const auth = getAuth();
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

  return fetch(`${apiBase}${url}`, { credentials: 'include',  ...options, headers }).then(r => {
    if (!r.ok) throw new Error(`Request failed (${r.status})`);
    return r.json();
  });
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

document.querySelectorAll('a[href="#reviews"], a[href="#meet-seller"]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const tabId = link.getAttribute('href').replace('#', '');
        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (btn) { btn.click(); document.querySelector('.tabs-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
});

// ─── QUANTITY STEPPER ─────────────────────────────────────────────────────────
let qty = 1;
let maxStock = 999;
const qtyEl    = document.getElementById('qty-value');
const qtyMinus = document.getElementById('qty-minus');
const qtyPlus  = document.getElementById('qty-plus');

qtyMinus.addEventListener('click', () => {
    if (qty > 1) { qty--; qtyEl.textContent = qty; }
    qtyMinus.disabled = qty === 1;
});
qtyPlus.addEventListener('click', () => {
    if (qty < maxStock) { qty++; qtyEl.textContent = qty; }
    qtyPlus.disabled = qty >= maxStock;
});

// ─── SAVE / WISHLIST ──────────────────────────────────────────────────────────
function initSaveButtons(productId) {
    ['gallery-save', 'save-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.dataset.productId = productId;
    });
    WishlistAPI.init().then(() => lucide.createIcons());
}

function initAddToCart() {
    const btn = document.getElementById('add-to-cart');
    if (!btn || !window.__addToCartAPI) {
        if (!btn) return;
        const tryBind = () => { if (window.__addToCartAPI) bindAddToCart(); };
        window.addEventListener('__cartAPIReady', tryBind);
        setTimeout(tryBind, 800);
        return;
    }
    bindAddToCart();
}

function bindAddToCart() {
    const btn = document.getElementById('add-to-cart');
    if (!btn || btn.dataset.cartBound) return;
    btn.dataset.cartBound = '1';
    btn.addEventListener('click', async () => {
        const auth = getAuth();
        if (!auth?.token) { showToast('Please log in to add to cart', 'error'); window.location.href = '../../auth/login.html'; return; }
        btn.classList.add('loading');
        try {
            const json = await window.__addToCartAPI(currentProductId, qty);
            if (json?.cartCount != null) {
                document.getElementById('cart-count').textContent = String(json.cartCount);
            }
            showToast('Added to cart!', 'success');
        } catch (err) {
            showToast(err?.message || 'Could not add to cart', 'error');
        } finally {
            btn.classList.remove('loading');
        }
    });
}

async function refreshCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    try {
        const authHeader = getAuth()?.token ? { 'Authorization': `Bearer ${getAuth().token}` } : {};
        const res = await fetch(`${apiBase}/api/cart`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...authHeader } });
        if (!res.ok) { console.warn('[cart-badge] /api/cart status', res.status); return; }
        const json = await res.json();
        const items = json?.data?.items || json?.items || [];
        const count = items.reduce((s, i) => s + (i.quantity || i.qty || 1), 0) || json?.data?.count || json?.data?.totalItems || json?.data?.itemCount || json?.totalItems || json?.itemCount || json?.cartCount;
        if (count != null && count > 0) { badge.textContent = String(count); return; }
    } catch (e) { console.warn('[cart-badge] /api/cart failed', e.message); }
    try {
        const raw = localStorage.getItem('cart');
        const cart = JSON.parse(raw);
        const items = cart.items || cart.data?.items || [];
        const count = items.reduce((s, i) => s + (i.quantity || i.qty || 1), 0);
        if (count > 0) badge.textContent = String(count);
    } catch(e) {}
}

// ─── GALLERY ──────────────────────────────────────────────────────────────────
let allImages = [];
let activeIdx = 0;

function setMainImage(idx) {
    activeIdx = idx;
    const img    = document.getElementById('gallery-img');
    const placeholder = document.getElementById('gallery-placeholder');
    const url    = allImages[idx];
    if (url && !url.startsWith('data:')) {
        img.src = url;
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';

    }
    document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function buildGallery(images, product) {
    allImages = images.length ? images : [null];
    const thumbsEl = document.getElementById('gallery-thumbs');
    thumbsEl.innerHTML = allImages.map((url, i) => `
        <button class="thumb${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Image ${i + 1}">
            ${url && !url.startsWith('data:')
                ? `<img src="${url}" alt="Thumb ${i + 1}" style="width:100%;height:100%;object-fit:cover;">`
                : `<div class="thumb-placeholder"></div>`}
        </button>`).join('');

    thumbsEl.querySelectorAll('.thumb').forEach(t => {
        t.addEventListener('click', () => setMainImage(parseInt(t.dataset.index)));
    });
    setMainImage(0);
}

// ─── DESCRIPTION TAB ──────────────────────────────────────────────────────────
const IGNORED_DETAIL_KEYS = new Set(['_fulfillment', '_location', 'color', 'whats_included', 'meal_type', 'service_type']);

function renderDescription(product) {
    const el = document.getElementById('description-content');
    const details = product.details || {};
    const description = product.description || 'No description provided.';
    let html = `<h3>About this product</h3><p>${description}</p>`;

    // Tags as pills
    if (product.tags?.length) {
        html += `<div class="tag-pills">${product.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>`;
    }

    // What's in the box from details
    if (details.whats_included) {
        const items = details.whats_included.split(',').map(s => s.trim()).filter(Boolean);
        html += `<h3>What's in the Box</h3><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    }

    // Condition + fulfillment quick-info strip
    const infoItems = [];
    if (product.condition) infoItems.push({ icon: 'tag', label: 'Condition', value: product.condition.replace('-', ' ') });
    if (details._fulfillment) infoItems.push({ icon: 'truck', label: 'Fulfillment', value: details._fulfillment });
    if (details._location) infoItems.push({ icon: 'map-pin', label: 'Location', value: details._location });
    if (product.subcategory) infoItems.push({ icon: 'layers', label: 'Subcategory', value: product.subcategory });

    if (infoItems.length) {
        html += `<div class="quick-info-strip">${infoItems.map(i =>
            `<div class="quick-info-item">
                <i data-lucide="${i.icon}"></i>
                <div><strong>${i.label}</strong><span>${i.value}</span></div>
            </div>`).join('')}</div>`;
    }

    // Delivery fee
    const fee = product.deliveryFee;
    if (fee != null && fee !== undefined) {
        const formatted = Number(fee) === 0 ? 'Free' : `GH¢ ${parseFloat(fee).toFixed(2)}`;
        html += `<div class="quick-info-strip"><div class="quick-info-item"><i data-lucide="truck"></i><div><strong>Delivery Fee</strong><span>${formatted}</span></div></div></div>`;
    }

    el.innerHTML = html;
    lucide.createIcons();
}

// ─── SPECIFICATIONS TAB ───────────────────────────────────────────────────────
function renderSpecs(product) {
    const el = document.getElementById('specs-grid');
    const details = product.details || {};
    const rows = [];

    rows.push({ label: 'Category', value: (product.category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) });
    if (product.subcategory) rows.push({ label: 'Subcategory', value: product.subcategory });
    if (product.condition) rows.push({ label: 'Condition', value: product.condition.replace('-', ' ') });
    rows.push({ label: 'Stock', value: (product.stock || 0) > 0 ? `${product.stock} available` : 'Out of stock' });

    const DETAIL_LABEL_OVERRIDES = {
        rating: 'Rating', brand: 'Brand', material: 'Material',
        dimensions: 'Dimensions', weight: 'Weight', color: 'Color',
        size: 'Size', warranty: 'Warranty',
    };
    Object.entries(details).forEach(([key, value]) => {
        if (!value || IGNORED_DETAIL_KEYS.has(key)) return;
        const label = DETAIL_LABEL_OVERRIDES[key] || key;
        rows.push({ label, value });
    });

    el.innerHTML = rows.map(r => `
        <div class="spec-row">
            <span class="spec-label">${r.label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            <span class="spec-value">${r.value}</span>
        </div>
    `).join('');
}

async function fetchProduct(productId) {
  const res = await fetch(`${apiBase}/api/public/products/${productId}`);
  if (!res.ok) throw new Error(`Failed to load product (${res.status})`);
  return res.json().then(j => j.data || j);
}

function renderProduct(product) {
    const details = product.details || {};

    document.getElementById('breadcrumb-category').textContent = product.category?.replace(/_/g, ' ') || 'Shop';
    document.getElementById('breadcrumb-category')?.closest('a')?.removeAttribute('href');
    document.getElementById('breadcrumb-name').textContent = product.name || 'Product';

    const storeName = product.storeName || product.store_name || 'UnimartX Store';
    document.getElementById('store-name-link').textContent = storeName;
    if (details.campus_seller || details.is_campus_seller || product.seller?.isCampusSeller) {
        document.getElementById('store-badge').classList.remove('hidden');
    }

    document.getElementById('product-title').textContent = product.name || 'Product';
    document.getElementById('product-price').textContent = `GH¢ ${parseFloat(product.price || 0).toFixed(2)}`;
    document.getElementById('product-price-old').textContent = product.comparePrice ? `GH¢ ${parseFloat(product.comparePrice).toFixed(2)}` : '';
    const discount = product.comparePrice && product.price ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
    const discountEl = document.getElementById('product-discount');
    if (discount > 0) {
        discountEl.textContent = `-${discount}%`;
        discountEl.classList.remove('hidden');
    }
    document.getElementById('product-short-desc').textContent = product.description || '';

    const badgeEl = document.getElementById('gallery-badge');
    if (badgeEl) {
        if (discount > 0) {
            badgeEl.textContent = `-${discount}%`;
            badgeEl.className = 'gallery-badge';
        } else if (product.tags?.length) {
            badgeEl.textContent = product.tags[0];
            badgeEl.className = 'gallery-badge';
        }
    }

    document.getElementById('rating-stars').textContent = stars(product.rating || product.seller?.avgRating);
    document.getElementById('rating-score').textContent = product.rating ? product.rating.toFixed(1) : (product.seller?.avgRating?.toFixed(1) ?? '0.0');
    document.getElementById('rating-count').textContent = product.reviewCount || 0;
    document.getElementById('sold-count').textContent = `${product.unitsSold || product.soldCount || 0} sold`;

    buildGallery(product.images || (product.image ? [product.image] : []), product);

    renderVariants(product);
    renderDescription(product);
    renderSpecs(product);
    renderDeliveryInfo(product);
    if (product.seller?.id) loadSellerProfile(product.seller.id);
    document.getElementById('info-content').style.display = 'flex';
    document.getElementById('info-skeleton').classList.add('hidden');
    document.getElementById('tab-description').querySelector('.skel')?.remove();
    document.getElementById('tab-specifications').querySelector('.skel')?.remove();
    lucide.createIcons();
}

function renderVariants(product) {
    const container = document.getElementById('variants-container');
    const details = product.details || {};
    let html = '';

    if (details.color) {
        const colors = details.color.split(',').map(s => s.trim()).filter(Boolean);
        const label = colors.length === 1 ? colors[0] : `${colors.length} Colors`;
        html += `<div class="variant-group"><div class="variant-label"><strong>Color:</strong> ${label}</div><div class="variant-chips">${colors.map(c => `<button class="color-chip active" style="background:${c};" aria-label="${c}"></button>`).join('')}</div></div>`;
    }

    if (details.size) {
        const sizes = [details.size];
        html += `<div class="variant-group"><div class="variant-label"><strong>Size:</strong> ${details.size}</div><div class="variant-chips">${sizes.map(s => `<button class="size-chip active">${s}</button>`).join('')}</div></div>`;
    }

    if (details.whats_included) {
        const items = details.whats_included.split(',').map(s => s.trim()).filter(Boolean);
        html += `<div class="variant-group"><div class="variant-label"><strong>Includes:</strong></div><div class="variant-chips">${items.map(i => `<span class="size-chip" style="opacity:0.7;cursor:default;">${i}</span>`).join('')}</div></div>`;
    }

    container.innerHTML = html;
}

function renderDeliveryInfo(product) {
    const el = document.getElementById('delivery-info');
    if (!el) return;
    const rows = [];
    const fee = product.deliveryFee;
    const feeText = (fee == null || fee === undefined) ? null : (Number(fee) === 0 ? 'Free delivery' : `GH¢ ${parseFloat(fee).toFixed(2)}`);
    const details = product.details || {};
    if (details._fulfillment) rows.push({ icon: 'truck', label: 'Fulfillment', value: details._fulfillment });
    if (details._location) rows.push({ icon: 'map-pin', label: 'Location', value: details._location });
    if (feeText) rows.push({ icon: 'banknote', label: 'Delivery Fee', value: feeText });
    if (!rows.length) { el.innerHTML = ''; return; }
    el.innerHTML = rows.map(i => `<div class="delivery-row"><i data-lucide="${i.icon}"></i><div><strong>${i.label}</strong><span>${i.value}</span></div></div>`).join('');
    lucide.createIcons();
}

function renderSellerProfile(product) {
    const el = document.getElementById('seller-profile-content');
    const seller = product.seller || {};
    const userDisplayName = seller.user?.firstName && seller.user?.lastName
        ? `${seller.user.firstName} ${seller.user.lastName}`
        : (seller.user?.firstName || seller.storeName || 'UnimartX Seller');
    const initial = userDisplayName ? userDisplayName[0].toUpperCase() : '?';
    const store = seller.storeName || product.storeName || product.store_name || '';
    const count = seller.productCount ?? (seller._count?.products ?? '?');
    const rating = seller.avgRating ?? product.rating ?? 0;
    const location = seller.user?.location || seller.city || seller.country || '';
    const bio = seller.user?.bio || seller.storeDescription || 'This seller has not added a bio yet.';

    const badges = [];
    const statsBadges = [];
    if (userDisplayName && userDisplayName !== 'UnimartX Seller') badges.push({ icon: 'user', label: userDisplayName });
    if (count != null && count !== '?') statsBadges.push({ value: count, label: 'Products' });
    if (rating > 0) statsBadges.push({ value: rating.toFixed(1), label: 'Rating' });
    if (location) badges.push({ icon: 'map-pin', label: location });
    statsBadges.push({ value: 'UnimartX', label: 'Seller' });

    el.innerHTML = `<div class="seller-profile">
        <div class="seller-profile-top">
          <div class="seller-profile-info">
            <div class="seller-name-row">
              <div class="seller-avatar">${initial}</div>
              <div>
                <h3>${userDisplayName}</h3>
                ${store ? `<div class="seller-store-label">${store}</div>` : ''}
                ${location ? `<div class="seller-university"><i data-lucide="map-pin"></i><span>${location}</span></div>` : ''}
              </div>
            </div>
          </div>
            ${store ? `<a href="../../seller/public/store/store.html?sellerId=${seller.id}&slug=${seller.slug || ''}" class="visit-store-btn"><i data-lucide="store"></i> Browse Store <i data-lucide="arrow-right" style="width:14px;height:14px;stroke:currentColor;"></i></a>` : ''}
        </div>
        <div class="seller-stats-row">
          ${statsBadges.map(h => `<div class="seller-stat"><strong>${h.value}</strong><span>${h.label}</span></div>`).join('')}
        </div>
        <div class="seller-about">
          <h4>About this seller</h4>
          <p>${bio}</p>
        </div>
        <div class="seller-highlights">
          ${badges.map(h => `<span class="seller-highlight"><i data-lucide="${h.icon}"></i>${h.label}</span>`).join('')}
        </div>
    </div>`;
    lucide.createIcons();
}

async function loadSellerProfile(sellerId) {
    const el = document.getElementById('seller-profile-content');
    if (!el || !sellerId) { el.innerHTML = '<p style="color:var(--text-3);font-size:.9rem">No seller profile available.</p>'; return; }
    try {
        const j = await apiFetch(`/api/public/seller/${sellerId}`);
        if (!j?.success) throw new Error(j?.message || 'Not found');
        const { profile, stats } = j.data;
        if (!profile) { el.innerHTML = '<p style="color:var(--text-3);font-size:.9rem">Seller profile unavailable.</p>'; return; }
        renderSellerProfileFromProfile(profile, stats);
    } catch(e) {}
}

function renderSellerProfileFromProfile(profile, stats) {
    const el = document.getElementById('seller-profile-content');
    if (!el) return;
    const name = profile.name || 'UnimartX Seller';
    const initial = name?.[0]?.toUpperCase() || '?';
    const location = [profile.city, profile.country].filter(Boolean).join(', ') || profile.location || '';
    const bio = profile.bio || 'This seller has not added a bio yet.';
    const joined = profile.joinedDate ? new Date(profile.joinedDate).toLocaleDateString() : '';

    const badges = [];
    const statsBadges = [];
    badges.push({ icon: 'user', label: name });
    if (stats?.productCount != null) statsBadges.push({ value: stats.productCount, label: 'Products' });
    if (stats?.avgRating != null) statsBadges.push({ value: stats.avgRating.toFixed(1), label: 'Rating' });
    if (location) badges.push({ icon: 'map-pin', label: location });
    if (profile.verified) badges.push({ icon: 'badge-check', label: 'Verified Seller' });
    if (joined) badges.push({ icon: 'calendar', label: `Joined ${joined}` });

    el.innerHTML = `<div class="seller-profile">
      <div class="seller-profile-top">
        <div class="seller-profile-info">
          <div class="seller-name-row">
            <div class="seller-avatar">${profile.avatar ? `<img src="${profile.avatar}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : initial}</div>
            <div>
              <h3>${name}</h3>
              ${profile.storeName ? `<div class="seller-store-label">${profile.storeName}</div>` : ''}
              ${location ? `<div class="seller-university"><i data-lucide="map-pin"></i><span>${location}</span></div>` : ''}
            </div>
          </div>
        </div>
          ${profile.storeName ? `<a href="../../seller/public/store/store.html?sellerId=${profile.sellerId}&slug=${profile.slug || ''}" class="visit-store-btn"><i data-lucide="store"></i> Browse Store <i data-lucide="arrow-right" style="width:14px;height:14px;stroke:currentColor;"></i></a>` : ''}
      </div>
      <div class="seller-stats-row">
        ${statsBadges.map(h => `<div class="seller-stat"><strong>${h.value}</strong><span>${h.label}</span></div>`).join('')}
      </div>
      <div class="seller-about">
        <h4>About this seller</h4>
        <p>${bio}</p>
      </div>
      <div class="seller-highlights">
        ${badges.map(h => `<span class="seller-highlight"><i data-lucide="${h.icon}"></i>${h.label}</span>`).join('')}
      </div>
    </div>`;
    lucide.createIcons();
}

async function loadReviews(productId, reviewCount) {
    const container = document.getElementById('reviews-container');
    const formWrap = document.getElementById('review-form-wrap');
    const countEl = document.getElementById('reviews-tab-count');
    try {
        const reviewsData = await apiFetch(`/api/public/products/${productId}/reviews`);
        const reviewsArray = (reviewsData.data?.reviews || reviewsData.reviews || []);
        const count = reviewCount ?? reviewsArray.length ?? 0;
        if (countEl) countEl.textContent = count;
        if (!reviewsArray.length) {
            container.innerHTML = '<p style="color:var(--text-3);font-size:.9rem">No reviews yet.</p>';
        } else {
            container.innerHTML = `<div class="reviews-list">${reviewsArray.map(r => buildReviewCard(r)).join('')}</div>`;
            lucide.createIcons();
        }
        renderReviewForm(productId, formWrap);
    } catch(e) {}
}

function buildReviewCard(r) {
    const name = r.user?.name || 'Anonymous Buyer';
    const initial = r.user?.initials || (name[0] || '?').toUpperCase();
    const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '';
    const starsStr = '★'.repeat(Math.round(r.rating || 0)) + '☆'.repeat(5 - Math.round(r.rating || 0));
    return `<div class="review-card">
        <div class="review-header">
            <div class="review-avatar">${r.user?.avatar ? `<img src="${r.user.avatar}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : initial}</div>
            <div class="review-meta">
                <strong>${name}</strong>
                <span>Buyer Review</span>
            </div>
            <span class="review-date">${date}</span>
        </div>
        <div class="review-stars">${starsStr}</div>
        <p class="review-body">${r.comment || r.text || ''}</p>
    </div>`;
}

function renderReviewForm(productId, formWrap) {
    const auth = getAuth();
    if (!auth?.token) {
        formWrap.innerHTML = `<div class="review-form-notice"><i data-lucide="info"></i><span>Please <a href="../../auth/login.html">log in</a> to write a review.</span></div>`;
        lucide.createIcons();
        return;
    }
    formWrap.innerHTML = `<div class="review-form-box">
        <h3>Write a review</h3>
        <div class="star-picker" id="star-picker">
            ${[1,2,3,4,5].map(i => `<button aria-label="${i} star${i>1?'s':''}">★</button>`).join('')}
        </div>
        <textarea id="review-textarea" placeholder="Share your experience with this product..."></textarea>
        <button class="review-submit-btn" id="review-submit-btn"><i data-lucide="send" style="width:16px;height:16px;stroke:currentColor;"></i> Submit Review</button>
        <div class="review-form-error" id="review-form-error"></div>
    </div>`;

    let ratingVal = 0;
    const picker = document.getElementById('star-picker');
    const errorEl = document.getElementById('review-form-error');
    picker.querySelectorAll('button').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            ratingVal = idx + 1;
            picker.querySelectorAll('button').forEach((b, j) => b.classList.toggle('lit', j < ratingVal));
        });
    });

    document.getElementById('review-submit-btn').addEventListener('click', async () => {
        const text = document.getElementById('review-textarea').value.trim();
        if (!ratingVal) { errorEl.textContent = 'Please select a star rating.'; errorEl.classList.add('visible'); return; }
        if (!text) { errorEl.textContent = 'Please write a comment.'; errorEl.classList.add('visible'); return; }
        errorEl.classList.remove('visible');
        const btn = document.getElementById('review-submit-btn');
        btn.disabled = true; btn.textContent = 'Submitting…';
        try {
            await apiFetch(`/api/public/reviews`, { method: 'POST', body: JSON.stringify({ productId, rating: ratingVal, comment: text }) });
            document.getElementById('review-textarea').value = '';
            ratingVal = 0; picker.querySelectorAll('button').forEach(b => b.classList.remove('lit'));
            btn.textContent = 'Submitted!';
            setTimeout(() => btn.disabled = false, 1500);
            loadReviews(productId);
            showToast('Review submitted successfully', 'success');
        } catch (err) {
            errorEl.textContent = err?.message || 'Could not submit review.';
            errorEl.classList.add('visible');
            btn.disabled = false; btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;stroke:currentColor;"></i> Submit Review';
            lucide.createIcons();
        }
    });
    lucide.createIcons();
}

let relatedProductId = null;
let relatedPage = 1;
const RELATED_PER_PAGE = 8;

function loadRelatedProducts(product) {
    relatedProductId = product._id || product.id;
    relatedPage = 1;
    const grid = document.getElementById('related-grid');
    const cat = product.category;
    const sub = product.subcategory;
    let url = `/api/public/products?category=${encodeURIComponent(cat)}&limit=8`;
    if (sub && sub.includes('-')) url += `&subcategory=${encodeURIComponent(sub)}`;
    apiFetch(url)
        .then(j => {
            let list = j.data || j.products || j;
            if (!Array.isArray(list)) list = [];
            list = list.filter(p => (p._id || p.id) !== relatedProductId);
            if (!list.length) {
                grid.innerHTML = '<p style="color:var(--text-3);font-size:.9rem;grid-column:1/-1;text-align:center;padding:2rem;">No related products right now.</p>';
                return;
            }
            grid.innerHTML = list.map(p => relatedCardHTML(p)).join('');
            lucide.createIcons();
            handleSaveAll('related-grid', product);
        })
        .catch(() => {
            grid.innerHTML = '<p style="color:var(--text-3);font-size:.9rem;grid-column:1/-1;text-align:center;padding:2rem;">Could not load related products.</p>';
        });
}

function relatedCardHTML(p) {
    const img = p.images?.[0] || p.image || '';
    return `<a class="product-card" href="${`product-details.html?id=${p._id || p.id}`}" style="text-decoration:none;color:inherit;">
        <div class="product-img-wrap" style="aspect-ratio:1;overflow:hidden;border-radius:var(--radius);background:var(--bg-2);border:1px solid var(--border);">
            ${img && !img.startsWith('data:') ? `<img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a26,#12121a);"></div>`}
            <button class="product-save" data-product-id="${p._id || p.id}" aria-label="Save product" style="position:absolute;top:0.5rem;right:0.5rem;width:36px;height:36px;border-radius:50%;background:rgba(10,10,15,0.7);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.1);cursor:pointer;color:var(--text-2);display:flex;align-items:center;justify-content:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
        </div>
        <div class="product-info-card">
            <span style="font-size:.82rem;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;">${(p.category||'').replace(/_/g,' ')}</span>
            <span style="font-size:.95rem;font-weight:700;color:var(--text);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.name}</span>
            <span style="font-size:1.05rem;font-weight:700;color:var(--text);">GH¢ ${parseFloat(p.price||0).toFixed(2)}</span>
            <div class="product-rating-sm">
                <span class="stars-filled" style="color:#fbbf24;">${'★'.repeat(Math.round(p.rating||0))}</span>
                <span class="rating-count">${p.rating ? p.rating.toFixed(1) : '0.0'}</span>
            </div>
        </div>
    </a>`;
}

function handleSaveAll(parent, product) {
    const btns = document.querySelectorAll(`#${parent} .product-save`);
    btns.forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const pid = btn.dataset.productId;
            if (!pid) return;
            handleWishlistToggle(btn, pid, product);
        });
    });
}

function handleWishlistToggle(btn, pid, product) {
    const auth = getAuth();
    if (!auth?.token) { showToast('Log in to save items', 'error'); return; }
    if (!btn.dataset.wishlistBound) {
        btn.dataset.wishlistBound = '1';
        btn.addEventListener('click', async e => {
            e.preventDefault();
            e.stopPropagation();
            await WishlistAPI.toggle(btn, pid);
            const nowSaved = btn.classList.contains('saved');
            showToast(nowSaved ? 'Saved to wishlist' : 'Removed from wishlist', nowSaved ? 'success' : 'success');
        });
    }
    WishlistAPI.hydrateButtons();
}

let currentProductId = null;
let currentProduct = null;

document.addEventListener('DOMContentLoaded', () => {
    init();
    lucide.createIcons();
    refreshCartBadge();
    window.addEventListener('storage', e => { if (e.key === 'cart' || e.key === 'authData') refreshCartBadge(); });
    window.addEventListener('focus', () => refreshCartBadge());
});

async function init() {
    const productId = getQueryParam('id');
    if (!productId) {
        showToast('No product ID found in URL', 'error');
        return;
    }
    document.getElementById('info-skeleton')?.classList.remove('hidden');
    document.getElementById('info-content').style.display = 'none';
    try {
        currentProductId = productId;
        const product = await fetchProduct(productId);
        currentProduct = product;
        maxStock = product.stock > 0 ? product.stock : 999;
        qtyEl.textContent = qty;
        renderProduct(product);
        initSaveButtons(product._id || product.id);
        initAddToCart(product);
        loadReviews(productId);
        loadRelatedProducts(product);
        if (product.seller?.id) loadSellerProfile(product.seller.id);
        refreshCartBadge();
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('info-skeleton')?.classList.add('hidden');
    }
}
