// ── State ─────────────────────────────────────
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const PAGE_SIZE = 20;
let _pollId = null;

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

// ── DOM refs ──────────────────────────────────
const filterTabs = document.querySelectorAll('.notif-tab');
const loadingEl = document.getElementById('notif-loading');
const listEl = document.getElementById('notif-list-full');
const loadMoreEl = document.getElementById('load-more');
const loadMoreBtn = document.getElementById('load-more-btn');
const markAllBtn = document.getElementById('mark-all-read-btn');
const markReadTopnav = document.getElementById('mark-read');

// ── State vars ────────────────────────────────
let currentFilter = 'all';
let allNotifications = [];
let currentPage = 0;
let hasMore = true;
let _lastSnapshot = null;
let _isFetching = false;

// ── Helpers ───────────────────────────────────
function getNotifMeta(type) {
  if (!type) return { icon: 'bell', cat: 'default', label: 'Notification' };
  if (type.startsWith('order_') || type === 'new_order_seller') return { icon: 'package', cat: 'order', label: 'Order' };
  if (type.startsWith('wishlist_')) return { icon: 'heart', cat: 'wishlist', label: 'Wishlist' };
  if (type.startsWith('review_') || type === 'rating') return { icon: 'star', cat: 'review', label: 'Review' };
  if (['login_alert', 'password_changed', 'email_verified'].includes(type) || type.startsWith('account_') || type.startsWith('security_'))
    return { icon: 'shield', cat: 'account', label: 'Account' };
  if (type.startsWith('promo') || type.startsWith('deal') || type.startsWith('marketing'))
    return { icon: 'tag', cat: 'promo', label: 'Promo' };
  return { icon: 'bell', cat: 'default', label: 'Alert' };
}

function getCta(n) {
  if (n.actionUrl) return n.actionUrl;
  if (n.orderId) return `../orders/order-details.html?id=${encodeURIComponent(n.orderId)}`;
  if (n.productId) return `../../public/shop/product-details.html?id=${encodeURIComponent(n.productId)}`;
  return null;
}

function priorityClass(p) {
  return p === 'urgent' ? 'notif-card--urgent' : p === 'high' ? 'notif-card--high' : '';
}

function dayBucket(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((b - a) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This Week';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

function getSnapshot(arr) {
  if (!arr || !arr.length) return '';
  return arr.map(n => n.id + ':' + (n.read ? '1' : '0')).join(',');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ── API ─────────────────────────────────────────

async function loadNotifications(reset = true, skipRerender = false) {
  if (reset) {
    currentPage = 0;
    hasMore = true;
    allNotifications = [];
    if (loadingEl) loadingEl.style.display = 'block';
    if (listEl) listEl.innerHTML = '';
    if (loadMoreEl) loadMoreEl.classList.add('hidden');
  }

  const readParam = currentFilter === 'unread' ? 'false' : undefined;
  const offset = currentPage * PAGE_SIZE;
  const params = new URLSearchParams();
  params.set('limit', PAGE_SIZE.toString());
  params.set('offset', offset.toString());
  if (readParam !== undefined) params.set('read', readParam);

  try {
    const res = await fetch(`${API_BASE}/api/notifications?${params}`, { credentials: 'include',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load');

    const newNotifs = data.data.notifications;
    const snapshot = getSnapshot(newNotifs);

    if (snapshot !== _lastSnapshot || reset) {
      _lastSnapshot = snapshot;
      allNotifications = reset ? newNotifs : [...allNotifications, ...newNotifs];
    }
    hasMore = data.data.hasMore;
    currentPage++;

    renderNotifications(skipRerender);
    if (loadMoreEl) loadMoreEl.classList.toggle('hidden', !hasMore);

    syncBadge();
  } catch (err) {
    if (reset) alert('Failed to load notifications: ' + err.message);
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

function renderNotifications() {
  const filtered = filterNotifications(allNotifications);

  if (listEl) {
    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <i data-lucide="bell-off"></i>
          <h3>No notifications</h3>
          <p>${emptyMessage()}</p>
        </div>
      `;
      lucide.createIcons();
      updateSummary();
      return;
    }

    const groups = [];
    let current = null;
    filtered.forEach(n => {
      const label = dayBucket(n.createdAt);
      if (!current || current.label !== label) { current = { label, items: [] }; groups.push(current); }
      current.items.push(n);
    });

    listEl.innerHTML = groups.map(g => `
      <div class="notif-group">
        <div class="notif-group-label">${g.label}</div>
        ${g.items.map(buildCard).join('')}
      </div>
    `).join('');

    lucide.createIcons();
    bindCardEvents();
  }

  updateSummary();
}

function buildCard(n) {
  const isUnread = !n.read;
  const meta = getNotifMeta(n.type);
  const cta = getCta(n);
  const pClass = priorityClass(n.priority);
  const tag = n.orderId
    ? `<span class="notif-tag"><i data-lucide="file-text"></i> Order #${escapeHtml(n.orderId.slice(0, 8))}</span>` : '';
  const pTag = n.priority === 'urgent'
    ? `<span class="notif-tag notif-tag--urgent"><i data-lucide="alert-octagon"></i> Urgent</span>`
    : n.priority === 'high'
      ? `<span class="notif-tag notif-tag--high"><i data-lucide="arrow-up"></i> High</span>` : '';
  const ctaHtml = cta
    ? `<a class="notif-cta" href="${cta}">View <i data-lucide="arrow-right"></i></a>` : '';

  return `
    <div class="notif-card ${isUnread ? 'unread' : ''} ${pClass}" data-id="${n.id}" data-type="${n.type}">
      <div class="notif-card-icon notif-card-icon--${meta.cat}">
        <i data-lucide="${meta.icon}"></i>
      </div>
      <div class="notif-card-body">
        <div class="notif-card-top">
          <h3 class="notif-card-title">${escapeHtml(n.title)}</h3>
          ${isUnread ? '<span class="notif-dot" title="Unread"></span>' : ''}
        </div>
        <p class="notif-card-message">${escapeHtml(n.message)}</p>
        <div class="notif-card-meta">
          <span><i data-lucide="clock"></i> ${formatRelativeTime(n.createdAt)}</span>
          ${tag}
          ${pTag}
        </div>
        ${ctaHtml}
      </div>
      <div class="notif-card-actions">
        ${isUnread ? `<button class="notif-action-btn mark-read mark-read-btn"><i data-lucide="check"></i> Mark read</button>` : ''}
        <button class="notif-action-btn delete delete-btn"><i data-lucide="trash-2"></i> Delete</button>
      </div>
    </div>`;
}

function emptyMessage() {
  switch (currentFilter) {
    case 'unread': return "You're all caught up. No unread notifications.";
    case 'orders': return 'No order updates yet. We\'ll notify you when something changes.';
    case 'wishlist': return 'No wishlist alerts yet. Price drops and restocks will show up here.';
    case 'account': return 'No account activity yet.';
    default: return 'You\'re all caught up! New notifications will appear here.';
  }
}

function bindCardEvents() {
  document.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = e.target.closest('.notif-card');
      await markRead(card.dataset.id);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = e.target.closest('.notif-card');
      const id = card.dataset.id;
      if (!confirm('Delete this notification?')) return;
      try {
        await fetch(`${API_BASE}/api/notifications/${id}`, { credentials: 'include',
          method: 'DELETE', headers: authHeaders()
        });
        card.remove();
        syncBadge();
      } catch (err) { alert('Failed: ' + err.message); }
    });
  });

  document.querySelectorAll('.notif-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.notif-action-btn') || e.target.closest('.notif-cta')) return;
      if (card.classList.contains('unread')) await markRead(card.dataset.id);
    });
  });
}

async function markRead(id) {
  try {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, { credentials: 'include',
      method: 'PATCH', headers: authHeaders()
    });
    const notif = allNotifications.find(n => n.id === id);
    if (notif) notif.read = true;
    renderNotifications();
    syncBadge();
  } catch (err) { alert('Failed: ' + err.message); }
}

function filterNotifications(notifs) {
  const filter = currentFilter;
  if (filter === 'all') return notifs;
  if (filter === 'unread') return notifs.filter(n => !n.read);
  if (filter === 'orders' || filter === 'order') return notifs.filter(n => n.type.startsWith('order_') || n.type === 'new_order_seller');
  if (filter === 'wishlist') return notifs.filter(n => n.type.startsWith('wishlist_'));
  if (filter === 'account') return notifs.filter(n =>
    ['login_alert', 'password_changed', 'email_verified'].includes(n.type)
  );
  return notifs;
}

// ── Badge Sync ────────────────────────────────────

function updateSummary() {
  const unread = allNotifications.filter(n => !n.read).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const week = allNotifications.filter(n => new Date(n.createdAt).getTime() >= weekAgo).length;

  const summaryEl = document.getElementById('unread-summary');
  if (summaryEl) summaryEl.textContent = `${unread} unread notification${unread !== 1 ? 's' : ''}`;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('ns-total', allNotifications.length);
  set('ns-unread', unread);
  set('ns-week', week);
}

function syncBadge() {
  const unread = allNotifications.filter(n => !n.read).length;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('tab-all', allNotifications.length);
  set('tab-unread', unread);
  set('tab-orders', allNotifications.filter(n => n.type.startsWith('order_') || n.type === 'new_order_seller').length);
  set('tab-wishlist', allNotifications.filter(n => n.type.startsWith('wishlist_')).length);
  set('tab-account', allNotifications.filter(n =>
    ['login_alert', 'password_changed', 'email_verified'].includes(n.type) ||
    n.type.startsWith('account_') || n.type.startsWith('security_')
  ).length);

  // Update topnav badge
  const topnavBadge = document.getElementById('notif-badge');
  if (topnavBadge) {
    if (unread > 0) {
      topnavBadge.textContent = unread > 99 ? '99+' : String(unread);
      topnavBadge.style.display = 'block';
    } else {
      topnavBadge.style.display = 'none';
    }
  }

  // Update sidebar badge
  if (typeof window.updateSidebarBadge === 'function') {
    window.updateSidebarBadge('notifications', unread);
  }
}

// ── Event Listeners ─────────────────────────────

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    loadNotifications(true);
  });
});

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => loadNotifications(false));
}

// Mark all read
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE}/api/notifications/read-all`, { credentials: 'include',
          method: 'PATCH',
          headers: authHeaders()
        });
      // Update local state: mark all as read
      allNotifications.forEach(n => n.read = true);
      renderNotifications();
      syncBadge();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  });
}

// Topnav mark-all
  if (markReadTopnav) {
    markReadTopnav.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE}/api/notifications/read-all`, { credentials: 'include',
          method: 'PATCH',
          headers: authHeaders()
        });
      // Update local state: mark all as read
      allNotifications.forEach(n => n.read = true);
      renderNotifications();
      syncBadge();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  });
}

// ── Init — No setInterval ──────────────────────
loadNotifications(true);
_lastCount = allNotifications.filter(n => !n.read).length;

window.addEventListener('focus', () => {
    loadNotifications(true);
});

// ── Live sync ──────────────────────────────────
async function liveFetchNotifications() {
    const json = await apiFetch(`/api/notifications?limit=1&offset=0`);
    if (!json || !json.success) return;
    const serverItems = json.data.notifications || [];
    const serverCount = json.data.totalCount ?? serverItems.length;

    const container = document.getElementById('notif-list-full');
    const localCount = container ? container.querySelectorAll('.notif-card').length : 0;

    if (serverCount !== localCount) {
        await loadNotifications(true);
    }
}

function startNotificationsLiveSync() {
    let initialized = false;
    _pollId = setInterval(async () => {
        if (_isFetching) return;
        if (!initialized) {
            initialized = true;
            return;
        }
        await liveFetchNotifications();
    }, 30000);
}

function stopNotificationsLiveSync() {
    if (_pollId) {
        clearInterval(_pollId);
        _pollId = null;
    }
}

window.addEventListener('beforeunload', stopNotificationsLiveSync);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        _isFetching = false;
        stopNotificationsLiveSync();
        loadNotifications(true).then(() => startNotificationsLiveSync());
    }
});

window.addEventListener('online', () => {
    _isFetching = false;
    stopNotificationsLiveSync();
    loadNotifications(true).then(() => startNotificationsLiveSync());
});
