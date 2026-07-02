lucide.createIcons();

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
let _busy = false;
let _pollId = null;

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
        header.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
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
    return (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch {
        return null;
    }
}

/* ═══════════════════════════════════════════
   LOAD: USER PROFILE
═══════════════════════════════════════════ */
async function loadUserData() {
    try {
        const result = await apiFetch('/api/auth/me');
        if (!result || !result.success) throw new Error('Auth failed');

        const user = result.data;
        const firstName = user.firstName || 'User';
        const lastName  = user.lastName  || '';
        const initials  = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase() || 'U';

        document.getElementById('hero-name').textContent     = firstName;
        document.getElementById('nav-username').textContent = `${firstName} ${lastName}`.trim();

        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar && user.avatar) {
            navAvatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = user.avatar; img.alt = 'Avatar';
            img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
            navAvatar.appendChild(img);
        }

        await loadCartCount();
        await loadNotificationCount();
        await refreshDashboard();
    } catch (err) {
        console.error('Failed to load user:', err);
        window.location.href = '../../auth/login.html';
    }
}

/* ═══════════════════════════════════════════
   LOAD: CART COUNT
═══════════════════════════════════════════ */
async function loadCartCount() {
    try {
        const result = await apiFetch('/api/cart');
        const badge = document.getElementById('cart-badge');
        if (badge && result?.data?.items) {
            const count = result.data.items.reduce((s, i) => s + i.quantity, 0);
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch { /* silent */ }
}

/* ═══════════════════════════════════════════
   LOAD: HERO STATS
═══════════════════════════════════════════ */
function updateHeroStats(stats) {
    const ordersEl = document.getElementById('hs-orders');
    const wishEl   = document.getElementById('hs-wishlist');
    const notifEl  = document.getElementById('hs-notif');

    if (ordersEl) ordersEl.textContent = stats.totalOrders ?? '—';
    if (wishEl)   wishEl.textContent   = stats.wishlistItems ?? '—';
}

async function loadNotificationCount() {
    try {
        const result = await apiFetch('/api/notifications/unread-count');
        if (result && result.success) {
            const count = result.data?.count ?? result.data?.unread ?? '—';
            const notifEl = document.getElementById('hs-notif');
            if (notifEl) notifEl.textContent = count;
        }
    } catch { /* silent */ }
}

/* ═══════════════════════════════════════════
   LOAD: RECENT ORDERS
═══════════════════════════════════════════ */
const EMPTY_STATE_HTML = `
    <div class="empty-state">
        <div class="empty-icon"><i data-lucide="package"></i></div>
        <h3>No orders yet</h3>
        <p>Start shopping to see your orders here.</p>
        <a href="../../public/shop/shop.html" class="btn-primary btn-sm" style="margin-top:0.75rem;">
            <i data-lucide="shopping-bag"></i> Browse Shop
        </a>
    </div>
`;

function updateRecentOrders(orders) {
    const list = document.getElementById('recent-list');
    if (!list) return;

    if (!orders || orders.length === 0) {
        list.innerHTML = EMPTY_STATE_HTML;
        lucide.createIcons();
        return;
    }

    const recent = orders.slice(0, 4);
    list.innerHTML = recent.map(order => {
        const status = (order.status || 'pending').toLowerCase();
        const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const imgSrc = order.items?.[0]?.product?.image || '';
        const productName = order.items?.[0]?.product?.name || `Order #${order.id}`;
        const date = order.createdAt
            ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : '';

        return `
            <a href="../orders/order-details.html?id=${order.id}" class="order-row">
                <div class="order-row-img">
                    ${imgSrc
                        ? `<img src="${imgSrc}" alt="${productName}" loading="lazy">`
                        : `<div style="width:100%;height:100%;background:var(--bg-2);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" stroke="var(--text-3)" fill="none" stroke-width="2"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 9h14"/></svg></div>`
                    }
                </div>
                <div class="order-row-body">
                    <h4>${productName}</h4>
                    <p>${date ? `Placed ${date}` : ''}</p>
                </div>
                <div class="order-row-meta">
                    <strong>GH₵ ${parseFloat(order.totalAmount || 0).toFixed(2)}</strong>
                    <span class="badge-status badge-status--${status}">${statusLabel}</span>
                </div>
            </a>
        `;
    }).join('');
    lucide.createIcons();
}

/* ═══════════════════════════════════════════
   REFRESH
═══════════════════════════════════════════ */
async function refreshDashboard() {
    if (_busy) return;
    _busy = true;

    try {
        const result = await apiFetch('/api/buyer/dashboard');
        if (!result || !result.success) return;

        const { stats, recentOrders } = result.data;
        updateHeroStats(stats || {});
        updateRecentOrders(recentOrders || []);
        await loadNotificationCount();
    } catch {
        // Silently fail
    } finally {
        _busy = false;
    }
}

function startPolling() {
    stopPolling();
    _pollId = setInterval(refreshDashboard, 4000);
}

function stopPolling() {
    if (_pollId !== null) {
        clearInterval(_pollId);
        _pollId = null;
    }
}

window.addEventListener('beforeunload', stopPolling);
window.addEventListener('pagehide', stopPolling);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        _busy = false;
        stopPolling();
        refreshDashboard().then(() => startPolling());
    }
});

window.addEventListener('online', () => {
    _busy = false;
    stopPolling();
    refreshDashboard().then(() => startPolling());
});

/* ═══════════════════════════════════════════
   INIT — No setInterval
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '../../auth/login.html';
        return;
    }

    loadUserData();
    startPolling();

    window.addEventListener('focus', () => {
        refreshDashboard();
        loadCartCount();
    });

    window.addEventListener('beforeunload', () => {});
});
