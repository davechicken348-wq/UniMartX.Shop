// ═══════════════════════════════════════════════
//    BUYER ORDER DETAILS JS - Dynamic Data
// ═══════════════════════════════════════════════

(function() {
    const API = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

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

    let _isFetching = false;
    let _currentOrder = null;
    let _currentRefund = null;
    let _pollId = null;
    let _lastStatus = null;
    let _lastRefundStatus = null;
    let _liveSyncHandle = null;

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c] || c));
    }

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

    function getOrderId() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) return id;
        const orderParam = urlParams.get('order');
        if (orderParam) return orderParam;
        return null;
    }

    function formatCurrency(amount, currency = '₵') {
        return `${currency} ${parseFloat(amount).toFixed(2)}`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
               ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    function updateStatusBadge(status) {
        const badge = document.getElementById('order-status-badge');
        if (!badge) return;
        badge.className = 'badge-status ' + (statusClasses[status] || 'badge-status--pending');
        badge.textContent = statusLabels[status] || status;
    }

    const refundLabels = { refund_requested: 'Pending', seller_approved: 'Approved', seller_denied: 'Denied', disputed: 'Disputed', refunded: 'Refunded', denied: 'Refund Denied' };

    function updateRefundStatusBadge(status) {
        const badge = document.getElementById('refund-status');
        if (!badge) return;
        badge.textContent = refundLabels[status] || status;
        const cls = status === 'refund_requested' ? 'badge-status--pending'
            : (status === 'refunded') ? 'badge-status--delivered'
            : (status === 'seller_approved') ? 'badge-status--approved'
            : (status === 'seller_denied' || status === 'denied') ? 'badge-status--cancelled'
            : (status === 'disputed') ? 'badge-status--pending'
            : 'badge-status--pending';
        badge.className = 'badge-status ' + cls;
    }

    function updateRefundStatusText(status) {
        const badge = document.getElementById('refund-status-badge');
        if (!badge) return;
        const labels = {
            refund_requested: 'Pending Seller Review',
            seller_approved: 'Approved by Seller',
            seller_denied: 'Denied by Seller',
            disputed: 'Under Admin Review',
            refunded: 'Refund Complete',
            denied: 'Refund Denied',
        };
        badge.textContent = labels[status] || status;
    }

    let _refundFormToggled = false;

    function updateRefundUi(orderStatus) {
        const refundStatus = _currentRefund?.status;
        const hasRefund = !!refundStatus;

        const refundBtn = document.getElementById('refund-btn');
        const formCard = document.getElementById('refund-card');
        const statusCard = document.getElementById('refund-status-card');
        const confirmBtn = document.getElementById('confirm-receipt-btn');
        const disputeBtn = document.getElementById('refund-dispute-btn');

        const canRequestRefund = ['delivered'].includes(orderStatus) && !hasRefund;
        const showRefundFlow = canRequestRefund || hasRefund;

        if (!showRefundFlow) {
            if (refundBtn) refundBtn.style.display = 'none';
            if (formCard) formCard.classList.add('hidden');
            if (statusCard) statusCard.classList.add('hidden');
            if (confirmBtn) confirmBtn.style.display = 'none';
            if (disputeBtn) disputeBtn.style.display = 'none';
            return;
        }

        if (!hasRefund) {
            if (refundBtn) refundBtn.style.display = '';
            if (formCard && !formCard.classList.contains('hidden')) {
                // Keep form open if user already opened it
            } else if (formCard) {
                formCard.classList.add('hidden');
            }
            if (statusCard) statusCard.classList.add('hidden');
            if (confirmBtn) confirmBtn.style.display = 'none';
            if (disputeBtn) disputeBtn.style.display = 'none';
            return;
        }

        if (refundBtn) refundBtn.style.display = 'none';
        if (formCard) formCard.classList.add('hidden');
        if (statusCard) statusCard.classList.remove('hidden');
        updateRefundStatusBadge(refundStatus);
        updateRefundStatusText(refundStatus);

        if (refundStatus === 'seller_approved') {
            if (confirmBtn) confirmBtn.style.display = '';
            if (disputeBtn) disputeBtn.style.display = '';
        } else if (refundStatus === 'seller_denied') {
            if (confirmBtn) confirmBtn.style.display = 'none';
            if (disputeBtn) disputeBtn.style.display = '';
        } else {
            if (confirmBtn) confirmBtn.style.display = 'none';
            if (disputeBtn) disputeBtn.style.display = 'none';
        }
    }

    const refundStatusMessages = {
        refund_requested: 'Your refund request is pending review by the seller.',
        seller_approved: 'The seller has approved your refund request.',
        seller_denied: 'The seller has denied your refund request.',
        disputed: 'Your refund dispute is under admin review.',
        refunded: 'Your refund has been completed.',
        denied: 'Your refund request has been denied.',
    };

    function renderBuyerRefundDetails(refund) {
        if (!refund) return;
        const msgEl = document.getElementById('refund-status-msg');
        const detailsEl = document.getElementById('refund-details');
        if (msgEl) msgEl.textContent = refundStatusMessages[refund.status] || 'Refund request submitted.';
        if (detailsEl) {
            detailsEl.innerHTML = `
                ${refund.reason ? `<div class="info-row"><i data-lucide="alert-circle"></i><div><p class="info-label">Reason</p><p class="info-val">${esc(refund.reason)}</p></div></div>` : ''}
                ${refund.message ? `<div class="info-row"><i data-lucide="file-text"></i><div><p class="info-label">Your message</p><p class="info-val">${esc(refund.message)}</p></div></div>` : ''}
                ${refund.evidence && refund.evidence.length ? `<div class="info-row"><i data-lucide="image"></i><div><p class="info-label">Evidence</p><p class="info-val">${refund.evidence.length} image(s) attached</p></div></div>` : ''}
                <div class="info-row"><i data-lucide="clock"></i><div><p class="info-label">Requested</p><p class="info-val">${formatDateTime(refund.createdAt)}</p></div></div>
            `;
        }
        if (window.lucide) lucide.createIcons();
    }

    const statusClasses = {
        pending: 'badge-status--pending',
        processing: 'badge-status--processing',
        shipped: 'badge-status--shipped',
        delivered: 'badge-status--delivered',
        cancelled: 'badge-status--cancelled',
        refund_requested: 'badge-status--pending',
        seller_approved: 'badge-status--approved',
        seller_denied: 'badge-status--cancelled',
        disputed: 'badge-status--pending',
        refunded: 'badge-status--delivered',
        denied: 'badge-status--cancelled',
    };

    const statusLabels = {
        pending: 'Pending',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        refund_requested: 'Refund Requested',
        seller_approved: 'Approved by Seller',
        seller_denied: 'Denied by Seller',
        disputed: 'Disputed',
        refunded: 'Refunded',
        denied: 'Refund Denied',
    };

    function renderTracking(order) {
        const timeline = document.getElementById('order-timeline');
        const deliveryEstimate = document.getElementById('delivery-estimate');
        if (!timeline) return;

        const status = order.status;
        const stepConfig = {
            pending: { label: 'Order Placed', icon: 'package' },
            processing: { label: 'Processing', icon: 'loader' },
            shipped: { label: 'Shipped', icon: 'truck' },
            delivered: { label: 'Delivered', icon: 'check-circle' },
            refunded: { label: 'Refunded', icon: 'rotate-ccw' },
            cancelled: { label: 'Cancelled', icon: 'x-circle' },
        };

        let steps;
        if (status === 'cancelled') {
            steps = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        } else if (['refund_requested', 'seller_approved', 'seller_denied', 'disputed', 'denied', 'refunded'].includes(status)) {
            steps = ['pending', 'processing', 'shipped', 'delivered', 'refunded'];
        } else {
            steps = ['pending', 'processing', 'shipped', 'delivered'];
        }

        const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
        let activeIndex;
        if (status === 'cancelled') {
            activeIndex = steps.length - 1;
        } else if (['refund_requested', 'seller_approved', 'seller_denied', 'disputed', 'denied', 'refunded'].includes(status)) {
            activeIndex = steps.length - 1;
        } else {
            activeIndex = statusOrder.indexOf(status);
        }

        timeline.innerHTML = steps.map((step, i) => {
            const isDone = i < activeIndex;
            const isActive = i === activeIndex && status !== 'delivered';
            const cls = isDone ? 'done' : (isActive ? 'active' : '');
            const cfg = stepConfig[step];
            return `
                <div class="track-step ${cls}">
                    <div class="track-icon"><i data-lucide="${cfg.icon}"></i></div>
                    <div class="track-info">
                        <strong>${cfg.label}</strong>
                        <span>${isDone ? 'Done' : (isActive ? 'Now' : 'Pending')}</span>
                    </div>
                </div>
            `;
        }).join('');

        if (deliveryEstimate) {
            if (status === 'delivered') deliveryEstimate.textContent = 'Delivered';
            else if (status === 'cancelled') deliveryEstimate.textContent = 'Order cancelled';
            else if (['refund_requested', 'disputed', 'refunded'].includes(status)) deliveryEstimate.textContent = 'Refund in process';
            else if (status === 'processing') deliveryEstimate.textContent = 'Being prepared';
            else if (status === 'shipped') deliveryEstimate.textContent = 'On its way';
            else deliveryEstimate.textContent = 'Estimated delivery: Processing';
        }

        if (window.lucide) lucide.createIcons();
    }

    function renderOrder(order) {
        _currentOrder = order;
        const BACKEND_URL = API;

        document.getElementById('order-ref').textContent = '#' + order.orderNumber;
        const refFallback = document.getElementById('order-ref-fallback');
        if (refFallback) refFallback.textContent = order.orderNumber;
        document.getElementById('order-date').textContent = formatDateTime(order.createdAt);
        document.getElementById('order-date-card').textContent = formatDate(order.createdAt);
        document.getElementById('order-payment').textContent = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'MTN MoMo';

        updateStatusBadge(order.status);

        // Items
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

        // Summary
        const summaryEl = document.getElementById('order-summary');
        if (summaryEl) {
            const items = order.items || [];
            const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price.toString()) * item.quantity, 0);
            summaryEl.innerHTML = `
                <div class="summary-line"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
                <div class="summary-line summary-line--total"><span>Total</span><strong>${formatCurrency(order.totalAmount)}</strong></div>
            `;
        }

        // Delivery info
        const deliveryInfo = document.getElementById('delivery-info');
        if (deliveryInfo && order.address) {
            deliveryInfo.innerHTML = `
                <div class="info-row"><i data-lucide="map-pin"></i><div><p class="info-label">Address</p><p class="info-val">${[order.address.street, order.address.city, order.address.state, order.address.country].filter(Boolean).join(', ') || '—'}</p></div></div>
                ${order.seller?.pickupAddress ? `<div class="info-row"><i data-lucide="store"></i><div><p class="info-label">Pickup</p><p class="info-val">${esc(order.seller.pickupAddress)}</p></div></div>` : ''}
            `;
        }

        // Payment info
        const paymentInfo = document.getElementById('payment-info');
        if (paymentInfo) {
            paymentInfo.innerHTML = `
                <div class="info-row"><i data-lucide="credit-card"></i><div><p class="info-label">Method</p><p class="info-val">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'MTN MoMo'}</p></div></div>
                <div class="info-row"><i data-lucide="hash"></i><div><p class="info-label">Order #</p><p class="info-val">${order.orderNumber}</p></div></div>
            `;
        }

        renderTracking(order);
        updateRefundUi(order.status);

        // Contact buttons
        const emailBtn = document.getElementById('contact-email-btn');
        const phoneBtn = document.getElementById('contact-phone-btn');
        if (emailBtn && order.seller?.user?.email) emailBtn.href = `mailto:${order.seller.user.email}`;
        if (phoneBtn && order.seller?.user?.phone) {
            phoneBtn.href = `tel:${order.seller.user.phone}`;
            phoneBtn.style.display = '';
        }
    }

    async function fetchRefundDetails() {
        const orderId = getOrderId();
        if (!orderId) return null;

        const token = getAuthToken();
        if (!token) return null;

        try {
            const res = await fetch(`${API}/api/buyer/orders/${orderId}/refund`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) return null;
            const json = await res.json();
            if (json.success) return json.data;
        } catch (err) {
            console.error('[OrderDetails] Failed to fetch refund:', err);
        }
        return null;
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
            if (!skipLoading) showError('Please log in to view order details');
            _isFetching = false;
            return;
        }

        try {
            const response = await fetch(`${API}/api/buyer/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to fetch order');

            const json = await response.json();
            if (json.success) {
                if (!skipLoading) {
                    document.getElementById('loading-state').classList.add('hidden');
                    document.getElementById('order-content').classList.remove('hidden');
                }
                renderOrder(json.data);
                _lastStatus = json.data.status;

                const refund = await fetchRefundDetails();
                _currentRefund = refund;
                if (refund && refund.status) {
                    updateRefundUi(json.data.status);
                    renderBuyerRefundDetails(refund);
                }

                if (window.lucide) lucide.createIcons();
            } else {
                throw new Error(json.error || 'Failed to fetch order');
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            if (!skipLoading) showError(err.message || 'Failed to load order details');
        }
        _isFetching = false;
    }

    function showError(message) {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('order-content').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
        const errorMsg = document.getElementById('error-message');
        if (errorMsg) errorMsg.textContent = message;
    }

    // Evidence upload handling
    const evidenceInputs = [
        document.getElementById('evidence-0'),
        document.getElementById('evidence-1'),
        document.getElementById('evidence-2'),
    ];
    const evidencePreviews = document.getElementById('evidence-previews');
    const evidenceBtn = document.getElementById('evidence-btn');
    let nextInputIndex = 0;

    function findNextInput() {
        for (let i = 0; i < 3; i++) {
            if (evidenceInputs[i] && evidenceInputs[i].value === '') return evidenceInputs[i];
        }
        return null;
    }

    evidenceBtn?.addEventListener('click', () => {
        const input = findNextInput();
        if (input) input.click();
        else toast('Maximum 3 evidence images allowed', 'info');
    });

    evidenceInputs.forEach((input, idx) => {
        input?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.createElement('div');
                preview.className = 'evidence-preview';
                preview.style.backgroundImage = `url(${ev.target.result})`;
                preview.innerHTML = `<button class="evidence-remove" data-idx="${idx}"><i data-lucide="x"></i></button>`;
                evidencePreviews?.appendChild(preview);
                if (window.lucide) lucide.createIcons();
                preview.querySelector('.evidence-remove')?.addEventListener('click', () => {
                    preview.remove();
                    if (input) { input.value = ''; };
                });
            };
            reader.readAsDataURL(file);
        });
    });

    // Refund form submission
    const refundForm = document.getElementById('refund-form');
    refundForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = getOrderId();
        if (!orderId) return;

        const token = getAuthToken();
        if (!token) {
            toast('Please log in', 'danger');
            return;
        }

        const reason = document.getElementById('refund-reason').value;
        const message = document.getElementById('refund-message').value.trim();

        if (!reason) {
            toast('Please select a reason', 'danger');
            return;
        }

        const submitBtn = refundForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader"></i> Submitting…';
            if (window.lucide) lucide.createIcons();
        }

        try {
            const formData = new FormData();
            formData.append('reason', reason);
            formData.append('message', message);

            if (evidenceInputs[0]?.files?.[0]) formData.append('evidence', evidenceInputs[0].files[0]);
            if (evidenceInputs[1]?.files?.[0]) formData.append('evidence', evidenceInputs[1].files[0]);
            if (evidenceInputs[2]?.files?.[0]) formData.append('evidence', evidenceInputs[2].files[0]);

            const res = await fetch(`${API}/api/buyer/orders/${orderId}/refund`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Failed to request refund');

            toast('Refund request submitted successfully!', 'success');
            if (document.getElementById('refund-card')) document.getElementById('refund-card').classList.add('hidden');
            _refundFormToggled = false;
            updateRefundUi('refund_requested');
            fetchOrder(true);
        } catch (err) {
            toast(err.message || 'Failed to request refund', 'danger');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="send"></i> Submit Request';
                if (window.lucide) lucide.createIcons();
            }
        }
    });

    // Cancel button
    document.getElementById('refund-cancel-btn')?.addEventListener('click', () => {
        fetchOrder(true);
    });

    document.getElementById('refund-btn')?.addEventListener('click', () => {
        const formCard = document.getElementById('refund-card');
        if (formCard) {
            formCard.classList.remove('hidden');
            formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // Confirm receipt
    document.getElementById('confirm-receipt-btn')?.addEventListener('click', async () => {
        const orderId = getOrderId();
        if (!orderId) return;
        const token = getAuthToken();
        if (!token) return;
        if (!confirm('Have you actually received your refund? This cannot be undone.')) return;

        try {
            const res = await fetch(`${API}/api/buyer/orders/${orderId}/refund/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
            toast('Refund receipt confirmed!', 'success');
            fetchOrder(true);
        } catch (err) {
            toast(err.message || 'Failed to confirm', 'danger');
        }
    });

    // Dispute refund
    document.getElementById('refund-dispute-btn')?.addEventListener('click', async () => {
        const orderId = getOrderId();
        if (!orderId) return;
        const reason = prompt('Why are you disputing this refund decision? This will be reviewed by an admin.');
        if (!reason || !reason.trim()) return;

        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch(`${API}/api/buyer/orders/${orderId}/refund/dispute`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
            toast('Dispute submitted. An admin will review both sides.', 'success');
            fetchOrder(true);
        } catch (err) {
            toast(err.message || 'Failed to submit dispute', 'danger');
        }
    });

    function freshFetch() {
        return fetchOrder(true);
    }

    function startLiveSync() {
        if (typeof window.__createLiveSync === 'function') {
            _liveSyncHandle = window.__createLiveSync({
                interval: 5000,
                fetchFn: fetchOrder,
                onUpdate: function() {},
                getSnapshot: function(data) {
                    if (!data) return '__null__';
                    return data.status + ':' + (data.updatedAt || '');
                }
            });
            _liveSyncHandle.start();
        } else {
            if (_pollId) return;
            _pollId = setInterval(() => {
                const orderId = getOrderId();
                if (orderId && !_isFetching) {
                    freshFetch();
                }
            }, 5000);
        }
    }

    function stopLiveSync() {
        if (_liveSyncHandle && typeof _liveSyncHandle.stop === 'function') {
            _liveSyncHandle.stop();
        } else if (_pollId) {
            clearInterval(_pollId);
            _pollId = null;
        }
    }

    // Init — Live updates via polling utility
    function init() {
        const orderId = getOrderId();
        if (!orderId) {
            showError('No order ID provided');
            return;
        }
        fetchOrder();
        startLiveSync();

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                stopLiveSync();
                freshFetch().then(() => startLiveSync());
            }
        });

        window.addEventListener('online', () => {
            stopLiveSync();
            freshFetch().then(() => startLiveSync());
        });

        window.addEventListener('focus', () => fetchOrder(true));
    }

    document.addEventListener('DOMContentLoaded', init);
})();
