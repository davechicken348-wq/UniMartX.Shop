/* ═══════════════════════════════════════════
   ADMIN ORDER DETAILS — With live updates
   ═══════════════════════════════════════════ */

(function () {
    'use strict';

    const API = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    let _isFetching = false;
    let _currentOrder = null;
    let _currentRefund = null;

    function getAuthToken() {
        const raw = localStorage.getItem('authData');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed.expiry && Date.now() > parsed.expiry) {
                    localStorage.removeItem('authData');
                    return null;
                }
                const data = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (data.token) return data.token;
            } catch {}
        }
        return localStorage.getItem('authToken');
    }

    function getOrderId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || urlParams.get('order');
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(str).replace(/[&<>"']/g, c => map[c] || c);
    }

    function formatCurrency(amount, currency = '₵') {
        return `${currency} ${parseFloat(amount).toFixed(2)}`;
    }

    function formatDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(d) {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
               ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    function toast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const el = document.createElement('div');
        const icons = { success: 'check-circle', danger: 'x-circle', error: 'alert-circle', info: 'info' };
        el.className = `toast toast--${type}`;
        el.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${esc(msg)}</span>`;
        container.appendChild(el);
        if (window.lucide) lucide.createIcons({ nodes: [el] });
        setTimeout(() => {
            el.classList.add('toast-out');
            el.addEventListener('animationend', () => el.remove());
        }, 3200);
    }

    function showError(message) {
        document.getElementById('loading-state')?.classList.add('hidden');
        document.getElementById('order-content')?.classList.add('hidden');
        const errorState = document.getElementById('error-state');
        if (errorState) errorState.classList.remove('hidden');
        const errorMsg = document.getElementById('error-message');
        if (errorMsg) errorMsg.textContent = message;
    }

    function getStatusLabel(status) {
        const labels = {
            pending: 'Pending',
            processing: 'Processing',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
            refund_requested: 'Refund Requested',
            seller_approved: 'Seller Approved',
            seller_denied: 'Seller Denied',
            disputed: 'Disputed',
            refunded: 'Refunded',
            refund_denied: 'Refund Denied',
        };
        return labels[status] || status || '—';
    }

    function getStatusBadgeClass(status) {
        if (!status) return 'badge-status--pending';
        const map = {
            pending: 'badge-status--pending',
            processing: 'badge-status--info',
            shipped: 'badge-status--info',
            delivered: 'badge-status--success',
            cancelled: 'badge-status--danger',
            refund_requested: 'badge-status--warning',
            seller_approved: 'badge-status--info',
            seller_denied: 'badge-status--danger',
            disputed: 'badge-status--warning',
            refunded: 'badge-status--success',
            refund_denied: 'badge-status--danger',
        };
        return map[status] || 'badge-status--pending';
    }

    function renderOrder(order) {
        _currentOrder = order;
        document.getElementById('topnav-order-ref').textContent = order.orderNumber;
        document.getElementById('header-order-ref').textContent = '#' + order.orderNumber;
        document.getElementById('header-order-date').textContent = formatDate(order.createdAt);
        document.getElementById('header-order-time').textContent = formatDateTime(order.createdAt);
        document.getElementById('header-payment-method').textContent = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'MTN MoMo';
        document.getElementById('header-payment-amount').innerHTML = `<i data-lucide="check-circle" class="header-icon"></i> ${formatCurrency(order.totalAmount)}`;

        const statusSelect = document.getElementById('status-select');
        if (statusSelect) statusSelect.value = order.status;

        const statusBadge = document.getElementById('order-status-badge');
        if (statusBadge) {
            statusBadge.textContent = getStatusLabel(order.status);
            statusBadge.className = `badge-status ${getStatusBadgeClass(order.status)} order-status-badge`;
        }

        const itemsList = document.getElementById('order-items-list');
        const itemsCount = document.getElementById('items-count');
        if (itemsList && order.items) {
            itemsList.innerHTML = order.items.map(item => {
                const img = item.product?.image || '';
                const bg = img ? `background-image:url('${img}');background-size:cover;background-position:center` : '';
                return `
                <div class="order-item-row">
                    <div class="order-item-img ${img ? '' : 'shimmer'}" style="${bg}"></div>
                    <div class="order-item-info">
                        <p class="order-item-name">${item.product.name}</p>
                        <p class="order-item-meta">Qty: ${item.quantity}</p>
                    </div>
                    <div class="order-item-price">${formatCurrency(parseFloat(item.price.toString()) * item.quantity)}</div>
                </div>`;
            }).join('');
        }
        if (itemsCount) itemsCount.textContent = `${order.items?.length || 0} items`;

        const summaryEl = document.getElementById('order-summary');
        if (summaryEl) {
            const items = order.items || [];
            const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price.toString()) * item.quantity, 0);
            summaryEl.innerHTML = `
                <div class="summary-line"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
                <div class="summary-line summary-line--total"><span>Total</span><strong>${formatCurrency(order.totalAmount)}</strong></div>
            `;
        }

        const buyerInfo = document.getElementById('buyer-info');
        if (buyerInfo && order.buyer) {
            buyerInfo.innerHTML = `
                <div class="info-row"><i data-lucide="user"></i><div><p class="info-label">Name</p><p class="info-val">${esc(order.buyer.firstName || '')} ${esc(order.buyer.lastName || '')}</p></div></div>
                <div class="info-row"><i data-lucide="mail"></i><div><p class="info-label">Email</p><p class="info-val">${esc(order.buyer.email || '—')}</p></div></div>
                <div class="info-row"><i data-lucide="phone"></i><div><p class="info-label">Phone</p><p class="info-val">${esc(order.buyer.phone || '—')}</p></div></div>
            `;
        }

        const sellerInfo = document.getElementById('seller-info');
        if (sellerInfo && order.seller) {
            sellerInfo.innerHTML = `
                <div class="info-row"><i data-lucide="store"></i><div><p class="info-label">Store</p><p class="info-val">${esc(order.seller.storeName || order.seller.user?.firstName || '—')}</p></div></div>
                <div class="info-row"><i data-lucide="mail"></i><div><p class="info-label">Email</p><p class="info-val">${esc(order.seller.user?.email || '—')}</p></div></div>
            `;
        }

        const platformRevenue = document.getElementById('platform-revenue');
        if (platformRevenue && order.items) {
            const items = order.items || [];
            const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price.toString()) * item.quantity, 0);
            const totalPayout = parseFloat(order.totalAmount.toString());

            let statusNote = '';
            if (order.status === 'cancelled') {
                statusNote = '<p style="font-size:0.82rem;color:var(--text-3);margin-top:0.5rem;">Order cancelled — funds not released to seller.</p>';
            } else if (['refunded', 'refund_denied'].includes(order.status)) {
                statusNote = '<p style="font-size:0.82rem;color:var(--text-3);margin-top:0.5rem;">Refund resolved — see arbitration above.</p>';
            } else if (['refund_requested', 'seller_approved', 'seller_denied', 'disputed'].includes(order.status)) {
                statusNote = '<p style="font-size:0.82rem;color:var(--text-3);margin-top:0.5rem;">Refund in progress — payout on hold.</p>';
            }

            platformRevenue.innerHTML = `
                <div class="payout-row"><span>Order amount</span><strong>${formatCurrency(order.totalAmount)}</strong></div>
                <div class="payout-row payout-row--total"><span>Seller payout</span><strong>${formatCurrency(totalPayout)}</strong></div>
                ${statusNote}
            `;
        }

        renderTimeline(order);
        if (window.lucide) lucide.createIcons();
    }

    function renderTimeline(order) {
        const timeline = document.getElementById('order-timeline');
        if (!timeline) return;

        const steps = [
            { label: 'Order Placed', date: order.createdAt, icon: 'package', done: true },
            { label: 'Payment Confirmed', date: order.paymentDetails?.confirmedAt || order.createdAt, icon: 'check-circle', done: true },
        ];

        const status = order.status || 'pending';
        const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
        const idx = statusOrder.indexOf(status);

        if (idx >= 0) {
            steps.push({ label: 'Processing', date: idx >= 1 ? order.updatedAt : null, icon: 'loader', done: idx >= 1 });
            steps.push({ label: 'Shipped', date: idx >= 2 ? order.updatedAt : null, icon: 'truck', done: idx >= 2 });
            steps.push({ label: 'Delivered', date: idx >= 3 ? order.updatedAt : null, icon: 'home', done: idx >= 3 });
        }

        if (status === 'cancelled') {
            steps.push({ label: 'Cancelled', date: order.updatedAt, icon: 'x-circle', done: true, danger: true });
        } else if (['refunded', 'refund_denied'].includes(status)) {
            steps.push({ label: status === 'refunded' ? 'Refunded' : 'Refund Denied', date: order.updatedAt, icon: 'rotate-ccw', done: true, danger: status === 'refund_denied' });
        } else if (['refund_requested', 'seller_approved', 'seller_denied', 'disputed'].includes(status)) {
            steps.push({ label: 'Refund Initiated', date: order.updatedAt, icon: 'alert-circle', done: true, warning: true });
        }

        timeline.innerHTML = steps.map(step => `
            <div class="timeline-item ${step.done ? 'timeline-item--done' : ''} ${step.danger ? 'timeline-item--danger' : ''} ${step.warning ? 'timeline-item--warning' : ''}">
                <div class="timeline-icon">
                    <i data-lucide="${step.icon}"></i>
                </div>
                <div class="timeline-body">
                    <p class="timeline-label">${step.label}</p>
                    ${step.date ? `<p class="timeline-date">${formatDateTime(step.date)}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    async function fetchRefundDetails() {
        const orderId = getOrderId();
        if (!orderId) return null;
        const token = getAuthToken();
        if (!token) return null;
        try {
            const res = await fetch(`${API}/api/refunds/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) return null;
            const json = await res.json();
            if (json.success) return json.data;
        } catch (err) {
            console.error('[Admin] Failed to fetch refund:', err);
        }
        return null;
    }

    function renderRefundCard(refund) {
        const card = document.getElementById('admin-refund-card');
        const info = document.getElementById('admin-refund-info');
        if (!card || !refund) {
            if (card) card.classList.add('hidden');
            return;
        }
        card.classList.remove('hidden');
        if (info) {
            info.innerHTML = `
                <div class="info-row"><i data-lucide="alert-circle"></i><div><p class="info-label">Reason</p><p class="info-val">${esc(refund.reason)}</p></div></div>
                ${refund.message ? `<div class="info-row"><i data-lucide="file-text"></i><div><p class="info-label">Details</p><p class="info-val">${esc(refund.message)}</p></div></div>` : ''}
                <div class="info-row"><i data-lucide="clock"></i><div><p class="info-label">Requested</p><p class="info-val">${formatDateTime(refund.createdAt)}</p></div></div>
                ${refund.sellerResponse ? `<div class="info-row"><i data-lucide="message-circle"></i><div><p class="info-label">Seller Response</p><p class="info-val">${esc(refund.sellerResponse)}</p></div></div>` : ''}
            `;
        }
        const canArbitrate = ['disputed', 'refund_requested', 'seller_denied', 'seller_approved'].includes(refund.status);
        const approveBtn = document.getElementById('approve-refund-btn');
        const denyBtn = document.getElementById('deny-refund-btn');
        if (canArbitrate) {
            if (approveBtn) approveBtn.disabled = false;
            if (denyBtn) denyBtn.disabled = false;
        } else {
            if (approveBtn) approveBtn.disabled = true;
            if (denyBtn) denyBtn.disabled = true;
        }
        if (window.lucide) lucide.createIcons();
    }

    async function arbitrateRefund(decision) {
        const orderId = getOrderId();
        if (!orderId) return;
        const token = getAuthToken();
        if (!token) return;
        const note = document.getElementById('admin-refund-note')?.value?.trim() || '';
        if (decision === 'deny' && !note) {
            toast('Please provide a reason for denying.', 'danger');
            return;
        }
        if (!confirm(`Are you sure you want to ${decision} this refund?`)) return;
        const approveBtn = document.getElementById('approve-refund-btn');
        const denyBtn = document.getElementById('deny-refund-btn');
        [approveBtn, denyBtn].forEach(b => { if (b) { b.disabled = true; b.textContent = 'Processing…'; } });

        try {
            const res = await fetch(`${API}/api/refunds/orders/${orderId}/refund/arbitrate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, adminNote: note }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
            toast(json.message || `Refund ${decision === 'approve' ? 'approved' : 'denied'}.`, 'success');
            fetchOrder(true);
            window.dispatchEvent(new Event('admin:badgesChanged'));
        } catch (err) {
            toast(err.message || 'Failed.', 'danger');
        } finally {
            [approveBtn, denyBtn].forEach(b => { if (b) { b.disabled = false; b.textContent = decision === 'approve' ? 'Approve Refund' : 'Deny Refund'; } });
        }
    }

    async function updateOrderStatus(newStatus) {
        const orderId = getOrderId();
        if (!orderId) return;
        const token = getAuthToken();
        if (!token) return;
        const updateBtn = document.getElementById('update-status-btn');
        if (updateBtn) {
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<i data-lucide="loader"></i> Updating…';
            if (window.lucide) lucide.createIcons();
        }
        try {
            const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                toast('Order status updated', 'success');
                fetchOrder(true);
                window.dispatchEvent(new Event('admin:badgesChanged'));
            } else {
                toast(data.error || 'Failed', 'danger');
                if (updateBtn) {
                    updateBtn.disabled = false;
                    updateBtn.innerHTML = '<i data-lucide="check"></i> Update';
                    if (window.lucide) lucide.createIcons();
                }
            }
        } catch (err) {
            toast(err.message || 'Failed', 'danger');
            if (updateBtn) {
                updateBtn.disabled = false;
                updateBtn.innerHTML = '<i data-lucide="check"></i> Update';
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    async function fetchOrder(skipLoading = false) {
        if (_isFetching) return;
        _isFetching = true;
        const orderId = getOrderId();
        if (!orderId) {
            if (!skipLoading) showError('No order ID provided');
            _isFetching = false;
            return;
        }
        const token = getAuthToken();
        if (!token) {
            if (!skipLoading) showError('Please log in');
            _isFetching = false;
            return;
        }
        try {
            const response = await fetch(`${API}/api/admin/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store',
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(json.error || `Request failed (${response.status})`);
            if (json.success) {
                if (!skipLoading) {
                    document.getElementById('loading-state')?.classList.add('hidden');
                    document.getElementById('order-content')?.classList.remove('hidden');
                }
                renderOrder(json.data);
                _currentOrder = json.data;
                const refund = await fetchRefundDetails();
                _currentRefund = refund;
                if (refund) renderRefundCard(refund);
                else {
                    const card = document.getElementById('admin-refund-card');
                    if (card) card.classList.add('hidden');
                }
                if (window.lucide) lucide.createIcons();
            } else {
                throw new Error(json.error || 'Failed');
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            if (!skipLoading) showError(err.message || 'Failed to load order details');
        }
        _isFetching = false;
    }

    // ── Live sync via shared polling utility ──
    function startLiveSync() {
        if (typeof window.__createLiveSync === 'function') {
            window.__createLiveSync({
                interval: 5000,
                fetchFn: fetchOrder,
                onUpdate: function () {
                    const refund = _currentOrder ? fetchRefundDetails() : null;
                    if (refund) renderRefundCard(refund);
                    else {
                        const card = document.getElementById('admin-refund-card');
                        if (card) card.classList.add('hidden');
                    }
                },
                getSnapshot: function () {
                    if (!_currentOrder) return '__null__';
                    return _currentOrder.status + ':' + (_currentOrder.updatedAt || '');
                }
            }).start();
        }
    }

    function init() {
        const orderId = getOrderId();
        if (!orderId) { showError('No order ID provided'); return; }
        fetchOrder();

        document.getElementById('update-status-btn')?.addEventListener('click', () => {
            const statusSelect = document.getElementById('status-select');
            if (statusSelect) updateOrderStatus(statusSelect.value);
        });

        document.getElementById('admin-cancel-btn')?.addEventListener('click', () => {
            if (!confirm('Are you sure you want to cancel this order? This will notify the buyer and seller.')) return;
            updateOrderStatus('cancelled');
        });

        document.getElementById('admin-contact-buyer-btn')?.addEventListener('click', () => {
            const buyer = _currentOrder?.buyer;
            if (buyer?.email) {
                window.location.href = `mailto:${buyer.email}?subject=Regarding order #${_currentOrder.orderNumber}`;
            } else {
                toast('Buyer email not available', 'danger');
            }
        });

        document.getElementById('admin-contact-seller-btn')?.addEventListener('click', () => {
            const seller = _currentOrder?.seller;
            const email = seller?.user?.email;
            if (email) {
                window.location.href = `mailto:${email}?subject=Regarding order #${_currentOrder.orderNumber}`;
            } else {
                toast('Seller email not available', 'danger');
            }
        });

        document.getElementById('admin-hold-btn')?.addEventListener('click', () => {
            toast('Hold feature coming soon', 'info');
        });

        document.getElementById('approve-refund-btn')?.addEventListener('click', () => arbitrateRefund('approve'));
        document.getElementById('deny-refund-btn')?.addEventListener('click', () => arbitrateRefund('deny'));

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                fetchOrder(true);
            }
        });

        window.addEventListener('focus', () => {
            fetchOrder(true);
        });

        window.addEventListener('admin:badgesChanged', () => {
            fetchOrder(true);
        });

        window.addEventListener('online', () => {
            fetchOrder(true);
        });

        startLiveSync();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
