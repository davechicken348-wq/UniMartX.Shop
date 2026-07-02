/* ═══════════════════════════════════════════
  ADMIN SIDEBAR — Event-driven, no polling
═══════════════════════════════════════════ */

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

    const sidebar        = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleBtn      = document.getElementById('sidebar-toggle');
    const adminMain      = document.getElementById('admin-main');
    const topnav         = document.getElementById('topnav');

    if (!sidebar) return;

    // ── Collapse / expand ─────────────────────
    const COLLAPSED_KEY = 'admin_sidebar_collapsed';
    let isCollapsed = localStorage.getItem(COLLAPSED_KEY) === 'true';

    function applyCollapsed() {
        sidebar.classList.toggle('collapsed', isCollapsed);
        if (adminMain) adminMain.classList.toggle('collapsed', isCollapsed);
        if (topnav)    topnav.classList.toggle('collapsed', isCollapsed);
    }
    applyCollapsed();

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            localStorage.setItem(COLLAPSED_KEY, isCollapsed);
            applyCollapsed();
            if (document.documentElement.classList.contains('no-transition')) {
                document.documentElement.classList.remove('no-transition');
            }
        });
    }

    // ── Mobile drawer ─────────────────────────
    function openSidebar()  {
        sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    const hamburger = document.getElementById('topnav-hamburger');
    if (hamburger) hamburger.addEventListener('click', openSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

    // ── Active nav item ───────────────────────
    const pageFile = window.location.pathname.split('/').pop() || '';
    const pageBase = pageFile.replace(/\.html$/, '');
    document.querySelectorAll('.nav-item[href]').forEach(item => {
        const href = item.getAttribute('href') || '';
        const hrefBase = href.replace(/\.html$/, '').split('/').pop() || '';
        if (hrefBase && pageBase === hrefBase) {
            item.classList.add('active');
        }
    });

    // ── Auth & user info ──────────────────────
    function updateSidebarUser(data) {
        const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || 'Admin';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

        const avatarEl = document.getElementById('sidebar-avatar');
        const nameEl   = document.getElementById('sidebar-name');
        const roleEl   = document.getElementById('sidebar-role');

        if (avatarEl) {
            if (data.avatar) {
                avatarEl.innerHTML = '';
                const img = document.createElement('img');
                img.src = data.avatar;
                img.alt = 'Avatar';
                img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
                avatarEl.appendChild(img);
            } else {
                avatarEl.textContent = initials;
            }
        }
        if (nameEl) nameEl.textContent = name;
        if (roleEl) roleEl.textContent = data.role === 'admin' ? 'Super Admin' : data.role;
    }

    async function loadSidebarProfile() {
        try {
            const result = await apiFetch('/api/auth/me');
            if (!result || !result.success) return;
            updateSidebarUser(result.data);
        } catch (err) {
            console.error('[Sidebar] Profile load failed:', err);
        }
    }

    // ── Notification badge on sidebar ────────
    async function fetchSidebarNotifBadge() {
        try {
            const result = await apiFetch('/api/admin/notifications/unread-count');
            const count = result?.data?.count ?? 0;
            const badge = document.getElementById('sidebar-notif-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch {
            // silent
        }
    }

    // ── Pending badge on sidebar ─────────────
    async function fetchSidebarPendingBadge() {
        try {
            const result = await apiFetch('/api/admin/sellers/pending-count');
            const count = result?.data?.count ?? 0;
            const badge = document.getElementById('sidebar-sellers-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch {
            // silent
        }
    }

    // Fallback in case polling.js failed to load
    if (!window.__createLiveSync) {
      window.__createLiveSync = function () {
        return { start: function () {}, stop: function () {}, destroy: function () {}, getState: function () { return { running: false }; } };
      };
    }

    // ── Live sync: sidebar badges ───────────────────
    const badgeSync = window.__createLiveSync({
        interval: 4000,
        fetchFn: async function () {
            await Promise.all([fetchSidebarNotifBadge(), fetchSidebarPendingBadge()]);
        },
        onUpdate: function () {},
        getSnapshot: function () { return 'badges'; }
    });

    // ── Live sync: user profile ─────────────────────
    const profileSync = window.__createLiveSync({
        interval: 10000,
        fetchFn: loadSidebarProfile,
        onUpdate: function (data) {
            if (data) updateSidebarUser(data);
        },
        getSnapshot: function (data) {
            if (!data) return '__null__';
            return (data.firstName || '') + '|' + (data.lastName || '') + '|' + (data.avatar || '') + '|' + (data.role || '');
        }
    });

    // ── Event-driven updates only, no intervals ──
    window.addEventListener('admin:badgesChanged', () => {
        fetchSidebarNotifBadge();
        fetchSidebarPendingBadge();
    });

    window.addEventListener('admin:profileUpdated', () => {
        loadSidebarProfile();
    });

    window.addEventListener('focus', () => {
        loadSidebarProfile();
        fetchSidebarNotifBadge();
        fetchSidebarPendingBadge();
    });

    // ── Init ─────────────────────────────────
    loadSidebarProfile().then(function () { profileSync.start(); });
    fetchSidebarNotifBadge().then(function () { badgeSync.start(); });
    fetchSidebarPendingBadge();
})();
