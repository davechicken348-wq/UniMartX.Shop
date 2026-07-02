const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const TOKEN_KEY = 'authToken';

// ── Auth ──────────────────────────────────────────────────────────────────────
function authHeaders() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (token && token !== 'undefined' && token !== 'null') {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }
  const raw = localStorage.getItem('authData');
  if (!raw) return { 'Content-Type': 'application/json' };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.token && typeof parsed.token === 'string') {
      return { Authorization: `Bearer ${parsed.token}`, 'Content-Type': 'application/json' };
    }
    if (parsed.value) {
      const inner = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
      if (inner.token && typeof inner.token === 'string') {
        return { Authorization: `Bearer ${inner.token}`, 'Content-Type': 'application/json' };
      }
    }
  } catch {}
  return { 'Content-Type': 'application/json' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showToast(msg, type = 'error') {
  const existing = document.querySelector('.pd-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'pd-toast';
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '1.5rem', left: '50%',
    transform: 'translateX(-50%)',
    background: type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
    border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
    color: type === 'success' ? '#22c55e' : '#ef4444',
    padding: '0.65rem 1.25rem', borderRadius: '10px',
    fontFamily: 'Quicksand, sans-serif', fontWeight: '700', fontSize: '0.85rem',
    zIndex: '9999', backdropFilter: 'blur(8px)',
    animation: 'fadeInUp 0.25s ease both',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1YTQ1MCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iODAiIGZpbGw9IiNlM2M0YzgiLz48ZyBzdHJva2U9Im5vbmUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIgc3Ryb2tlLXdpZHRoPSIzIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiPjxwYXRoIGQ9Ik0xMD MgNTUgTDUwIDExMCAzNSA5NSAyMCAxMDAgMzUgNjUgMTI1IDU1IDEyMCA1NCAxMDAgNTUgOTAgMzUgMTU1IDkwIDEyMCA3MCAxNzUgMTI1IDY1IDE1MCA0MCAxNzUgMzUgMjAwIDU1IDI1MCA0MCAyNzUgMzUgMzAwIDU1IDMwMCA3MCAyNzUgMTIwIDMxMCA3MCAzMzUgMzUgMzUwIDU1IDM1MCAxMDAgMzM1IDEyMCA0MCAzMzAgNTUgdlsgICAgXCIvPjwvZz48L3N2Zz4=';

function safeImgSrc(src) {
  if (!src) return '';
  return src.replace(/"/g, '&quot;').replace(/\s+/g, '%20');
}

function getProductId() {
  const hashMatch = window.location.hash.match(/^#id=([^&]+)/);
  if (hashMatch) return decodeURIComponent(hashMatch[1]);
  return new URLSearchParams(window.location.search).get('id');
}

// ── Animations ───────────────────────────────────────────────────────────────
function animateStat(el, target, suffix, decimals) {
  suffix = suffix || '';
  decimals = decimals || 0;
  if (!el) return;
  const raw = Number(target);
  if (isNaN(raw) || raw === 0) {
    el.textContent = suffix === '%' ? `0.0${suffix}` : `0${suffix}`;
    return;
  }
  let current = 0;
  const step = Math.max(raw / 30, raw < 50 ? 0.5 : 1);
  const timer = setInterval(() => {
    current = Math.min(current + step, raw);
    el.textContent =
      suffix === '%' ? `${current.toFixed(1)}${suffix}`
      : decimals > 0    ? current.toFixed(decimals)
      : Math.round(current).toLocaleString();
    if (current >= raw) clearInterval(timer);
  }, 40);
}

// ── Render helpers ────────────────────────────────────────────────────────────
function getProductImage(product) {
  const src = product.image || '';
  if (!src) {
    return '';
  }
  return `<img src="${safeImgSrc(src)}" alt="${product.name || 'Product'}" class="pd-main-img" onerror="this.style.display='none';document.querySelector('.pd-main-img-placeholder').style.display='flex';lucide.createIcons()">`;
}

function getThumbImage(src) {
  if (!src) return '';
  return `<img src="${safeImgSrc(src)}" alt="" class="pd-thumb-img" onerror="this.style.opacity='0.3'">`;
}

function renderThumbs(images, mainImage) {
  const allImages = [mainImage, ...(Array.isArray(images) ? images : [])];
  return allImages.slice(0, 5).map((src, i) =>
    `<div class="pd-thumb${i === 0 ? ' active' : ''}">${getThumbImage(src) || '<div class="shimmer" style="width:100%;height:100%;border-radius:inherit;"></div>'}</div>`
  ).join('');
}

let productData = null;

function renderPeriodDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderOrderRow(order) {
  const statusColors = {
    pending: 'badge-status--pending',
    processing: 'badge-status--processing',
    shipped: 'badge-status--shipped',
    delivered: 'badge-status--delivered',
    cancelled: 'badge-status--cancelled',
    refunded: 'badge-status--refunded',
  };
  const statusClass = statusColors[order.status] || 'badge-status--draft';
  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return `
    <div class="pd-order-row">
      <div class="pd-order-row-main">
        <span class="pd-order-number">${order.orderNumber}</span>
        <span class="badge-status ${statusClass}">${String(order.status).replace('_', ' ')}</span>
      </div>
      <div class="pd-order-row-detail">
        <span>Qty: ${order.quantity || 1}</span>
        <span>·</span>
        <span>${order.buyer ? order.buyer.name : 'Guest'}</span>
        <span>·</span>
        <span>${date}</span>
      </div>
      <div class="order-amount">GH₵ ${(order.orderTotal || 0).toFixed(2)}</div>
      <a href="../orders/order-details.html?order=${order.id}" class="order-link" title="View order">
        <i data-lucide="external-link"></i>
      </a>
    </div>
  `;
}

function renderReviewCard(review) {
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const avatar = review.user?.avatar
    ? `<img src="${safeImgSrc(review.user.avatar)}" alt="" class="pd-review-avatar">`
    : `<div class="pd-review-avatar">${(review.user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>`;
  return `
    <div class="pd-review-card">
      <div class="pd-review-top">
        ${avatar}
        <div class="pd-review-meta">
          <div class="pd-review-name">${review.user?.name || 'Anonymous'}</div>
          <div class="pd-review-stars">${stars}</div>
        </div>
        <span class="pd-review-date">${date}</span>
      </div>
      <p class="pd-review-text">${review.comment || '—'}</p>
    </div>
  `;
}

function renderStats(statValues) {
  const statEls = {
    statViews:    document.getElementById('stat-views'),
    statSold:     document.getElementById('stat-sold'),
    statRevenue:  document.getElementById('stat-revenue'),
    statConv:     document.getElementById('stat-conversion'),
    statSaves:    document.getElementById('stat-saves'),
    statRating:   document.getElementById('stat-rating'),
  };
  const items = [
    { el: statEls.statViews,  val: statValues.views    || 0, suffix: '' },
    { el: statEls.statSold,   val: statValues.unitsSold || 0, suffix: '' },
    { el: statEls.statRevenue,val: statValues.revenue   || 0, suffix: '', decimals: 2 },
    { el: statEls.statConv,   val: statValues.conversionRate || 0, suffix: '%' },
    { el: statEls.statSaves,  val: statValues.wishlistCount || 0, suffix: '' },
    { el: statEls.statRating, val: statValues.rating    || 0, suffix: '', decimals: 1 },
  ];
  items.forEach(({ el, val, suffix, decimals }) => animateStat(el, val, suffix, decimals));
}

function renderBadge(isActive) {
  const badge = document.getElementById('pd-status');
  const btn   = document.getElementById('toggle-status-btn');
  if (!badge || !btn) return;
  if (isActive) {
    badge.className = 'badge-status badge-status--active';
    badge.textContent = 'Active';
    btn.innerHTML = '<i data-lucide="eye-off"></i> Unpublish';
  } else {
    badge.className = 'badge-status badge-status--draft';
    badge.textContent = 'Draft';
    btn.innerHTML = '<i data-lucide="eye"></i> Publish';
  }
  lucide.createIcons();
}

function setLoading(isLoading) {
  document.querySelectorAll('.pd-skeleton').forEach(el => el.style.display = isLoading ? '' : 'none');
  document.querySelectorAll('.pd-loaded').forEach(el => el.style.display = isLoading ? 'none' : '');
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchProductDetails(productId) {
  const res = await fetch(
    `${API_BASE}/api/seller/products/${productId}?includeStats=true&includeOrders=true&includeReviews=true`,
    { headers: authHeaders() }
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to load product details');
  }
  return json.data;
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderProduct(product) {
  productData = product;

  // Core details
  document.getElementById('pd-category').textContent  = (product.category || '').replace('_', ' ');
  document.getElementById('pd-name').textContent      = product.name || '—';
  document.getElementById('pd-price').textContent     = `GH₵ ${parseFloat(product.price || 0).toFixed(2)}`;
  document.getElementById('pd-desc').textContent      = product.description || 'No description';
  
  // Page header
  const pageHeader = document.querySelector('.page-header p');
  if (pageHeader) {
    pageHeader.textContent = product.category ? product.category.replace('_', ' ') : '';
  }

  document.getElementById('meta-category').textContent  = (product.category || '').replace('_', ' ');
  document.getElementById('meta-condition').textContent = product.condition
    ? product.condition.replace('-', ' ')
    : 'Not specified';
  document.getElementById('meta-listed').textContent    = renderPeriodDate(product.createdAt);
  document.getElementById('meta-updated').textContent   = renderPeriodDate(product.updatedAt);

  // Badge
  renderBadge(product.isActive !== false);

  // Images
  const mainImg = document.querySelector('.pd-main-img-wrap');
  if (mainImg) {
    if (product.image) {
      mainImg.innerHTML = getProductImage(product);
    }
    lucide.createIcons();
  }
  const thumbsWrap = document.querySelector('#pd-thumbs-list');
  if (thumbsWrap) {
    thumbsWrap.innerHTML = renderThumbs(Array.isArray(product.images) ? product.images : [], product.image);
    // Re-attach thumb click handlers
    document.querySelectorAll('.pd-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        document.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const idx = [...thumbsWrap.children].indexOf(thumb);
        const allImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])];
        if (mainImg && allImages[idx]) {
          mainImg.innerHTML = getProductImage({...product, image: allImages[idx]});
          lucide.createIcons();
        }
      });
    });
    lucide.createIcons();
  }

  // Edit buttons — set href with product id
  const editUrl = `add-product.html?edit=${product._id || product.id}`;
  const editBtnTop  = document.getElementById('edit-product-btn');
  const editBtnCard = document.getElementById('edit-product-btn-card');
  if (editBtnTop)  editBtnTop.href  = editUrl;
  if (editBtnCard) editBtnCard.href = editUrl;

  // Delete modal — set product name
  const delName = document.getElementById('delete-product-name');
  if (delName) delName.textContent = product.name || 'this product';

  // Stats
  if (product.stats) {
    renderStats(product.stats);
  }
}

function renderOrders(orders) {
  const container = document.getElementById('pd-orders-list');
  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="pd-empty-state">No orders have been placed for this product yet.</div>';
    return;
  }
  container.innerHTML = orders.slice(0, 10).map(renderOrderRow).join('');
}

function renderReviews(reviews, summaryText) {
  const summaryEl = document.getElementById('reviews-summary');
  const container  = document.getElementById('pd-reviews');

  if (summaryEl && summaryText) {
    summaryEl.textContent = summaryText;
  }

  if (!reviews || reviews.length === 0) {
    container.innerHTML = '<div class="pd-empty-state">No reviews have been submitted yet.</div>';
    return;
  }
  container.innerHTML = reviews.slice(0, 10).map(renderReviewCard).join('');
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function handleToggleStatus(productId, isActive) {
  const res = await fetch(`${API_BASE}/api/seller/products/${productId}/toggle`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update status');
  }
  renderBadge(isActive);
}

async function handleDelete(productId) {
  await fetch(`${API_BASE}/api/seller/products/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const productId = getProductId();
  if (!productId) {
    showToast('No product ID found in URL', 'error');
    return;
  }

  setLoading(true);
  try {
    const data = await fetchProductDetails(productId);
    renderProduct(data);
    renderOrders(data.orders || []);
    lucide.createIcons();
    renderReviews(data.reviews || [], data.reviewSummaryText || '');
    lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }

  // Toggle status
  document.getElementById('toggle-status-btn')?.addEventListener('click', async () => {
    if (!productData) return;
    const newActive = !(productData.isActive !== false); // toggle: active→false, draft→true
    try {
      await handleToggleStatus(productId, newActive);
      productData.isActive = newActive;
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Delete — open modal
  document.getElementById('delete-product-btn')?.addEventListener('click', () => {
    document.getElementById('delete-modal')?.classList.remove('hidden');
  });

  // Modal cancel
  document.getElementById('modal-cancel')?.addEventListener('click', () => {
    document.getElementById('delete-modal')?.classList.add('hidden');
  });

  // Modal confirm delete
  document.getElementById('modal-confirm')?.addEventListener('click', async () => {
    try {
      await handleDelete(productId);
      window.location.href = 'product-list.html';
    } catch (err) {
      showToast(err.message, 'error');
      document.getElementById('delete-modal')?.classList.add('hidden');
    }
  });
}

lucide.createIcons();
init();

