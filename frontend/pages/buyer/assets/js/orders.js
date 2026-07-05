// ═══════════════════════════════════════════
//    BUYER ORDERS JS - No polling
// ═══════════════════════════════════════════

(function() {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
    const ORDERS_PER_PAGE = 15;

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

    // ── DOM refs ─────────────────────────────────
    const filterTabs = document.querySelectorAll('.filter-tab');
    const ordersList = document.getElementById('orders-list');
    const noResults = document.getElementById('no-results');
    const noOrders = document.getElementById('no-orders');
    const paginationContainer = document.getElementById('pagination-container');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageButtons = document.getElementById('page-buttons');
    const countAll = document.getElementById('count-all');
    const countPending = document.getElementById('count-pending');
    const countConfirmed = document.getElementById('count-confirmed');
    const countShipped = document.getElementById('count-shipped');
    const countDelivered = document.getElementById('count-delivered');
    const countCancelled = document.getElementById('count-cancelled');
    const searchInput = document.getElementById('order-search');
    const searchMobile = document.getElementById('order-search-mobile');

    // ── State ────────────────────────────────────
    let currentFilter = 'all';
    let currentPage = 1;
    let totalPages = 1;
    let currentSearch = '';
    let _isFetching = false;
    let _lastSnapshot = null;

    const BACKEND_STATUS_MAP = {
        all: '',
        pending: 'pending',
        confirmed: 'processing',
        shipped: 'shipped',
        delivered: 'delivered',
        cancelled: 'cancelled',
    };

    // ── Helpers ──────────────────────────────────
    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c] || c));
    }

    function formatCurrency(amount) {
        return `GH₵ ${parseFloat(amount).toFixed(2)}`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function getStatusClass(status) {
        const map = {
            pending: 'badge-status--pending',
            processing: 'badge-status--processing',
            shipped: 'badge-status--shipped',
            delivered: 'badge-status--delivered',
            cancelled: 'badge-status--cancelled',
        };
        return map[status] || 'badge-status--pending';
    }

    function getStatusLabel(status) {
        const map = {
            pending: 'Pending',
            processing: 'Processing',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
        };
        return map[status] || status;
    }

    function makeSnapshot(orders, total) {
        return JSON.stringify({
            count: orders.length,
            ids: orders.map(o => o.id).join(','),
            total,
        });
    }

    // ── API ──────────────────────────────────────
    async function fetchOrders(page, status, search) {
        if (_isFetching) return;
        _isFetching = true;

        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(ORDERS_PER_PAGE));
        const backendStatus = BACKEND_STATUS_MAP[status] || '';
        if (backendStatus) params.set('status', backendStatus);
        if (search) params.set('search', search);

        try {
            const res = await fetch(`${API_BASE}/api/buyer/orders?${params}`, {
                headers: authHeaders(),
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || data.error || 'Failed to load orders');
            }

            return data.data;
        } catch (err) {
            console.error('Fetch orders error:', err);
            return null;
        } finally {
            _isFetching = false;
        }
    }

    // ── Render ───────────────────────────────────
    function renderOrderCard(order) {
        const items = order.items || [];
        const itemThumbs = items.slice(0, 3).map(item => {
            const img = item.product?.image || '';
            const bg = img ? `background-image:url('${img}');background-size:cover;background-position:center` : '';
            const shimmer = img ? '' : ' shimmer';
            return `<div class="order-thumb${shimmer}" style="${bg}"></div>`;
        }).join('');

        const itemNames = items.map(i => i.product?.name || 'Unknown Product').join(', ');
        const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

        return `
            <div class="order-card" data-order-id="${order.id}" data-status="${order.status}">
                <div class="order-card-header">
                    <div class="order-card-ref">
                        <span class="ref-num">#${esc(order.orderNumber)}</span>
                        <span class="ref-date">${formatDate(order.createdAt)}</span>
                    </div>
                    <span class="badge-status ${getStatusClass(order.status)}">${getStatusLabel(order.status)}</span>
                </div>
                <div class="order-card-items">
                    ${itemThumbs}
                    <div class="order-items-info">
                        <p class="order-items-names">${esc(itemNames)}</p>
                        <p class="order-items-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="order-card-footer">
                    <div class="order-total">
                        <span>Total</span>
                        <strong>${formatCurrency(order.totalAmount)}</strong>
                    </div>
                    <div class="order-card-actions">
                        <a href="order-details.html?id=${order.id}" class="btn btn-primary">
                            <i data-lucide="eye"></i> View Details
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    function renderOrders(orders, total = 0) {
        if (!ordersList) return;

        if (!orders || orders.length === 0) {
            ordersList.innerHTML = '';
            if (total > 0) {
                if (noResults) noResults.classList.remove('hidden');
                if (noOrders) noOrders.classList.add('hidden');
            } else {
                if (noOrders) noOrders.classList.remove('hidden');
                if (noResults) noResults.classList.add('hidden');
            }
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        if (noOrders) noOrders.classList.add('hidden');
        if (noResults) noResults.classList.add('hidden');

        ordersList.innerHTML = orders.map(renderOrderCard).join('');
        lucide.createIcons();
    }

    function renderPagination(page, pages) {
        if (!paginationContainer) return;

        totalPages = pages;
        currentPage = page;

        if (pages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        if (prevPageBtn) prevPageBtn.disabled = page <= 1;
        if (nextPageBtn) nextPageBtn.disabled = page >= pages;

        if (pageButtons) {
            let html = '';
            for (let i = 1; i <= pages; i++) {
                html += `<button class="page-btn${i === page ? ' active' : ''}" data-page="${i}">${i}</button>`;
            }
            pageButtons.innerHTML = html;
        }
    }

    function updateCounts(counts) {
        if (!counts) return;
        if (countAll) countAll.textContent = counts.all ?? 0;
        if (countPending) countPending.textContent = counts.pending ?? 0;
        if (countConfirmed) countConfirmed.textContent = counts.processing ?? 0;
        if (countShipped) countShipped.textContent = counts.shipped ?? 0;
        if (countDelivered) countDelivered.textContent = counts.delivered ?? 0;
        if (countCancelled) countCancelled.textContent = counts.cancelled ?? 0;
    }

    // ── Load ─────────────────────────────────────
    async function loadOrders(page = 1, skipLoading = false) {
        const data = await fetchOrders(page, currentFilter, currentSearch);
        if (!data) {
            if (!skipLoading) {
                ordersList.innerHTML = '';
                if (noOrders) noOrders.classList.add('hidden');
                if (noResults) noResults.classList.remove('hidden');
            }
            return;
        }

        const { orders, total, pages, page: currentPageData, counts } = data;

        updateCounts(counts);
        renderOrders(orders, total);
        renderPagination(currentPageData, pages);

        const snapshot = makeSnapshot(orders, total);
        if (!skipLoading || snapshot !== _lastSnapshot) {
            _lastSnapshot = snapshot;
        }
    }

    function switchFilter(filter) {
        currentFilter = filter;
        currentPage = 1;

        filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        if (noResults) noResults.classList.add('hidden');
        loadOrders(1);
    }

    // ── Debounce helper ──────────────────────────
    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const debouncedSearch = debounce((value) => {
        currentSearch = value.trim();
        currentPage = 1;
        loadOrders(1);
    }, 400);

    // ── Event listeners ──────────────────────────
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchFilter(tab.dataset.filter);
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    if (searchMobile) {
        searchMobile.addEventListener('input', (e) => {
            if (searchInput) searchInput.value = e.target.value;
            debouncedSearch(e.target.value);
        });
    }

    if (pageButtons) {
        pageButtons.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.disabled) return;
            const page = parseInt(btn.dataset.page, 10);
            if (page !== currentPage) {
                loadOrders(page);
                ordersList?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                loadOrders(currentPage - 1);
                ordersList?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                loadOrders(currentPage + 1);
                ordersList?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // ── Init ─────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const token = getAuthToken();
        if (!token) {
            window.location.href = '../../auth/login.html';
            return;
        }
        loadOrders(1);
        startOrdersLiveSync();

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                _isFetching = false;
                stopOrdersLiveSync();
                _lastSnapshot = null;
                loadOrders(currentPage).then(() => startOrdersLiveSync());
            }
        });

        window.addEventListener('online', () => {
            _isFetching = false;
            stopOrdersLiveSync();
            loadOrders(currentPage).then(() => startOrdersLiveSync());
        });
    });

    window.addEventListener('focus', () => {
        loadOrders(currentPage, true);
    });

    // ── Live sync ─────────────────────────────────
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
            if (currentFilter && currentFilter !== 'all') params.set('status', BACKEND_STATUS_MAP[currentFilter] || '');
            if (currentSearch) params.set('search', currentSearch);

            const response = await fetch(`${API_BASE}/api/buyer/orders?${params}`, {
                headers: authHeaders(),
                credentials: 'include',
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

            const snapshot = makeSnapshot(data.data.orders, data.data.total);
            if (snapshot !== _lastSnapshot) {
                _lastSnapshot = snapshot;
                renderOrders(data.data.orders, data.data.total);
                updatePagination(data.data.page, data.data.pages);
                updateCounts(data.data.counts);
                checkEmptyStates(data.data.orders.length, currentFilter, currentSearch);
                lucide.createIcons();
            }
        } catch {}

        _isFetching = false;
    }

    function startOrdersLiveSync() {
        let initialized = false;
        _pollId = setInterval(async () => {
            const token = getAuthToken();
            if (!token || _isFetching) return;
            if (!initialized) {
                initialized = true;
                await liveFetchOrders();
                return;
            }
            await liveFetchOrders();
        }, 30000);
    }

    function stopOrdersLiveSync() {
        if (_pollId) {
            clearInterval(_pollId);
            _pollId = null;
        }
    }

    window.addEventListener('beforeunload', stopOrdersLiveSync);
    const _origOrdersPushState = history.pushState;
    history.pushState = function () {
        _origOrdersPushState.apply(this, arguments);
        stopOrdersLiveSync();
        setTimeout(startOrdersLiveSync, 0);
    };
    const _origOrdersReplaceState = history.replaceState;
    history.replaceState = function () {
        _origOrdersReplaceState.apply(this, arguments);
        stopOrdersLiveSync();
        setTimeout(startOrdersLiveSync, 0);
    };
})();
