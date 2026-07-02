/* ═══════════════════════════════════════════
  ADMIN TOPNAV — Event-driven, no polling
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

    // ── Scroll shadow ─────────────────────────
    const topnav = document.getElementById('topnav');
    if (topnav) {
        window.addEventListener('scroll', () => {
            topnav.style.boxShadow =
                window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
        });
    }

    // ── Update topnav user info ───────────────
    function updateTopnavUser(data) {
        const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || 'Admin';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

        const avatarEl   = document.getElementById('topnav-avatar');
        const usernameEl = document.getElementById('topnav-username');

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
        if (usernameEl) usernameEl.textContent = name;

        // Sync to sidebar
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        const sidebarName   = document.getElementById('sidebar-name');
        if (sidebarAvatar) {
            if (data.avatar) {
                sidebarAvatar.innerHTML = '';
                const img = document.createElement('img');
                img.src = data.avatar;
                img.alt = 'Avatar';
                img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
                sidebarAvatar.appendChild(img);
            } else {
                sidebarAvatar.textContent = initials;
            }
        }
        if (sidebarName) sidebarName.textContent = name;
    }

    async function loadTopnavProfile() {
        try {
            const result = await apiFetch('/api/auth/me');
            if (!result || !result.success) return;
            updateTopnavUser(result.data);
        } catch (err) {
            console.error('[Topnav] Profile load failed:', err);
        }
    }

    // ── User dropdown ─────────────────────────
    const userTrigger = document.getElementById('topnav-user');
    const dropdown    = document.getElementById('topnav-dropdown');

    if (userTrigger && dropdown) {
        userTrigger.addEventListener('click', e => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('open');
            userTrigger.classList.toggle('open', isOpen);
            const notifPanel = document.getElementById('notif-panel');
            if (notifPanel) notifPanel.classList.remove('open');
        });
    }

    // ── Notifications ─────────────────────────
    const notifBtn   = document.getElementById('notif-btn');
    const notifPanel = document.getElementById('notif-panel');
    const notifBadge = document.getElementById('notif-badge');
    const markRead   = document.getElementById('mark-read');
    const notifList  = notifPanel ? notifPanel.querySelector('.notif-list') : null;

    function formatTime(iso) {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function fetchNotifData() {
        try {
            const [notifsRes, countRes] = await Promise.all([
                apiFetch('/api/admin/notifications?limit=5'),
                apiFetch('/api/admin/notifications/unread-count'),
            ]);

            const notifs = notifsRes?.data?.notifications ?? [];
            const count  = countRes?.data?.count ?? 0;

            if (notifBadge) {
                notifBadge.textContent = count;
                notifBadge.style.display = count > 0 ? 'flex' : 'none';
            }

            if (notifList) {
                if (!notifs.length) {
                    notifList.innerHTML = '<div class="notif-empty">No new notifications</div>';
                } else {
                    notifList.innerHTML = notifs.map(n => `
                        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                            <div class="notif-dot"></div>
                            <div class="notif-body">
                                <p>${n.read ? escapeHtml(n.title) : '<strong>' + escapeHtml(n.title) + '</strong>'}</p>
                                <p>${escapeHtml(n.message)}</p>
                                <p class="notif-time">${formatTime(n.createdAt)}</p>
                            </div>
                        </div>`).join('');

                    const notifIdPrefix = 'admin:';
                    notifList.querySelectorAll('.notif-item.unread').forEach(el => {
                        el.addEventListener('click', async () => {
                            const id = el.dataset.id;
                            try {
                                await apiFetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH' });
                                el.classList.remove('unread');
                                const dot = el.querySelector('.notif-dot');
                                if (dot) dot.style.background = 'transparent';
                                const fresh = await fetchNotifData();
                                if (fresh) renderNotifPanel(fresh);
                            } catch {}
                        }, { once: true });
                    });
                }
            }

            return { notifications: notifs, count: count };
        } catch (err) {
            console.error('[Topnav] Notif panel load failed:', err);
        }
        return null;
    }

    // ── Live sync: user data ──────────────────────
    const profileSync = window.__createLiveSync({
        interval: 10000,
        fetchFn: loadTopnavProfile,
        onUpdate: function (data) {
            if (data) updateTopnavUser(data);
        },
        getSnapshot: function (data) {
            if (!data) return '__null__';
            return (data.firstName || '') + '|' + (data.lastName || '') + '|' + (data.avatar || '') + '|' + (data.role || '');
        }
    });

    // Fallback in case polling.js failed to load
    if (!window.__createLiveSync) {
      window.__createLiveSync = function () {
        return { start: function () {}, stop: function () {}, destroy: function () {}, getState: function () { return { running: false }; } };
      };
    }

    // ── Live sync: badge (always) ─────────────────
    const badgeSync = window.__createLiveSync({
        interval: 4000,
        fetchFn: async function () {
            try {
                const result = await apiFetch('/api/admin/notifications/unread-count');
                const count = result?.data?.count ?? 0;
                if (notifBadge) {
                    notifBadge.textContent = count;
                    notifBadge.style.display = count > 0 ? 'flex' : 'none';
                }
                const sidebarBadge = document.getElementById('sidebar-notif-count');
                if (sidebarBadge) {
                    sidebarBadge.textContent = count;
                    sidebarBadge.style.display = count > 0 ? 'flex' : 'none';
                }
                return count;
            } catch {
                return 0;
            }
        },
        onUpdate: function () {},
        getSnapshot: function () { return 'badge'; }
    });

    // ── Live sync: panel (only when open) ─────────
    const panelSync = window.__createLiveSync({
        interval: 4000,
        fetchFn: fetchNotifData,
        onUpdate: function (data) {
            if (data) renderNotifPanel(data);
        },
        getSnapshot: function (data) {
            if (!data) return '__null__';
            return data.count + ':' + data.notifications.map(n => n.id + ':' + (n.read ? '1' : '0')).join(',');
        }
    });

    if (notifBtn && notifPanel) {
        notifBtn.addEventListener('click', e => {
            e.stopPropagation();
            const opening = notifPanel.classList.toggle('open');
            if (dropdown) dropdown.classList.remove('open');
            if (userTrigger) userTrigger.classList.remove('open');
            if (opening) panelSync.start();
            else panelSync.stop();
        });
    }

    if (markRead) {
        markRead.addEventListener('click', async () => {
            try {
                await apiFetch('/api/admin/notifications/read-all', { method: 'PATCH' });
                const fresh = await fetchNotifData();
                if (fresh) renderNotifPanel(fresh);
            } catch {}
        });
    }

    window.addEventListener('admin:badgesChanged', () => {
        badgeSync.stop();
        badgeSync.start();
    });

    window.addEventListener('admin:profileUpdated', () => {
        profileSync.stop();
        profileSync.start();
    });

    window.addEventListener('focus', () => {
        profileSync.stop();
        badgeSync.stop();
        loadTopnavProfile().then(function () {
            profileSync.start();
        });
        badgeSync.start();
    });

    // ── Init ──────────────────────────────────
    loadTopnavProfile().then(function () {
        profileSync.start();
    });
    badgeSync.start();
    // Initial notification panel load if elements exist
    if (notifBtn && notifPanel) fetchNotifData();
})();
