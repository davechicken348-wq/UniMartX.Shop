/* ═══════════════════════════════════════════════
   ADMIN ORDERS PAGE — Fixed JS
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

    async function apiFetch(path, options = {}) {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API}${path}`, {
            credentials: 'include',
            headers: { ...headers, ...(options.headers || {}) },
            ...options,
        });
        if (!res.ok) {
            if (res.status === 401) window.location.href = '../../auth/login.html?error=auth_required';
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Request failed (${res.status})`);
        }
        return res.json();
    }

    const PER_PAGE = 15;
    let state = { page: 1, total: 0, pages: 1, status: '', search: '', orders: [] };

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

    function toast(msg, type = '') {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast toast--${type}`;
        const icons = { success: 'check-circle', danger: 'x-circle', error: 'alert-circle' };
        const iconName = icons[type] || 'info';
        el.innerHTML = `<i data-lucide="${iconName}"></i><span>${escapeHtml(msg)}</span>`;
        container.appendChild(el);
        if (window.lucide) lucide.createIcons({ nodes: [el] });
        setTimeout(() => {
            el.classList.add('toast-out');
            el.addEventListener('animationend', () => el.remove());
        }, 3200);
    }

    /* ── Profile ── */
    async function loadProfile() {
        try {
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

            const ap = document.getElementById('sidebar-avatar');
            if (ap && data.avatar) ap.innerHTML = `<img src="${data.avatar}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } catch (err) {
            console.error('[Orders] loadProfile failed:', err);
        }
    }

    /* ── Helpers ── */
    function initials(name = '') {
        return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '??';
    }
    function dateStr(d) {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    function timeAgo(d) {
        const diff = Date.now() - new Date(d).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const hr = Math.floor(m / 60);
        if (hr < 24) return `${hr}h ago`;
        return `${Math.floor(hr / 24)}d ago`;
    }
    function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
    function currency(v) { return `GH₵ ${parseFloat(v).toFixed(2)}`; }

    function statusBadge(status) {
        const cls = { pending:'pending', processing:'processing', shipped:'shipped', delivered:'delivered', cancelled:'cancelled', disputed:'pending', refund_requested:'pending', refund_approved:'confirmed', refunded:'refunded', refund_denied:'cancelled' }[status] ?? 'pending';
        return `<span class="badge badge--${cls}">${status}</span>`;
    }

    /* ── Drawer ── */
    const drawer        = document.getElementById('order-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerBody    = document.getElementById('drawer-body');
    const drawerClose   = document.getElementById('drawer-close');

    function openDrawer(order) {
        const buyerName  = order.buyer  ? `${order.buyer.firstName} ${order.buyer.lastName}`   : '—';
        const storeName  = order.seller?.storeName ?? '—';
        const items      = order.items ?? [];
        const addr       = order.address;

        drawerBody.innerHTML = `
            <div class="drawer-order-head">
                <div>
                    <div class="drawer-order-num">#${escapeHtml(order.orderNumber || order.id?.slice(-8).toUpperCase())}</div>
                    <div class="drawer-order-date">${dateStr(order.createdAt)} · ${timeAgo(order.createdAt)}</div>
                </div>
                ${statusBadge(order.status)}
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Buyer</div>
                <div class="p-person">
                    <div class="p-avatar p-avatar--buyer">${initials(buyerName)}</div>
                    <div class="p-person-info">
                        <div class="p-person-name">${escapeHtml(buyerName)}</div>
                        <div class="p-person-meta">${escapeHtml(order.buyer?.email || '')}</div>
                    </div>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Seller</div>
                <div class="p-person">
                    <div class="p-avatar p-avatar--seller">${initials(storeName)}</div>
                    <div class="p-person-info">
                        <div class="p-person-name">${escapeHtml(storeName)}</div>
                    </div>
                </div>
            </div>

            ${items.length ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Items (${items.length})</div>
                <div class="order-items-list">
                    ${items.map(it => `
                        <div class="order-item-row">
                            <img class="order-item-img"
                                 src="${it.product?.image ? `${API}/${String(it.product.image).replace(/^\//, '')}` : ''}"
                                 alt="" onerror="this.style.display='none'">
                            <div class="order-item-name">${escapeHtml(it.product?.name || 'Product')}</div>
                            <div class="order-item-qty">×${it.quantity}</div>
                            <div class="order-item-price">${currency(it.price * it.quantity)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div class="drawer-section">
                <div class="drawer-section-title">Order Info</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Order Total</span>
                    <span class="drawer-field-value">${currency(order.totalAmount)}</span>
                </div>
                ${addr ? `
                <div class="drawer-field">
                    <span class="drawer-field-label">Delivery Address</span>
                    <span class="drawer-field-value">${escapeHtml(addr.street)}, ${escapeHtml(addr.city)}</span>
                </div>` : ''}
                ${order.notes ? `
                <div class="drawer-field">
                    <span class="drawer-field-label">Notes</span>
                    <span class="drawer-field-value" style="color:var(--text-2)">${escapeHtml(order.notes)}</span>
                </div>` : ''}
            </div>

            ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Update Status</div>
                <div class="status-select-wrap">
                    <select class="status-select" id="status-select">
                        <option value="pending"    ${order.status === 'pending'    ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped"    ${order.status === 'shipped'    ? 'selected' : ''}>Shipped</option>
                        <option value="delivered"  ${order.status === 'delivered'  ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled"  ${order.status === 'cancelled'  ? 'selected' : ''}>Cancelled</option>
                        <option value="disputed"  ${order.status === 'disputed'  ? 'selected' : ''}>Disputed</option>
                    </select>
                    <button class="drawer-btn drawer-btn--primary" id="update-status-btn" style="width:auto;padding:0.6rem 1rem">
                        <i data-lucide="check"></i> Update
                    </button>
                </div>
            </div>` : ''}

            <div class="drawer-actions">
                <button class="drawer-btn drawer-btn--ghost" id="copy-order-btn">
                    <i data-lucide="copy"></i> Copy Order ID
                </button>
            </div>
        `;

        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
        lucide.createIcons();

        document.getElementById('update-status-btn')?.addEventListener('click', async () => {
            const newStatus = document.getElementById('status-select').value;
            const btn = document.getElementById('update-status-btn');
            btn.disabled = true;
            try {
                await apiFetch(`/api/admin/orders/${order.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: newStatus }),
                });
                toast(`Order status updated to ${newStatus}.`, 'success');
                closeDrawer();
                loadOrders();
            } catch {
                toast('Failed to update status.', 'danger');
                btn.disabled = false;
            }
        });

        document.getElementById('copy-order-btn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(order.orderNumber || order.id).then(() => toast('Order ID copied.', 'success'));
        });
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    }
    drawerClose.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    /* ── Stats ── */
    async function loadStats() {
        try {
            const result = await apiFetch('/api/admin/orders/stats');
            if (!result) return;
            const data = result.data;
            if (!data) return;

            document.getElementById('stat-total').textContent     = fmt(data.total     ?? 0);
            document.getElementById('stat-pending').textContent   = fmt(data.pending   ?? 0);
            document.getElementById('stat-shipped').textContent   = fmt(data.shipped   ?? 0);
            document.getElementById('stat-delivered').textContent = fmt(data.delivered ?? 0);
            document.getElementById('stat-cancelled').textContent = fmt(data.cancelled ?? 0);

            if (data.revenue !== undefined) {
                const rev = parseFloat(data.revenue);
                const el = document.getElementById('stat-revenue');
                if (el) el.textContent = rev >= 1000 ? `GH₵ ${(rev / 1000).toFixed(1)}k` : `GH₵ ${rev.toFixed(2)}`;
            }
        } catch (err) {
            console.error('[Orders] loadStats failed:', err);
        }
    }

    /* ── Orders table ── */
    async function loadOrders() {
        const tbody = document.getElementById('orders-tbody');
        tbody.innerHTML = Array(6).fill(`<tr class="skel-row"><td colspan="8"><div class="skel-line"></div></td></tr>`).join('');

        try {
            const params = new URLSearchParams({
                page:  state.page,
                limit: PER_PAGE,
                ...(state.status && { status: state.status }),
                ...(state.search && { search: state.search }),
            });

            const result = await apiFetch(`/api/admin/orders?${params}`);
            const data = result.data;

            const orders = data?.orders ?? data ?? [];
            state.orders = orders;
            state.total  = data?.total ?? orders.length;
            state.pages  = data?.pages ?? Math.ceil(state.total / PER_PAGE);

            renderTable(orders);
            renderPagination();
        } catch (err) {
            console.error('[Orders] loadOrders failed:', err);
            tbody.innerHTML = `
                <tr class="empty-row"><td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i data-lucide="wifi-off"></i></div>
                        <h3>Could not load orders</h3>
                        <p>Check that the backend is running and try again.</p>
                    </div>
                </td></tr>`;
        }
        lucide.createIcons();
    }

    function renderTable(orders) {
        const tbody = document.getElementById('orders-tbody');
        if (!orders.length) {
            tbody.innerHTML = `
                <tr class="empty-row"><td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i data-lucide="shopping-bag"></i></div>
                        <h3>No orders found</h3>
                        <p>Try a different status filter or search term.</p>
                    </div>
                </td></tr>`;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const buyerName  = o.buyer  ? `${o.buyer.firstName} ${o.buyer.lastName}` : '—';
            const storeName  = o.seller?.storeName ?? '—';
            const itemNames  = (o.items ?? []).map(i => i.product?.name ?? 'Item').join(', ') || '—';
            const orderNum   = o.orderNumber || o.id?.slice(-8).toUpperCase();

            return `
                <tr data-id="${o.id}" class="order-link-row" style="cursor:pointer">
                    <td class="order-num">#${escapeHtml(orderNum)}</td>
                    <td>
                        <div class="person-cell">
                            <div class="p-avatar p-avatar--buyer">${initials(buyerName)}</div>
                            <span class="p-name">${escapeHtml(buyerName)}</span>
                        </div>
                    </td>
                    <td>
                        <div class="person-cell">
                            <div class="p-avatar p-avatar--seller">${initials(storeName)}</div>
                            <span class="p-name">${escapeHtml(storeName)}</span>
                        </div>
                    </td>
                    <td class="items-cell" title="${escapeHtml(itemNames)}">${escapeHtml(itemNames)}</td>
                    <td class="amount-cell">${currency(o.totalAmount)}</td>
                    <td>${statusBadge(o.status)}</td>
                    <td class="date-cell">${timeAgo(o.createdAt)}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="act-btn act-btn--danger cancel-btn" data-id="${o.id}" title="Cancel order">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                window.location.href = `order-details.html?order=${row.dataset.id}`;
            });
        });

        tbody.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Cancel this order?')) return;
                btn.disabled = true;
                try {
                    await apiFetch(`/api/admin/orders/${btn.dataset.id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: 'cancelled' }),
                    });
                    toast('Order cancelled.', 'success');
                    loadOrders();
                } catch {
                    toast('Failed to cancel order.', 'danger');
                    btn.disabled = false;
                }
            });
        });

        lucide.createIcons();
    }

    /* ── Pagination ── */
    function renderPagination() {
        const info    = document.getElementById('page-info');
        const numbers = document.getElementById('page-numbers');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        const start = (state.page - 1) * PER_PAGE + 1;
        const end   = Math.min(state.page * PER_PAGE, state.total);
        info.textContent = state.total ? `Showing ${start}–${end} of ${state.total} orders` : '';

        prevBtn.disabled = state.page <= 1;
        nextBtn.disabled = state.page >= state.pages;

        const pages = [];
        if (state.pages <= 7) {
            for (let i = 1; i <= state.pages; i++) pages.push(i);
        }

        numbers.innerHTML = pages.map(p =>
            p === '…'
                ? `<span class="page-ellipsis">…</span>`
                : `<button class="page-num${p === state.page ? ' active' : ''}" data-p="${p}">${p}</button>`
        ).join('');

        numbers.querySelectorAll('.page-num').forEach(btn => {
            btn.addEventListener('click', () => { state.page = +btn.dataset.p; loadOrders(); });
        });
        prevBtn.onclick = () => { if (state.page > 1) { state.page--; loadOrders(); } };
        nextBtn.onclick = () => { if (state.page < state.pages) { state.page++; loadOrders(); } };
        lucide.createIcons();
    }

    /* ── Filter pills ── */
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.status = pill.dataset.status;
            state.page   = 1;
            loadOrders();
        });
    });

    /* ── Search ── */
    let searchTimer;
    function bindSearch(id) {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.search = input.value.trim();
                state.page   = 1;
                loadOrders();
            }, 380);
        });
    }
    bindSearch('search-input');
    bindSearch('topnav-search-input');

    /* ── Export CSV ── */
    document.getElementById('export-btn')?.addEventListener('click', () => {
        if (!state.orders.length) { toast('No orders to export.', 'danger'); return; }
        const rows = [['Order #', 'Buyer', 'Seller', 'Total', 'Status', 'Date']];
        state.orders.forEach(o => {
            rows.push([
                o.orderNumber || o.id,
                o.buyer ? `${o.buyer.firstName} ${o.buyer.lastName}` : '—',
                o.seller?.storeName ?? '—',
                parseFloat(o.totalAmount).toFixed(2),
                o.status,
                dateStr(o.createdAt),
            ]);
        });
        const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a    = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: 'unimartx-orders.csv',
        });
        a.click();
        toast('CSV exported.', 'success');
    });

    /* ── Init ── */
    loadProfile();
    loadStats();
    loadOrders();

    window.addEventListener('admin:profileUpdated', () => {
        loadProfile();
        Promise.all([loadStats(), loadOrders()]);
    });
    window.addEventListener('focus', () => {
        Promise.all([loadStats(), loadOrders()]);
    });
})();
