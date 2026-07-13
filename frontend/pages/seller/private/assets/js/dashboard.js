const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── Auth helpers ───────────────────────────────
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
  return localStorage.getItem('authToken');
}

function getCurrentUser() {
  const raw = localStorage.getItem('authData');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('authData');
      } else {
        const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
        if (authData.user) return authData.user;
      }
    } catch {}
  }
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try { return JSON.parse(userStr); } catch {}
  }
  return null;
}

// ── Set user info in sidebar ───────────────────
(function setUserInfo() {
  const user = getCurrentUser();
  const fullName = user && (user.firstName || user.lastName)
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'Store Owner';
  const storeName = localStorage.getItem('seller_store') || 'My Store';

  const nameEl = document.getElementById('sidebar-name');
  if (nameEl) nameEl.textContent = fullName;
  const storeEl = document.getElementById('sidebar-store');
  if (storeEl) storeEl.textContent = storeName;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEl = document.getElementById('topnav-greeting');
  if (greetingEl) greetingEl.textContent = `${greeting} 👋`;
})();

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Dashboard data loader ──────────────────────
let _isFetching = false;
let _lastStats = null;
let _pollId = null;

async function fetchDashboard(skipLoading = false) {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '../../../auth/login.html';
    return null;
  }

  if (!skipLoading) showLoadingState();

  try {
    const res = await fetch(`${API_BASE}/api/seller/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load dashboard');
    }

    renderDashboard(json.data, skipLoading);
    if (!skipLoading) animateCounters();
    _lastStats = json.data.stats;
    return json.data;
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    if (!skipLoading) showErrorState(err.message || 'Failed to load dashboard data');
    return null;
  } finally {
    if (!skipLoading) hideLoadingState();
  }
}

function renderDashboard(data, skipLoading = false) {
  renderStats(data.stats);
  renderRecentOrders(data.recentOrders);
  renderChart(data.chartData, data.chartLabels);
  renderTopProducts(data.topProducts);
  renderFollowers(data.followers);
  if (skipLoading) lucide.createIcons();
}

function renderStats(stats) {
  const formatCurrency = (val) =>
    `GH₵ ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const revenueEl = document.getElementById('stat-revenue');
  const ordersEl = document.getElementById('stat-orders');
  const pendingEl = document.getElementById('stat-pending');
  const ratingEl = document.getElementById('stat-rating');

  if (revenueEl) revenueEl.textContent = formatCurrency(stats.revenue);
  const revenueTotalEl = document.querySelector('.revenue-total');
  if (revenueTotalEl) revenueTotalEl.textContent = formatCurrency(stats.revenue);
  if (ordersEl) ordersEl.textContent = stats.orders.toLocaleString();
  if (pendingEl) pendingEl.textContent = stats.pending;
  if (ratingEl) ratingEl.textContent = `${stats.rating} ★`;

  // Low-stock banner
  if (stats.lowStock > 0) {
    let banner = document.getElementById('low-stock-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'low-stock-banner';
      banner.style.cssText = 'display:flex;align-items:center;gap:0.75rem;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:0.85rem 1.1rem;margin-bottom:1.5rem;font-size:0.88rem;color:#fbbf24;font-weight:600;';
      const statsGrid = document.querySelector('.stats-grid');
      if (statsGrid) statsGrid.parentNode.insertBefore(banner, statsGrid);
    }
    banner.innerHTML = `<i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:#f59e0b;flex-shrink:0;"></i> <span style="flex:1;"><strong>${stats.lowStock} product${stats.lowStock === 1 ? '' : 's'}</strong> ${stats.lowStock === 1 ? 'is' : 'are'} low on stock or out of stock.</span> <a href="../products/product-list.html" style="color:#f59e0b;text-decoration:underline;white-space:nowrap;">View products →</a>`;
    if (window.lucide) lucide.createIcons();
  } else {
    const banner = document.getElementById('low-stock-banner');
    if (banner) banner.remove();
  }
}

function renderRecentOrders(orders) {
  const container = document.querySelector('.orders-table');
  if (!container) return;

  if (!orders || !orders.length) {
    container.innerHTML = `
      <div class="orders-table-head">
        <span>Order</span>
        <span>Product</span>
        <span>Amount</span>
        <span>Status</span>
        <span></span>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="shopping-bag"></i></div>
        <h3>No recent orders</h3>
        <p>When you receive orders, they'll appear here</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="orders-table-head">
      <span>Order</span>
      <span>Product</span>
      <span>Amount</span>
      <span>Status</span>
      <span></span>
    </div>
    ${orders.map((o) => {
      const statusClass = getStatusClass(o.status);
      return `
      <div class="order-row">
        <div class="order-cell">
          <span class="order-cell-label">Order</span>
          <span class="order-cell-value order-cell-value--primary">#${o.orderNumber}</span>
        </div>
        <div class="order-cell">
          <span class="order-cell-label">Product</span>
          <span class="order-cell-value">${escapeHtml(o.productName || '—')}</span>
        </div>
        <div class="order-cell">
          <span class="order-cell-label">Amount</span>
          <span class="order-cell-value order-cell-value--amount">GH₵ ${o.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="order-cell">
          <span class="order-cell-label">Status</span>
          <span class="order-cell-value order-cell-value--status">
            <span class="badge-status ${statusClass}">${capitalize(o.status)}</span>
          </span>
        </div>
        <a href="../orders/order-details.html?id=${o.id}" class="order-link"><i data-lucide="arrow-right"></i></a>
      </div>
    `;
    }).join('')}
  `;
  lucide.createIcons();
}

function renderTopProducts(products) {
  const container = document.querySelector('.top-products');
  if (!container) return;

  if (!products || !products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="package"></i></div>
        <h3>No products yet</h3>
        <p>Add your first product to start selling</p>
        <a href="../products/add-product.html" class="btn btn-primary btn-sm">Add Product</a>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = products.map((p) => {
    const imgStyle = p.image
      ? `background-image:url('${p.image}');background-size:cover;background-position:center`
      : '';
    return `
    <div class="top-product-row">
      <div class="top-product-img ${p.image ? '' : 'shimmer'}" style="${imgStyle}"></div>
      <div class="top-product-info">
        <p class="top-product-name">${escapeHtml(p.name)}</p>
        <p class="top-product-sales">${p.sales.toLocaleString()} sold</p>
      </div>
      <div class="top-product-revenue">GH₵ ${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
    </div>
   `;
  }).join('');
}

function renderChart(data, labels) {
  const container = document.getElementById('mini-chart');
  if (!container) return;

  const max = Math.max(...data, 1);
  container.innerHTML = data.map((val, i) => {
    const height = (val / max) * 100;
    const isToday = i === labels.length - 1;
    return `
      <div class="chart-bar${isToday ? ' chart-bar--today' : ''}" style="--h:${height}%" title="GH₵ ${val.toLocaleString()}">
        <span>${labels[i]}</span>
      </div>
    `;
  }).join('');
}

function renderFollowers(followers) {
  const grid = document.getElementById('followers-grid');
  const empty = document.getElementById('followers-empty');
  const badge = document.getElementById('followers-count-badge');
  const count = Array.isArray(followers) ? followers.length : 0;

  if (badge) badge.textContent = `${count} follower${count !== 1 ? 's' : ''}`;

  const statFollowers = document.getElementById('stat-followers');
  if (statFollowers) statFollowers.textContent = count;

  if (!grid) return;

  if (count === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  grid.innerHTML = followers.map((f) => {
    const name = `${f.firstName || ''} ${f.lastName || ''}`.trim() || 'Buyer';
    const initial = name.charAt(0).toUpperCase();
    const avatarStyle = f.avatar
      ? `background-image:url('${f.avatar}');background-size:cover;background-position:center`
      : `background:linear-gradient(135deg,#f59e0b,#fbbf24)`;

    return `
      <div class="follower-card">
        <div class="follower-avatar" style="${avatarStyle}">
          ${f.avatar ? '' : initial}
        </div>
        <div class="follower-info">
          <div class="follower-name">${escapeHtml(name)}</div>
          <div class="follower-email">${escapeHtml(f.email || '')}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Loading and error states ──────────────────
function showLoadingState() {
  const statsGrid = document.querySelector('.stats-grid');
  if (statsGrid) statsGrid.classList.add('loading');

  const ordersTable = document.querySelector('.orders-table');
  if (ordersTable) {
    ordersTable.innerHTML = `
      <div class="orders-table-head">
        <span>Order</span>
        <span>Product</span>
        <span>Amount</span>
        <span>Status</span>
        <span></span>
      </div>
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading recent orders...</p>
      </div>
    `;
  }

  const topProducts = document.querySelector('.top-products');
  if (topProducts) {
    topProducts.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading top products...</p>
      </div>
    `;
  }

  const miniChart = document.getElementById('mini-chart');
  if (miniChart) {
    miniChart.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading chart...</p>
      </div>
    `;
  }
}

function hideLoadingState() {
  const statsGrid = document.querySelector('.stats-grid');
  if (statsGrid) statsGrid.classList.remove('loading');
}

function showErrorState(message) {
  const ordersTable = document.querySelector('.orders-table');
  if (ordersTable) {
    ordersTable.innerHTML = `
      <div class="orders-table-head">
        <span>Order</span>
        <span>Product</span>
        <span>Amount</span>
        <span>Status</span>
        <span></span>
      </div>
      <div class="error-state">
        <div class="error-icon"><i data-lucide="alert-triangle"></i></div>
        <h3>Failed to load orders</h3>
        <p>${message}</p>
        <button onclick="window.reloadDashboard()" class="btn btn-primary btn-sm">Retry</button>
      </div>
    `;
  }

  const topProducts = document.querySelector('.top-products');
  if (topProducts) {
    topProducts.innerHTML = `
      <div class="error-state">
        <div class="error-icon"><i data-lucide="alert-triangle"></i></div>
        <h3>Failed to load products</h3>
        <p>${message}</p>
        <button onclick="window.reloadDashboard()" class="btn btn-primary btn-sm">Retry</button>
      </div>
    `;
  }

  const miniChart = document.getElementById('mini-chart');
  if (miniChart) {
    miniChart.innerHTML = `
      <div class="error-state">
        <div class="error-icon"><i data-lucide="alert-triangle"></i></div>
        <h3>Failed to load chart</h3>
        <p>${message}</p>
        <button onclick="window.reloadDashboard()" class="btn btn-primary btn-sm">Retry</button>
      </div>
    `;
  }

  lucide.createIcons();
}

function animateCounters() {
  document.querySelectorAll('.stat-value').forEach((el) => {
    const raw = el.textContent.trim();
    const target = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(target)) return;

    const isDecimal = raw.includes('.');
    const hasComma = target >= 1000;
    let current = 0;
    const step = Math.ceil(target / 50);

    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      if (isDecimal) {
        el.textContent = current.toFixed(1);
      } else if (hasComma) {
        el.textContent = Math.round(current).toLocaleString();
      } else {
        el.textContent = Math.round(current);
      }
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return 'badge-status--pending';
    case 'processing':
    case 'shipped':
      return 'badge-status--processing';
    case 'delivered':
      return 'badge-status--delivered';
    default:
      return '';
  }
}

// ── Live sync ──────────────────────────────────
async function liveFetch() {
  if (_isFetching) return;
  const token = getAuthToken();
  if (!token) return;
  _isFetching = true;

  try {
    const res = await fetch(`${API_BASE}/api/seller/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    const json = await res.json();
    if (!res.ok || !json.success) return;

    const data = json.data;
    const prev = _lastStats;
    let changed = false;
    if (prev) {
      changed =
        prev.revenue !== data.stats.revenue ||
        prev.orders !== data.stats.orders ||
        prev.pending !== data.stats.pending ||
        prev.rating !== data.stats.rating;
    }

    renderDashboard(data, true);
    if (changed) animateCounters();
    _lastStats = data.stats;
  } catch {}

  _isFetching = false;
}

function startDashboardLiveSync() {
  let initialized = false;
  _pollId = setInterval(async () => {
    const token = getAuthToken();
    if (!token || _isFetching) return;
    if (!initialized) {
      initialized = true;
      await liveFetch();
      return;
    }
    await liveFetch();
  }, 30000);
}

function stopDashboardLiveSync() {
  if (_pollId) {
    clearInterval(_pollId);
    _pollId = null;
  }
}

window.addEventListener('beforeunload', stopDashboardLiveSync);
const origPushState = history.pushState;
history.pushState = function () {
  origPushState.apply(this, arguments);
  stopDashboardLiveSync();
  setTimeout(startDashboardLiveSync, 0);
};
const origReplaceState = history.replaceState;
history.replaceState = function () {
  origReplaceState.apply(this, arguments);
  stopDashboardLiveSync();
  setTimeout(startDashboardLiveSync, 0);
};

// ── My Shop button ────────────────────────────
async function initMyShopBtn() {
  const btn = document.getElementById('view-my-shop-btn');
  if (!btn) return;
  const cached = localStorage.getItem('seller_id');
  if (cached) {
    btn.href = `/pages/seller/public/store/store.html?sellerId=${cached}`;
    return;
  }
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/seller/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    if (json.success && json.data?.sellerId) {
      localStorage.setItem('seller_id', json.data.sellerId);
      btn.href = `../../../seller/public/store/store.html?sellerId=${json.data.sellerId}`;
    }
  } catch {}
}

// ── Init ───────────────────────────────────────
function init() {
  lucide.createIcons();
  fetchDashboard();
  startDashboardLiveSync();
  initMyShopBtn();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      stopDashboardLiveSync();
      fetchDashboard().then(() => startDashboardLiveSync());
    }
  });

  window.addEventListener('online', () => {
    stopDashboardLiveSync();
    fetchDashboard().then(() => startDashboardLiveSync());
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for retry buttons and inline handlers
window.loadDashboard = window.reloadDashboard = () => {
  stopDashboardLiveSync();
  fetchDashboard().then(() => startDashboardLiveSync());
};
