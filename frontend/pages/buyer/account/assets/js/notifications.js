/* ═══════════════════════════════════════════
   NOTIFICATIONS PAGE (Buyer Account) — No polling
═══════════════════════════════════════════ */

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const PAGE_SIZE = 20;

// ── Auth ──────────────────────────────────────
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

let allNotifications = [];
let currentPage = 0;
let hasMore = true;
let currentFilter = 'all'; // 'all' | 'unread' | 'orders' | 'wishlist' | 'account'
let _lastCount = -1;

// DOM elements
const listEl = document.getElementById('notifications-list');
const loadingEl = document.getElementById('notifications-loading');
const loadMoreEl = document.getElementById('load-more');
const loadMoreBtn = document.getElementById('load-more-btn');
const filterBtns = document.querySelectorAll('.filter-btn');

// ── Helpers ──────────────────────────────────────

function getNotificationIcon(type) {
  const icons = {
    order_placed: 'shopping-cart',
    order_confirmed: 'check-circle',
    order_preparing: 'package',
    order_shipped: 'truck',
    order_delivered: 'home',
    order_cancelled: 'x-circle',
    order_refunded: 'refresh-cw',
    wishlist_price_drop: 'trending-down',
    wishlist_back_in_stock: 'archive-restore',
    new_review: 'star',
    review_reply: 'message-square',
    login_alert: 'alert-triangle',
    password_changed: 'key',
    email_verified: 'mail',
    new_order_seller: 'shopping-bag',
    low_stock_alert: 'alert-octagon',
    promotion: 'tag',
    announcement: 'megaphone',
    welcome: 'gift',
  };
  return icons[type] || 'bell';
}

function getTypeLabel(type) {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ── API ─────────────────────────────────────────

async function loadNotifications(reset = true) {
  if (reset) {
    currentPage = 0;
    hasMore = true;
    allNotifications = [];
    loadingEl.style.display = 'block';
    listEl.innerHTML = '';
    loadMoreEl.style.display = 'none';
  }

  const readParam = currentFilter === 'unread' ? 'false' : undefined;
  const offset = currentPage * PAGE_SIZE;
  const params = new URLSearchParams();
  params.set('limit', PAGE_SIZE.toString());
  params.set('offset', offset.toString());
  if (readParam !== undefined) params.set('read', readParam);

  try {
    const res = await fetch(`${API_BASE}/api/notifications?${params}`, {
      credentials: 'include',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load');

    const newNotifs = data.data.notifications;
    allNotifications = reset ? newNotifs : [...allNotifications, ...newNotifs];
    hasMore = data.data.hasMore;
    currentPage++;

    renderNotifications();
    loadMoreEl.style.display = hasMore ? 'block' : 'none';
  } catch (err) {
    alert('Failed to load notifications: ' + err.message);
  } finally {
    loadingEl.style.display = 'none';
  }

  syncBadge();
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
        <div class="notif-card ${isUnread ? 'unread' : ''}" data-id="${notif.id}">
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
              <span><i data-lucide="clock"></i> ${formatDate(notif.createdAt)}</span>
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

    document.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const card = e.target.closest('.notif-card');
        const id = card.dataset.id;
        try {
          await fetch(`${API_BASE}/api/notifications/${id}/read`, {
            credentials: 'include',
            method: 'PATCH',
            headers: authHeaders()
          });
          card.classList.remove('unread');
          card.querySelector('.mark-read-btn')?.remove();
          syncBadge();
        } catch (err) { alert('Failed: ' + err.message); }
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const card = e.target.closest('.notif-card');
        const id = card.dataset.id;
        if (!confirm('Delete this notification?')) return;
        try {
          await fetch(`${API_BASE}/api/notifications/${id}`, {
            credentials: 'include',
            method: 'DELETE',
            headers: authHeaders()
          });
          allNotifications = allNotifications.filter(n => n.id !== id);
          renderNotifications();
          syncBadge();
        } catch (err) { alert('Failed: ' + err.message); }
      });
    });
  }
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

function syncBadge() {
  const unread = allNotifications.filter(n => !n.read).length;
  const topnavBadge = document.getElementById('notif-badge');
  if (topnavBadge) {
    if (unread > 0) {
      topnavBadge.textContent = unread > 99 ? '99+' : String(unread);
      topnavBadge.style.display = 'block';
    }
  }

  if (typeof window.updateSidebarBadge === 'function') {
    window.updateSidebarBadge('notifications', unread);
  }
}

// ── Event Listeners ─────────────────────────────

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadNotifications(true);
  });
});

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => loadNotifications(false));
}

if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE}/api/notifications/read-all`, { credentials: 'include',
          method: 'PATCH',
          headers: authHeaders()
        });
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
