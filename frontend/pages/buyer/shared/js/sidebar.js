/* ═══════════════════════════════════════════
   BUYER SIDEBAR JS
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.__createLiveSync) {
    window.__createLiveSync = function createLiveSync(opts) {
      const config = Object.assign({
        interval: 4000,
        fetchFn: null,
        onUpdate: function () {},
        onError: function () {},
        getSnapshot: function (val) {
          return typeof val === 'string' ? val : JSON.stringify(val);
        }
      }, opts);

      if (typeof config.fetchFn !== 'function') {
        throw new Error('createLiveSync: fetchFn is required');
      }

      let _isFetching = false;
      let _running = false;
      let _lastSnapshot = null;
      let _initialized = false;

      async function tick() {
        if (_isFetching) return;
        _isFetching = true;
        try {
          const result = await config.fetchFn();
          if (result !== undefined && result !== null) {
            const snap = config.getSnapshot(result);
            if (snap !== _lastSnapshot || !_initialized) {
              _lastSnapshot = snap;
              _initialized = true;
              config.onUpdate(result);
            }
          }
        } catch (err) {
          config.onError(err);
        } finally {
          _isFetching = false;
        }
      }

      async function resume() {
        _initialized = false;
        _lastSnapshot = null;
        await tick();
      }

      function start() {
        if (_running) return;
        _running = true;
        (async function loop() {
          while (_running) {
            await tick();
            if (!_running) break;
            await new Promise(function (resolve) {
              setTimeout(resolve, config.interval);
            });
          }
        })();
      }

      function stop() {
        _running = false;
      }

      function destroy() {
        stop();
      }

      function getState() {
        return { running: _running, initialized: _initialized };
      }

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') {
            _isFetching = false;
            stop();
            resume().then(function () {
              if (!_running) start();
            });
          }
        });

        window.addEventListener('online', function () {
          _isFetching = false;
          stop();
          resume().then(function () {
            if (!_running) start();
          });
        });

        window.addEventListener('focus', function () {
          _isFetching = false;
          resume();
        });

        window.addEventListener('beforeunload', stop);
      }

      return { start: start, stop: stop, destroy: destroy, getState: getState };
    };
  }

  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const toggleBtn      = document.getElementById('sidebar-toggle');
  const buyerMain      = document.getElementById('buyer-main');
  const topnav         = document.getElementById('topnav');

  if (!sidebar) return;

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

  function updateSidebarUser(data) {
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || 'User';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl   = document.getElementById('sidebar-name');

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
  }

  // ── Collapse / expand ─────────────────────────
  const COLLAPSED_KEY = 'buyer_sidebar_collapsed';
  let isCollapsed = localStorage.getItem(COLLAPSED_KEY) === 'true';

  function applyCollapsed() {
    sidebar.classList.toggle('collapsed', isCollapsed);
    if (buyerMain) buyerMain.classList.toggle('collapsed', isCollapsed);
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

  // ── Mobile drawer ──────────────────────────────
  function openSidebar() {
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

  // ── Active nav item ────────────────────────────
  const pageFile = window.location.pathname.split('/').pop() || '';
  const pageBase = pageFile.replace(/\.html$/, '');
  document.querySelectorAll('.nav-item[href]').forEach(item => {
    const href = item.getAttribute('href') || '';
    const hrefBase = href.replace(/\.html$/, '').split('/').pop() || '';
    if (hrefBase && pageBase === hrefBase) {
      item.classList.add('active');
    }
  });

  // ── Badge data logic ───────────────────────────
  function updateSidebarBadge(count) {
    const notifBadge = document.getElementById('sidebar-notif-count');
    if (notifBadge) {
      notifBadge.textContent = count;
      notifBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  async function fetchSidebarBadgeCount() {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) return json.data.count;
    } catch (err) {
      // silent fail
    }
    return null;
  }

  // ── Live sync: sidebar badge ───────────────────
  const badgeSync = window.__createLiveSync({
    interval: 60000,
    fetchFn: fetchSidebarBadgeCount,
    onUpdate: function (count) {
      if (count !== null) updateSidebarBadge(count);
    },
    getSnapshot: function (val) { return String(val); }
  });

  // ── Live sync: user data ───────────────────────
  const userSync = window.__createLiveSync({
    interval: 120000,
    fetchFn: fetchUserData,
    onUpdate: function (data) {
      if (data) updateSidebarUser(data);
    },
    getSnapshot: function (data) {
      if (!data) return '__null__';
      return (data.firstName || '') + '|' + (data.lastName || '') + '|' + (data.avatar || '');
    }
  });

  // ── Init ───────────────────────────────────────
  fetchUserData().then(function (data) {
    if (data) {
      updateSidebarUser(data);
    } else {
      const initials = localStorage.getItem('sidebar_initials') || '';
      const name     = localStorage.getItem('sidebar_name') || '';
      const avatarEl = document.getElementById('sidebar-avatar');
      const nameEl   = document.getElementById('sidebar-name');
      if (avatarEl) avatarEl.textContent = initials;
      if (nameEl)   nameEl.textContent   = name;
    }
  }).then(function () {
    userSync.start();
  });

  fetchSidebarBadgeCount().then(function (count) {
    if (count !== null) updateSidebarBadge(count);
    badgeSync.start();
  });

  // ── Event-driven badge updates from pages ─────
  window.addEventListener('buyer:badgesChanged', function () {
    fetchSidebarBadgeCount().then(function (count) {
      if (count !== null) updateSidebarBadge(count);
    });
  });

})();
