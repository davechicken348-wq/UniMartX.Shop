/* ═══════════════════════════════════════════════
   ADMIN USERS PAGE — Fixed JS
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
    let state = { page: 1, total: 0, pages: 1, role: '', search: '', users: [] };

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
            console.error('[Users] loadProfile failed:', err);
        }
    }

    /* ── Helpers ── */
    function initials(first = '', last = '') {
        return ((first[0] || '') + (last[0] || '')).toUpperCase() || '??';
    }
    function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
    function dateStr(d) {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    /* ── Drawer ── */
    const drawer        = document.getElementById('user-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerBody    = document.getElementById('drawer-body');
    const drawerClose   = document.getElementById('drawer-close');

    function openDrawer(user) {
        const role      = user.role === 'admin' ? 'admin' : (user.seller ? 'seller' : 'buyer');
        const avatarCls = role === 'seller' ? 'u-avatar--seller' : (role === 'admin' ? 'u-avatar--admin' : 'u-avatar--buyer');
        const name      = `${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}`;
        const verified  = user.emailVerified;
        const orders    = user._count?.orders ?? 0;
        const wishlist  = user._count?.wishlist ?? 0;

        drawerBody.innerHTML = `
            <div class="drawer-profile">
                <div class="drawer-avatar ${avatarCls}">${initials(user.firstName, user.lastName)}</div>
                <div class="drawer-profile-info">
                    <h3>${escapeHtml(name)}</h3>
                    <p>${escapeHtml(user.email)}</p>
                    <span class="badge badge--${role}">${role}</span>
                    ${verified
                        ? '<span class="badge badge--verified" style="margin-left:0.35rem">Verified</span>'
                        : '<span class="badge badge--unverified" style="margin-left:0.35rem">Unverified</span>'}
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Account Info</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">User ID</span>
                    <span class="drawer-field-value" style="font-size:0.74rem;color:var(--text-3)">${user.id}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Phone</span>
                    <span class="drawer-field-value">${user.phone || '—'}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Joined</span>
                    <span class="drawer-field-value">${dateStr(user.createdAt)}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Email verified</span>
                    <span class="drawer-field-value">${verified ? 'Yes' : 'No'}</span>
                </div>
            </div>

            ${role === 'seller' && user.seller ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Store Info</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Store Name</span>
                    <span class="drawer-field-value">${escapeHtml(user.seller.storeName)}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Business Type</span>
                    <span class="drawer-field-value">${user.seller.businessType || '—'}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Store Active</span>
                    <span class="drawer-field-value">${user.seller.isActive ? 'Yes' : 'No'}</span>
                </div>
            </div>` : ''}

            <div class="drawer-section">
                <div class="drawer-section-title">Activity</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Orders</span>
                    <span class="drawer-field-value">${orders}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Wishlist Items</span>
                    <span class="drawer-field-value">${wishlist}</span>
                </div>
            </div>

            <div class="drawer-actions">
                <a href="mailto:${escapeHtml(user.email)}" class="drawer-btn drawer-btn--ghost" style="text-decoration:none">
                    <i data-lucide="mail"></i> Email User
                </a>
                ${role === 'seller'
                    ? `<a href="../seller-verification/seller-verification.html" class="drawer-btn drawer-btn--primary" style="text-decoration:none">
                        <i data-lucide="user-check"></i> Review Seller
                       </a>`
                    : ''}
                <button class="drawer-btn drawer-btn--danger" id="drawer-delete-btn" data-id="${user.id}" data-name="${escapeHtml(name)}">
                    <i data-lucide="trash-2"></i> Delete Account
                </button>
            </div>
        `;

        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
        lucide.createIcons();

        document.getElementById('drawer-delete-btn')?.addEventListener('click', async (e) => {
            const { id, name: uname } = e.currentTarget.dataset;
            if (!confirm(`Delete account for ${escapeHtml(uname)}? This cannot be undone.`)) return;
            e.currentTarget.disabled = true;
            try {
                await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
                closeDrawer();
                toast(`${escapeHtml(uname)} deleted successfully.`, 'success');
                loadUsers();
            } catch {
                toast('Failed to delete user.', 'danger');
                e.currentTarget.disabled = false;
            }
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
            const [totalRes, sellersRes, unverifiedRes] = await Promise.all([
                apiFetch('/api/admin/users/count'),
                apiFetch('/api/admin/users/sellers/count'),
                apiFetch('/api/admin/users/unverified/count'),
            ]);

            const get = (res) => res?.data?.count ?? null;
            const [total, sellers, unverified] = [get(totalRes), get(sellersRes), get(unverifiedRes)];

            if (total      !== null) document.getElementById('stat-total').textContent      = fmt(total);
            if (sellers    !== null) {
                document.getElementById('stat-sellers').textContent = fmt(sellers);
                document.getElementById('stat-buyers').textContent  = fmt(Math.max(0, total - sellers));
            }
            if (unverified !== null) document.getElementById('stat-unverified').textContent = fmt(unverified);
        } catch (err) {
            console.error('[Users] loadStats failed:', err);
        }
    }

    /* ── Users table ── */
    async function loadUsers() {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = Array(6).fill(`
            <tr class="skel-row"><td colspan="7"><div class="skel-line"></div></td></tr>
        `).join('');

        try {
            const params = new URLSearchParams({
                page: state.page,
                limit: PER_PAGE,
                ...(state.role   && { role: state.role }),
                ...(state.search && { search: state.search }),
            });

            const result = await apiFetch(`/api/admin/users?${params}`);
            const data = result.data;

            const users = data?.users ?? data ?? [];
            const total = data?.total ?? users.length;
            const pages = data?.pages ?? Math.ceil(total / PER_PAGE);

            state.users = users;
            state.total = total;
            state.pages = pages;

            renderTable(users);
            renderPagination();
            lucide.createIcons();
        } catch (err) {
            console.error('[Users] loadUsers failed:', err);
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-icon"><i data-lucide="wifi-off"></i></div>
                            <h3>Could not load users</h3>
                            <p>Check that the backend is running and try again.</p>
                        </div>
                    </td>
                </tr>`;
            lucide.createIcons();
        }
    }

    function renderTable(users) {
        const tbody = document.getElementById('users-tbody');

        if (!users.length) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-icon"><i data-lucide="users"></i></div>
                            <h3>No users found</h3>
                            <p>Try adjusting your search or filter.</p>
                        </div>
                    </td>
                </tr>`;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = users.map(u => {
            const role      = u.role === 'admin' ? 'admin' : (u.seller ? 'seller' : 'buyer');
            const avatarCls = role === 'seller' ? 'u-avatar--seller' : (role === 'admin' ? 'u-avatar--admin' : 'u-avatar--buyer');
            const name      = `${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}`;
            const orders    = u._count?.orders ?? '—';

            return `
                <tr data-id="${u.id}">
                    <td>
                        <div class="user-cell">
                            <div class="u-avatar ${avatarCls}">${initials(u.firstName, u.lastName)}</div>
                            <div>
                                <div class="u-name">${escapeHtml(name)}</div>
                                <div class="u-handle">${u.phone || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td style="color:var(--text)">${escapeHtml(u.email)}</td>
                    <td><span class="badge badge--${role}">${role}</span></td>
                    <td>${u.emailVerified
                            ? '<span class="badge badge--verified">Verified</span>'
                            : '<span class="badge badge--unverified">Unverified</span>'}</td>
                    <td>${dateStr(u.createdAt)}</td>
                    <td style="color:var(--text);font-weight:700">${orders}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="act-btn view-btn" data-id="${u.id}" title="View details">
                                <i data-lucide="eye"></i>
                            </button>
                            ${role === 'seller' ? `
                            <button class="act-btn act-btn--success verify-btn" data-id="${u.id}" title="Verify seller">
                                <i data-lucide="user-check"></i>
                            </button>` : ''}
                            <button class="act-btn act-btn--danger delete-btn" data-id="${u.id}" data-name="${escapeHtml(name)}" title="Delete user">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const user = state.users.find(u => u.id === row.dataset.id);
                if (user) openDrawer(user);
            });
        });

        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const user = state.users.find(u => u.id === btn.dataset.id);
                if (user) openDrawer(user);
            });
        });

        tbody.querySelectorAll('.verify-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = '../seller-verification/seller-verification.html';
            });
        });

        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { id, name } = btn.dataset;
                if (!confirm(`Delete account for ${escapeHtml(name)}? This cannot be undone.`)) return;
                btn.disabled = true;
                try {
                    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
                    toast(`${escapeHtml(name)} deleted.`, 'success');
                    loadUsers();
                } catch {
                    toast('Failed to delete user.', 'danger');
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
        info.textContent = state.total ? `Showing ${start}–${end} of ${state.total} users` : '';

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
            btn.addEventListener('click', () => { state.page = +btn.dataset.p; loadUsers(); });
        });
        prevBtn.onclick = () => { if (state.page > 1) { state.page--; loadUsers(); } };
        nextBtn.onclick = () => { if (state.page < state.pages) { state.page++; loadUsers(); } };
        lucide.createIcons();
    }

    /* ── Filter pills ── */
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.role = pill.dataset.role;
            state.page = 1;
            loadUsers();
        });
    });

    /* ── Search ── */
    let searchTimer;
    function bindSearch(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.search = input.value.trim();
                state.page   = 1;
                loadUsers();
            }, 380);
        });
    }
    bindSearch('search-input');
    bindSearch('topnav-search-input');

    /* ── Export CSV ── */
    document.getElementById('export-btn')?.addEventListener('click', () => {
        if (!state.users.length) { toast('No users to export.', 'danger'); return; }
        const rows = [['Name', 'Email', 'Role', 'Verified', 'Joined', 'Orders']];
        state.users.forEach(u => {
            rows.push([
                `${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}`,
                u.email,
                u.role === 'admin' ? 'admin' : (u.seller ? 'seller' : 'buyer'),
                u.emailVerified ? 'Yes' : 'No',
                dateStr(u.createdAt),
                u._count?.orders ?? 0,
            ]);
        });
        const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a    = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: 'unimartx-users.csv',
        });
        a.click();
        toast('CSV exported.', 'success');
    });

    /* ── Init ── */
    loadProfile();
    loadStats();
    loadUsers();

    window.addEventListener('admin:profileUpdated', () => {
        loadProfile();
        Promise.all([loadStats(), loadUsers()]);
    });
    window.addEventListener('focus', () => {
        Promise.all([loadStats(), loadUsers()]);
    });
})();
