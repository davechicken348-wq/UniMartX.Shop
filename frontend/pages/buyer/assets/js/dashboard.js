// ── Greeting ──────────────────────────────────
const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

function setGreeting(firstName) {
  const greetingEl = document.getElementById('topnav-greeting');
  if (greetingEl) greetingEl.textContent = `${greeting}, ${firstName || 'there'} 👋`;
}

// ── Helpers ─────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending': return 'status-badge status-badge--warning';
    case 'processing': return 'status-badge status-badge--info';
    case 'shipped': return 'status-badge status-badge--primary';
    case 'delivered': return 'status-badge status-badge--success';
    case 'cancelled': return 'status-badge status-badge--danger';
    case 'refunded': return 'status-badge status-badge--muted';
    default: return 'status-badge';
  }
}

// ── Stats Animation ─────────────────────────────

function animateValue(el, target, duration = 1200) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easeOut);
    el.textContent = current;
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ── Auth ──────────────────────────────────────────────────────
function getAuthToken() {
    const raw = localStorage.getItem('authData');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.expiry && Date.now() > parsed.expiry) {
                localStorage.removeItem('authData');
            } else {
                const data = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (data.token) return data.token;
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

function getBaseUrl() {
    return (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
}

// ── Load Dashboard Data ─────────────────────────

let _isFetching = false;
let _lastSnapshot = null;
let _pollId = null;

async function fetchDashboard(skipLoading = false) {
    const token = getAuthToken();

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (!skipLoading) _isFetching = true;

    try {
        const res = await fetch(`${getBaseUrl()}/api/buyer/dashboard`, {
            credentials: 'include',
            headers,
        });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (!skipLoading) console.error(data.message || 'Failed to load dashboard');
      return null;
    }

    renderDashboard(data.data, skipLoading);
    return data.data;
  } catch (err) {
    if (!skipLoading) console.error('Dashboard fetch error:', err);
    return null;
  } finally {
    if (!skipLoading) _isFetching = false;
  }
}

function renderDashboard(data, skipLoading = false) {
  const { stats, recentOrders, profileCompletion } = data;

  const snapshot = { ...stats, orders: recentOrders.map(o => o.id).join(',') };

  if (!skipLoading) {
    _lastSnapshot = snapshot;
  }

  const firstName = document.getElementById('topnav-username')?.textContent?.split(' ')[0];
  setGreeting(firstName);

  const statValues = document.querySelectorAll('.stat-value');
  if (statValues.length >= 4) {
    statValues[0].textContent = stats.totalOrders ?? 0;
    statValues[1].textContent = stats.pendingDelivery ?? 0;
    statValues[2].textContent = stats.delivered ?? 0;
    statValues[3].textContent = stats.wishlistItems ?? 0;
  }

  updateProfileCompletion(profileCompletion);
  renderRecentOrders(recentOrders);
  renderFollowedSellers(true);
}

// ── Init — No setInterval ────────────────────
function init() {
  lucide.createIcons();
  fetchDashboard();
  startDashboardLiveSync();

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

window.addEventListener('focus', () => {
    fetchDashboard(true);
});

// ── Live sync ──────────────────────────────────
async function liveFetch() {
  if (_isFetching) return;
  const token = getAuthToken();
  if (!token) return;
  _isFetching = true;

  try {
    const res = await fetch(`${getBaseUrl()}/api/buyer/dashboard`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) return;

    const prev = _lastSnapshot;
    let changed = false;
    if (prev && data.data) {
      const curr = data.data;
      const currStats = curr.stats || {};
      const currOrders = (curr.recentOrders || []).map(o => o.id).join(',');
      changed =
        prev.totalOrders !== currStats.totalOrders ||
        prev.pendingDelivery !== currStats.pendingDelivery ||
        prev.delivered !== currStats.delivered ||
        prev.wishlistItems !== currStats.wishlistItems ||
        prev.orders !== currOrders;
    }

    renderDashboard(data.data, true);
    if (changed) lucide.createIcons();
    _lastSnapshot = { ...(data.data.stats || {}), orders: (data.data.recentOrders || []).map(o => o.id).join(',') };
  } finally {
    _isFetching = false;
  }
}

function startDashboardLiveSync() {
  let initialized = false;
  _pollId = setInterval(async () => {
    if (_isFetching) return;
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

function updateProfileCompletion(completion) {
  if (!completion) return;

  const pctEl = document.querySelector('.completion-pct');
  const barEl = document.querySelector('.completion-bar');
  if (pctEl) pctEl.textContent = `${completion.percentage}%`;
  if (barEl) barEl.style.width = `${completion.percentage}%`;

  const listItems = document.querySelectorAll('.completion-item');
  const items = completion.items || [];
  listItems.forEach((item, index) => {
    if (index < items.length) {
      const { done, label } = items[index];
      item.classList.toggle('done', done);
      const iconName = done ? 'check-circle' : 'circle';
      item.innerHTML = `<i data-lucide="${iconName}"></i><span>${label}</span>`;
    }
  });
  lucide.createIcons();
}

function renderRecentOrders(orders) {
    const container = document.querySelector('.orders-list');
    if (!container) return;

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:2rem 1rem;text-align:center;">
          <i data-lucide="package" style="width:40px;height:40px;color:var(--text-3);margin-bottom:0.75rem;"></i>
          <p style="color:var(--text-2);font-size:0.9rem;">No orders yet</p>
          <a href="../../public/shop/shop.html" class="btn btn-ghost btn-sm" style="margin-top:0.5rem;">Start Shopping</a>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = orders.map(order => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const firstItem = order.items[0];
      const productName = firstItem?.product?.name || 'Item';
      const orderUrl = `../orders/order-details.html?id=${order.id}`;

      return `
        <a class="order-row" href="${orderUrl}" data-order-id="${order.id}">
          <div class="order-img">
            ${firstItem?.product?.image
              ? `<img src="${firstItem.product.image}" alt="${escapeHtml(productName)}">`
              : '<i data-lucide="package"></i>'
            }
          </div>
          <div class="order-info">
            <div class="order-name">Order #${order.orderNumber}</div>
            <div class="order-meta">
              <span>${itemCount} item${itemCount > 1 ? 's' : ''}</span>
              <span class="${getStatusBadgeClass(order.status)}">${order.status.replace('_', ' ')}</span>
            </div>
          </div>
          <div class="order-action">
            <i data-lucide="chevron-right"></i>
          </div>
        </a>
      `;
    }).join('');

    lucide.createIcons();
  }

async function renderFollowedSellers() {
    const token = getAuthToken();
    const grid = document.getElementById('followed-grid');
    const empty = document.getElementById('followed-empty');
    const countEl = document.getElementById('stat-following-count');
    const card = document.getElementById('followed-sellers-card');
    const statsGrid = document.querySelector('.stats-grid');

    if (!token || !grid) return;

    try {
        const headers = authHeaders();
        const res = await fetch(`${getBaseUrl()}/api/follow/sellers`, {
            credentials: 'include',
            headers
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed');

        const sellers = json.data || [];
        if (countEl) countEl.textContent = sellers.length;
        if (statsGrid && sellers.length > 0) statsGrid.classList.add('has-follows');

        if (sellers.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            if (card) card.style.display = 'none';
            return;
        }

        if (empty) empty.classList.add('hidden');
        if (card) card.style.display = '';

        grid.innerHTML = sellers.map(s => {
            const avatarStyle = s.storeAvatar
                ? `background-image:url('${s.storeAvatar}');background-size:cover;background-position:center`
                : `background:${s.storeColor || 'linear-gradient(135deg,#10b981,#34d399)'}`;
            const initial = (s.storeName || 'S').charAt(0).toUpperCase();
            const catLabel = s.category ? s.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Store';

            return `
                <a class="followed-card" href="../../seller/public/profile/profile.html?sellerId=${s.id}">
                    <div class="followed-avatar" style="${avatarStyle}" title="${escapeHtml(s.storeName)}">
                        ${s.storeAvatar ? '' : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-weight:700;font-size:0.85rem;color:#fff;">${initial}</span>`}
                    </div>
                    <div class="followed-info">
                        <div class="followed-name">${escapeHtml(s.storeName)}</div>
                        <div class="followed-meta">${catLabel} · ★ ${s.avgRating || '—'} · ${s.productCount || 0} items</div>
                    </div>
                </a>
            `;
        }).join('');

        lucide.createIcons();
    } catch (err) {
        console.error('Followed sellers load error:', err);
    }
}
