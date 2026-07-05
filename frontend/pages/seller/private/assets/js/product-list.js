// ══════════════════════════════════════════
//  PRODUCT LIST JS — seller panel
// ══════════════════════════════════════════

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const TOKEN_KEY = 'authToken';

function getAuthToken() {
  try {
    const raw = localStorage.getItem('authData');
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = parsed.value ? JSON.parse(parsed.value) : parsed;
      return data.token || null;
    }
  } catch {}
  return localStorage.getItem(TOKEN_KEY);
}

async function apiFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

const LOW_STOCK_THRESHOLD = 5;

// ── State ──────────────────────────────────────────────────────────────────────
let allProducts   = [];
let activeFilter  = 'all';
let searchQuery   = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const productsWrap       = document.getElementById('products-wrap');
const noResults          = document.getElementById('no-results');
const searchDesktop      = document.getElementById('product-search');
const searchMobile       = document.getElementById('product-search-mobile');
const filterTabs         = document.querySelectorAll('.filter-tab');
const btnGrid            = document.getElementById('btn-grid');
const btnList            = document.getElementById('btn-list');
const toastEl            = document.getElementById('toast');

// Single body-level dropdown menu to avoid stacking-context trapping
const bodyMenu = (() => {
  const m = document.createElement('div');
  m.className = 'pc-menu';
  m.id = 'pc-menu-body';
  m.setAttribute('role', 'menu');
  m.style.display = 'none';
  m.innerHTML = `
    <button class="pc-menu-item" data-action="toggle" data-pid="">
      <i data-lucide="eye-off"></i>
      <span class="pc-menu-label"></span>
    </button>
    <button class="pc-menu-item danger" data-action="delete" data-pid="">
      <i data-lucide="trash-2"></i> Delete
    </button>`;
  document.body.appendChild(m);
  lucide.createIcons();
  return m;
})();

// Close menu helper
function closeBodyMenu() {
  if (bodyMenu.classList.contains('open')) {
    bodyMenu.classList.remove('open');
    setTimeout(() => { bodyMenu.style.display = 'none'; }, 150);
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  active: 'Active',
  draft:  'Draft',
};

function stockBadgeHTML(stock) {
  if (stock === 0)  return `<span class="pc-stock-badge pc-stock-badge--out">Out of stock</span>`;
  if (stock <= LOW_STOCK_THRESHOLD) return `<span class="pc-stock-badge pc-stock-badge--low">${stock} left</span>`;
  return '';
}

function statusBadgeHTML(isActive) {
  const cls = isActive ? 'badge-status badge-status--active' : 'badge-status badge-status--draft';
  const lbl = isActive ? 'Active' : 'Draft';
  return `<span class="${cls}">${lbl}</span>`;
}

const CATEGORY_ICONS = {
  electronics:  'smartphone',
  books:        'book-open',
  fashion:      'shirt',
  food:         'utensils',
  beauty:       'sparkles',
  sports:       'dumbbell',
};

function safeImgSrc(src) {
  if (!src) return '';
  return src.replace(/"/g, '&quot;').replace(/\s+/g, '%20');
}

const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1YTQ1MCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iODAiIGZpbGw9IiNlM2M0YzgiLz48ZyBzdHJva2U9Im5vbmUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIgc3Ryb2tlLXdpZHRoPSIzIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiPjxwYXRoIGQ9Ik0xMDMgNTUgTDUwIDExMCAzNSA5NSAyMCAxMDAgMzUgNjUgMTI1IDU1IDEyMCA1NCAxMDAgNTUgOTAgMzUgMTU1IDkwIDEyMCA3MCAxNzUgMTI1IDY1IDE1MCA0MCAxNzUgMzUgMjAwIDU1IDI1MCA0MCAyNzUgMzUgMzAwIDU1IDMwMCA3MCAyNzUgMTIwIDMxMCA3MCAzMzUgMzUgMzUwIDU1IDM1MCAxMDAgMzM1IDEyMCA0MCAzMzAgNTUgdlsgICAgXCIvPjwvZz48L3N2Zz4=';

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

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/seller/products`, {
      headers: authHeaders(),
      cache: 'no-cache',
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load products');
    allProducts = Array.isArray(json.data) ? json.data : (json.data?.products || []);
    renderAll();
  } catch (err) {
    console.error('fetchProducts:', err);
    showToast(err.message, 'error');
  }
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderAll() {
  renderProductCards(allProducts);
  applyFilter(activeFilter);
  filterBySearch(searchQuery);
  checkEmptyStates();
}

// ── Empty state ───────────────────────────────────────────────────────────────
function checkEmptyStates() {
  const cards = productsWrap.querySelectorAll('.product-card');
  let visible = 0;
  cards.forEach(card => {
    if (!card.classList.contains('hidden')) visible++;
  });
  noResults.classList.toggle('hidden', visible > 0);
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT CARDS
// ══════════════════════════════════════════════════════════════════════════════
function renderProductCards(list) {
  if (!productsWrap) return;

  if (list.length === 0) {
    productsWrap.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;">
        <i data-lucide="package" style="width:48px;height:48px;margin:0 auto 1rem;display:block;opacity:.3;"></i>
        <p style="color:var(--text-3);font-family:Quicksand,sans-serif;">No products match your filter.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id    = p.id;
    card.dataset.status = p.isActive !== false ? 'active' : 'draft';
    card.dataset.category = p.category || '';

    const imgSrc  = p.image || '';
    const price   = parseFloat(p.price || 0).toFixed(2);
    const stock   = p.stock ?? null;
    const badge   = statusBadgeHTML(p.isActive !== false);
    const stockBadge = stockBadgeHTML(stock);
    const catIcon = CATEGORY_ICONS[p.category] || 'package';
    const catName = (p.category || '').replace('_', ' ');
    const name    = p.name || 'Untitled';

    card.dataset.stock = stock !== null ? stock : '';

    card.innerHTML = `
      <div class="pc-image-wrap">
        ${imgSrc
          ? `<img src="${safeImgSrc(imgSrc)}" alt="${name}" class="pc-img" loading="lazy">`
          : `<div class="pc-img-placeholder"><i data-lucide="${catIcon}"></i></div>`}
        <span class="pc-badge">${badge}</span>
        ${stockBadge ? `<span class="pc-stock-overlay">${stockBadge}</span>` : ''}
      </div>
      <div class="pc-body">
        <p class="pc-category">${catName}</p>
        <h3 class="pc-name">${name}</h3>
        <p class="pc-price">GH₵ ${price}</p>
      </div>
      <div class="pc-footer">
        <button type="button" class="view-detail-btn" data-pid="${p.id}">View Details</button>
        <div class="pc-menu-wrap">
          <button class="pc-menu-btn" data-pid="${p.id}" aria-label="Product menu">
            <i data-lucide="more-vertical"></i>
          </button>
        </div>
      </div>`;

    frag.appendChild(card);
  });

  productsWrap.innerHTML = '';
  productsWrap.appendChild(frag);
  lucide.createIcons();

  // Wire up view-detail buttons
  document.querySelectorAll('.view-detail-btn[data-pid]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const pid = btn.dataset.pid;
      viewDetail(pid);
    });
  });

  // Body-level menu toggle
  document.querySelectorAll('.pc-menu-btn[data-pid]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const pid    = btn.dataset.pid;
      const card   = document.querySelector(`.product-card[data-id="${pid}"]`);
      const active = card ? card.dataset.status === 'active' : true;

      if (bodyMenu.classList.contains('open') && bodyMenu._pid === pid) {
        closeBodyMenu();
        return;
      }

      const toggleCb  = bodyMenu.querySelector('[data-action="toggle"]');
      const deleteCb  = bodyMenu.querySelector('[data-action="delete"]');
      const labelSpan = bodyMenu.querySelector('.pc-menu-label');
      if (toggleCb) {
        toggleCb.dataset.pid = pid;
        const ic = toggleCb.querySelector('i');
        if (ic) { ic.setAttribute('data-lucide', active ? 'eye-off' : 'eye'); ic.className = ''; }
        if (labelSpan) labelSpan.textContent = active ? 'Unpublish' : 'Publish';
      }
      if (deleteCb) deleteCb.dataset.pid = pid;
      lucide.createIcons();

      const rect = btn.getBoundingClientRect();
      bodyMenu.style.top  = `${rect.bottom + 6}px`;
      bodyMenu.style.left = `${Math.max(8, rect.right - 168)}px`;
      bodyMenu.style.display = 'block';
      bodyMenu._pid = pid;
      requestAnimationFrame(() => bodyMenu.classList.add('open'));
    });
  });

  console.log('[product-list] renderProductCards patched —', list.length, 'cards');
}


// ══════════════════════════════════════════════════════════════════════════════
//  FILTER / SEARCH
// ══════════════════════════════════════════════════════════════════════════════
function applyFilter(filter) {
  activeFilter = filter;
  filterTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
  filterBySearch(searchQuery);
}

function filterBySearch(query) {
  searchQuery = query;
  const cards = productsWrap.querySelectorAll('.product-card');
  let visible = 0;
  cards.forEach(card => {
    const name     = card.querySelector('.pc-name')?.textContent.toLowerCase() || '';
    const category = card.querySelector('.pc-category')?.textContent.toLowerCase() || '';
    const price    = card.querySelector('.pc-price')?.textContent.toLowerCase() || '';
    const matchSearch = !query || name.includes(query) || category.includes(query) || price.includes(query);

    let matchFilter = true;
    if (activeFilter === 'active')     matchFilter = card.dataset.status === 'active';
    else if (activeFilter === 'draft') matchFilter = card.dataset.status === 'draft';
    else if (activeFilter === 'low-stock') {
      const stock = parseInt(card.dataset.stock ?? '', 10);
      matchFilter = !isNaN(stock) && stock <= LOW_STOCK_THRESHOLD;
    }

    const show = matchFilter && matchSearch;
    card.classList.toggle('hidden', !show);
    if (show) visible++;
  });
  if (noResults) noResults.classList.toggle('hidden', visible > 0);
}

function getSearchVal() {
  return (searchDesktop?.value || searchMobile?.value || '').trim().toLowerCase();
}

// ── View toggle ───────────────────────────────────────────────────────────────
function setViewMode(mode) {
  productsWrap.classList.toggle('grid-view', mode === 'grid');
  productsWrap.classList.toggle('list-view', mode === 'list');
  btnGrid?.classList.toggle('active', mode === 'grid');
  btnList?.classList.toggle('active', mode === 'list');
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function showToast(msg, type) {
  if (toastEl) {
    toastEl.textContent = msg;
    toastEl.className   = 'toast toast--' + (type || 'error');
    toastEl.style.display = '';
    setTimeout(() => { toastEl.style.display = 'none'; }, 3000);
  } else {
    console.warn('[product-list] toast el not found:', msg);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  EVENT LISTENERS  (lines ~551-587)
// ══════════════════════════════════════════════════════════════════════════════
// Filter tabs
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => applyFilter(tab.dataset.filter));
});

// Search (desktop + mobile sync)
function attachSearch(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    const val = input.value;
    if (searchDesktop && input !== searchDesktop) searchDesktop.value = val;
    if (searchMobile  && input !== searchMobile)  searchMobile.value  = val;
    filterBySearch(val.trim().toLowerCase());
  });
}
attachSearch(searchDesktop);
attachSearch(searchMobile);

// View toggle
btnGrid?.addEventListener('click', () => setViewMode('grid'));
btnList?.addEventListener('click', () => setViewMode('list'));

// Body-menu action delegation (toggle & delete)
function makeToggleHandler(pid, desiredActive) {
  return async function () {
    const card = document.querySelector(`.product-card[data-id="${pid}"]`);
    if (!card) return;
    const newActive = !desiredActive;
    try {
      const res = await fetch(`${API_BASE}/api/seller/products/${pid}/toggle`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ isActive: newActive })
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) {
        card.dataset.status = desiredActive ? 'draft' : 'active';
        const badgeEl  = card.querySelector('.pc-badge .badge-status');
        if (badgeEl) {
          badgeEl.className = desiredActive
            ? 'badge-status badge-status--draft'
            : 'badge-status badge-status--active';
          badgeEl.textContent = desiredActive ? 'Draft' : 'Active';
        }
        showToast(desiredActive ? 'Unpublished' : 'Published', 'success');
      } else { showToast(j.error || 'Failed', 'error'); }
    } catch (err) { showToast(err.message, 'error'); }
    closeBodyMenu();
  };
}
function makeDeleteHandler(pid) {
  return async function () {
    const card = document.querySelector(`.product-card[data-id="${pid}"]`);
    if (!card) { closeBodyMenu(); return; }
    if (!confirm('Delete this product permanently?')) { closeBodyMenu(); return; }
    try {
      const res = await fetch(`${API_BASE}/api/seller/products/${pid}`, {
        method: 'DELETE', headers: authHeaders()
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) { card.remove(); }
      else { showToast(j.error || 'Failed to delete', 'error'); }
    } catch (err) { showToast(err.message, 'error'); }
    closeBodyMenu();
  };
}
bodyMenu.addEventListener('click', e => {
  const item = e.target.closest('.pc-menu-item[data-action]');
  if (!item) return;
  const action = item.dataset.action;
  const pid    = item.dataset.pid;
  if (action === 'toggle') {
    const c = document.querySelector(`.product-card[data-id="${pid}"]`);
    const active = c ? c.dataset.status === 'active' : true;
    makeToggleHandler(pid, active)();
  } else if (action === 'delete') {
    makeDeleteHandler(pid)();
  }
});

// Close menu when clicking outside
document.addEventListener('click', e => {
  if (!bodyMenu.contains(e.target) && !e.target.closest('.pc-menu-btn')) {
    closeBodyMenu();
  }
});

// Close menu on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeBodyMenu();
});

// ══════════════════════════════════════════════════════════════════════════════
//  View detail routing
// ══════════════════════════════════════════════════════════════════════════════
function viewDetail(id) {
  window.location.href = 'product-details.html#id=' + encodeURIComponent(id);
}

// ══════════════════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════════════════
lucide.createIcons();
fetchProducts();