// ══════════════════════════════════════════
//  PRODUCT LIST JS — seller panel (dashboard)
// ══════════════════════════════════════════

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const TOKEN_KEY = 'authToken';
const LOW_STOCK_THRESHOLD = 5;

// ── State ──────────────────────────────────────────────────────────────────────
let allProducts = [];
let activeFilter = 'all';
let searchQuery  = '';
let sortKey      = 'name-asc';
let currentView  = 'grid';
let selectMode   = false;
const selected   = new Set();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const productsWrap = document.getElementById('products-wrap');
const noResults    = document.getElementById('no-results');
const searchInput  = document.getElementById('product-search');
const filterTabs   = document.querySelectorAll('.filter-tab');
const btnGrid      = document.getElementById('btn-grid');
const btnList      = document.getElementById('btn-list');
const btnSelect    = document.getElementById('btn-select');
const sortSelect   = document.getElementById('product-sort');
const bulkBar      = document.getElementById('bulk-bar');
const bulkCount    = document.getElementById('bulk-count');
const selectAll    = document.getElementById('select-all');
const bulkClear    = document.getElementById('bulk-clear');
const toastEl      = document.getElementById('toast');

// ── Single body-level dropdown menu ────────────────────────────────────────────
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
  if (window.lucide) lucide.createIcons();
  return m;
})();

function closeBodyMenu() {
  if (bodyMenu.classList.contains('open')) {
    bodyMenu.classList.remove('open');
    setTimeout(() => { bodyMenu.style.display = 'none'; }, 150);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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

const STATUS_LABEL = { active: 'Active', draft: 'Draft' };

function fmtPrice(v) {
  return `GH₵ ${parseFloat(v || 0).toFixed(2)}`;
}

function stockBadgeHTML(stock) {
  if (stock === 0) return `<span class="pc-stock-badge pc-stock-badge--out">Out of stock</span>`;
  if (stock <= LOW_STOCK_THRESHOLD) return `<span class="pc-stock-badge pc-stock-badge--low">${stock} left</span>`;
  return '';
}

function statusBadgeHTML(isActive) {
  const cls = isActive ? 'badge-status badge-status--active' : 'badge-status badge-status--draft';
  const lbl = isActive ? 'Active' : 'Draft';
  return `<span class="${cls}">${lbl}</span>`;
}

const CATEGORY_ICONS = {
  electronics: 'smartphone', books: 'book-open', fashion: 'shirt',
  food: 'utensils', beauty: 'sparkles', sports: 'dumbbell',
};

function safeImgSrc(src) {
  if (!src) return '';
  return src.replace(/"/g, '&quot;').replace(/\s+/g, '%20');
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/seller/products`, {
      headers: authHeaders(), cache: 'no-cache',
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

// ── Derived list (filter + search + sort) ─────────────────────────────────────
function getVisibleList() {
  const q = searchQuery.trim().toLowerCase();
  let list = allProducts.filter(p => {
    const status = p.isActive !== false ? 'active' : 'draft';
    let okFilter = true;
    if (activeFilter === 'active') okFilter = status === 'active';
    else if (activeFilter === 'draft') okFilter = status === 'draft';
    else if (activeFilter === 'low-stock') {
      const s = p.stock ?? 9999;
      okFilter = s > 0 && s <= LOW_STOCK_THRESHOLD;
    }
    const hay = `${p.name || ''} ${p.category || ''} ${fmtPrice(p.price)}`.toLowerCase();
    const okSearch = !q || hay.includes(q);
    return okFilter && okSearch;
  });

  const dir = sortKey.endsWith('desc') ? -1 : 1;
  const key = sortKey.split('-')[0];
  list = list.slice().sort((a, b) => {
    let av, bv;
    if (key === 'name')  { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); }
    if (key === 'price') { av = parseFloat(a.price || 0); bv = parseFloat(b.price || 0); }
    if (key === 'stock') { av = a.stock ?? 0; bv = b.stock ?? 0; }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return list;
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderAll() {
  renderKPIs();
  const list = getVisibleList();
  productsWrap.className = `products-wrap ${currentView === 'grid' ? 'grid-view' : 'list-view'}${selectMode ? ' select-mode' : ''}`;
  if (list.length === 0) {
    productsWrap.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;">
        <i data-lucide="package" style="width:48px;height:48px;margin:0 auto 1rem;display:block;opacity:.3;"></i>
        <p style="color:var(--text-3);font-family:Quicksand,sans-serif;">No products match your filter.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
  } else if (currentView === 'grid') {
    renderGrid(list);
  } else {
    renderTable(list);
  }
  updateBulkUI();
  noResults.classList.add('hidden');
}

// ── KPI cards ─────────────────────────────────────────────────────────────────
function renderKPIs() {
  const total = allProducts.length;
  const active = allProducts.filter(p => p.isActive !== false).length;
  const low = allProducts.filter(p => { const s = p.stock ?? 9999; return s > 0 && s <= LOW_STOCK_THRESHOLD; }).length;
  const out = allProducts.filter(p => (p.stock ?? 0) === 0).length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-low').textContent = low;
  document.getElementById('stat-out').textContent = out;
  const st = document.getElementById('stat-total-sub');
  if (st) st.textContent = active === total ? 'all published' : `${total - active} draft`;
}

// ── Grid view ─────────────────────────────────────────────────────────────────
function renderGrid(list) {
  const frag = document.createDocumentFragment();
  list.forEach(p => {
    const isActive = p.isActive !== false;
    const card = document.createElement('div');
    card.className = 'product-card' + (selected.has(p.id) && selectMode ? ' selected' : '');
    card.dataset.id = p.id;
    card.dataset.status = isActive ? 'active' : 'draft';
    card.dataset.stock = p.stock != null ? p.stock : '';
    card.dataset.name = (p.name || '').toLowerCase();
    card.dataset.category = (p.category || '').toLowerCase();
    card.dataset.price = fmtPrice(p.price).toLowerCase();

    const imgSrc = p.image || '';
    const catIcon = CATEGORY_ICONS[p.category] || 'package';
    const catName = (p.category || '').replace('_', ' ');
    const stockBadge = stockBadgeHTML(p.stock);
    const checked = selected.has(p.id) && selectMode ? 'checked' : '';

    card.innerHTML = `
      <label class="pc-check"><input type="checkbox" class="row-check" data-pid="${p.id}" ${checked}></label>
      <div class="pc-image-wrap">
        ${imgSrc
          ? `<img src="${safeImgSrc(imgSrc)}" alt="${p.name || ''}" class="pc-img" loading="lazy">`
          : `<div class="pc-img-placeholder"><i data-lucide="${catIcon}"></i></div>`}
        <span class="pc-badge">${statusBadgeHTML(isActive)}</span>
        ${stockBadge ? `<span class="pc-stock-overlay">${stockBadge}</span>` : ''}
      </div>
      <div class="pc-body">
        <p class="pc-category">${catName}</p>
        <h3 class="pc-name">${p.name || 'Untitled'}</h3>
        <p class="pc-price">${fmtPrice(p.price)}</p>
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
  if (window.lucide) lucide.createIcons();
}

// ── Table view ────────────────────────────────────────────────────────────────
function renderTable(list) {
  const rows = list.map(p => {
    const isActive = p.isActive !== false;
    const imgSrc = p.image || '';
    const catIcon = CATEGORY_ICONS[p.category] || 'package';
    const catName = (p.category || '').replace('_', ' ');
    const stockBadge = stockBadgeHTML(p.stock);
    const stockText = p.stock != null ? p.stock : '—';
    const checked = selected.has(p.id) && selectMode ? 'checked' : '';
    const cls = 'prod-row' + (selected.has(p.id) && selectMode ? ' selected' : '');
    return `
      <tr class="${cls}" data-id="${p.id}" data-status="${isActive ? 'active' : 'draft'}"
          data-stock="${p.stock != null ? p.stock : ''}"
          data-name="${(p.name || '').toLowerCase()}" data-category="${(p.category || '').toLowerCase()}" data-price="${fmtPrice(p.price).toLowerCase()}">
        <td class="col-check prod-check-cell">
          <input type="checkbox" class="row-check" data-pid="${p.id}" ${checked}>
        </td>
        <td data-label="Product">
          <div class="tp-cell">
            <div class="tp-thumb">${imgSrc ? `<img src="${safeImgSrc(imgSrc)}" alt="${p.name || ''}">` : `<i data-lucide="${catIcon}"></i>`}</div>
            <div class="tp-meta">
              <span class="tp-name">${p.name || 'Untitled'}</span>
              <span class="tp-cat">${catName}</span>
            </div>
          </div>
        </td>
        <td data-label="Status">${statusBadgeHTML(isActive)}</td>
        <td class="col-price tp-price" data-label="Price">${fmtPrice(p.price)}</td>
        <td class="col-stock tp-stock" data-label="Stock">${stockText}${stockBadge}</td>
        <td data-label="Category"><span class="tp-cat">${catName}</span></td>
        <td class="col-actions">
          <div class="tp-actions">
            <button type="button" class="view-detail-btn" data-pid="${p.id}">View</button>
            <button class="pc-menu-btn" data-pid="${p.id}" aria-label="Product menu"><i data-lucide="more-vertical"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');

  productsWrap.innerHTML = `
    <table class="prod-table">
      <thead>
        <tr>
          <th class="col-check"></th>
          <th>Product</th>
          <th>Status</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Category</th>
          <th class="col-actions"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  if (window.lucide) lucide.createIcons();
}

// ── View / filter / sort ──────────────────────────────────────────────────────
function setViewMode(mode) {
  currentView = mode;
  btnGrid?.classList.toggle('active', mode === 'grid');
  btnList?.classList.toggle('active', mode === 'list');
  renderAll();
}

function applyFilter(filter) {
  activeFilter = filter;
  filterTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.filter === filter));
  renderAll();
}

function setSort(val) {
  sortKey = val;
  renderAll();
}

// ── Selection / bulk ──────────────────────────────────────────────────────────
function setSelectMode(on) {
  selectMode = on;
  btnSelect?.classList.toggle('active', on);
  btnSelect?.setAttribute('aria-pressed', String(on));
  productsWrap.classList.toggle('select-mode', on);
  bulkBar?.classList.toggle('hidden', !on);
  if (!on) { selected.clear(); selectAll.checked = false; }
  renderAll();
}

function toggleSelect(pid, on) {
  if (on) selected.add(pid); else selected.delete(pid);
  updateBulkUI();
}

function updateBulkUI() {
  const n = selected.size;
  if (bulkCount) bulkCount.textContent = `${n} selected`;
  if (selectAll) {
    const visible = productsWrap.querySelectorAll('.row-check[data-pid]').length;
    const selVisible = productsWrap.querySelectorAll('.row-check[data-pid]:checked').length;
    selectAll.checked = visible > 0 && selVisible === visible;
    selectAll.indeterminate = selVisible > 0 && selVisible < visible;
  }
}

async function bulkAction(action) {
  if (selected.size === 0) return;
  const ids = Array.from(selected);
  if (action === 'delete') {
    if (!confirm(`Delete ${ids.length} product(s) permanently?`)) return;
  }
  for (const pid of ids) {
    try {
      if (action === 'delete') {
        const res = await fetch(`${API_BASE}/api/seller/products/${pid}`, { method: 'DELETE', headers: authHeaders() });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.success) allProducts = allProducts.filter(x => x.id !== pid);
        else showToast(j.error || 'Failed to delete', 'error');
      } else {
        const desired = action === 'publish';
        const res = await fetch(`${API_BASE}/api/seller/products/${pid}/toggle`, {
          method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ isActive: desired }),
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.success) {
          const p = allProducts.find(x => x.id === pid);
          if (p) p.isActive = desired;
        } else showToast(j.error || 'Failed', 'error');
      }
    } catch (err) { showToast(err.message, 'error'); }
  }
  selected.clear();
  selectAll.checked = false;
  showToast(action === 'delete' ? 'Deleted' : (action === 'publish' ? 'Published' : 'Unpublished'), 'success');
  renderAll();
}

// ── Toggle / delete (body menu) ───────────────────────────────────────────────
function openMenu(btn) {
  const pid = btn.dataset.pid;
  const item = document.querySelector(`[data-id="${pid}"]`);
  const active = item ? item.dataset.status === 'active' : true;

  if (bodyMenu.classList.contains('open') && bodyMenu._pid === pid) { closeBodyMenu(); return; }

  const toggleCb = bodyMenu.querySelector('[data-action="toggle"]');
  const deleteCb = bodyMenu.querySelector('[data-action="delete"]');
  const labelSpan = bodyMenu.querySelector('.pc-menu-label');
  if (toggleCb) {
    toggleCb.dataset.pid = pid;
    const ic = toggleCb.querySelector('i');
    if (ic) { ic.setAttribute('data-lucide', active ? 'eye-off' : 'eye'); ic.className = ''; }
    if (labelSpan) labelSpan.textContent = active ? 'Unpublish' : 'Publish';
  }
  if (deleteCb) deleteCb.dataset.pid = pid;
  if (window.lucide) lucide.createIcons();

  const rect = btn.getBoundingClientRect();
  bodyMenu.style.top = `${rect.bottom + 6}px`;
  bodyMenu.style.left = `${Math.max(8, rect.right - 168)}px`;
  bodyMenu.style.display = 'block';
  bodyMenu._pid = pid;
  requestAnimationFrame(() => bodyMenu.classList.add('open'));
}

function makeToggleHandler(pid, desiredActive) {
  return async function () {
    const item = document.querySelector(`[data-id="${pid}"]`);
    try {
      const res = await fetch(`${API_BASE}/api/seller/products/${pid}/toggle`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ isActive: !desiredActive }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) {
        const p = allProducts.find(x => x.id === pid);
        if (p) p.isActive = !desiredActive;
        const badgeEl = item ? item.querySelector('.badge-status') : null;
        if (badgeEl) {
          badgeEl.className = desiredActive ? 'badge-status badge-status--draft' : 'badge-status badge-status--active';
          badgeEl.textContent = desiredActive ? 'Draft' : 'Active';
        }
        if (item) item.dataset.status = desiredActive ? 'draft' : 'active';
        showToast(desiredActive ? 'Unpublished' : 'Published', 'success');
        renderKPIs();
      } else showToast(j.error || 'Failed', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    closeBodyMenu();
  };
}

function makeDeleteHandler(pid) {
  return async function () {
    if (!confirm('Delete this product permanently?')) { closeBodyMenu(); return; }
    try {
      const res = await fetch(`${API_BASE}/api/seller/products/${pid}`, { method: 'DELETE', headers: authHeaders() });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) {
        allProducts = allProducts.filter(x => x.id !== pid);
        selected.delete(pid);
        renderAll();
      } else showToast(j.error || 'Failed to delete', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    closeBodyMenu();
  };
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function showToast(msg, type) {
  if (toastEl) {
    toastEl.textContent = msg;
    toastEl.className = 'toast toast--' + (type || 'error');
    toastEl.style.display = '';
    setTimeout(() => { toastEl.style.display = 'none'; }, 3000);
  } else console.warn('[product-list] toast el not found:', msg);
}

function viewDetail(id) {
  window.location.href = 'product-details.html#id=' + encodeURIComponent(id);
}

// ── Event wiring (delegated) ──────────────────────────────────────────────────
filterTabs.forEach(tab => tab.addEventListener('click', () => applyFilter(tab.dataset.filter)));

if (searchInput) searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderAll();
});
if (sortSelect) sortSelect.addEventListener('change', () => setSort(sortSelect.value));
btnGrid?.addEventListener('click', () => setViewMode('grid'));
btnList?.addEventListener('click', () => setViewMode('list'));
btnSelect?.addEventListener('click', () => setSelectMode(!selectMode));
bulkClear?.addEventListener('click', () => setSelectMode(false));

if (selectAll) selectAll.addEventListener('change', () => {
  const checks = productsWrap.querySelectorAll('.row-check[data-pid]');
  checks.forEach(c => {
    c.checked = selectAll.checked;
    toggleSelect(c.dataset.pid, selectAll.checked);
  });
  renderAll();
});

// Bulk action buttons
document.querySelectorAll('.bulk-btn[data-bulk]').forEach(b => {
  b.addEventListener('click', () => bulkAction(b.dataset.bulk));
});

// Delegated clicks inside product wrap
productsWrap?.addEventListener('click', e => {
  const menuBtn = e.target.closest('.pc-menu-btn');
  if (menuBtn) { e.stopPropagation(); openMenu(menuBtn); return; }

  const viewBtn = e.target.closest('.view-detail-btn');
  if (viewBtn) { e.stopPropagation(); viewDetail(viewBtn.dataset.pid); return; }

  const check = e.target.closest('.row-check');
  if (check) {
    toggleSelect(check.dataset.pid, check.checked);
    const card = check.closest('.product-card');
    if (card) card.classList.toggle('selected', check.checked && selectMode);
    const row = check.closest('.prod-row');
    if (row) row.classList.toggle('selected', check.checked && selectMode);
    updateBulkUI();
    return;
  }
});

// Body-menu actions
bodyMenu.addEventListener('click', e => {
  const item = e.target.closest('.pc-menu-item[data-action]');
  if (!item) return;
  const action = item.dataset.action;
  const pid = item.dataset.pid;
  if (action === 'toggle') {
    const c = document.querySelector(`[data-id="${pid}"]`);
    const active = c ? c.dataset.status === 'active' : true;
    makeToggleHandler(pid, active)();
  } else if (action === 'delete') {
    makeDeleteHandler(pid)();
  }
});

document.addEventListener('click', e => {
  if (!bodyMenu.contains(e.target) && !e.target.closest('.pc-menu-btn')) closeBodyMenu();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBodyMenu(); });

// ── Init ──────────────────────────────────────────────────────────────────────
if (window.lucide) lucide.createIcons();
fetchProducts();
