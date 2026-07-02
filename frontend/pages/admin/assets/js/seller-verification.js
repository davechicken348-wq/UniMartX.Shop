/* ═══════════════════════════════════════════════
   ADMIN SELLER VERIFICATION — Fixed JS
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
    let state = { page: 1, total: 0, pages: 1, status: '', search: '', sellers: [] };
    let pendingRejectId   = null;
    let pendingRejectName = null;

    /* ── DOM helpers ── */
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

    /* ── Toast (queued) ── */
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
            console.error('[SellerVerification] loadProfile failed:', err);
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
    function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—'; }
    function imgUrl(path) {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${API}/${path.replace(/^\//, '')}`;
    }
    function statusBadge(status) {
        const map = {
            pending:  `<span class="badge badge--pending"><i data-lucide="clock"></i> Pending</span>`,
            approved: `<span class="badge badge--approved"><i data-lucide="badge-check"></i> Approved</span>`,
            rejected: `<span class="badge badge--rejected"><i data-lucide="x-circle"></i> Rejected</span>`,
        };
        return map[status] ?? map.pending;
    }

    /* ── Reject Modal ── */
    const modalOverlay = document.getElementById('modal-overlay');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel  = document.getElementById('modal-cancel');
    const modalClose   = document.getElementById('modal-close');
    const rejectReason = document.getElementById('reject-reason');

    function openRejectModal(id, name) {
        pendingRejectId   = id;
        pendingRejectName = name;
        rejectReason.value = '';
        modalOverlay.classList.add('open');
        setTimeout(() => rejectReason.focus(), 100);
        lucide.createIcons();
    }
    function closeRejectModal() {
        modalOverlay.classList.remove('open');
        pendingRejectId   = null;
        pendingRejectName = null;
    }
    modalCancel.addEventListener('click', closeRejectModal);
    modalClose.addEventListener('click', closeRejectModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeRejectModal(); });

    modalConfirm.addEventListener('click', async () => {
        const reason = rejectReason.value.trim();
        if (!reason) { rejectReason.style.borderColor = 'var(--danger)'; return; }
        rejectReason.style.borderColor = '';
        modalConfirm.disabled = true;
        await doDecision(pendingRejectId, 'rejected', reason);
        closeRejectModal();
        modalConfirm.disabled = false;
    });

    /* ── API decision ── */
    async function doDecision(sellerId, status, reason = '') {
        try {
            await apiFetch(`/api/admin/sellers/${sellerId}/verify`, {
                method: 'PATCH',
                body: JSON.stringify({ status, rejectionReason: reason }),
            });
            toast(`Seller ${status === 'approved' ? 'approved' : 'rejected'} successfully.`, status === 'approved' ? 'success' : 'danger');
            closeDrawer();
            loadStats();
            loadSellers();
            window.dispatchEvent(new Event('admin:badgesChanged'));
        } catch {
            toast('Failed to update verification status.', 'danger');
        }
    }

    /* ── Drawer ── */
    const drawer        = document.getElementById('seller-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerBody    = document.getElementById('drawer-body');
    const drawerClose   = document.getElementById('drawer-close');

    function openDrawer(seller) {
        const verification = seller.sellerVerification;
        const vstatus      = verification?.status ?? 'pending';
        const user         = seller.user ?? {};
        const sellerName   = user.firstName ? `${user.firstName} ${user.lastName}` : '—';
        const bannerImg    = imgUrl(seller.storeBanner);
        const avatarImg    = imgUrl(seller.storeAvatar);

        drawerBody.innerHTML = `
            ${bannerImg
                ? `<img class="drawer-store-banner" src="${bannerImg}" alt="" onerror="this.style.display='none'">`
                : `<div class="drawer-store-banner-placeholder"></div>`}

            <div class="drawer-profile-row">
                <div class="drawer-store-avatar ${vstatus === 'approved' ? 'sv-avatar--verified' : ''}">
                    ${avatarImg
                        ? `<img src="${avatarImg}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="" onerror="this.outerHTML='${initials(seller.storeName)}'">`
                        : initials(seller.storeName)}
                </div>
                <div class="drawer-profile-text">
                    <div class="drawer-store-name">${seller.storeName}</div>
                    <div class="drawer-seller-name">${sellerName} · ${user.email ?? ''}</div>
                </div>
                ${statusBadge(vstatus)}
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Store Info</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Business Type</span>
                    <span class="drawer-field-value">${cap(seller.businessType)}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Category</span>
                    <span class="drawer-field-value">${cap(seller.category)}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Location</span>
                    <span class="drawer-field-value">${[seller.city, seller.country].filter(Boolean).join(', ') || '—'}</span>
                </div>
                ${seller.universityAffiliation ? `
                <div class="drawer-field">
                    <span class="drawer-field-label">University</span>
                    <span class="drawer-field-value">${seller.universityAffiliation}</span>
                </div>` : ''}
                <div class="drawer-field">
                    <span class="drawer-field-label">Applied</span>
                    <span class="drawer-field-value">${dateStr(verification?.submittedAt ?? seller.createdAt)}</span>
                </div>
                ${verification?.reviewedAt ? `
                <div class="drawer-field">
                    <span class="drawer-field-label">Reviewed</span>
                    <span class="drawer-field-value">${dateStr(verification.reviewedAt)}</span>
                </div>` : ''}
            </div>

            ${seller.storeDescription ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Store Description</div>
                <div class="drawer-desc">${seller.storeDescription}</div>
            </div>` : ''}

            ${vstatus === 'rejected' && verification?.rejectionReason ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Rejection Reason</div>
                <div class="rejection-reason-box">${verification.rejectionReason}</div>
            </div>` : ''}

            <div class="drawer-section">
                <div class="drawer-section-title">Seller Account</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Full Name</span>
                    <span class="drawer-field-value">${sellerName}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Email</span>
                    <span class="drawer-field-value">${user.email ?? '—'}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Phone</span>
                    <span class="drawer-field-value">${user.phone ?? '—'}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Email Verified</span>
                    <span class="drawer-field-value">${user.emailVerified ? '✓ Yes' : '✗ No'}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Registered</span>
                    <span class="drawer-field-value">${dateStr(seller.createdAt)}</span>
                </div>
            </div>

            <div class="drawer-decision">
                ${vstatus === 'pending' ? `
                <button class="drawer-btn drawer-btn--approve" id="approve-btn" data-id="${seller.id}" data-name="${seller.storeName}">
                    <i data-lucide="check"></i> Approve
                </button>
                <button class="drawer-btn drawer-btn--reject" id="reject-btn" data-id="${seller.id}" data-name="${seller.storeName}">
                    <i data-lucide="x"></i> Reject
                </button>` : ''}
                ${vstatus === 'approved' ? `
                <button class="drawer-btn drawer-btn--revoke drawer-btn--full" id="revoke-btn" data-id="${seller.id}" data-name="${seller.storeName}">
                    <i data-lucide="shield-off"></i> Revoke Approval
                </button>` : ''}
                ${vstatus === 'rejected' ? `
                <button class="drawer-btn drawer-btn--approve drawer-btn--full" id="approve-btn" data-id="${seller.id}" data-name="${seller.storeName}">
                    <i data-lucide="rotate-ccw"></i> Re-approve
                </button>` : ''}
                <button class="drawer-btn drawer-btn--ghost drawer-btn--full" id="copy-btn" data-id="${seller.id}">
                    <i data-lucide="copy"></i> Copy Seller ID
                </button>
            </div>
        `;

        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
        lucide.createIcons();

        document.getElementById('approve-btn')?.addEventListener('click', async (e) => {
            e.currentTarget.disabled = true;
            await doDecision(e.currentTarget.dataset.id, 'approved');
        });
        document.getElementById('reject-btn')?.addEventListener('click', (e) => {
            openRejectModal(e.currentTarget.dataset.id, e.currentTarget.dataset.name);
        });
        document.getElementById('revoke-btn')?.addEventListener('click', async (e) => {
            if (!confirm('Revoke approval for this seller?')) return;
            e.currentTarget.disabled = true;
            await doDecision(e.currentTarget.dataset.id, 'rejected', 'Approval revoked by admin.');
        });
        document.getElementById('copy-btn')?.addEventListener('click', (e) => {
            navigator.clipboard.writeText(e.currentTarget.dataset.id).then(() => toast('Seller ID copied.', 'success'));
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
            const result = await apiFetch('/api/admin/sellers/stats');
            if (!result) return;
            const data = result.data;
            if (!data) return;

            document.getElementById('stat-total').textContent    = data.total    ?? 0;
            document.getElementById('stat-pending').textContent  = data.pending  ?? 0;
            document.getElementById('stat-approved').textContent = data.approved ?? 0;
            document.getElementById('stat-rejected').textContent = data.rejected ?? 0;

            const pending = data.pending ?? 0;
            const banner  = document.getElementById('pending-banner');
            const badge   = document.getElementById('sb-pending-badge');
            if (pending > 0) {
                document.getElementById('pending-banner-count').textContent = pending;
                banner.style.display = 'flex';
                if (badge) { badge.textContent = pending; badge.style.display = 'inline-flex'; }
            }
        } catch (err) {
            console.error('[SellerVerification] loadStats failed:', err);
        }
    }

    /* ── Sellers table ── */
    async function loadSellers() {
        const tbody = document.getElementById('sellers-tbody');
        tbody.innerHTML = Array(5).fill(`<tr class="skel-row"><td colspan="8"><div class="skel-line"></div></td></tr>`).join('');

        try {
            const params = new URLSearchParams({
                page:  state.page,
                limit: PER_PAGE,
                ...(state.status && { status: state.status }),
                ...(state.search && { search: state.search }),
            });

            const result = await apiFetch(`/api/admin/sellers?${params}`);
            const data = result.data;

            const sellers = data?.sellers ?? data ?? [];
            state.sellers = sellers;
            state.total   = data?.total ?? sellers.length;
            state.pages   = data?.pages ?? Math.ceil(state.total / PER_PAGE);

            renderTable(sellers);
            renderPagination();
        } catch (err) {
            console.error('[SellerVerification] loadSellers failed:', err);
            tbody.innerHTML = `
                <tr class="empty-row"><td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i data-lucide="wifi-off"></i></div>
                        <h3>Could not load sellers</h3>
                        <p>Check that the backend is running and try again.</p>
                    </div>
                </td></tr>`;
        }
        lucide.createIcons();
    }

    function renderTable(sellers) {
        const tbody = document.getElementById('sellers-tbody');

        if (!sellers.length) {
            tbody.innerHTML = `
                <tr class="empty-row"><td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i data-lucide="user-check"></i></div>
                        <h3>No sellers found</h3>
                        <p>Try a different filter or search term.</p>
                    </div>
                </td></tr>`;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = sellers.map(s => {
            const user       = s.user ?? {};
            const sellerName = user.firstName ? `${user.firstName} ${user.lastName}` : '—';
            const vstatus    = s.sellerVerification?.status ?? 'pending';
            const submittedAt = s.sellerVerification?.submittedAt ?? s.createdAt;

            return `
                <tr data-id="${s.id}">
                    <td>
                        <div class="seller-cell">
                            <div class="sv-avatar ${vstatus === 'approved' ? 'sv-avatar--verified' : ''}">${initials(sellerName)}</div>
                            <div>
                                <div class="sv-name">${sellerName}</div>
                                <div class="sv-email">${user.email ?? ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="store-cell">${escapeHtml(s.storeName)}</div>
                        ${s.category ? `<div class="store-sub">${cap(s.category)}</div>` : ''}
                    </td>
                    <td>${cap(s.businessType) || '—'}</td>
                    <td>${cap(s.category) || '—'}</td>
                    <td>${[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                    <td>${statusBadge(vstatus)}</td>
                    <td style="font-size:0.82rem;color:var(--text-3)">${timeAgo(submittedAt)}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="act-btn view-btn" data-id="${s.id}" title="View details">
                                <i data-lucide="eye"></i>
                            </button>
                            ${vstatus === 'pending' ? `
                            <button class="act-btn act-btn--success approve-btn" data-id="${s.id}" title="Approve">
                                <i data-lucide="check"></i>
                            </button>
                            <button class="act-btn act-btn--danger reject-btn" data-id="${s.id}" data-name="${escapeHtml(s.storeName)}" title="Reject">
                                <i data-lucide="x"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const seller = state.sellers.find(s => s.id === row.dataset.id);
                if (seller) openDrawer(seller);
            });
        });

        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const seller = state.sellers.find(s => s.id === btn.dataset.id);
                if (seller) openDrawer(seller);
            });
        });

        tbody.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Approve this seller?')) return;
                btn.disabled = true;
                await doDecision(btn.dataset.id, 'approved');
            });
        });

        tbody.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openRejectModal(btn.dataset.id, btn.dataset.name);
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
        info.textContent = state.total ? `Showing ${start}–${end} of ${state.total} sellers` : '';

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
            btn.addEventListener('click', () => { state.page = +btn.dataset.p; loadSellers(); });
        });
        prevBtn.onclick = () => { if (state.page > 1)           { state.page--; loadSellers(); } };
        nextBtn.onclick = () => { if (state.page < state.pages) { state.page++; loadSellers(); } };
        lucide.createIcons();
    }

    /* ── Filter pills ── */
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.status = pill.dataset.status;
            state.page   = 1;
            loadSellers();
        });
    });

    /* ── Pending banner ── */
    document.getElementById('pending-filter-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(p => {
            p.classList.toggle('active', p.dataset.status === 'pending');
        });
        state.status = 'pending';
        state.page   = 1;
        loadSellers();
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
                loadSellers();
            }, 380);
        });
    }
    bindSearch('search-input');
    bindSearch('topnav-search-input');

    /* ── Export CSV ── */
    document.getElementById('export-btn')?.addEventListener('click', () => {
        if (!state.sellers.length) { toast('No sellers to export.', 'danger'); return; }
        const rows = [['Store Name', 'Seller', 'Email', 'Business Type', 'Category', 'Location', 'Status', 'Applied']];
        state.sellers.forEach(s => {
            const user = s.user ?? {};
            const name = user.firstName ? `${user.firstName} ${user.lastName}` : '—';
            const vstatus = s.sellerVerification?.status ?? 'pending';
            rows.push([
                s.storeName,
                name,
                user.email ?? '—',
                cap(s.businessType),
                cap(s.category),
                [s.city, s.country].filter(Boolean).join(', ') || '—',
                vstatus,
                dateStr(s.sellerVerification?.submittedAt ?? s.createdAt),
            ]);
        });
        const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a    = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: 'unimartx-sellers.csv',
        });
        a.click();
        toast('CSV exported.', 'success');
    });

    /* ── Init ── */
    loadProfile();
    loadStats();
    loadSellers();

    window.addEventListener('admin:profileUpdated', () => {
        loadProfile();
        Promise.all([loadStats(), loadSellers()]);
    });
    window.addEventListener('focus', () => {
        Promise.all([loadStats(), loadSellers()]);
    });
})();
