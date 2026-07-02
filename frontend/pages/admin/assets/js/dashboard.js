/* ═══════════════════════════════════════════════
   ADMIN DASHBOARD — Production JS
   ═══════════════════════════════════════════════ */

(function () {
    const API = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

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

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function consoleLog(tag, err) {
        console.error(`[Dashboard] ${tag}:`, err);
    }

    async function apiFetch(path) {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(`${API}${path}`, {
                credentials: 'include',
                headers,
                cache: 'no-store',
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                console.error(`[Dashboard] HTTP ${res.status} for ${path}:`, text.slice(0, 200));
                return null;
            }
            return await res.json();
        } catch (err) {
            console.error(`[Dashboard] Fetch failed for ${path}:`, err);
            return null;
        }
    }

    /* ── Greeting + date ──────────────────────────── */
    function setGreeting() {
        const h = new Date().getHours();
        const greet = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
        document.getElementById('time-greeting').textContent = greet;
        document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    setGreeting();

    /* ── Helpers ──────────────────────────────────── */
    const fmt = n => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M'
                    : n >= 1000     ? (n / 1000).toFixed(1) + 'k'
                    : String(n);

    function timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1)  return 'just now';
        if (m < 60) return `${m}m ago`;
        const hr = Math.floor(m / 60);
        if (hr < 24) return `${hr}h ago`;
        return `${Math.floor(hr / 24)}d ago`;
    }

    function initials(name = '') {
        return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '??';
    }

    function statusBadge(status) {
        const cls = { pending:'pending', processing:'processing', shipped:'shipped', delivered:'delivered', cancelled:'cancelled' }[status] || 'pending';
        return `<span class="badge-status badge-status--${cls}">${status}</span>`;
    }

    /* ── Profile ──────────────────────────────────── */
    async function loadProfile() {
        const result = await apiFetch('/api/auth/me');
        if (!result || !result.success) return;

        const data = result.data;
        const first = data.firstName || '';
        const last  = data.lastName || '';
        const full  = `${first}${last ? ' ' + last : ''}` || 'Admin';
        const ini   = full.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'AD';

        setText('sidebar-name', full);
        setText('sidebar-role', 'Super Admin');
        setText('sidebar-avatar', ini);
        setText('topnav-username', first || 'Admin');
        setText('topnav-avatar', ini);
        setText('dash-user-name', first || 'Admin');

        const ap = document.getElementById('sidebar-avatar');
        if (ap && data.avatar) ap.innerHTML = `<img src="${data.avatar}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }

    /* ── KPIs ─────────────────────────────────────── */
    async function loadKPIs() {
        const [usersRes, sellersRes, ordersRes, productsRes, pendingRes] = await Promise.all([
            apiFetch('/api/admin/users/count'),
            apiFetch('/api/admin/sellers/count'),
            apiFetch('/api/admin/orders/count'),
            apiFetch('/api/admin/products/count'),
            apiFetch('/api/admin/sellers/pending-count'),
        ]);

        const users    = usersRes?.data?.count ?? '—';
        const sellers  = sellersRes?.data?.count ?? '—';
        const orders   = ordersRes?.data?.count ?? '—';
        const products = productsRes?.data?.count ?? '—';
        const pending  = pendingRes?.data?.count ?? '—';

        setText('kpi-users', users);
        setText('kpi-sellers', sellers);
        setText('kpi-orders', orders);
        setText('kpi-products', products);
        setText('kpi-pending', pending);
    }

    /* ── Recent Orders ────────────────────────────── */
    async function loadOrders() {
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) return;

        let result;
        try {
            result = await apiFetch('/api/admin/orders/recent?limit=8');
        } catch (err) {
            console.error('[Dashboard] loadOrders fetch error:', err);
            tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Could not load orders.</td></tr>`;
            return;
        }

        if (!result || !result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-loading">No orders found.</td></tr>`;
            return;
        }

        const orders = Array.isArray(result.data) ? result.data : [];

        if (!orders.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-loading">No orders yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const name = `${o.buyer?.firstName ?? ''} ${o.buyer?.lastName ?? ''}`.trim() || '—';
            const amount = parseFloat(o.totalAmount || 0).toFixed(2);
            const status = o.status || 'pending';
            return `
                <tr>
                    <td class="order-id">#${escapeHtml(o.orderNumber || o.id?.slice(-6).toUpperCase())}</td>
                    <td>${escapeHtml(name)}</td>
                    <td class="order-amount">GH₵ ${amount}</td>
                    <td>${statusBadge(status)}</td>
                    <td>${timeAgo(o.createdAt)}</td>
                </tr>
            `;
        }).join('');
    }

    /* ── Pending Sellers ──────────────────────────── */
    async function loadPendingSellers() {
        const container = document.getElementById('pending-sellers-list');
        const result = await apiFetch('/api/admin/sellers/pending?limit=5');
        if (!result) {
            container.innerHTML = `<div class="seller-empty">Could not load sellers.</div>`;
            return;
        }

        const sellers = Array.isArray(result.data) ? result.data : (result.data?.sellers ?? []);

        if (!sellers.length) {
            container.innerHTML = `<div class="seller-empty">No pending applications 🎉</div>`;
            return;
        }

        container.innerHTML = sellers.map(s => {
            const name = s.user ? `${s.user.firstName} ${s.user.lastName}` : s.storeName;
            const email = s.user?.email ?? '';
            return `
                <div class="seller-item">
                    <div class="seller-avatar">${initials(name)}</div>
                    <div class="seller-info">
                        <div class="seller-name">${escapeHtml(s.storeName)}</div>
                        <div class="seller-meta">${escapeHtml(email)}</div>
                    </div>
                    <a href="../seller-verification/seller-verification.html" class="seller-review-btn">Review</a>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    /* ── Activity Feed ────────────────────────────── */
    async function loadActivity() {
        const feed = document.getElementById('activity-feed');
        const result = await apiFetch('/api/admin/notifications/recent?limit=8');
        if (!result) {
            feed.innerHTML = `<div class="list-loading">Could not load activity.</div>`;
            return;
        }

        const items = Array.isArray(result.data) ? result.data : (result.data?.notifications ?? []);

        if (!items.length) {
            feed.innerHTML = `<div class="list-loading">No recent activity.</div>`;
            return;
        }

        const iconMap = {
            order_placed:     ['shopping-bag', 'act-order'],
            new_order_seller: ['shopping-bag', 'act-order'],
            welcome:          ['user-plus',   'act-user'],
            email_verified:   ['check-circle','act-user'],
            low_stock_alert:  ['alert-triangle','act-product'],
            promotion:        ['zap',         'act-product'],
        };

        feed.innerHTML = items.map(n => {
            const [icon, cls] = iconMap[n.type] ?? ['bell', 'act-alert'];
            return `
                <div class="activity-item">
                    <div class="activity-icon ${cls}"><i data-lucide="${icon}"></i></div>
                    <div class="activity-body">
                        <div class="activity-title">${escapeHtml(n.title)}</div>
                        <div class="activity-time">${timeAgo(n.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    /* ── Top Sellers ──────────────────────────────── */
    async function loadTopSellers() {
        const container = document.getElementById('top-sellers-list');
        const result = await apiFetch('/api/admin/sellers/top?limit=6&sort=products');
        if (!result) {
            container.innerHTML = `<div class="list-loading">Could not load sellers.</div>`;
            return;
        }

        const sellers = Array.isArray(result.data) ? result.data : (result.data?.sellers ?? []);

        if (!sellers.length) {
            container.innerHTML = `<div class="list-loading">No sellers yet.</div>`;
            return;
        }

        const ranks = ['gold', 'silver', 'bronze'];
        container.innerHTML = sellers.slice(0, 6).map((s, i) => {
            const name   = s.storeName || `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim();
            const count  = s._count?.products ?? s.productCount ?? 0;
            const rankCls = ranks[i] ?? '';
            return `
                <div class="top-seller-item">
                    <span class="top-seller-rank ${rankCls}">${String(i + 1).padStart(2, '0')}</span>
                    <div class="top-seller-avatar">${initials(name)}</div>
                    <div class="top-seller-info">
                        <div class="top-seller-name">${escapeHtml(name)}</div>
                        <div class="top-seller-meta">${escapeHtml(s.category ?? 'General')}</div>
                    </div>
                    <span class="top-seller-count">${count} products</span>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    /* ── Init ─────────────────────────────────────── */
    loadProfile();
    Promise.allSettled([
        loadKPIs(),
        loadOrders(),
        loadPendingSellers(),
        loadActivity(),
        loadTopSellers(),
    ]).then(() => lucide.createIcons());

    /* ── Live updates ─────────────────────────────── */
    window.addEventListener('admin:profileUpdated', () => {
        loadProfile();
        Promise.allSettled([loadKPIs(), loadOrders(), loadPendingSellers(), loadActivity(), loadTopSellers()]);
    });
    window.addEventListener('focus', () => {
        Promise.allSettled([loadKPIs(), loadOrders(), loadPendingSellers(), loadActivity(), loadTopSellers()]);
    });
})();
