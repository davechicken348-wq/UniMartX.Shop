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
function getNotificationIcon(type) {
  if (!type) return 'bell';
  if (type.startsWith('order_') || type === 'new_order_seller') return 'package';
  if (type.startsWith('wishlist_')) return 'heart';
  if (type.startsWith('review_')) return 'message-square';
  if (['login_alert', 'password_changed', 'email_verified'].includes(type)) return 'shield';
  return 'bell';
}

function getSnapshot(arr) {
  if (!arr || !arr.length) return '';
  return arr.map(n => n.id + ':' + (n.read ? '1' : '0')).join(',');
}

function getTypeLabel(type) {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
    if (loadMoreEl) loadMoreEl.style.display = 'none';
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
      cache: 'no-store'
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
    if (loadMoreEl) loadMoreEl.style.display = hasMore ? 'block' : 'none';

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
          <p>You're all caught up! Check back later.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    listEl.innerHTML = filtered.map(notif => {
      const isUnread = !notif.read;
      const icon = getNotificationIcon(notif.type);
      const typeLabel = getTypeLabel(notif.type);

      return `
        <div class="notif-card ${isUnread ? 'unread' : ''}" data-id="${notif.id}" data-type="${notif.type}">
          <div class="notif-card-icon">
            <i data-lucide="${icon}"></i>
          </div>
          <div class="notif-card-body">
            <div class="notif-card-title">
              ${escapeHtml(notif.title)}
              <span class="type-badge">${typeLabel}</span>
            </div>
            <div class="notif-card-message">${escapeHtml(notif.message)}</div>
            <div class="notif-card-meta">
              <span><i data-lucide="clock"></i> ${formatRelativeTime(notif.createdAt)}</span>
              ${notif.orderId ? `<span><i data-lucide="file-text"></i> Order #${notif.orderId.slice(0,8)}</span>` : ''}
            </div>
          </div>
          <div class="notif-card-actions">
            ${!notif.read ? `<button class="notif-action-btn mark-read-btn">Mark read</button>` : ''}
            <button class="notif-action-btn delete delete-btn">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();

    // Bind events
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const card = e.target.closest('.notif-card');
        const id = card.dataset.id;
        try {
          await fetch(`${API_BASE}/api/notifications/${id}/read`, { credentials: 'include',
            method: 'PATCH',
            headers: authHeaders()
          });
          // Update local state
          const notif = allNotifications.find(n => n.id === id);
          if (notif) notif.read = true;
          // Re-render to apply filter changes (e.g., remove from Unread view)
          renderNotifications();
          syncBadge();
        } catch (err) { alert('Failed: ' + err.message); }
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
            method: 'DELETE',
            headers: authHeaders()
          });
          card.remove();
          syncBadge();
        } catch (err) { alert('Failed: ' + err.message); }
      });
    });
  }

  updateSummary();
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
  const summaryEl = document.getElementById('unread-summary');
  if (summaryEl) {
    summaryEl.textContent = `${unread} unread notification${unread !== 1 ? 's' : ''}`;
  }
}

function syncBadge() {
  const unread = allNotifications.filter(n => !n.read).length;

  // Update tab counts
  const tabUnread = document.getElementById('tab-unread');
  const tabAll = document.getElementById('tab-all');
  if (tabUnread) tabUnread.textContent = unread;
  if (tabAll) tabAll.textContent = allNotifications.length;

  // Update topnav badge
  const topnavBadge = document.getElementById('notif-badge');
  if (topnavBadge) {
    if (unread > 0) {
      topnavBadge.textContent = unread > 99 ? '99+' : String(unread);
      topnavBadge.style.display = 'block';

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
    }, 5000);
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
