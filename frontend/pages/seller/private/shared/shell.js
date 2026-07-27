/* ═══════════════════════════════════════════════════════════════
   SELLER OS — SHARED APPLICATION SHELL
   -----------------------------------------------------------------
   Single source of truth for the sidebar + topnav. Mounts ONCE per
   browser session and survives in-app navigation by swapping only
   <main>, so the shell is never destroyed/re-rendered between
   sections. Cross-page (full reload) restores state instantly with
   no animation via the `no-transition` class set in head-shell.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

  const COLLAPSED_KEY  = 'seller_sidebar_collapsed';
  const NAV_GROUPS_KEY = 'seller_sidebar_groups';
  const NAV_SCROLL_KEY = 'seller_sidebar_scroll';
  const ACTIVE_KEY     = 'seller_nav_active';

  function getBool(key, fallback) {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === 'true';
  }
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
    const fb = localStorage.getItem('authToken');
    if (!fb || fb === 'undefined' || fb === 'null') return null;
    return fb;
  }

  // Site-absolute base for the seller private area (works at any page
  // depth). Pages are served from /pages/seller/private/.
  function privateBase() {
    const parts = window.location.pathname.split('/');
    const idx = parts.indexOf('private');
    if (idx !== -1) return parts.slice(0, idx + 1).join('/') + '/';
    return '/pages/seller/private/';
  }
  const PB = privateBase(); // e.g. /pages/seller/private/
  const link = (p) => PB + p;

  /* ── Sidebar markup (built once) ─────────────────────────────── */
  function sidebarMarkup() {
    return `
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
            <div class="sidebar-logo-icon"><i data-lucide="briefcase"></i></div>
            <span class="sidebar-logo-text">Unimart<span>X</span></span>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">
            <i data-lucide="chevron-left"></i>
        </button>
        <nav class="sidebar-nav">
            <span class="nav-section-label">My Business</span>
            <a href="${link('dashboard/overview.html')}" class="nav-item" data-tooltip="Dashboard" data-nav="overview">
                <div class="nav-item-icon"><i data-lucide="layout-dashboard"></i></div>
                <span class="nav-item-label">My Dashboard</span>
            </a>
            <a href="${link('orders/order-list.html')}" class="nav-item" data-tooltip="Orders" data-nav="orders">
                <div class="nav-item-icon"><i data-lucide="shopping-bag"></i></div>
                <span class="nav-item-label">My Orders</span>
                <span class="nav-item-badge" id="sidebar-orders-count"></span>
            </a>
            <a href="${link('products/product-list.html')}" class="nav-item" data-tooltip="Products" data-nav="products">
                <div class="nav-item-icon"><i data-lucide="package"></i></div>
                <span class="nav-item-label">My Products</span>
            </a>
            <a href="${link('products/add-product.html')}" class="nav-item" data-tooltip="Add Product" data-nav="add-product">
                <div class="nav-item-icon"><i data-lucide="plus-circle"></i></div>
                <span class="nav-item-label">Add Product</span>
            </a>

            <span class="nav-section-label">My Store</span>
            <a href="${link('profile/customize-store.html')}" class="nav-item" data-tooltip="My Store" data-nav="customize-store">
                <div class="nav-item-icon"><i data-lucide="store"></i></div>
                <span class="nav-item-label">My Store</span>
            </a>
            <a href="${link('profile/customize-profile.html')}" class="nav-item" data-tooltip="Profile" data-nav="customize-profile">
                <div class="nav-item-icon"><i data-lucide="user"></i></div>
                <span class="nav-item-label">My Profile</span>
            </a>
            <a href="${link('profile/account-settings.html')}" class="nav-item" data-tooltip="Settings" data-nav="account-settings">
                <div class="nav-item-icon"><i data-lucide="settings"></i></div>
                <span class="nav-item-label">Settings</span>
            </a>

            <span class="nav-section-label">Growth</span>
            <a href="#" class="nav-item disabled" data-tooltip="Analytics (Coming Soon)">
                <div class="nav-item-icon"><i data-lucide="bar-chart-3"></i></div>
                <span class="nav-item-label">My Analytics</span>
                <span class="coming-soon-badge">Coming Soon</span>
            </a>
            <a href="#" class="nav-item disabled" data-tooltip="Customers (Coming Soon)">
                <div class="nav-item-icon"><i data-lucide="users"></i></div>
                <span class="nav-item-label">My Customers</span>
                <span class="coming-soon-badge">Coming Soon</span>
            </a>
            <a href="#" class="nav-item disabled" data-tooltip="Marketing (Coming Soon)">
                <div class="nav-item-icon"><i data-lucide="megaphone"></i></div>
                <span class="nav-item-label">Marketing</span>
                <span class="coming-soon-badge">Coming Soon</span>
            </a>

            <span class="nav-section-label">More</span>
            <a href="${link('notifications.html')}" class="nav-item" data-tooltip="Notifications" data-nav="notifications">
                <div class="nav-item-icon"><i data-lucide="bell"></i></div>
                <span class="nav-item-label">Notifications</span>
                <span class="nav-item-badge" id="sidebar-notif-count"></span>
            </a>
            <a href="/pages/public/stores/stores.html" class="nav-item" data-tooltip="Find More">
                <div class="nav-item-icon"><i data-lucide="home"></i></div>
                <span class="nav-item-label">Find More Stores</span>
            </a>
            <a href="/pages/public/info/faq.html" class="nav-item" data-tooltip="Help">
                <div class="nav-item-icon"><i data-lucide="help-circle"></i></div>
                <span class="nav-item-label">Help & FAQ</span>
            </a>
        </nav>
        <div class="sidebar-footer">
            <div class="sidebar-user">
                <div class="sidebar-avatar" id="sidebar-avatar"></div>
                <div class="sidebar-user-info">
                    <p class="sidebar-user-name" id="sidebar-name"></p>
                    <p class="sidebar-user-role" id="sidebar-store">Seller</p>
                </div>
                <a href="/pages/auth/logout.html" class="sidebar-logout" aria-label="Log out">
                    <i data-lucide="log-out"></i>
                </a>
            </div>
        </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>`;
  }

  /* ── Topnav markup (built once) ──────────────────────────────── */
  function topnavMarkup() {
    return `
    <header class="topnav" id="topnav">
        <button class="topnav-hamburger" id="topnav-hamburger" aria-label="Open menu">
            <i data-lucide="menu"></i>
        </button>
        <div class="topnav-title">
            <h1 id="topnav-title-text">Seller</h1>
            <p id="topnav-greeting"></p>
        </div>
        <div class="topnav-search">
            <i data-lucide="search"></i>
            <input type="search" placeholder="Search orders, products…" aria-label="Search">
        </div>
        <div class="topnav-actions">
            <a href="#" id="view-my-shop-btn" class="topnav-add-btn" target="_blank" rel="noopener" title="View your public store">
                <i data-lucide="external-link"></i>
                <span>Visit Store</span>
            </a>
            <a href="${link('products/add-product.html')}" class="topnav-add-btn" style="background:var(--os-accent);color:#1c1917;">
                <i data-lucide="plus"></i>
                <span>Add Product</span>
            </a>
            <div style="position:relative;">
                <button class="topnav-btn" id="notif-btn" aria-label="Notifications">
                    <i data-lucide="bell"></i>
                    <span class="topnav-badge" id="notif-badge">0</span>
                </button>
                <div class="notif-panel" id="notif-panel">
                    <div class="notif-header">
                        <h3>Notifications</h3>
                        <button class="notif-mark-read" id="mark-read">Mark all read</button>
                    </div>
                    <div class="notif-list" id="notif-list"></div>
                    <div class="notif-footer"><a href="${link('notifications.html')}">View all</a></div>
                </div>
            </div>
            <div style="position:relative;">
                <div class="topnav-user" id="topnav-user">
                    <div class="topnav-avatar" id="topnav-avatar"></div>
                    <span class="topnav-username" id="topnav-username"></span>
                    <i data-lucide="chevron-down" class="topnav-chevron"></i>
                </div>
                <div class="topnav-dropdown" id="topnav-dropdown">
                    <a href="${link('profile/customize-profile.html')}" class="dropdown-item"><i data-lucide="user"></i> My Profile</a>
                    <a href="${link('profile/customize-store.html')}" class="dropdown-item"><i data-lucide="store"></i> My Store</a>
                    <a href="${link('profile/account-settings.html')}" class="dropdown-item"><i data-lucide="settings"></i> Settings</a>
                    <div class="dropdown-divider"></div>
                    <a href="/pages/public/home.html" class="dropdown-item"><i data-lucide="globe"></i> Public Site</a>
                    <div class="dropdown-divider"></div>
                    <a href="/pages/auth/logout.html" class="dropdown-item dropdown-item--danger"><i data-lucide="log-out"></i> Log Out</a>
                </div>
            </div>
        </div>
    </header>`;
  }

  /* ── Mount the shell once ────────────────────────────────────── */
  function mountShell() {
    const mount = document.getElementById('app-shell');
    if (!mount) return;
    if (!document.getElementById('sidebar'))  mount.insertAdjacentHTML('afterbegin', sidebarMarkup());
    if (!document.getElementById('topnav'))   mount.insertAdjacentHTML('afterbegin', topnavMarkup());

    restoreVisualState();
    bindShell();
    bindTopnav();
    initShellData();

    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();

    // Re-enable transitions after first paint (restore was flash-free).
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('no-transition');
      });
    });
  }

  /* ── Restore saved state instantly (no animation) ───────────── */
  function restoreVisualState() {
    const sidebar    = document.getElementById('sidebar');
    const sellerMain = document.getElementById('seller-main');
    const topnav     = document.getElementById('topnav');
    const isCollapsed = getBool(COLLAPSED_KEY, false);

    if (sidebar)    sidebar.classList.toggle('collapsed', isCollapsed);
    if (sellerMain) sellerMain.classList.toggle('collapsed', isCollapsed);
    if (topnav)     topnav.classList.toggle('collapsed', isCollapsed);

    const active = localStorage.getItem(ACTIVE_KEY) || currentNavKey();
    if (active) {
      document.querySelectorAll('.nav-item[data-nav]').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-nav') === active);
      });
    }

    const nav = sidebar && sidebar.querySelector('.sidebar-nav');
    const scroll = parseInt(localStorage.getItem(NAV_SCROLL_KEY) || '0', 10);
    if (nav && scroll > 0) nav.scrollTop = scroll;
  }

  function currentNavKey() {
    const file = (window.location.pathname.split('/').pop() || '').replace(/\.html$/, '') || 'overview';
    const map = {
      'overview': 'overview',
      'order-list': 'orders', 'order-details': 'orders',
      'product-list': 'products', 'product-details': 'products', 'add-product': 'add-product',
      'customize-store': 'customize-store', 'customize-profile': 'customize-profile',
      'account-settings': 'account-settings', 'notifications': 'notifications'
    };
    return map[file] || null;
  }

  /* ── Bind shell interactions (run once) ─────────────────────── */
  function bindShell() {
    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('sidebar-overlay');
    const toggleBtn  = document.getElementById('sidebar-toggle');
    const sellerMain = document.getElementById('seller-main');
    const topnav     = document.getElementById('topnav');

    function toggleSidebar() {
      document.documentElement.classList.remove('no-transition');
      const willCollapse = !sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed', willCollapse);
      if (sellerMain) sellerMain.classList.toggle('collapsed', willCollapse);
      if (topnav)     topnav.classList.toggle('collapsed', willCollapse);
      localStorage.setItem(COLLAPSED_KEY, willCollapse);
    }
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);

    function openSidebar() {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
    const hamburger = document.getElementById('topnav-hamburger');
    if (hamburger) hamburger.addEventListener('click', openSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSidebar(); });

    const nav = sidebar && sidebar.querySelector('.sidebar-nav');
    if (nav) {
      let t = null;
      nav.addEventListener('scroll', function () {
        if (t) clearTimeout(t);
        t = setTimeout(function () { localStorage.setItem(NAV_SCROLL_KEY, nav.scrollTop); }, 200);
      }, { passive: true });
    }

    document.querySelectorAll('.nav-item[href]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        const href = item.getAttribute('href') || '';
        const key = item.getAttribute('data-nav');
        if (key) localStorage.setItem(ACTIVE_KEY, key);
        if (item.classList.contains('disabled')) { e.preventDefault(); return; }
        if (href.indexOf('http') === 0 || href.charAt(0) === '#') return;
        if (!href.endsWith('.html')) return;
        e.preventDefault();
        navigateTo(href);
      });
    });
  }

  /* ── Sync the destination page's <head> stylesheets into the
     current document. In-app navigation only swaps <main>, so the
     destination's page-specific CSS would otherwise never load until
     a full reload. We add any stylesheet <link> not already present,
     resolving relative URLs against the destination page. ──────── */
  function syncHeadStyles(newDoc, baseUrl) {
    const head = document.head;

    const shellHrefs = new Set([
      'seller-base.css',
      'sidebar.css',
      'topnav.css',
      'seller-os.css'
    ]);

    function isShellStyleSheet(link) {
      const href = link.getAttribute('href') || '';
      return shellHrefs.has(href.split('/').pop().split('?')[0]);
    }

    head.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
      if (!isShellStyleSheet(l)) l.remove();
    });

    const present = {};
    head.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
      try { present[new URL(l.getAttribute('href'), window.location.href).href] = true; }
      catch (e) {}
    });
    newDoc.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
      const raw = l.getAttribute('href');
      if (!raw) return;
      let abs;
      try { abs = new URL(raw, baseUrl).href; } catch (e) { return; }
      if (present[abs]) return;
      present[abs] = true;
      const clone = l.cloneNode(true);
      clone.setAttribute('href', abs);
      clone.dataset.shellStyle = '1';
      head.appendChild(clone);
    });
  }

  /* ── In-app navigation: swap only <main>, keep shell mounted ── */
  async function navigateTo(href) {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) { window.location.href = href; return; }
    if (url.pathname.indexOf('/seller/private/') === -1) { window.location.href = href; return; }

    // Visual feedback without rebuilding the shell.
    const main = document.getElementById('seller-main');
    try {
      const res = await fetch(url.pathname + url.search);
      if (!res.ok) throw new Error('fetch failed');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newMain = doc.getElementById('seller-main');
      if (!newMain || !main) throw new Error('no main');

      syncHeadStyles(doc, url.href);

      // Tear down the outgoing page (clear its intervals/listeners) so a
      // previously injected page script can't keep polling a detached <main>.
      if (typeof window.__umxTeardown === 'function') {
        try { window.__umxTeardown(); } catch (e) {}
        window.__umxTeardown = null;
      }

      main.innerHTML = newMain.innerHTML;
      if (doc.title) document.title = doc.title;
      restoreVisualState();
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();

      window.history.pushState({ path: url.pathname }, '', url.pathname + url.search);
      window.scrollTo(0, 0);

      window.dispatchEvent(new CustomEvent('shell:navigated', { detail: { path: url.pathname } }));

       // Re-run the destination page's script. Injected as a CLASSIC script
      // (not a module) so it behaves exactly like a normal first-load script:
      // its top-level bootstrap/init runs immediately on append, globals and
      // window.* handlers are shared, and the existing readyState guard in
      // each page script fires init() correctly after the <main> swap.
      // Cache-busted (?t=) so it re-executes cleanly on every navigation.
      const pageScript = doc.getElementById('page-script');
      if (pageScript && pageScript.getAttribute('src')) {
        document.querySelectorAll('script[data-injected-page]').forEach(function (s) { s.remove(); });
        const fresh = document.createElement('script');
        fresh.dataset.injectedPage = '1';
        const src = pageScript.getAttribute('src').split('?')[0];
        fresh.src = src + '?t=' + Date.now();
        document.body.appendChild(fresh);
      }
    } catch (err) {
      window.location.href = href; // graceful fallback
    }
  }

    window.addEventListener('popstate', function () {
      const path = (window.history.state && window.history.state.path) || window.location.pathname;
      if (path && document.getElementById('seller-main')) {
        const file = path.split('/').pop();
        navigateTo(file);
      }
    });

    // Re-fetch shell data after every in-app navigation so that sidebar
    // user info and badge counts stay fresh without requiring a reload.
    window.addEventListener('shell:navigated', function () {
      initShellData();
    });

  /* ═══════════════════════════════════════════════════════════
     TOPNAV behaviour (folded from topnav.js — bound once)
     ═══════════════════════════════════════════════════════════ */
  function bindTopnav() {
    const userTrigger = document.getElementById('topnav-user');
    const dropdown    = document.getElementById('topnav-dropdown');
    const notifBtn    = document.getElementById('notif-btn');
    const notifPanel  = document.getElementById('notif-panel');
    const notifBadge  = document.getElementById('notif-badge');
    const markRead    = document.getElementById('mark-read');
    const notifList   = notifPanel ? notifPanel.querySelector('.notif-list') : null;

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
        const res = await fetch(`${API_BASE}/api/notifications/unread-count`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        if (res.ok && json.success) return json.data.count;
      } catch {}
      return null;
    }
    async function fetchNotifData() {
      const token = getAuthToken();
      if (!token) return null;
      try {
        const [nRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/notifications?limit=5`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/notifications/unread-count`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const [nJson, cJson] = await Promise.all([nRes.json(), cRes.json()]);
        if (!nJson.success || !cJson.success) return null;
        return { notifications: nJson.data.notifications, count: cJson.data.count };
      } catch { return null; }
    }
    function formatTime(iso) {
      const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + 'm ago';
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      return Math.floor(hrs / 24) + 'd ago';
    }
    function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

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
            await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
            el.classList.remove('unread');
            const dot = el.querySelector('.notif-dot'); if (dot) dot.style.background = 'transparent';
            const fresh = await fetchNotifData(); if (fresh) renderNotifPanel(fresh);
          }, { once: true });
        });
      }
    }

    if (userTrigger && dropdown) {
      userTrigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('open');
        userTrigger.classList.toggle('open', isOpen);
        if (notifPanel) notifPanel.classList.remove('open');
      });
    }
    if (notifBtn && notifPanel) {
      notifBtn.addEventListener('click', e => {
        e.stopPropagation();
        const opening = notifPanel.classList.toggle('open');
        if (dropdown) dropdown.classList.remove('open');
        if (userTrigger) userTrigger.classList.remove('open');
        if (opening) {
          fetchNotifData().then(d => { if (d) renderNotifPanel(d); });
        }
      });
      if (markRead) {
        markRead.addEventListener('click', async () => {
          const token = getAuthToken(); if (!token) return;
          await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
          const fresh = await fetchNotifData(); if (fresh) renderNotifPanel(fresh);
        });
      }
    }
    document.addEventListener('click', () => {
      if (dropdown)   dropdown.classList.remove('open');
      if (notifPanel) notifPanel.classList.remove('open');
      if (userTrigger) userTrigger.classList.remove('open');
    });

    // Scroll shadow.
    if (document.getElementById('topnav')) {
      window.addEventListener('scroll', () => {
        const tn = document.getElementById('topnav');
        if (tn) tn.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
      });
    }

    // My Shop button.
    (async function () {
      const btn = document.getElementById('view-my-shop-btn');
      if (!btn) return;
      const cached = localStorage.getItem('seller_id');
      if (cached) { btn.href = '/pages/seller/public/store/store.html?sellerId=' + cached; return; }
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/api/seller/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        if (json.success && json.data && json.data.sellerId) {
          localStorage.setItem('seller_id', json.data.sellerId);
          btn.href = `../../../seller/public/store/store.html?sellerId=${json.data.sellerId}`;
        }
      } catch {}
    })();

    // Initial badge.
    fetchBadgeCount().then(function (count) { if (count !== null) updateNotifBadge(count); });
  }

  /* ── Shell user data (sidebar + topnav avatars) ─────────────── */
  async function fetchUserData() {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok && json.success) return json.data;
    } catch {}
    return null;
  }
  function updateSidebarUser(data) {
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || 'User';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
    const av = document.getElementById('sidebar-avatar');
    const nm = document.getElementById('sidebar-name');
    const tav = document.getElementById('topnav-avatar');
    const tnm = document.getElementById('topnav-username');
    if (av) { if (data.avatar) { av.innerHTML = ''; const i = document.createElement('img'); i.src = data.avatar; i.alt = 'Avatar'; i.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;'; av.appendChild(i); } else { av.textContent = initials; } }
    if (nm) nm.textContent = name;
    if (tav) { if (data.avatar) { tav.innerHTML = ''; const i = document.createElement('img'); i.src = data.avatar; i.alt = 'Avatar'; i.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;'; tav.appendChild(i); } else { tav.textContent = initials; } }
    if (tnm) tnm.textContent = name;
  }
  function updateSidebarBadges(data) {
    const nb = document.getElementById('sidebar-notif-count');
    const ob = document.getElementById('sidebar-orders-count');
    if (nb) { nb.textContent = data.count; nb.style.display = data.count > 0 ? 'flex' : 'none'; }
    if (ob) { ob.textContent = data.pending; ob.style.display = data.pending > 0 ? 'flex' : 'none'; }
  }
  async function fetchSidebarBadges() {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok && json.success) return { count: json.data.count || 0, pending: json.data.pendingOrders || 0 };
    } catch {}
    return null;
  }
  function initShellData() {
    fetchUserData().then(function (data) {
      if (data) updateSidebarUser(data);
      else {
        const initials = localStorage.getItem('sidebar_initials') || '';
        const name = localStorage.getItem('sidebar_name') || '';
        const av = document.getElementById('sidebar-avatar');
        const nm = document.getElementById('sidebar-name');
        if (av) av.textContent = initials;
        if (nm) nm.textContent = name;
      }
    });
    fetchSidebarBadges().then(function (data) { if (data) updateSidebarBadges(data); });
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountShell);
  } else {
    mountShell();
  }

})();
