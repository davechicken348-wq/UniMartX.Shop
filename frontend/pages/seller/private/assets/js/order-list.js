// ═══════════════════════════════════════════
//    SELLER ORDER LIST JS — Professional Console
// ═══════════════════════════════════════════

(function () {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
    const ORDERS_PER_PAGE = 15;

    // Inject toast keyframes once
    const _kf = document.createElement('style');
    _kf.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateX(-50%) translateY(8px)}}`;
    document.head.appendChild(_kf);

    // ── Auth Token Helper ──────────────────────────────────────
    function getAuthToken() {
        const raw = localStorage.getItem('authData');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed.expiry && Date.now() > parsed.expiry) { localStorage.removeItem('authData'); return null; }
                const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (authData.token) return authData.token;
            } catch {}
        }
        const fallback = localStorage.getItem('authToken');
        if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
        return fallback;
    }

    // ── Helpers ───────────────────────────────────────────────
    function formatCurrency(amount, currency = '₵') {
        const n = parseFloat(amount);
        return `${currency} ${isNaN(n) ? '0.00' : n.toFixed(2)}`;
    }
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
    }
    function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function imgUrl(path) {
        if (!path) return '';
        if (/^https?:\/\//.test(path)) return path;
        return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    }
    function toast(message, type = 'success') {
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:${type === 'error' ? '#ef4444' : 'var(--bg-2)'};color:${type === 'error' ? '#fff' : 'var(--text)'};border:1px solid ${type === 'error' ? 'transparent' : 'var(--border)'};border-radius:var(--radius);padding:0.8rem 1.1rem;font-family:'Quicksand',sans-serif;font-weight:600;font-size:0.85rem;box-shadow:0 8px 32px rgba(0,0,0,0.35);max-width:360px;animation:toastIn .3s ease;`;
        t.textContent = message;
        document.body.appendChild(t);
        setTimeout(() => { t.style.animation = 'toastOut .25s ease forwards'; setTimeout(() => t.remove(), 250); }, 3200);
    }

    // ── Status transitions ────────────────────────────────────
    const FORWARD = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };
    function nextStatus(s) {
        if (FORWARD[s]) return { status: FORWARD[s], label: s === 'pending' ? 'Process' : s === 'processing' ? 'Ship' : 'Deliver' };
        return null;
    }
    function cancelAllowed(s) { return ['pending', 'processing', 'shipped'].includes(s); }

    // ── State ──────────────────────────────────────────────────
    let currentPage = 1;
    let currentFilter = 'all';
    let currentSearch = '';
    let currentSort = 'newest';
    let totalPages = 1;
    let rawOrders = [];
    let selected = new Set();
    let _isFetching = false;
    let _pollId = null;
    let _lastOrderSnapshot = null;
    let currentDrawerOrder = null;

    // ── Row factory ────────────────────────────────────────────
    function createOrderRow(order) {
        const status = order.status;
        const buyerName = [order.buyer?.firstName, order.buyer?.lastName].filter(Boolean).join(' ') || '—';
        const buyerEmail = order.buyer?.email || '';
        const item = order.items?.[0];
        const product = item?.product;
        const img = product?.image ? imgUrl(product.image) : '';
        const productName = product?.name || 'Multiple items';
        const fulfilType = order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'both' ? 'Both' : 'Pickup';
        const next = nextStatus(status);

        const row = document.createElement('div');
        row.className = 'order-row';
        row.dataset.id = order.id;
        row.dataset.status = status;
        row.dataset.ref = order.orderNumber;

        row.innerHTML = `
            <label class="col-check">
                <input type="checkbox" class="row-select" data-id="${order.id}">
                <span class="check-box"><i data-lucide="check"></i></span>
            </label>
            <div class="order-cell">
                <div class="order-thumb">
                    ${img ? `<img src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<i data-lucide="image" class="thumb-fallback"></i>'}
                </div>
                <div class="order-cell-text">
                    <span class="order-ref">#${escapeHtml(order.orderNumber)}</span>
                    <span class="order-sub">${escapeHtml(productName)}</span>
                </div>
            </div>
            <div class="order-buyer">
                <span class="buyer-name">${escapeHtml(buyerName)}</span>
                ${buyerEmail ? `<span class="buyer-email">${escapeHtml(buyerEmail)}</span>` : ''}
            </div>
            <div class="order-fulfil"><span class="badge-status badge-status--${order.fulfillmentType || ''}">${fulfilType}</span></div>
            <div class="order-amount">${formatCurrency(order.totalAmount)}</div>
            <div class="order-date">${formatDate(order.createdAt)}</div>
            <span class="badge-status badge-status--${status}">${cap(status)}</span>
            <div class="order-actions">
                <button class="btn-action view-btn" data-id="${order.id}" type="button">View</button>
                ${next ? `<button class="btn-action advance-btn" data-id="${order.id}" data-next="${next.status}" type="button">${next.label}</button>` : ''}
            </div>
        `;
        return row;
    }

    // ── Sorting ────────────────────────────────────────────────
    function sortedOrders() {
        const arr = [...rawOrders];
        if (currentSort === 'oldest') arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        else if (currentSort === 'amount_desc') arr.sort((a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount));
        else if (currentSort === 'amount_asc') arr.sort((a, b) => parseFloat(a.totalAmount) - parseFloat(b.totalAmount));
        return arr;
    }
    function renderSorted() {
        const listEl = document.getElementById('orders-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        sortedOrders().forEach(o => listEl.appendChild(createOrderRow(o)));
        syncSelectionUI();
        if (window.lucide) lucide.createIcons();
    }

    // ── Selection ─────────────────────────────────────────────
    function updateBulkUI() {
        const cnt = selected.size;
        const bulkBar = document.getElementById('bulk-bar');
        const countEl = document.getElementById('bulk-count');
        if (countEl) countEl.textContent = `${cnt} selected`;
        if (bulkBar) bulkBar.classList.toggle('hidden', cnt === 0);
    }
    function syncSelectionUI() {
        const rows = Array.from(document.querySelectorAll('#orders-list .order-row'));
        rows.forEach(r => {
            const cb = r.querySelector('.row-select');
            const on = selected.has(r.dataset.id);
            if (cb) cb.checked = on;
            r.classList.toggle('selected', on);
        });
        const selAll = document.getElementById('select-all');
        if (selAll) selAll.checked = rows.length > 0 && rows.every(r => selected.has(r.dataset.id));
        updateBulkUI();
    }
    function clearSelection() { selected.clear(); syncSelectionUI(); }

    // ── Status PATCH ───────────────────────────────────────────
    async function patchStatus(id, status) {
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE}/api/seller/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return { ok: false, error: data.error || 'Update failed' };
            return { ok: true };
        } catch { return { ok: false, error: 'Network error' }; }
    }
    async function getOrderStatus(id) {
        const cached = rawOrders.find(o => o.id === id);
        if (cached) return cached.status;
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE}/api/seller/orders/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return null;
            const data = await res.json();
            return data.success ? data.data.status : null;
        } catch { return null; }
    }
    async function advanceTo(id, target) {
        let status = await getOrderStatus(id);
        while (status && status !== target && status !== 'delivered' && status !== 'cancelled') {
            const nx = FORWARD[status];
            if (!nx) break;
            const r = await patchStatus(id, nx);
            if (!r.ok) break;
            status = nx;
        }
        return status === target;
    }

    // ── Fetch orders ──────────────────────────────────────────
    function getOrdersSnapshot(orders) {
        if (!orders || !orders.length) return '__empty__';
        return orders.map(o => `${o.id}:${o.status}:${o.totalAmount}`).join('|');
    }

    async function fetchOrders(page = 1, status = 'all', search = '', skipStateUpdate = false) {
        const token = getAuthToken();
        if (!token) { showError('Please log in to view orders'); return; }
        if (!skipStateUpdate) _isFetching = true;

        const params = new URLSearchParams({ page: page.toString(), limit: ORDERS_PER_PAGE.toString() });
        if (status && status !== 'all') params.set('status', status);
        if (search) params.set('search', search);

        try {
            const response = await fetch(`${API_BASE}/api/seller/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store'
            });
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            if (data.success) {
                const snapshot = getOrdersSnapshot(data.data.orders);
                if (snapshot !== _lastOrderSnapshot || !skipStateUpdate) {
                    _lastOrderSnapshot = snapshot;
                    rawOrders = data.data.orders || [];
                    renderSorted();
                    updateCounts(data.data.counts);
                    updatePagination(data.data.page, data.data.pages);
                    checkEmptyStates(rawOrders.length, status, search);
                }
            } else throw new Error(data.error || 'Failed to fetch orders');
        } catch (err) {
            if (!skipStateUpdate) { console.error('Error fetching orders:', err); showError('Failed to load orders'); }
        } finally {
            if (!skipStateUpdate) _isFetching = false;
        }
    }

    async function liveFetchOrders() {
        if (_isFetching) return;
        const token = getAuthToken();
        if (!token) return;
        _isFetching = true;
        try {
            const params = new URLSearchParams({ page: currentPage.toString(), limit: ORDERS_PER_PAGE.toString() });
            if (currentFilter && currentFilter !== 'all') params.set('status', currentFilter);
            if (currentSearch) params.set('search', currentSearch);
            const response = await fetch(`${API_BASE}/api/seller/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store'
            });
            if (!response.ok) { _isFetching = false; return; }
            const data = await response.json();
            if (!data.success) { _isFetching = false; return; }
            const snapshot = getOrdersSnapshot(data.data.orders);
            if (snapshot !== _lastOrderSnapshot) {
                _lastOrderSnapshot = snapshot;
                rawOrders = data.data.orders || [];
                renderSorted();
                updateCounts(data.data.counts);
                updatePagination(data.data.page, data.data.pages);
                checkEmptyStates(rawOrders.length, currentFilter, currentSearch);
            }
        } catch {}
        _isFetching = false;
    }

    function startOrderListLiveSync() {
        let initialized = false;
        _pollId = setInterval(async () => {
            const token = getAuthToken();
            if (!token || _isFetching) return;
            if (!initialized) {
                initialized = true;
                await fetchOrders(currentPage, currentFilter, currentSearch);
                return;
            }
            await liveFetchOrders();
        }, 30000);
    }
    function stopOrderListLiveSync() { if (_pollId) { clearInterval(_pollId); _pollId = null; } }
    window.addEventListener('beforeunload', stopOrderListLiveSync);
    const _origPush = history.pushState; history.pushState = function () { _origPush.apply(this, arguments); stopOrderListLiveSync(); setTimeout(startOrderListLiveSync, 0); };
    const _origRep = history.replaceState; history.replaceState = function () { _origRep.apply(this, arguments); stopOrderListLiveSync(); setTimeout(startOrderListLiveSync, 0); };
    _lastOrderSnapshot = null;

    // ── Counts + KPIs ─────────────────────────────────────────
    function updateCounts(counts) {
        const c = { all: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0, ...(counts || {}) };
        c.processing = Math.max(0, c.all - c.pending - c.shipped - c.delivered - c.cancelled);
        const setTab = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || 0; };
        setTab('count-all', c.all); setTab('count-pending', c.pending); setTab('count-processing', c.processing);
        setTab('count-shipped', c.shipped); setTab('count-delivered', c.delivered); setTab('count-cancelled', c.cancelled);
        const setK = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || 0; };
        setK('kpi-total', c.all); setK('kpi-pending', c.pending); setK('kpi-processing', c.processing);
        setK('kpi-shipped', c.shipped); setK('kpi-delivered', c.delivered);
    }

    // ── Export CSV ────────────────────────────────────────────
    function exportToCSV(orders, filename) {
        if (!orders || !orders.length) { toast('No orders to export', 'error'); return; }
        const headers = ['Order #', 'Buyer', 'Product', 'Amount', 'Type', 'Date', 'Status'];
        const rows = orders.map(o => [
            o.orderNumber,
            [o.buyer?.firstName, o.buyer?.lastName].filter(Boolean).join(' '),
            o.items?.[0]?.product?.name || 'Multiple items',
            o.totalAmount,
            o.fulfillmentType || '',
            new Date(o.createdAt).toISOString().slice(0, 10),
            o.status
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }

    // ── Pagination ────────────────────────────────────────────
    function updatePagination(page, pages) {
        currentPage = page; totalPages = pages;
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pagesEl = document.getElementById('page-buttons');
        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= pages;
        if (pagesEl) {
            pagesEl.innerHTML = '';
            const startPage = Math.max(1, page - 2);
            const endPage = Math.min(pages, startPage + 4);
            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('button');
                btn.className = `page-btn ${i === page ? 'active' : ''}`;
                btn.textContent = i; btn.dataset.page = i.toString();
                pagesEl.appendChild(btn);
            }
        }
    }

    // ── Empty states ──────────────────────────────────────────
    function checkEmptyStates(orderCount, filter, search) {
        const noOrders = document.getElementById('no-orders');
        const noResults = document.getElementById('no-results');
        const ordersCard = document.querySelector('.orders-card');
        const hasNoOrders = orderCount === 0;
        const isAllFilter = filter === 'all' && !search;
        noOrders?.classList.add('hidden');
        noResults?.classList.add('hidden');
        if (hasNoOrders) {
            if (isAllFilter) noOrders?.classList.remove('hidden');
            else noResults?.classList.remove('hidden');
            ordersCard?.classList.add('hidden');
        } else ordersCard?.classList.remove('hidden');
    }

    function showError(message) {
        const listEl = document.getElementById('orders-list');
        if (listEl) {
            listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-circle"></i></div><h3>Error</h3><p>${escapeHtml(message)}</p></div>`;
            if (window.lucide) lucide.createIcons();
        }
    }

    // ── Drawer ────────────────────────────────────────────────
    const drawer = document.getElementById('order-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const dwBody = document.getElementById('dw-body');
    const dwFooter = document.getElementById('dw-footer');
    const dwOrderNumber = document.getElementById('dw-order-number');

    function openDrawer(id) {
        drawerOverlay?.classList.add('open');
        drawer?.classList.add('open');
        drawer?.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        dwBody.innerHTML = `<div class="drawer-skeleton"><div class="sk sk-line w60"></div><div class="sk sk-line w40"></div><div class="sk sk-block"></div><div class="sk sk-line w80"></div><div class="sk sk-line w70"></div></div>`;
        dwFooter.innerHTML = '';
        fetchOrderDetail(id);
    }
    function closeDrawer() {
        drawerOverlay?.classList.remove('open');
        drawer?.classList.remove('open');
        drawer?.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        currentDrawerOrder = null;
    }

    async function fetchOrderDetail(id) {
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_BASE}/api/seller/orders/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load order');
            currentDrawerOrder = data.data;
            renderDrawer(data.data);
        } catch (err) {
            dwBody.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-circle"></i></div><h3>Couldn't load order</h3><p>${escapeHtml(err.message || 'Try again')}</p></div>`;
            if (window.lucide) lucide.createIcons();
        }
    }

    function renderDrawer(order) {
        const subTotal = (order.items || []).reduce((s, it) => s + (parseFloat(it.price) * (it.quantity || 1)), 0);
        const deliveryFee = parseFloat(order.sellerDeliveryFee || 0);
        const next = nextStatus(order.status);
        const canCancel = cancelAllowed(order.status);

        dwOrderNumber.textContent = `#${order.orderNumber}`;

        const itemsHtml = (order.items || []).map(it => {
            const img = it.product?.image ? imgUrl(it.product.image) : '';
            const line = (parseFloat(it.price) * (it.quantity || 1));
            return `
                <div class="dw-item">
                    <div class="dw-item-thumb">${img ? `<img src="${img}" alt="" onerror="this.style.display='none'">` : '<i data-lucide="image"></i>'}</div>
                    <div class="dw-item-info">
                        <div class="dw-item-name">${escapeHtml(it.product?.name || 'Item')}</div>
                        <div class="dw-item-meta">${it.quantity || 1} × ${formatCurrency(it.price)}</div>
                    </div>
                    <div class="dw-item-price">${formatCurrency(line)}</div>
                </div>`;
        }).join('');

        dwBody.innerHTML = `
            <div class="dw-status-row">
                <span class="badge-status badge-status--${order.status}">${cap(order.status)}</span>
                <span class="dw-date">${formatDate(order.createdAt)}</span>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Customer</div>
                <div class="dw-info-grid">
                    <div class="dw-info"><div class="dw-info-label">Name</div><div class="dw-info-value">${escapeHtml([order.buyer?.firstName, order.buyer?.lastName].filter(Boolean).join(' ') || '—')}</div></div>
                    <div class="dw-info"><div class="dw-info-label">Email</div><div class="dw-info-value">${escapeHtml(order.buyer?.email || '—')}</div></div>
                    ${order.buyer?.phone ? `<div class="dw-info"><div class="dw-info-label">Phone</div><div class="dw-info-value">${escapeHtml(order.buyer.phone)}</div></div>` : ''}
                    <div class="dw-info"><div class="dw-info-label">Fulfilment</div><div class="dw-info-value">${cap(order.fulfillmentType || '—')}</div></div>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Items</div>
                ${itemsHtml || '<p style="font-size:0.85rem;color:var(--text-3)">No items</p>'}
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Summary</div>
                <div class="dw-totals">
                    <div class="dw-total-row"><span>Subtotal</span><span>${formatCurrency(subTotal)}</span></div>
                    ${deliveryFee > 0 ? `<div class="dw-total-row"><span>Delivery fee</span><span>${formatCurrency(deliveryFee)}</span></div>` : ''}
                    <div class="dw-total-row grand"><span>Total</span><span>${formatCurrency(order.totalAmount)}</span></div>
                </div>
            </div>

            ${order.notes ? `<div class="drawer-section"><div class="drawer-section-title">Notes</div><div class="dw-info"><div class="dw-info-value">${escapeHtml(order.notes)}</div></div></div>` : ''}
        `;

        // Footer actions
        let footer = '';
        if (next) footer += `<button class="btn btn-primary" id="dw-advance" data-id="${order.id}" data-next="${next.status}"><i data-lucide="arrow-right"></i> ${next.label}</button>`;
        if (canCancel) footer += `<button class="btn btn-ghost" id="dw-cancel" data-id="${order.id}"><i data-lucide="x-circle"></i> Cancel</button>`;
        footer += `<button class="btn btn-ghost" id="dw-print"><i data-lucide="printer"></i> Print</button>`;
        footer += `<a class="btn btn-ghost" href="order-details.html?id=${order.id}" target="_blank" rel="noopener"><i data-lucide="external-link"></i> Full page</a>`;
        dwFooter.innerHTML = footer;
        if (window.lucide) lucide.createIcons();

        dwFooter.querySelector('#dw-advance')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget; btn.disabled = true;
            const r = await patchStatus(order.id, btn.dataset.next);
            if (r.ok) { toast('Order updated'); refreshAndSyncDrawer(order.id); }
            else { toast(r.error || 'Update failed', 'error'); btn.disabled = false; }
        });
        dwFooter.querySelector('#dw-cancel')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget; btn.disabled = true;
            const r = await patchStatus(order.id, 'cancelled');
            if (r.ok) { toast('Order cancelled'); refreshAndSyncDrawer(order.id); }
            else { toast(r.error || 'Cancel failed', 'error'); btn.disabled = false; }
        });
        dwFooter.querySelector('#dw-print')?.addEventListener('click', () => window.print());
    }

    async function refreshAndSyncDrawer(id) {
        _lastOrderSnapshot = null;
        await fetchOrders(currentPage, currentFilter, currentSearch);
        // re-open drawer with fresh data
        const stillThere = rawOrders.find(o => o.id === id);
        if (stillThere) fetchOrderDetail(id);
        else closeDrawer();
    }

    // ── Single-row advance (table) ────────────────────────────
    async function advanceRow(id, next) {
        const r = await patchStatus(id, next);
        if (r.ok) { toast('Order updated'); _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch); }
        else toast(r.error || 'Update failed', 'error');
    }

    // ── Bulk mutations ────────────────────────────────────────
    async function bulkAdvanceToShipped() {
        const ids = Array.from(selected);
        if (!ids.length) return;
        let ok = 0, fail = 0;
        for (const id of ids) { const r = await advanceTo(id, 'shipped'); r ? ok++ : fail++; }
        if (ok) toast(`${ok} order(s) marked as shipped`);
        if (fail) toast(`${fail} order(s) could not be updated`, 'error');
        clearSelection(); _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch);
    }
    async function bulkCancel() {
        const ids = Array.from(selected);
        if (!ids.length) return;
        let ok = 0, fail = 0;
        for (const id of ids) { const r = await patchStatus(id, 'cancelled'); r.ok ? ok++ : fail++; }
        if (ok) toast(`${ok} order(s) cancelled`);
        if (fail) toast(`${fail} order(s) could not be cancelled`, 'error');
        clearSelection(); _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch);
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        const listEl = document.getElementById('orders-list');

        // Refresh + export
        document.getElementById('refresh-orders')?.addEventListener('click', () => { _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch); });
        document.getElementById('export-orders')?.addEventListener('click', () => exportToCSV(rawOrders, 'orders-export.csv'));

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                currentPage = 1; clearSelection(); _lastOrderSnapshot = null;
                fetchOrders(currentPage, currentFilter, currentSearch);
            });
        });

        // Sort
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            currentSort = e.target.value; renderSorted();
        });

        // Search (desktop + mobile sync)
        const searchDesktop = document.getElementById('order-search');
        const searchMobile = document.getElementById('order-search-mobile');
        function handleSearch(value) {
            currentSearch = value.trim(); currentPage = 1; clearSelection();
            _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch);
        }
        searchDesktop?.addEventListener('input', (e) => { handleSearch(e.target.value); if (searchMobile) searchMobile.value = e.target.value; });
        searchMobile?.addEventListener('input', (e) => { handleSearch(e.target.value); if (searchDesktop) searchDesktop.value = e.target.value; });

        // List interactions (row click → drawer; actions; selection)
        listEl?.addEventListener('click', (e) => {
            const row = e.target.closest('.order-row');
            if (!row) return;
            if (e.target.closest('.col-check')) return; // checkbox handles itself
            const adv = e.target.closest('.advance-btn');
            if (adv) { e.stopPropagation(); advanceRow(adv.dataset.id, adv.dataset.next); return; }
            const view = e.target.closest('.view-btn');
            if (view) { e.stopPropagation(); openDrawer(view.dataset.id); return; }
            openDrawer(row.dataset.id);
        });
        listEl?.addEventListener('change', (e) => {
            const cb = e.target.closest('.row-select');
            if (!cb) return;
            const id = cb.dataset.id;
            if (cb.checked) selected.add(id); else selected.delete(id);
            cb.closest('.order-row')?.classList.toggle('selected', cb.checked);
            updateBulkUI();
            const selAll = document.getElementById('select-all');
            const rows = Array.from(document.querySelectorAll('#orders-list .order-row'));
            if (selAll) selAll.checked = rows.length > 0 && rows.every(r => selected.has(r.dataset.id));
        });

        // Select all
        document.getElementById('select-all')?.addEventListener('change', (e) => {
            const on = e.target.checked;
            document.querySelectorAll('#orders-list .order-row').forEach(r => {
                if (on) selected.add(r.dataset.id); else selected.delete(r.dataset.id);
            });
            syncSelectionUI();
        });

        // Bulk bar
        document.getElementById('bulk-clear')?.addEventListener('click', clearSelection);
        document.getElementById('bulk-ship')?.addEventListener('click', bulkAdvanceToShipped);
        document.getElementById('bulk-cancel')?.addEventListener('click', bulkCancel);
        document.getElementById('bulk-export')?.addEventListener('click', () => {
            const chosen = rawOrders.filter(o => selected.has(o.id));
            exportToCSV(chosen, 'orders-selected.csv');
        });

        // Pagination
        document.getElementById('page-buttons')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.classList.contains('active')) return;
            currentPage = parseInt(btn.dataset.page); clearSelection();
            _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch);
        });
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; clearSelection(); _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch); }
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (currentPage < totalPages) { currentPage++; clearSelection(); _lastOrderSnapshot = null; fetchOrders(currentPage, currentFilter, currentSearch); }
        });

        // Drawer close
        document.getElementById('dw-close')?.addEventListener('click', closeDrawer);
        drawerOverlay?.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

        // Initial load
        fetchOrders();
        startOrderListLiveSync();

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                _isFetching = false; stopOrderListLiveSync(); _lastOrderSnapshot = null;
                fetchOrders(currentPage, currentFilter, currentSearch).then(startOrderListLiveSync);
            }
        });
        window.addEventListener('online', () => {
            _isFetching = false; stopOrderListLiveSync(); _lastOrderSnapshot = null;
            fetchOrders(currentPage, currentFilter, currentSearch).then(startOrderListLiveSync);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
