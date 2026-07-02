lucide.createIcons();

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
let _busy = false;

/* ═══════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════ */
const hamburger = document.getElementById('nav-hamburger');
const mobileNav  = document.getElementById('nav-mobile');
if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
        const isOpen = mobileNav.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', String(isOpen));
        hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
        lucide.createIcons();
    });
}

const navUser     = document.getElementById('nav-user');
const navDropdown = document.getElementById('nav-dropdown');
if (navUser && navDropdown) {
    navUser.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navDropdown.classList.toggle('open');
        navUser.classList.toggle('open', isOpen);
    });
    document.addEventListener('click', () => {
        navDropdown.classList.remove('open');
        navUser.classList.remove('open');
    });
}

window.addEventListener('scroll', () => {
    const header = document.getElementById('navbar');
    if (header) {
        header.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.45)' : 'none';
    }
});

/* ═══════════════════════════════════════════
   REVEAL ON SCROLL
═══════════════════════════════════════════ */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    revealEls.forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════ */
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

function getBaseUrl() {
    const h = window.location.hostname;
    const isLocal = h === 'localhost' || h === '127.0.0.1';
    return isLocal ? 'http://127.0.0.1:5000' : '';
}

async function apiFetch(path) {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
            credentials: 'include',
            headers,
            cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/* ═══════════════════════════════════════════
   LOAD: ADMIN INFO
═══════════════════════════════════════════ */
async function loadAdminInfo() {
    try {
        const result = await apiFetch('/api/auth/me');
        if (!result || !result.success) return;

        const u = result.data;
        const name = u.firstName + (u.lastName ? ' ' + u.lastName : '') || 'Admin';
        const initials = name.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'AD';

        const heroName    = document.getElementById('hero-name');
        const navUsername = document.getElementById('nav-username');
        const navAvatar   = document.getElementById('nav-avatar');
        if (heroName)    heroName.textContent    = name;
        if (navUsername) navUsername.textContent  = name;
        if (navAvatar)   navAvatar.textContent    = initials;
    } catch (err) {
        console.error('Failed to load admin info:', err);
    }
}

/* ═══════════════════════════════════════════
   LOAD: STATS
═══════════════════════════════════════════ */
async function loadStats() {
    if (_busy) return;
    _busy = true;

    try {
        const base = getBaseUrl();
        const token = getAuthToken();
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
        const targets = [
            { url: `${base}/api/admin/users/count`,            key: 'hs-users' },
            { url: `${base}/api/admin/sellers/count`,          key: 'hs-sellers' },
            { url: `${base}/api/admin/orders/count`,           key: 'hs-orders' },
            { url: `${base}/api/admin/sellers/pending-count`,  key: 'hs-pending' },
        ];

        const responses = await Promise.all(targets.map(item =>
            fetch(item.url, { credentials: 'include', headers: authHeaders }).catch(() => null)
        ));
        const payloads = await Promise.all(responses.map(response =>
            (response && response.ok) ? response.json().catch(() => null) : null
        ));

        targets.forEach((item, index) => {
            const payload = payloads[index];
            const count = payload?.data?.count ?? '—';
            const el = document.getElementById(item.key);
            if (el) el.textContent = count;
        });
    } catch {
        // leave placeholders on error
    } finally {
        _busy = false;
    }
}

/* ═══════════════════════════════════════════
   NOTIFICATION BADGE
═══════════════════════════════════════════ */
async function loadNotifBadge() {
    const res = await apiFetch('/api/admin/notifications/unread-count');
    const count = res?.data?.data?.count ?? res?.data?.count ?? 0;
    const dot = document.getElementById('nav-notif-dot');
    if (dot) {
        dot.textContent = count;
        dot.style.display = count > 0 ? 'flex' : 'none';
    }
}

/* ═══════════════════════════════════════════
   REFRESH ALL
═══════════════════════════════════════════ */
async function refreshAll() {
    await loadAdminInfo();
    await loadStats();
    await loadNotifBadge();
}

/* ═══════════════════════════════════════════
   NO SETINTERVAL — Event + focus driven only
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const token = getAuthToken();
    if (!token) {
        window.location.href = '../../auth/login.html';
        return;
    }

    refreshAll();

    window.addEventListener('admin:profileUpdated', () => refreshAll());
    window.addEventListener('admin:badgesChanged', () => refreshAll());

    window.addEventListener('focus', () => {
        refreshAll();
    });

    window.addEventListener('beforeunload', () => {});
    window.addEventListener('pagehide', () => {});
});
