// ═══════════════════════════════════════════
//    SELLER ORDER DETAILS JS - Dynamic Data
// ═══════════════════════════════════════════

(function() {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c] || c));
    }

    let _approveFieldsVisible = false;

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

    // ── Get order ID from URL ─────────────────────────────────
    function getOrderId() {
        const param = new URLSearchParams(window.location.search).get('order');
        if (param) return param;
        const alt = new URLSearchParams(window.location.search).get('id');
        if (alt) return alt;

        if (typeof _isScaffold === 'function' && _isScaffold()) return null;

        const ref = document.querySelector('.order-header-ref');
        if (ref) {
            const text = ref.textContent.trim();
            if (text.startsWith('#')) return text.slice(1).trim();
        }
        return null;
    }

    // ── Format helpers ───────────────────────────────────────
    function formatCurrency(amount, currency = '₵') {
        return `${currency} ${parseFloat(amount).toFixed(2)}`;
    }

    function formatDateTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
               ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // ── Status badge map ──────────────────────────────────────
    const statusClasses = {
        pending:   'badge-status--pending',
        processing: 'badge-status--confirmed',
        shipped:   'badge-status--shipped',
        delivered: 'badge-status--delivered',
        cancelled: 'badge-status--cancelled',
        refund_requested: 'badge-status--pending',
        seller_approved: 'badge-status--approved',
        seller_denied: 'badge-status--pending',
        disputed: 'badge-status--pending',
        refunded: 'badge-status--delivered',
        denied: 'badge-status--cancelled',
    };

    const statusLabels = {
        pending:   'Pending',
        processing: 'Processing',
        shipped:   'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        refund_requested: 'Refund Requested',
        seller_approved: 'Seller Approved',
        seller_denied: 'Seller Denied',
        disputed: 'Disputed',
        refunded: 'Refunded',
        denied: 'Refund Denied',
    };

    function populateStatusSelect(currentStatus) {
        const select = document.getElementById('status-select');
        if (!select) return;

        const FORWARD_ONLY = {
            pending:   ['processing', 'cancelled'],
            processing: ['shipped', 'cancelled'],
            shipped:    ['delivered', 'cancelled'],
        };

        const labels = {
            pending: 'Pending',
            processing: 'Processing',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
        };

        const allowedNext = FORWARD_ONLY[currentStatus] || [];
        select.innerHTML = '';

        if (allowedNext.length === 0) {
            const opt = document.createElement('option');
            opt.value = currentStatus;
            opt.textContent = labels[currentStatus] || currentStatus;
            opt.disabled = true;
            opt.selected = true;
            select.appendChild(opt);
            select.disabled = true;
            return;
        }

        select.disabled = false;
        allowedNext.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = labels[s] || s;
            select.appendChild(opt);
        });

        if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'shipped') {
            select.disabled = true;
        }
    }

    function updateStatusBadge(status) {
        const badge = document.getElementById('order-status-badge');
        if (!badge) return;
        badge.className = `badge-status ${statusClasses[status] || ''}`;
        badge.textContent = statusLabels[status] || status;
    }

    // ── Timeline timestamps (persisted per order) ──────────────
    function getTimelineKey(orderId) { return `timeline_${orderId}`; }

    function getTimestamps(orderId) {
        try { return JSON.parse(localStorage.getItem(getTimelineKey(orderId)) || '{}'); } catch { return {}; }
    }

    function saveTimestamp(orderId, status) {
        const ts = getTimestamps(orderId);
        if (!ts[status]) {
            ts[status] = new Date().toISOString();
            localStorage.setItem(getTimelineKey(orderId), JSON.stringify(ts));
        }
    }

    function seedTimestamps(orderId, order) {
        // On first load, back-fill timestamps for already-completed steps using createdAt
        const statusOrder = { pending: 0, processing: 1, shipped: 2, delivered: 3 };
        const currentIdx = statusOrder[order.status] ?? 0;
        const ts = getTimestamps(orderId);
        const states = ['pending', 'processing', 'shipped', 'delivered'];
        let changed = false;
        states.forEach((s, idx) => {
            if (idx <= currentIdx && !ts[s]) {
                ts[s] = idx === 0 ? order.createdAt : new Date().toISOString();
                changed = true;
            }
        });
        if (changed) localStorage.setItem(getTimelineKey(orderId), JSON.stringify(ts));
    }

    // ── Timeline states ───────────────────────────────────────
    function getTimelineState(currentStatus) {
        const states = ['pending', 'processing', 'shipped', 'delivered'];
        const statusOrder = { pending: 0, processing: 1, shipped: 2, delivered: 3 };
        const currentIdx = statusOrder[currentStatus] ?? 0;
        
        return states.map((state, idx) => ({
            state,
            done: idx < currentIdx && currentStatus !== 'cancelled',
            active: idx === currentIdx && currentStatus !== 'cancelled',
            cancelled: currentStatus === 'cancelled',
        }));
    }

    // ── Render order details ───────────────────────────────────
    function renderOrder(order) {
        _currentOrder = order;
        // Order header
        document.getElementById('order-ref').textContent = '#' + order.orderNumber;
        const refFallback = document.getElementById('order-ref-fallback');
        if (refFallback) refFallback.textContent = order.orderNumber;
        document.getElementById('order-date').textContent = formatDateTime(order.createdAt);
        document.getElementById('order-payment').textContent = `${formatCurrency(order.totalAmount)} ✓`;
        document.getElementById('order-date-fallback').textContent = formatDateTime(order.createdAt);

        // Status
        populateStatusSelect(order.status);
        updateStatusBadge(order.status);

        // Items
        const itemsList = document.getElementById('order-items-list');
        const itemsCount = document.getElementById('items-count');
        if (itemsList) {
            itemsList.innerHTML = order.items.map(item => {
                const img = item.product?.image || '';
                const bg = img ? `background-image:url('${img}');background-size:cover;background-position:center` : '';
                return `
                <div class="order-item-row">
                    <div class="order-item-img ${img ? '' : 'shimmer'}" style="${bg}" ${img ? `data-img-url="${img}"` : ''}></div>
                    <div class="order-item-info">
                        <p class="order-item-name">${item.product.name}</p>
                        <p class="order-item-meta">Qty: ${item.quantity}</p>
                        <a href="../products/product-details.html?id=${item.product.id}" class="order-item-link">
                            <i data-lucide="external-link"></i> View product
                        </a>
                    </div>
                    <div class="order-item-price">${formatCurrency(parseFloat(item.price.toString()) * item.quantity)}</div>
                </div>`;
            }).join('');
            itemsList.querySelectorAll('.order-item-img[data-img-url]').forEach(el => {
                const url = el.getAttribute('data-img-url');
                const testImg = new Image();
                testImg.onload = () => { el.removeAttribute('data-img-url'); };
                testImg.onerror = () => {
                    el.removeAttribute('data-img-url');
                    el.style.backgroundImage = 'none';
                    el.classList.add('shimmer');
                };
                testImg.src = url;
            });
        }
        if (itemsCount) itemsCount.textContent = `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`;

        // Summary
        const summaryEl = document.getElementById('order-summary');
        if (summaryEl) {
            const subtotal = order.items.reduce((sum, item) => sum + parseFloat(item.price.toString()) * item.quantity, 0);
            const deliveryFee = parseFloat((order.sellerDeliveryFee || 0).toString());
            const platformFee = subtotal * 0.05;
            const youReceive = subtotal + deliveryFee - platformFee;

            const deliveryLabel = order.fulfillmentType === 'delivery' || order.fulfillmentType === 'both' ? 'Delivery fee' : '';

            summaryEl.innerHTML = `
                <div class="summary-line"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
                ${deliveryLabel && deliveryFee > 0 ? `<div class="summary-line"><span>${deliveryLabel}</span><strong>${formatCurrency(deliveryFee)}</strong></div>` : ''}
                <div class="summary-line"><span>Platform fee (5%)</span><strong class="fee-deduct">— Coming soon</strong></div>
                <div class="summary-line summary-line--total"><span>You receive</span><strong>${formatCurrency(subtotal + deliveryFee)}</strong></div>
            `;
        }

        // Timeline
        const orderId = order.id || getOrderId();
        seedTimestamps(orderId, order);
        renderTimeline(order.status, order.fulfillmentType, orderId);

        // Buyer info
        const buyerInfo = document.getElementById('buyer-info');
        if (buyerInfo) {
            const buyerName = [order.buyer.firstName, order.buyer.lastName].filter(Boolean).join(' ') || '—';
            buyerInfo.innerHTML = `
                <div class="info-row">
                    <i data-lucide="user"></i>
                    <div><p class="info-label">Name</p><p class="info-val">${buyerName}</p></div>
                </div>
                <div class="info-row">
                    <i data-lucide="mail"></i>
                    <div><p class="info-label">Email</p><p class="info-val">${order.buyer.email || '—'}</p></div>
                </div>
                <div class="info-row">
                    <i data-lucide="phone"></i>
                    <div><p class="info-label">Phone</p><p class="info-val">${order.buyer.phone || 'Not provided'}</p></div>
                </div>
                <div class="info-row">
                    <i data-lucide="map-pin"></i>
                    <div><p class="info-label">Delivery Address</p><p class="info-val">${order.address ? [order.address.street, order.address.city, order.address.state, order.address.country].filter(Boolean).join(', ') : '—'}</p></div>
                </div>
                <div class="info-row">
                    <i data-lucide="file-text"></i>
                    <div><p class="info-label">Delivery Notes</p><p class="info-val">${order.notes || '—'}</p></div>
                </div>
            `;
        }

        // Contact buttons
        const emailBtn = document.getElementById('contact-email-btn');
        const phoneBtn = document.getElementById('contact-phone-btn');
        if (emailBtn) {
            emailBtn.href = `mailto:${order.buyer.email || ''}`;
        }
        if (phoneBtn) {
            if (order.buyer.phone) {
                phoneBtn.href = `tel:${order.buyer.phone}`;
                phoneBtn.style.display = '';
            } else {
                phoneBtn.style.display = 'none';
            }
        }
        lucide.createIcons();

        // Payout info
        const payoutInfo = document.getElementById('payout-info');
        if (payoutInfo) {
            const subtotal = order.items.reduce((sum, item) => sum + parseFloat(item.price.toString()) * item.quantity, 0);
            const deliveryFee = parseFloat((order.sellerDeliveryFee || 0).toString());
            payoutInfo.innerHTML = `
                <div class="payout-row"><span>Order amount</span><strong>${formatCurrency(order.totalAmount)}</strong></div>
                <div class="payout-row"><span>Platform fee (5%)</span><strong class="fee-deduct">— Coming soon</strong></div>
                <div class="payout-row payout-row--total"><span>You receive</span><strong>${formatCurrency(subtotal + deliveryFee)}</strong></div>
            `;
        }

        // Action buttons
        const confirmBtn = document.getElementById('confirm-btn');
        const shippedBtn = document.getElementById('mark-shipped-btn');
        const cancelBtn = document.getElementById('cancel-order-btn');

        // Disable actions for terminal states
        if (order.status === 'cancelled' || order.status === 'delivered') {
            const updateBtn = document.getElementById('update-status-btn');
            if (updateBtn) updateBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = true;
        }

        // Hide confirm button if already processing+
        if (order.status !== 'pending') {
            if (confirmBtn) confirmBtn.style.display = 'none';
        }
        if (order.status !== 'processing') {
            if (shippedBtn) shippedBtn.style.display = 'none';
        }
    }

    function renderTimeline(currentStatus, fulfillmentType, orderId) {
        const timelineEl = document.getElementById('order-timeline');
        if (!timelineEl) return;
        const timelineStates = getTimelineState(currentStatus);
        const fulfillmentLabel = fulfillmentType === 'delivery' ? 'with delivery' : fulfillmentType === 'both' ? '(delivery & pickup)' : '';
        const ts = getTimestamps(orderId);
        timelineEl.innerHTML = timelineStates.map((s, idx) => {
            const timestamp = ts[s.state];
            const timeText = (s.done || s.active) && timestamp
                ? formatDateTime(timestamp)
                : 'Awaiting action';
            return `
                <div class="timeline-item ${s.done ? 'done' : ''} ${s.active ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-line ${idx === timelineStates.length - 1 ? 'last' : ''}"></div>
                    <div class="timeline-content">
                        <strong>${s.state.charAt(0).toUpperCase() + s.state.slice(1)}</strong>
                        <span>${getTimelineDescription(s.state)}${fulfillmentLabel ? ` ${fulfillmentLabel}` : ''}</span>
                        <p class="timeline-time">${timeText}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getTimelineDescription(state) {
        const descriptions = {
            pending: 'Buyer placed and paid for the order.',
            processing: 'You confirm the order and begin packing.',
            shipped: 'Item dispatched to buyer.',
            delivered: 'Buyer confirms receipt. Payment released to you.',
        };
        return descriptions[state] || '';
    }

    // ── Fetch order from backend ────────────────────────────────
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
            const response = await fetch(`${API_BASE}/api/seller/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch order');
            }

            const data = await response.json();

            if (data.success) {
                if (!skipLoading) {
                    document.getElementById('loading-state').classList.add('hidden');
                    document.getElementById('order-content').classList.remove('hidden');
                }
                renderOrder(data.data);

                const refund = await fetchRefundDetails();
                if (refund) renderRefundInfo(refund);
            } else {
                throw new Error(data.error || 'Failed to fetch order');
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

    // ── Refund Management ───────────────────────────────────────
    async function fetchRefundDetails() {
        const orderId = getOrderId();
        if (!orderId) return null;
        const token = getAuthToken();
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role !== 'seller') return null;
        } catch { return null; }

        try {
            const res = await fetch(`${API_BASE}/api/seller/refunds/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) return null;
            const json = await res.json();
            if (json.success) return json.data;
        } catch {}
        return null;
    }

    const reasonLabels = {
        item_not_received: 'Item not received',
        item_damaged: 'Item damaged or faulty',
        wrong_item: 'Wrong item received',
        not_as_described: 'Not as described',
        other: 'Other',
    };

    function renderRefundInfo(refund) {
        const card = document.getElementById('refund-request-card');
        if (!card) return;

        const wasApproving = _approveFieldsVisible;

        if (!refund || refund.status !== 'refund_requested') {
            _approveFieldsVisible = false;
            card.classList.add('hidden');
            return;
        }

        card.classList.remove('hidden');
        const info = document.getElementById('refund-info');
        const badge = document.getElementById('refund-status-badge');
        if (badge) {
            badge.textContent = 'Review';
        }

        if (info) {
            const reasonText = reasonLabels[refund.reason] || refund.reason || 'Not specified';
            info.innerHTML = `
                <div class="info-row"><i data-lucide="alert-circle"></i><div><p class="info-label">Reason</p><p class="info-val">${esc(reasonText)}</p></div></div>
                ${refund.message ? `<div class="info-row"><i data-lucide="file-text"></i><div><p class="info-label">Details</p><p class="info-val">${esc(refund.message)}</p></div></div>` : ''}
                ${refund.evidence && refund.evidence.length ? `<div class="info-row"><i data-lucide="image"></i><div><p class="info-label">Evidence</p><p class="info-val">${refund.evidence.length} image(s)</p></div></div>
                <div class="info-row evidence-images">${refund.evidence.map(src => `<img src="${API_BASE}${esc(src)}" alt="Evidence" class="evidence-img" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23eee%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 dy=%22.35em%22 text-anchor=%22middle%22 fill=%22%23999%22>No preview</text></svg>'">`).join('')}</div>` : ''}
                <div class="info-row"><i data-lucide="clock"></i><div><p class="info-label">Requested</p><p class="info-val">${formatDateTime(refund.createdAt)}</p></div></div>
            `;
        }

        const approveBtn = document.getElementById('approve-refund-btn');
        const denyBtn = document.getElementById('deny-refund-btn');
        const responseInput = document.getElementById('refund-response-message');
        const approveFields = document.getElementById('approve-fields');

        if (approveBtn) approveBtn.disabled = false;
        if (denyBtn) denyBtn.disabled = false;
        if (responseInput) responseInput.disabled = false;

        if (approveFields) {
            if (wasApproving) {
                _approveFieldsVisible = true;
                approveFields.classList.remove('hidden');
            } else {
                _approveFieldsVisible = false;
                approveFields.classList.add('hidden');
            }
        }

        const newApprove = approveBtn ? approveBtn.cloneNode(true) : null;
        if (approveBtn) {
            approveBtn.parentNode.replaceChild(newApprove, approveBtn);
        }
        if (newApprove) {
            newApprove.addEventListener('click', () => {
                if (!_approveFieldsVisible) {
                    _approveFieldsVisible = true;
                    if (approveFields) approveFields.classList.remove('hidden');
                    return;
                }
                respondToRefund('approve');
            });
        }

        const newDeny = denyBtn ? denyBtn.cloneNode(true) : null;
        if (denyBtn) {
            denyBtn.parentNode.replaceChild(newDeny, denyBtn);
        }
        if (newDeny) {
            newDeny.addEventListener('click', () => {
                if (approveFields) approveFields.classList.add('hidden');
                _approveFieldsVisible = false;
                respondToRefund('deny');
            });
        }

        if (window.lucide) lucide.createIcons();
    }

    async function respondToRefund(response) {
        const orderId = getOrderId();
        if (!orderId) return;
        const token = getAuthToken();
        if (!token) return;

        const message = document.getElementById('refund-response-message')?.value?.trim() || '';

        if (response === 'deny' && !message) {
            toast('Please provide a reason for denying this refund.', 'danger');
            return;
        }

        const refundMethod = document.getElementById('refund-method')?.value;
        const sellerProof = document.getElementById('refund-proof')?.value?.trim() || '';

        if (response === 'approve') {
            if (!refundMethod) {
                toast('Please select how you will refund.', 'danger');
                return;
            }
            if (!sellerProof) {
                toast('Please provide proof / reference for the refund.', 'danger');
                return;
            }
        }

        if (!confirm(`Are you sure you want to ${response} this refund request?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/seller/refunds/${orderId}/respond`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ response, message, refundMethod: response === 'approve' ? refundMethod : undefined, sellerProof: response === 'approve' ? sellerProof : undefined }),
            });

            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Failed');

            toast(json.message || `Refund ${response === 'approve' ? 'approved' : 'denied'}.`, 'success');
            const newStatus = response === 'approve' ? 'seller_approved' : 'seller_denied';
            updateStatusBadge(newStatus);
            if (_currentOrder) _currentOrder.status = newStatus;
            fetchOrder(true);
        } catch (err) {
            toast(err.message || 'Failed to respond to refund.', 'danger');
        }
    }

    function toast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const el = document.createElement('div');
        const icons = { success: 'check-circle', danger: 'x-circle', error: 'alert-circle', info: 'info' };
        el.className = `toast toast--${type}`;
        el.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${msg}</span>`;
        container.appendChild(el);
        if (window.lucide) lucide.createIcons({ nodes: [el] });
        setTimeout(() => {
            el.classList.add('toast-out');
            el.addEventListener('animationend', () => el.remove());
        }, 3200);
    }

    // ── Update status ─────────────────────────────────────────
    async function updateOrderStatus(newStatus) {
        const orderId = getOrderId();
        if (!orderId) return;

        const token = getAuthToken();
        if (!token) return;

        const updateBtn = document.getElementById('update-status-btn');
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i data-lucide="loader"></i> Updating…';
        lucide.createIcons();

        try {
            const response = await fetch(`${API_BASE}/api/seller/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            const data = await response.json();
            if (data.success) {
                updateStatusBadge(newStatus);
                updateBtn.innerHTML = '<i data-lucide="check"></i> Updated!';
                updateBtn.style.background = 'rgba(34,197,94,0.15)';
                updateBtn.style.color = '#22c55e';

                const titleP = document.querySelector('.topnav-title p');
                if (titleP) titleP.textContent = `Status: ${statusLabels[newStatus]}`;

                saveTimestamp(orderId, newStatus);
                
                fetchOrder(true);

                setTimeout(() => {
                    updateBtn.disabled = false;
                    updateBtn.innerHTML = '<i data-lucide="check"></i> Update Status';
                    updateBtn.style.background = '';
                    updateBtn.style.color = '';
                    lucide.createIcons();
                }, 2000);
            }
        } catch (err) {
            console.error('Error updating status:', err);
            const currentOrder = _currentOrder;
            if (currentOrder) populateStatusSelect(currentOrder.status);
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i data-lucide="check"></i> Update Status';
            lucide.createIcons();
        }
    }

    let _currentOrder = null;
    let _lastFetchedStatus = null;
    let _pollId = null;
    let _isFetching = false;

    function startLiveSync() {
        let initialized = false;
        _pollId = setInterval(async () => {
            const order = _currentOrder;
            if (!order) return;
            const current = order.status;
            if (!initialized) {
                _lastFetchedStatus = current;
                initialized = true;
                return;
            }
            if (_lastFetchedStatus && _lastFetchedStatus !== current) {
                await freshFetch();
                return;
            }
            const token = getAuthToken();
            if (!token) return;
            const orderId = getOrderId();
            if (!orderId) return;
            try {
                const response = await fetch(`${API_BASE}/api/seller/orders/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                if (!response.ok) return;
                const data = await response.json();
                if (!data.success) return;
                const serverStatus = data.data.status;
                if (serverStatus && serverStatus !== current) {
                    _currentOrder = data.data;
                    renderOrder(data.data);
                    return;
                }
                _lastFetchedStatus = current;
            } catch {}
        }, 30000);
    }

    async function freshFetch() {
        await fetchOrder();
        const order = _currentOrder;
        if (order) {
            _lastFetchedStatus = order.status;
        }
    }

    function stopLiveSync() {
        if (_pollId) {
            clearInterval(_pollId);
            _pollId = null;
        }
    }

    window.addEventListener('beforeunload', stopLiveSync);

    const origPushState = history.pushState;
    history.pushState = function() {
        origPushState.apply(this, arguments);
        stopLiveSync();
        setTimeout(() => startLiveSync(), 0);
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function() {
        origReplaceState.apply(this, arguments);
        stopLiveSync();
        setTimeout(() => startLiveSync(), 0);
    };

    // ── Init ───────────────────────────────────────────────────
    function init() {
        document.getElementById('update-status-btn')?.addEventListener('click', () => {
        const statusSelect = document.getElementById('status-select');
            const newStatus = statusSelect.value;
            updateOrderStatus(newStatus);
        });

        document.getElementById('confirm-btn')?.addEventListener('click', () => {
            document.getElementById('status-select').value = 'processing';
            document.getElementById('update-status-btn').click();
        });

        document.getElementById('mark-shipped-btn')?.addEventListener('click', () => {
            document.getElementById('status-select').value = 'shipped';
            document.getElementById('update-status-btn').click();
        });

        document.getElementById('cancel-order-btn')?.addEventListener('click', () => {
            if (!confirm('Cancel this order? This cannot be undone.')) return;
            document.getElementById('status-select').value = 'cancelled';
            document.getElementById('update-status-btn').click();
        });

        // Initial load
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
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();