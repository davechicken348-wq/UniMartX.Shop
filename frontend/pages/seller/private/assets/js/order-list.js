// ═══════════════════════════════════════════
//    SELLER ORDER LIST JS - Dynamic Data
// ═══════════════════════════════════════════

(function() {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
    const ORDERS_PER_PAGE = 15;

    // ── Auth Token Helper ──────────────────────────────────────
    function getAuthToken() {
        const raw = localStorage.getItem('authData');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed.expiry && Date.now() > parsed.expiry) {
                    localStorage.removeItem('authData');
                    return null;
                }
                const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (authData.token) return authData.token;
            } catch {}
        }
        const fallback = localStorage.getItem('authToken');
        if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
        return fallback;
    }

    // ── Format currency ───────────────────────────────────────
    function formatCurrency(amount, currency = '₵') {
        return `${currency} ${parseFloat(amount).toFixed(2)}`;
    }

    // ── Format date ───────────────────────────────────────────
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
    }

    // ── Create order row element ────────────────────────────────
    function createOrderRow(order) {
        const statusClass = `badge-status--${order.status}`;
        const buyerName = [order.buyer.firstName, order.buyer.lastName].filter(Boolean).join(' ') || '—';
        const productName = order.items?.[0]?.product?.name || 'Multiple items';
        const fulfillmentType = order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'both' ? 'Both' : 'Pickup';
        
        const row = document.createElement('div');
        row.className = 'order-row';
        row.dataset.status = order.status;
        row.dataset.ref = order.orderNumber;
        
        row.innerHTML = `
            <span class="order-ref">#${order.orderNumber}</span>
            <span class="order-buyer">${buyerName}</span>
            <span class="order-product">${productName}</span>
            <span class="order-amount">${formatCurrency(order.totalAmount)}</span>
            <span class="order-fulfillment"><span class="badge-status badge-status--${order.fulfillmentType}">${fulfillmentType}</span></span>
            <span class="order-date">${formatDate(order.createdAt)}</span>
            <span class="badge-status ${statusClass}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            <a href="order-details.html?id=${order.id}" class="order-link"><i data-lucide="arrow-right"></i></a>
        `;
        
        return row;
    }

    // ── State ──────────────────────────────────────────────────
    let currentPage = 1;
    let currentFilter = 'all';
    let currentSearch = '';
    let totalPages = 1;
    let orderCounts = { all: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0 };
    let _isFetching = false;
    let _pollId = null;
    let _lastOrderSnapshot = null;

    function getOrdersSnapshot(orders) {
        if (!orders || !orders.length) return '__empty__';
        return orders.map(o => `${o.id}:${o.status}:${o.totalAmount}`).join('|');
    }

    async function fetchOrders(page = 1, status = 'all', search = '', skipStateUpdate = false) {
        const token = getAuthToken();
        if (!token) {
            showError('Please log in to view orders');
            return;
        }

        if (!skipStateUpdate) _isFetching = true;

        const params = new URLSearchParams({
            page: page.toString(),
            limit: ORDERS_PER_PAGE.toString(),
        });
        if (status && status !== 'all') params.set('status', status);
        if (search) params.set('search', search);

        try {
            const response = await fetch(`${API_BASE}/api/seller/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();

            if (data.success) {
                const snapshot = getOrdersSnapshot(data.data.orders);
                if (snapshot !== _lastOrderSnapshot || !skipStateUpdate) {
                    _lastOrderSnapshot = snapshot;
                    renderOrders(data.data.orders);
                    updateCounts(data.data.counts);
                    updatePagination(data.data.page, data.data.pages);
                    checkEmptyStates(data.data.orders.length, status, search);
                    lucide.createIcons();
                }
            } else {
                throw new Error(data.error || 'Failed to fetch orders');
            }
        } catch (err) {
            if (!skipStateUpdate) {
                console.error('Error fetching orders:', err);
                showError('Failed to load orders');
            }
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
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: ORDERS_PER_PAGE.toString(),
            });
            if (currentFilter && currentFilter !== 'all') params.set('status', currentFilter);
            if (currentSearch) params.set('search', currentSearch);

            const response = await fetch(`${API_BASE}/api/seller/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });

            if (!response.ok) {
                _isFetching = false;
                return;
            }

            const data = await response.json();
            if (!data.success) {
                _isFetching = false;
                return;
            }

            const snapshot = getOrdersSnapshot(data.data.orders);
            if (snapshot !== _lastOrderSnapshot) {
                _lastOrderSnapshot = snapshot;
                renderOrders(data.data.orders);
                updateCounts(data.data.counts);
                updatePagination(data.data.page, data.data.pages);
                checkEmptyStates(data.data.orders.length, currentFilter, currentSearch);
                lucide.createIcons();
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
                _lastOrderSnapshot = getOrdersSnapshot(
                    Array.from(document.getElementById('orders-list')?.querySelectorAll('.order-row') || []).map(row => ({
                        id: row.querySelector('.order-ref')?.textContent?.replace('#', ''),
                        status: row.querySelector('.badge-status')?.textContent?.toLowerCase(),
                        totalAmount: row.querySelector('.order-amount')?.textContent?.replace('₵', '').trim() || '0'
                    }))
                );
                return;
            }

            await liveFetchOrders();
        }, 4000);
    }

    function stopOrderListLiveSync() {
        if (_pollId) {
            clearInterval(_pollId);
            _pollId = null;
        }
    }

    window.addEventListener('beforeunload', stopOrderListLiveSync);
    const _origPushState = history.pushState;
    history.pushState = function () {
        _origPushState.apply(this, arguments);
        stopOrderListLiveSync();
        setTimeout(startOrderListLiveSync, 0);
    };
    const _origReplaceState = history.replaceState;
    history.replaceState = function () {
        _origReplaceState.apply(this, arguments);
        stopOrderListLiveSync();
        setTimeout(startOrderListLiveSync, 0);
    };

    // Reset snapshot so the first poll always refreshes
    _lastOrderSnapshot = null;

    // ── Fetch orders from backend ────────────────────────────────
    async function fetchOrders(page = 1, status = 'all', search = '') {
        const token = getAuthToken();
        if (!token) {
            showError('Please log in to view orders');
            return;
        }

        const params = new URLSearchParams({
            page: page.toString(),
            limit: ORDERS_PER_PAGE.toString(),
        });
        if (status && status !== 'all') params.set('status', status);
        if (search) params.set('search', search);

        try {
            const response = await fetch(`${API_BASE}/api/seller/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            
            if (data.success) {
                renderOrders(data.data.orders);
                updateCounts(data.data.counts);
                updatePagination(data.data.page, data.data.pages);
                checkEmptyStates(data.data.orders.length, status, search);
                lucide.createIcons();
            } else {
                throw new Error(data.error || 'Failed to fetch orders');
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
            showError('Failed to load orders');
        }
    }

    // ── Render orders ──────────────────────────────────────────
    function renderOrders(orders) {
        const listEl = document.getElementById('orders-list');
        if (!listEl) return;

        listEl.innerHTML = '';
        orders.forEach(order => {
            listEl.appendChild(createOrderRow(order));
        });
    }

    // ── Update tab counts ──────────────────────────────────────
    function updateCounts(counts) {
        orderCounts = { ...orderCounts, ...counts };
        document.getElementById('count-all').textContent = counts.all || 0;
        document.getElementById('count-pending').textContent = counts.pending || 0;
        document.getElementById('count-shipped').textContent = counts.shipped || 0;
        document.getElementById('count-delivered').textContent = counts.delivered || 0;
        document.getElementById('count-cancelled').textContent = counts.cancelled || 0;
    }

    // ── Update pagination ──────────────────────────────────────
    function updatePagination(page, pages) {
        currentPage = page;
        totalPages = pages;

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pagesEl = document.getElementById('page-buttons');

        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= pages;

        if (pagesEl) {
            pagesEl.innerHTML = '';
            // Show max 5 page buttons
            const startPage = Math.max(1, page - 2);
            const endPage = Math.min(pages, startPage + 4);
            
            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('button');
                btn.className = `page-btn ${i === page ? 'active' : ''}`;
                btn.textContent = i;
                btn.dataset.page = i.toString();
                pagesEl.appendChild(btn);
            }
        }
    }

    // ── Check empty states ────────────────────────────────────
    function checkEmptyStates(orderCount, filter, search) {
        const noOrders = document.getElementById('no-orders');
        const noResults = document.getElementById('no-results');
        const ordersCard = document.querySelector('.orders-card');

        const hasNoOrders = orderCount === 0;
        const isAllFilter = filter === 'all' && !search;

        noOrders?.classList.add('hidden');
        noResults?.classList.add('hidden');

        if (hasNoOrders) {
            if (isAllFilter) {
                noOrders?.classList.remove('hidden');
            } else {
                noResults?.classList.remove('hidden');
            }
            ordersCard?.classList.add('hidden');
        } else {
            ordersCard?.classList.remove('hidden');
        }
    }

    // ── Show error ────────────────────────────────────────────
    function showError(message) {
        const listEl = document.getElementById('orders-list');
        if (listEl) {
            listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-circle"></i></div><h3>Error</h3><p>${message}</p></div>`;
            lucide.createIcons();
        }
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        // Filter tabs
        const tabs = document.querySelectorAll('.filter-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                currentPage = 1;
                _lastOrderSnapshot = null;
                fetchOrders(currentPage, currentFilter, currentSearch);
            });
        });

        // Search
        const searchDesktop = document.getElementById('order-search');
        const searchMobile = document.getElementById('order-search-mobile');

        function handleSearch(value) {
            currentSearch = value.trim();
            currentPage = 1;
            _lastOrderSnapshot = null;
            fetchOrders(currentPage, currentFilter, currentSearch);
        }

        searchDesktop?.addEventListener('input', (e) => {
            handleSearch(e.target.value);
            if (searchMobile) searchMobile.value = e.target.value;
        });

        searchMobile?.addEventListener('input', (e) => {
            handleSearch(e.target.value);
            if (searchDesktop) searchDesktop.value = e.target.value;
        });

        // Pagination
        document.getElementById('page-buttons')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.classList.contains('active')) return;
            currentPage = parseInt(btn.dataset.page);
            _lastOrderSnapshot = null;
            fetchOrders(currentPage, currentFilter, currentSearch);
        });

        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                _lastOrderSnapshot = null;
                fetchOrders(currentPage, currentFilter, currentSearch);
            }
        });

        document.getElementById('next-page')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                _lastOrderSnapshot = null;
                fetchOrders(currentPage, currentFilter, currentSearch);
            }
        });

        // Initial load
        fetchOrders();
        startOrderListLiveSync();

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                _isFetching = false;
                stopOrderListLiveSync();
                _lastOrderSnapshot = null;
                fetchOrders(currentPage, currentFilter, currentSearch).then(() => startOrderListLiveSync());
            }
        });

        window.addEventListener('online', () => {
            _isFetching = false;
            stopOrderListLiveSync();
            _lastOrderSnapshot = null;
            fetchOrders(currentPage, currentFilter, currentSearch).then(() => startOrderListLiveSync());
        });
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();