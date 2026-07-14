(function () {
  'use strict';

  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

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

  async function fetchUserData() {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) return json.data;
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
    return null;
  }

  // ── Scroll shadow ─────────────────────────────
  const topnav = document.getElementById('topnav');
  if (topnav) {
    window.addEventListener('scroll', () => {
      topnav.style.boxShadow =
        window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
    });
  }

  // ── Update topnav user info ───────────────────
  function updateTopnavUser(data) {
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || 'User';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

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
  }

  // ── Live sync: user data ──────────────────────
  const userSync = window.__createLiveSync({
    interval: 120000,
    fetchFn: fetchUserData,
    onUpdate: function (data) {
      if (data) updateTopnavUser(data);
    },
    getSnapshot: function (data) {
      if (!data) return '__null__';
      return (data.firstName || '') + '|' + (data.lastName || '') + '|' + (data.avatar || '') + '|' + (data.role || '');
    }
  });

  // Initial user load
  fetchUserData().then(function (data) {
    if (data) {
      updateTopnavUser(data);
    } else {
      const name     = localStorage.getItem('snav_firstname') || '';
      const initials = name ? name.charAt(0).toUpperCase() : '';
      const avatarEl   = document.getElementById('topnav-avatar');
      const usernameEl = document.getElementById('topnav-username');
      if (avatarEl)   avatarEl.textContent   = initials;
      if (usernameEl) usernameEl.textContent  = name;
    }
  }).then(function () {
    userSync.start();
  });

  // ── User dropdown ─────────────────────────────
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

  // ── Notifications ─────────────────────────────
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

  function updateNotifBadge(count) {
    if (notifBadge) {
      notifBadge.textContent = count;
      notifBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  async function fetchBadgeCount() {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) return json.data.count;
    } catch {
      // silent
    }
    return null;
  }

  async function fetchNotifData() {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const [notifsRes, countRes] = await Promise.all([
        fetch(`${API_BASE}/api/notifications?limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/notifications/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);
      const [notifsJson, countJson] = await Promise.all([
        notifsRes.json(), countRes.json()
      ]);
      if (!notifsJson.success || !countJson.success) return null;
      return {
        notifications: notifsJson.data.notifications,
        count: countJson.data.count
      };
    } catch {
      return null;
    }
  }

  function renderNotifPanel(data) {
    updateNotifBadge(data.count);

    if (!notifList) return;
    const items = data.notifications;
    if (!items.length) {
      notifList.innerHTML = '<div style="padding:1.25rem;text-align:center;font-size:0.82rem;color:var(--text-3)">No notifications</div>';
    } else {
      notifList.innerHTML = items.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
          <div class="notif-dot"></div>
          <div class="notif-body">
            <p>${n.read ? escapeHtml(n.title) : '<strong>' + escapeHtml(n.title) + '</strong>'}</p>
            <p>${escapeHtml(n.message)}</p>
            <p class="notif-time">${formatTime(n.createdAt)}</p>
          </div>
        </div>`).join('');

      const token = getAuthToken();
      notifList.querySelectorAll('.notif-item.unread').forEach(el => {
        el.addEventListener('click', async () => {
          const id = el.dataset.id;
          await fetch(`${API_BASE}/api/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          el.classList.remove('unread');
          const dot = el.querySelector('.notif-dot');
          if (dot) dot.style.background = 'transparent';
          const fresh = await fetchNotifData();
          if (fresh) renderNotifPanel(fresh);
        }, { once: true });
      });
    }
  }

  // Fallback in case polling.js failed to load
  if (!window.__createLiveSync) {
    window.__createLiveSync = function () {
      return { start: function () {}, stop: function () {}, destroy: function () {}, getState: function () { return { running: false }; } };
    };
  }

  // ── Live sync: badge (always) ─────────────────
  const badgeSync = window.__createLiveSync({
    interval: 60000,
    fetchFn: fetchBadgeCount,
    onUpdate: function (count) {
      if (count !== null) updateNotifBadge(count);
    },
    getSnapshot: function (val) { return String(val); }
  });

  // ── Live sync: panel (only when open) ─────────
  const panelSync = window.__createLiveSync({
    interval: 30000,
    fetchFn: fetchNotifData,
    onUpdate: function (data) {
      if (data) renderNotifPanel(data);
    },
    getSnapshot: function (data) {
      if (!data) return '__null__';
      return data.count + ':' + data.notifications.map(n => n.id + ':' + (n.read ? '1' : '0')).join(',');
    }
  });

  // Button / panel wiring
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      const opening = notifPanel.classList.toggle('open');
      if (dropdown) dropdown.classList.remove('open');
      if (userTrigger) userTrigger.classList.remove('open');
      if (opening) panelSync.start();
      else panelSync.stop();
    });

    if (markRead) {
      markRead.addEventListener('click', async () => {
        const token = getAuthToken();
        if (!token) return;
        await fetch(`${API_BASE}/api/notifications/read-all`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const fresh = await fetchNotifData();
        if (fresh) renderNotifPanel(fresh);
      });
    }
  }

  // ── Init ───────────────────────────────────────
  fetchBadgeCount().then(function (count) {
    if (count !== null) updateNotifBadge(count);
    badgeSync.start();
  });

  // ── Close on outside click ────────────────────
  document.addEventListener('click', () => {
    if (dropdown)    dropdown.classList.remove('open');
    if (notifPanel)  {
      notifPanel.classList.remove('open');
      panelSync.stop();
    }
    if (userTrigger) userTrigger.classList.remove('open');
  });

  // ── My Shop button (shared across private pages) ──
  (async function initMyShopBtn() {
    const btn = document.getElementById('view-my-shop-btn');
    if (!btn) return;

    const wireShare = () => {
      const shareEl = document.getElementById('gs-share');
      if (!shareEl || !btn.href) return;
      shareEl.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(btn.href);
          if (typeof showGsToast === 'function') showGsToast('Store link copied to clipboard!');
          else alert('Store link copied to clipboard!');
        } catch {
          window.open(btn.href, '_blank', 'noopener');
        }
      });
    };

    const cached = localStorage.getItem('seller_id');
    if (cached) {
      btn.href = '/pages/seller/public/store/store.html?sellerId=' + cached;
      wireShare();
      return;
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/seller/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data && json.data.sellerId) {
        localStorage.setItem('seller_id', json.data.sellerId);
        btn.href = `../../../seller/public/store/store.html?sellerId=${json.data.sellerId}`;
      }
    } catch {}
    wireShare();
  })();

})();
