// SELLER NOTIFICATIONS PAGE — JavaScript

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const PAGE_SIZE = 10;

let offset = 0;
let currentFilter = 'all';
let allLoaded = false;
let _isFetching = false;
let _pollId = null;
let _lastSnapshot = null;
let _lastKnownServerCount = 0;

function getSnapshot(items) {
    if (!items || !items.length) return '__empty__';
    return items.map(n => `${n.id}:${n.read}:${n.createdAt}`).join('|');
}

// ── Auth ──
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
        } catch { /* fall through */ }
    }
    return localStorage.getItem('authToken');
}

// ── API helpers ──
async function apiFetch(path, options = {}) {
    const token = getAuthToken();
    if (!token) { window.location.href = '../../../auth/login.html'; return null; }
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
        cache: 'no-store'
    });
    return res.json();
}

// ── Map backend type → filter category ──
function typeToFilter(type) {
    if (!type) return 'system';
    if (type.startsWith('order_') || type === 'new_order_seller') return 'orders';
    if (type.startsWith('wishlist_') || type === 'low_stock_alert' || type === 'new_review' || type === 'review_reply') return 'products';
    return 'system';
}

// ── Map filter → backend type query param ──
function filterToTypeParam(filter) {
    // We filter client-side after fetching all; backend supports type= but our categories span multiple types
    return '';
}

// ── Fetch notifications ──
async function fetchNotifications(reset = false, skipRerender = false) {
    if (reset) { offset = 0; allLoaded = false; }

    const readParam = currentFilter === 'unread' ? '&read=false' : '';
    const json = await apiFetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}${readParam}`);
    if (!json || !json.success) return [];

    const { notifications, hasMore } = json.data;
    allLoaded = !hasMore;
    offset += notifications.length;
    return notifications;
}

// ── Live sync for notifications ──
async function liveFetchNotifications() {
    const json = await apiFetch('/api/notifications?limit=1&offset=0');
    if (!json || !json.success) return;
    const serverItems = json.data.notifications || [];
    const serverTotal = json.data.total ?? serverItems.length;

    const container = document.getElementById('notifications-list');
    const localCount = container ? container.querySelectorAll('.notif-item').length : 0;

    if (_lastKnownServerCount > 0 && serverTotal > _lastKnownServerCount) {
        await renderNotifications(true);
        await updateBadges();
    }
    _lastKnownServerCount = serverTotal;
}

function startNotificationsLiveSync() {
    let initialized = false;
    _pollId = setInterval(async () => {
        if (_isFetching) return;
        if (!initialized) {
            initialized = true;
            await updateBadges();
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
const _origPushState = history.pushState;
history.pushState = function () {
    _origPushState.apply(this, arguments);
    stopNotificationsLiveSync();
    setTimeout(startNotificationsLiveSync, 0);
};
const _origReplaceState = history.replaceState;
history.replaceState = function () {
    _origReplaceState.apply(this, arguments);
    stopNotificationsLiveSync();
    setTimeout(startNotificationsLiveSync, 0);
};

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        _isFetching = false;
        stopNotificationsLiveSync();
        renderNotifications(true).then(() => startNotificationsLiveSync());
    }
});

window.addEventListener('online', () => {
    _isFetching = false;
    stopNotificationsLiveSync();
    renderNotifications(true).then(() => startNotificationsLiveSync());
});

// ── Render a single notification item ──
const CATEGORY_LABELS = { orders: 'Order', products: 'Product', system: 'System' };

function renderItem(n) {
    const category = typeToFilter(n.type);
    const iconMap = { orders: 'shopping-bag', products: 'package', system: 'bell' };
    const icon = iconMap[category] || 'bell';
    const label = CATEGORY_LABELS[category] || 'System';
    const timeStr = formatTime(n.createdAt);

    return `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
        <div class="notif-icon notif-icon--${category}"><i data-lucide="${icon}"></i></div>
        <div class="notif-content">
            <div class="notif-top">
                <span class="notif-badge notif-badge--${category}">${label}</span>
                <span class="notif-time"><i data-lucide="clock"></i> ${timeStr}</span>
            </div>
            <div class="notif-title">${n.read ? n.title : `<strong>${n.title}</strong>`}</div>
            <div class="notif-desc">${n.message}</div>
        </div>
        <div class="notif-actions">
            ${n.actionUrl ? `<a href="${n.actionUrl}" class="notif-btn notif-btn-primary">View</a>` : ''}
            <button class="notif-btn notif-btn-delete" data-delete="${n.id}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
        </div>
    </div>`;
}

// ── Summary counts (hero stats + filter pills) ──
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function loadSummary() {
    try {
        const json = await apiFetch(`/api/notifications?limit=200&offset=0`);
        if (!json || !json.success) return;
        const all = json.data.notifications || [];
        const counts = { all: all.length, unread: 0, orders: 0, products: 0, system: 0 };
        all.forEach(n => {
            const cat = typeToFilter(n.type);
            if (!n.read) counts.unread++;
            counts[cat] = (counts[cat] || 0) + 1;
        });
        setText('count-all', counts.all);
        setText('count-unread', counts.unread);
        setText('count-orders', counts.orders);
        setText('count-products', counts.products);
        setText('count-system', counts.system);
        setText('stat-unread', counts.unread);
        setText('stat-orders', counts.orders);
        setText('stat-products', counts.products);
        setText('stat-system', counts.system);
        setText('hero-unread-badge', `${counts.unread} unread`);
    } catch { /* non-fatal */ }
}

// ── Render list ──
async function renderNotifications(reset = false, skipRerender = false) {
    const container = document.getElementById('notifications-list');
    if (!skipRerender) {
        if (reset) container.innerHTML = '';
    }

    const items = await fetchNotifications(reset, skipRerender);

    if (skipRerender) {
        const prevCount = container.querySelectorAll('.notif-item').length;
        const newCount = items.length;
        if (prevCount === newCount) return items;
    }

    // Client-side filter for category tabs (orders/products/system)
    const filtered = currentFilter === 'all' || currentFilter === 'unread'
        ? items
        : items.filter(n => typeToFilter(n.type) === currentFilter);

    if (!skipRerender) {
        if (reset && filtered.length === 0 && offset === 0) {
            container.innerHTML = `
            <div class="notif-empty">
                <div class="notif-empty-icon"><i data-lucide="bell-off"></i></div>
                <h3>No notifications yet</h3>
                <p>You're all caught up! New updates will appear here.</p>
            </div>`;
        } else {
            container.insertAdjacentHTML('beforeend', filtered.map(renderItem).join(''));
        }

        if (window.lucide) lucide.createIcons();

        document.getElementById('load-more').style.display = allLoaded ? 'none' : 'flex';

        await updateBadges();
        bindItemActions();
        await loadSummary();
    }

    return items;
}

// ── Badges ──
async function updateBadges() {
    const json = await apiFetch('/api/notifications/unread-count');
    if (!json || !json.success) return;
    const count = json.data.count;

    const sidebarBadge = document.getElementById('sidebar-notif-count');
    if (sidebarBadge) { sidebarBadge.textContent = count; sidebarBadge.style.display = count > 0 ? 'flex' : 'none'; }

    const topnavBadge = document.getElementById('notif-badge');
    if (topnavBadge) { topnavBadge.textContent = count; topnavBadge.style.display = count > 0 ? 'flex' : 'none'; }
}

// ── Per-item actions (mark read on click, delete) ──
function bindItemActions() {
    document.querySelectorAll('.notif-item.unread').forEach(el => {
        el.addEventListener('click', async (e) => {
            if (e.target.closest('[data-delete]')) return;
            const id = el.dataset.id;
            await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
            el.classList.remove('unread');
            el.querySelector('.notif-unread-dot')?.remove();
            const title = el.querySelector('.notif-title');
            if (title) title.innerHTML = title.querySelector('strong')?.textContent || title.textContent;
            await updateBadges();
            await loadSummary();
        }, { once: true });
    });

    document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.delete;
            await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
            document.querySelector(`.notif-item[data-id="${id}"]`)?.remove();
            await updateBadges();
            await loadSummary();
        });
    });
}

// ── Filter tabs ──
function initFilters() {
    document.querySelectorAll('.notif-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.notif-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderNotifications(true);
        });
    });
}

// ── Mark all read ──
function initMarkAllRead() {
    document.getElementById('mark-all-read')?.addEventListener('click', async () => {
        await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
        renderNotifications(true);
        await loadSummary();
    });
}

// ── Load more ──
function initLoadMore() {
    document.getElementById('load-more')?.addEventListener('click', () => renderNotifications(false));
}

// ── Search (client-side filter on loaded items) ──
function initSearch() {
    const input = document.getElementById('notif-search');
    if (!input) return;
    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        document.querySelectorAll('#notifications-list .notif-item').forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            el.style.display = (!q || text.includes(q)) ? '' : 'none';
        });
    });
}

// ── Time formatter ──
function formatTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
    initFilters();
    initMarkAllRead();
    initLoadMore();
    initSearch();
    await renderNotifications(true);
    const countJson = await apiFetch('/api/notifications?limit=1&offset=0');
    if (countJson && countJson.success) {
        const serverItems = countJson.data.notifications || [];
        _lastKnownServerCount = countJson.data.total ?? serverItems.length;
    }
    startNotificationsLiveSync();
});
