/* ═══════════════════════════════════════════════
   ADMIN NOTIFICATIONS PAGE — Fixed JS
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

    /* ── State ── */
    const LIMIT = 20;
    let state = {
        offset: 0, total: 0, hasMore: false,
        readFilter: '', search: '', items: [],
    };

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

    /* ── Helpers ── */
    function timeAgo(d) {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    function getTypeInfo(type = '') {
        if (type.includes('order'))   return { cls: 'ni--order',   tag: 'tag--order',   label: 'Order',   icon: 'shopping-bag' };
        if (type.includes('seller') || type.includes('low_stock')) return { cls: 'ni--seller', tag: 'tag--seller', label: 'Seller', icon: 'store' };
        if (type.includes('review'))  return { cls: 'ni--review',  tag: 'tag--review',  label: 'Review',  icon: 'star' };
        if (type.includes('product') || type.includes('wishlist')) return { cls: 'ni--product', tag: 'tag--product', label: 'Product', icon: 'package' };
        if (type.includes('welcome') || type.includes('email') || type.includes('password') || type.includes('login')) {
            return { cls: 'ni--user', tag: 'tag--user', label: 'Account', icon: 'user' };
        }
        if (type.includes('promotion') || type.includes('announcement')) return { cls: 'ni--system', tag: 'tag--system', label: 'System', icon: 'bell' };
        return { cls: 'ni--system', tag: 'tag--system', label: 'Alert', icon: 'bell' };
    }

    function getPriorityClasses(priority, read) {
        if (read) return '';
        if (priority === 'urgent' || priority === 'high') return `notif-item--unread notif-item--${priority}`;
        return 'notif-item--unread';
    }

    /* ── Toast (queue via container) ── */
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

    /* ── Stats ── */
    async function loadStats() {
        try {
            const [allResult, unreadResult] = await Promise.all([
                apiFetch('/api/admin/notifications?limit=200'),
                apiFetch('/api/admin/notifications/unread-count'),
            ]);

            let total = 0, unread = 0, high = 0, read = 0;

            if (allResult) {
                const notifs = allResult.data?.notifications ?? [];
                total = allResult.data?.total ?? notifs.length;
                high  = notifs.filter(n => n.priority === 'high' || n.priority === 'urgent').length;
                read  = notifs.filter(n => n.read).length;
            }
            if (unreadResult) {
                unread = unreadResult.data?.count ?? 0;
            }

            document.getElementById('stat-total').textContent  = total;
            document.getElementById('stat-unread').textContent = unread;
            document.getElementById('stat-high').textContent   = high;
            document.getElementById('stat-read').textContent   = read;

            const badge = document.getElementById('sidebar-notif-count');
            const topBadge = document.getElementById('notif-badge');
            const show = unread > 0;
            if (badge) badge.style.display = show ? 'flex' : 'none';
            if (topBadge) { topBadge.style.display = show ? 'flex' : 'none'; topBadge.textContent = unread > 99 ? '99+' : unread; }
        } catch (err) {
            console.error('[Notifications] loadStats failed:', err);
            document.getElementById('stat-total').textContent = '!';
        }
    }

    /* ── Type breakdown ── */
    async function loadTypeBreakdown() {
        try {
            const result = await apiFetch('/api/admin/notifications?limit=200');
            if (!result) return;
            const notifs = result.data?.notifications ?? [];

            const counts = {};
            notifs.forEach(n => {
                const { label } = getTypeInfo(n.type);
                counts[label] = (counts[label] || 0) + 1;
            });

            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const max = sorted[0]?.[1] || 1;

            const colors = { Order:'#6366f1', Seller:'#a855f7', Review:'#22c55e', Product:'#f59e0b', Account:'#38bdf8', System:'#9ca3af', Alert:'#ef4444' };

            const container = document.getElementById('type-breakdown');
            if (!sorted.length) {
                container.innerHTML = `<p style="font-size:0.82rem;color:var(--text-3)">No data yet.</p>`;
                return;
            }

            container.innerHTML = sorted.map(([label, count]) => `
                <div class="type-row">
                    <span class="type-label">${label}</span>
                    <div class="type-bar-wrap">
                        <div class="type-bar" style="width:${Math.round((count/max)*100)}%;background:${colors[label] || '#6366f1'}"></div>
                    </div>
                    <span class="type-count">${count}</span>
                </div>
            `).join('');
        } catch (err) {
            console.error('[Notifications] loadTypeBreakdown failed:', err);
        }
    }

    /* ── Quick actions sidebar ── */
    async function loadQuickActions() {
        try {
            const result = await apiFetch('/api/admin/sellers/pending-count');
            const el = document.getElementById('ql-pending');
            if (el) el.textContent = result?.data?.count ? `${result.data.count} awaiting review` : 'No pending applications';
        } catch (err) {
            console.error('[Notifications] loadQuickActions failed:', err);
        }
    }

    /* ── Build notification row ── */
    function buildNotifHTML(n) {
        const info = getTypeInfo(n.type);
        const priCls = getPriorityClasses(n.priority, n.read);
        const dot = !n.read ? `<span class="unread-dot"></span>` : '';
        const checkBtn = !n.read
            ? `<button class="ni-act-btn mark-read-btn" data-id="${n.id}" title="Mark as read" aria-label="Mark as read">
                   <i data-lucide="check"></i>
               </button>`
            : '';

        return `
            <div class="notif-item ${priCls}" data-id="${n.id}">
                <div class="notif-icon ${info.cls}">
                    <i data-lucide="${info.icon}"></i>
                </div>
                <div class="notif-body">
                    <div class="notif-top">
                        <div class="notif-title-text">${escapeHtml(n.title)}</div>
                        <div class="notif-time-badge">
                            <span class="notif-time">${timeAgo(n.createdAt)}</span>
                            ${dot}
                        </div>
                    </div>
                    <div class="notif-msg">${escapeHtml(n.message)}</div>
                    <div class="notif-footer-row">
                        <span class="notif-type-tag ${info.tag}">${info.label}</span>
                        <div class="notif-item-actions">
                            ${checkBtn}
                            <button class="ni-act-btn ni-act-btn--danger delete-btn" data-id="${n.id}" title="Delete" aria-label="Delete">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ── Render feed (replaces list entirely, bound once) ── */
    let bound = false;
    function bindItemActions() {
        const list = document.getElementById('feed-list');
        if (!list || bound) return;
        bound = true;
        list.addEventListener('click', async (e) => {
            const markBtn = e.target.closest('.mark-read-btn');
            const delBtn  = e.target.closest('.delete-btn');
            if (!markBtn && !delBtn) return;

            const id = markBtn?.dataset.id ?? delBtn.dataset.id;
            e.stopPropagation();

            const row = list.querySelector(`.notif-item[data-id="${id}"]`);
            if (!row) return;

            if (markBtn) {
                try {
                    await apiFetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH' });
                    row.classList.remove('notif-item--unread', 'notif-item--high', 'notif-item--urgent');
                    row.dataset.read = 'true';
                    markBtn.closest('.notif-item-actions')?.querySelector('.mark-read-btn')?.remove();
                    row.querySelector('.unread-dot')?.remove();
                    updateUnreadCount(-1, false);
                    window.dispatchEvent(new Event('admin:badgesChanged'));
                } catch { toast('Failed to mark as read.', 'danger'); }
            }

            if (delBtn) {
                try {
                    await apiFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(20px)';
                    row.style.transition = 'opacity 0.2s, transform 0.2s';
                    row.addEventListener('transitionend', () => {
                        row.remove();
                        const remaining = list.querySelectorAll('.notif-item');
                        if (!remaining.length) renderFeed([]);
                    });
                    await loadStats();
                    window.dispatchEvent(new Event('admin:badgesChanged'));
                } catch { toast('Failed to delete.', 'danger'); }
            }
        });
    }

    function renderFeed(items) {
        const list = document.getElementById('feed-list');
        if (!list) return;
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = `
                <div class="feed-empty">
                    <div class="feed-empty-icon"><i data-lucide="bell-off"></i></div>
                    <h3>No notifications</h3>
                    <p>You're all caught up.</p>
                </div>`;
            if (window.lucide) lucide.createIcons();
            document.getElementById('load-more-wrap').style.display = 'none';
            bound = false;
            return;
        }

        const frag = document.createDocumentFragment();
        const tmp  = document.createElement('div');
        tmp.innerHTML = items.map(buildNotifHTML).join('');
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        list.appendChild(frag);

        bound = false;
        bindItemActions();
        if (window.lucide) lucide.createIcons();

        const wrap = document.getElementById('load-more-wrap');
        wrap.style.display = state.hasMore ? 'block' : 'none';
    }

    function updateUnreadCount(delta) {
        const el = document.getElementById('stat-unread');
        if (el) el.textContent = Math.max(0, (parseInt(el.textContent) || 0) + delta);
        const badge = document.getElementById('sidebar-notif-count');
        const topBadge = document.getElementById('notif-badge');
        const cur = Math.max(0, (parseInt(badge?.textContent) || 0) + delta);
        if (badge) { badge.textContent = cur; badge.style.display = cur > 0 ? 'flex' : 'none'; }
        if (topBadge) { topBadge.textContent = cur > 99 ? '99+' : cur; topBadge.style.display = cur > 0 ? 'flex' : 'none'; }
    }

    /* ── Load notifications ── */
    async function loadNotifications(append = false) {
        if (!append) {
            const list = document.getElementById('feed-list');
            if (list) list.innerHTML = `
                <div class="skel-notif"></div><div class="skel-notif"></div>
                <div class="skel-notif"></div><div class="skel-notif"></div>`;
            state.offset = 0;
        }

        try {
            const params = new URLSearchParams({
                limit:  LIMIT,
                offset: String(state.offset),
            });

            const result = await apiFetch(`/api/admin/notifications?${params}`);
            const data = result.data;

            let items = data?.notifications ?? [];

            /* ── Client-side filters (backend ignores read param) ── */
            if (state.readFilter === true)  items = items.filter(n => n.read);
            if (state.readFilter === false) items = items.filter(n => !n.read);

            if (state.search) {
                const q = state.search.toLowerCase();
                items = items.filter(n =>
                    n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
                );
            }

            state.total   = data?.total ?? items.length;
            state.hasMore = data?.hasMore ?? false;

            if (append) state.items = [...state.items, ...items];
            else state.items = items;

            renderFeed(items);
        } catch (err) {
            console.error('[Notifications] loadNotifications failed:', err);
            if (!append) {
                const list = document.getElementById('feed-list');
                if (list) {
                    list.innerHTML = `
                        <div class="feed-empty">
                            <div class="feed-empty-icon"><i data-lucide="wifi-off"></i></div>
                            <h3>Could not load notifications</h3>
                            <p>Check that the backend is running.</p>
                        </div>`;
                    if (window.lucide) lucide.createIcons();
                }
            }
        }
    }

    /* ── Load more (delegated) ── */
    document.getElementById('load-more-wrap').addEventListener('click', async (e) => {
        const btn = e.target.closest('#load-more-btn');
        if (!btn || btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" style="width:14px;height:14px;"></i> Loading…`;
        if (window.lucide) lucide.createIcons({ nodes: [btn] });
        state.offset += LIMIT;
        await loadNotifications(true);
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="chevron-down"></i> Load more`;
        if (window.lucide) lucide.createIcons({ nodes: [btn] });
    });

    /* ── Filter pills ── */
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.readFilter = pill.dataset.read === '' ? '' : pill.dataset.read === 'true';
            loadNotifications();
        });
    });

    /* ── Search ── */
    let searchTimer;
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { state.search = e.target.value.trim(); loadNotifications(); }, 350);
    });
    document.getElementById('topnav-search-input')?.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { state.search = e.target.value.trim(); loadNotifications(); }, 350);
    });

    /* ── Mark all read ── */
    document.getElementById('mark-all-btn')?.addEventListener('click', async () => {
        try {
            await apiFetch('/api/admin/notifications/read-all', { method: 'PATCH' });
            toast('All marked as read.', 'success');
            await Promise.all([loadNotifications(), loadStats()]);
            window.dispatchEvent(new Event('admin:badgesChanged'));
        } catch { toast('Failed.', 'danger'); }
    });

    /* ── Clear all ── */
    document.getElementById('clear-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete all internal admin alerts? User notifications will not be affected.')) return;
        try {
            const result = await apiFetch('/api/admin/notifications/clear-all', { method: 'DELETE' });
            const count = result?.data?.clearedCount ?? result?.clearedCount ?? 'All';
            toast(`${count} internal notification(s) cleared.`, 'success');
            await Promise.all([loadNotifications(), loadStats()]);
            window.dispatchEvent(new Event('admin:badgesChanged'));
        } catch { toast('Failed to clear.', 'danger'); }
    });

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
            console.error('[Notifications] loadProfile failed:', err);
        }
    }

    /* ── Init ── */
    loadProfile();
    loadStats();
    loadNotifications();
    loadTypeBreakdown();
    loadQuickActions();

    window.addEventListener('admin:profileUpdated', () => {
        loadProfile();
        Promise.all([loadStats(), loadNotifications(), loadTypeBreakdown(), loadQuickActions()]);
    });
    window.addEventListener('focus', () => {
        Promise.all([loadStats(), loadNotifications(), loadTypeBreakdown(), loadQuickActions()]);
    });
})();
