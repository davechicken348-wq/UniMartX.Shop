/* ═══════════════════════════════════════════════
   ADMIN REFUNDS PAGE — Fixed JS
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

    let state = { filter: 'disputed', items: [] };

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
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

    function formatDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function loadProfile() {
        apiFetch('/api/auth/me')
            .then(res => res?.data || res)
            .then(user => {
                if (!user) return;
                const full = `${user.firstName || ''}${user.lastName ? ' ' + user.lastName : ''}` || 'Admin';
                const ini = full.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'AD';
                setText('sidebar-name', full);
                setText('sidebar-role', 'Super Admin');
                setText('sidebar-avatar', ini);
                setText('topnav-username', user.firstName || 'Admin');
                setText('topnav-avatar', ini);
                const ap = document.getElementById('sidebar-avatar');
                if (ap && user.avatar) ap.innerHTML = `<img src="${user.avatar}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            })
            .catch(() => {});
    }

    // Drawer
    const drawer = document.getElementById('drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerBody = document.getElementById('drawer-body');
    const drawerClose = document.getElementById('drawer-close');

    function openDrawer(refund) {
        const order = refund.order || {};
        const buyer = order.buyer || {};
        const seller = order.seller || {};
        const canArbitrate = refund.status === 'disputed';

        drawerBody.innerHTML = `
            <div class="drawer-section">
                <div class="drawer-section-title">Order</div>
                <div class="drawer-field"><span class="drawer-field-label">Order #</span><span class="drawer-field-value">${esc(order.orderNumber || '—')}</span></div>
                <div class="drawer-field"><span class="drawer-field-label">Amount</span><span class="drawer-field-value">GH₵ ${Number(order.totalAmount || 0).toFixed(2)}</span></div>
                <div class="drawer-field"><span class="drawer-field-label">Status</span><span class="drawer-field-value">${esc(order.status)}</span></div>
            </div>
            <div class="drawer-section">
                <div class="drawer-section-title">Parties</div>
                <div class="drawer-field"><span class="drawer-field-label">Buyer</span><span class="drawer-field-value">${esc(buyer.firstName || '')} ${esc(buyer.lastName || '')} · ${esc(buyer.email || '')}</span></div>
                <div class="drawer-field"><span class="drawer-field-label">Seller</span><span class="drawer-field-value">${esc(seller.storeName || seller.user?.firstName || '—')}</span></div>
            </div>
            <div class="drawer-section">
                <div class="drawer-section-title">Refund Request</div>
                <div class="drawer-field"><span class="drawer-field-label">Reason</span><span class="drawer-field-value">${esc(refund.reason)}</span></div>
                <div class="drawer-field"><span class="drawer-field-label">Details</span><span class="drawer-field-value">${esc(refund.message || '—')}</span></div>
                <div class="drawer-field"><span class="drawer-field-label">Evidence</span><span class="drawer-field-value">${(refund.evidence && refund.evidence.length) ? refund.evidence.length + ' file(s)' : 'None'}</span></div>
                <div class="drawer-field"><span class="drawer-field-label">Requested</span><span class="drawer-field-value">${formatDate(refund.createdAt)}</span></div>
            </div>
            <div class="drawer-section">
                <div class="drawer-section-title">Seller Response</div>
                <div class="drawer-field"><span class="drawer-field-label">Response</span><span class="drawer-field-value">${esc(refund.sellerResponse || '—')}</span></div>
                <div class="drawer-field"><span class="drawer-field-label">Date</span><span class="drawer-field-value">${formatDate(refund.sellerRespondedAt)}</span></div>
                ${refund.refundMethod ? `<div class="drawer-field"><span class="drawer-field-label">Method</span><span class="drawer-field-value">${esc(refund.refundMethod)}</span></div>` : ''}
                ${refund.sellerProof ? `<div class="drawer-field"><span class="drawer-field-label">Proof</span><span class="drawer-field-value">${esc(refund.sellerProof)}</span></div>` : ''}
                ${refund.buyerConfirmedAt ? `<div class="drawer-field"><span class="drawer-field-label">Buyer Confirmed</span><span class="drawer-field-value">${formatDate(refund.buyerConfirmedAt)}</span></div>` : ''}
            </div>
            ${refund.disputeReason ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Buyer Dispute</div>
                <div class="drawer-field"><span class="drawer-field-label">Reason</span><span class="drawer-field-value">${esc(refund.disputeReason)}</span></div>
            </div>` : ''}
            ${(refund.evidence && refund.evidence.length) ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Evidence Images</div>
                <div class="evidence-gallery">
                    ${refund.evidence.map(url => {
                        const abs = url.startsWith('/uploads') ? `${API}${url}` : url;
                        return `<a href="${esc(abs)}" target="_blank" class="evidence-thumb" style="background-image:url('${esc(abs)}')"></a>`;
                    }).join('')}
                </div>
            </div>` : ''}
            ${canArbitrate ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Admin Decision</div>
                <div class="form-group">
                    <label class="form-label">Decision Note</label>
                    <textarea id="admin-note" class="form-textarea" rows="4" placeholder="Explain your decision..."></textarea>
                </div>
                <div class="drawer-actions">
                    <button class="drawer-btn drawer-btn--primary" id="approve-btn" data-id="${refund.orderId}">
                        <i data-lucide="check"></i> Approve Refund
                    </button>
                    <button class="drawer-btn drawer-btn--danger" id="deny-btn" data-id="${refund.orderId}">
                        <i data-lucide="x"></i> Deny Refund
                    </button>
                </div>
            </div>` : ''}
        `;

        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
        if (window.lucide) lucide.createIcons();

        if (canArbitrate) {
            document.getElementById('approve-btn')?.addEventListener('click', () => arbitrate(refund.orderId, 'approve'));
            document.getElementById('deny-btn')?.addEventListener('click', () => arbitrate(refund.orderId, 'deny'));
        }
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    }
    drawerClose?.addEventListener('click', closeDrawer);
    drawerOverlay?.addEventListener('click', closeDrawer);

    async function loadRefunds() {
        const tbody = document.getElementById('refunds-tbody');
        const empty = document.getElementById('empty-state');
        if (!tbody) return;
        tbody.innerHTML = Array(4).fill('<tr class="skel-row"><td colspan="8"><div class="skel-line"></div></td></tr>').join('');
        if (empty) empty.classList.add('hidden');

        let url;
        const filter = state.filter;
        if (filter === 'disputed') url = `${API}/api/refunds?filter=disputed`;
        else if (filter === 'pending') url = `${API}/api/refunds?filter=refund_requested,seller_approved,seller_denied`;
        else if (filter === 'resolved') url = `${API}/api/refunds?filter=refunded,denied`;
        else if (filter === 'all') url = `${API}/api/refunds?filter=all`;
        else { renderTable([]); return; }

        try {
            const result = await apiFetch(url.replace(API, ''));
            const items = result.data?.refunds || [];
            state.items = items;
            renderTable(items);
        } catch (err) {
            console.error('[Refunds] loadRefunds failed:', err);
            tbody.innerHTML = `<tr class="empty-row"><td colspan="8"><div class="empty-state"><div class="empty-icon"><i data-lucide="wifi-off"></i></div><h3>Could not load refunds</h3><p>Check that the backend is running and try again.</p></div></td></tr>`;
            if (window.lucide) lucide.createIcons();
        }
    }

    function renderTable(items) {
        const tbody = document.getElementById('refunds-tbody');
        const empty = document.getElementById('empty-state');
        if (!tbody) return;

        if (!items.length) {
            tbody.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        tbody.innerHTML = items.map(r => {
            const order = r.order || {};
            const buyer = order.buyer || {};
            const seller = order.seller || {};
            const badge = r.status === 'disputed' ? 'badge--disputed'
                : (r.status === 'seller_approved') ? 'badge--approved'
                : (r.status === 'seller_denied' || r.status === 'denied') ? 'badge--denied'
                : (r.status === 'refund_requested') ? 'badge--pending'
                : (r.status === 'refunded') ? 'badge--delivered'
                : 'badge--pending';
            const label = r.status === 'disputed' ? 'Disputed'
                : (r.status === 'seller_approved') ? 'Seller Approved'
                : (r.status === 'seller_denied' || r.status === 'denied') ? 'Denied'
                : (r.status === 'refund_requested') ? 'Pending'
                : (r.status === 'refunded') ? 'Refunded'
                : r.status;

            return `
                <tr>
                    <td><strong>#${esc(order.orderNumber || '—')}</strong></td>
                    <td>${esc(buyer.firstName || '')} ${esc(buyer.lastName || '')}</td>
                    <td>${esc(seller.storeName || seller.user?.firstName || '—')}</td>
                    <td>GH₵ ${Number(order.totalAmount || 0).toFixed(2)}</td>
                    <td>${esc(r.reason)}</td>
                    <td><span class="badge ${badge}">${label}</span></td>
                    <td>${formatDate(r.createdAt)}</td>
                    <td><button class="act-btn view-btn" data-id="${r.orderId}" title="Review"><i data-lucide="eye"></i></button></td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = state.items.find(x => x.orderId === btn.dataset.id);
                if (item) openDrawer(item);
            });
        });

        tbody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.querySelector('.view-btn')?.dataset.id;
                const item = state.items.find(x => x.orderId === id);
                if (item) openDrawer(item);
            });
        });

        if (window.lucide) lucide.createIcons();
    }

    async function arbitrate(orderId, decision) {
        const note = document.getElementById('admin-note')?.value?.trim() || '';
        if (decision === 'deny' && !note) {
            toast('Please provide a reason for denying this refund.', 'danger');
            return;
        }
        if (!confirm(`Are you sure you want to ${decision} this refund?`)) return;

        const approveBtn = document.getElementById('approve-btn');
        const denyBtn = document.getElementById('deny-btn');
        [approveBtn, denyBtn].forEach(b => { if (b) { b.disabled = true; b.textContent = 'Processing…'; } });

        try {
            const result = await apiFetch(`/api/refunds/orders/${orderId}/refund/arbitrate`, {
                method: 'POST',
                body: JSON.stringify({ decision, adminNote: note }),
            });
            toast(result.message || `Refund ${decision === 'approve' ? 'approved' : 'denied'}.`, 'success');
            closeDrawer();
            loadRefunds();
        } catch (err) {
            toast(err.message || 'Failed to arbitrate refund.', 'danger');
        } finally {
            [approveBtn, denyBtn].forEach(b => { if (b) { b.disabled = false; b.textContent = decision === 'approve' ? 'Approve Refund' : 'Deny Refund'; } });
        }
    }

    // Filters
    document.querySelectorAll('#filter-pills .pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#filter-pills .pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.filter = pill.dataset.filter;
            loadRefunds();
        });
    });

    // Init
    loadProfile();
    if (window.lucide) lucide.createIcons();
    loadRefunds();

    window.addEventListener('admin:profileUpdated', () => {
        loadProfile();
        loadRefunds();
    });
    window.addEventListener('focus', () => {
        loadProfile();
        loadRefunds();
    });
})();
