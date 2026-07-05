// PUBLIC NAV — Auth-aware navbar for all public pages

(function () {

    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    // ── Read auth from localStorage ────────────────────────────────────────
    function getAuthData() {
        try {
            const raw = localStorage.getItem('authData');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.expiry && Date.now() > parsed.expiry) {
                    localStorage.removeItem('authData');
                    return null;
                }
                const data = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (data.token) return data;
            }
            const token = localStorage.getItem('authToken');
            if (token) return { token };
        } catch { /* ignore */ }
        return null;
    }

    function decodeToken(token) {
        try { return JSON.parse(atob(token.split('.')[1])); }
        catch { return null; }
    }

    function getInitials(first, last) {
        return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
    }

    // ── Fetch fresh user data from API ─────────────────────────────────────
    async function fetchAndCacheUser(token) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const json = await res.json();
            if (!json.success) return null;
            const u = json.data;
            localStorage.setItem('pnav_firstname', u.firstName || '');
            localStorage.setItem('pnav_lastname',  u.lastName  || '');
            localStorage.setItem('pnav_avatar',    u.avatar    || '');
            localStorage.setItem('pnav_role',      u.role      || '');
            return u;
        } catch { return null; }
    }

    // ── URL helpers ────────────────────────────────────────────────────────
    function getDepth() {
        const path = window.location.pathname;
        const idx = path.indexOf('/pages/');
        if (idx === -1) return 0;
        return path.slice(idx + 7).split('/').length - 1;
    }

    function prefix(depth) { return '../'.repeat(depth); }

    function getDashboardUrl(role, depth) {
        if (role === 'seller') return `${prefix(depth)}seller/private/dashboard/overview.html`;
        if (role === 'buyer')  return `${prefix(depth)}buyer/dashboard/dashboard.html`;
        return `${prefix(depth)}auth/login.html`;
    }

    function getLogoutUrl(depth)  { return `${prefix(depth)}auth/logout.html`; }
    function getOrdersUrl(depth)  { return `${prefix(depth)}buyer/orders/orders.html`; }
    function getWishlistUrl(depth){ return `${prefix(depth)}buyer/shopping/wishlist.html`; }

    function getProfileUrl(role, depth) {
        if (role === 'seller') return `${prefix(depth)}seller/private/profile/customize-profile.html`;
        return `${prefix(depth)}buyer/account/profile.html`;
    }

    // ── Render nav with user data ──────────────────────────────────────────
    function injectUserNav(user) {
        const depth       = getDepth();
        const role        = user.role      || 'buyer';
        const firstName   = user.firstName || '';
        const lastName    = user.lastName  || '';
        const avatar      = user.avatar    || '';
        const initials    = getInitials(firstName, lastName);
        const displayName = firstName || 'Account';

        const dashUrl    = getDashboardUrl(role, depth);
        const logoutUrl  = getLogoutUrl(depth);
        const profileUrl = getProfileUrl(role, depth);

        const avatarHtml = avatar
            ? `<img src="${avatar}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
            : `<span>${initials}</span>`;

        const roleItems = role === 'seller'
            ? `<a href="${dashUrl}" class="pnav-drop-item"><i data-lucide="layout-dashboard"></i> Dashboard</a>
                <a href="${profileUrl}" class="pnav-drop-item"><i data-lucide="user"></i> My Profile</a>`
            : `<a href="${dashUrl}" class="pnav-drop-item"><i data-lucide="layout-dashboard"></i> Dashboard</a>
                <a href="${getOrdersUrl(depth)}" class="pnav-drop-item"><i data-lucide="shopping-bag"></i> My Orders</a>
                <a href="${getWishlistUrl(depth)}" class="pnav-drop-item"><i data-lucide="heart"></i> Wishlist</a>
                <a href="${profileUrl}" class="pnav-drop-item"><i data-lucide="user"></i> Profile</a>`;

        // Remove any previous injection before re-rendering
        document.getElementById('pnav-user-wrap')?.remove();

        const html = `
            <div class="pnav-user-wrap" id="pnav-user-wrap">
                <button class="pnav-user-btn" id="pnav-user-btn" aria-label="Account menu" aria-expanded="false">
                    <div class="pnav-avatar">${avatarHtml}</div>
                    <span class="pnav-username">${displayName}</span>
                    <i data-lucide="chevron-down" class="pnav-chevron"></i>
                </button>
                <div class="pnav-dropdown hidden" id="pnav-dropdown">
                    <div class="pnav-drop-header">
                        <div class="pnav-drop-avatar">${avatarHtml}</div>
                        <div>
                            <p class="pnav-drop-name">${firstName} ${lastName}</p>
                            <p class="pnav-drop-role">${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                        </div>
                    </div>
                    <div class="pnav-drop-divider"></div>
                    ${roleItems}
                    <div class="pnav-drop-divider"></div>
                    <a href="${logoutUrl}" class="pnav-drop-item pnav-drop-item--danger"><i data-lucide="log-out"></i> Log Out</a>
                </div>
            </div>`;

        // Desktop nav — remove guest buttons, insert user widget
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            navActions.querySelectorAll('.nav-btn').forEach(el => el.remove());
            navActions.insertAdjacentHTML('beforeend', html);
        }

        // Mobile nav — remove guest links, insert user links
        const navMobile = document.getElementById('nav-mobile');
        if (navMobile) {
            navMobile.querySelectorAll('a[href*="login"], a[href*="register"], .pnav-mobile-user, .pnav-mobile-links').forEach(el => el.remove());
            navMobile.insertAdjacentHTML('beforeend', `
                <div class="pnav-mobile-user">
                    <div class="pnav-avatar">${avatarHtml}</div>
                    <span>${displayName}</span>
                </div>
                <div class="pnav-mobile-links">
                    <a href="${dashUrl}">Dashboard</a>
                    ${role === 'buyer' ? `<a href="${getOrdersUrl(depth)}">My Orders</a><a href="${getWishlistUrl(depth)}">Wishlist</a>` : ''}
                    <a href="${profileUrl}">Profile</a>
                    <a href="${logoutUrl}" style="color:#ef4444;">Log Out</a>
                </div>
            `);
        }

        // Dropdown toggle
        const btn      = document.getElementById('pnav-user-btn');
        const dropdown = document.getElementById('pnav-dropdown');
        if (btn && dropdown) {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const isOpen = !dropdown.classList.contains('hidden');
                dropdown.classList.toggle('hidden', isOpen);
                btn.setAttribute('aria-expanded', String(!isOpen));
                if (window.lucide) window.lucide.createIcons();
            });
            document.addEventListener('click', () => {
                dropdown.classList.add('hidden');
                btn.setAttribute('aria-expanded', 'false');
            });
            dropdown.addEventListener('click', e => e.stopPropagation());
        }

        if (window.lucide) window.lucide.createIcons();
    }

    // ── Styles ─────────────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('pnav-styles')) return;
        const style = document.createElement('style');
        style.id = 'pnav-styles';
        style.textContent = `
            .pnav-user-wrap { position: relative; }
            .pnav-user-btn {
                display: flex; align-items: center; gap: 0.5rem;
                background: transparent; border: 1px solid rgba(255,255,255,0.1);
                border-radius: 50px; padding: 0.35rem 0.85rem 0.35rem 0.35rem;
                cursor: pointer; color: inherit; font-family: inherit;
                font-size: 0.9rem; font-weight: 600;
                transition: border-color 0.2s, background 0.2s;
            }
            .pnav-user-btn:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.04); }
            .pnav-avatar {
                width: 32px; height: 32px; border-radius: 50%;
                background: linear-gradient(135deg, #10b981, #34d399);
                display: flex; align-items: center; justify-content: center;
                font-size: 0.75rem; font-weight: 700; color: #0a0a0f;
                flex-shrink: 0; overflow: hidden;
            }
            .pnav-username { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .pnav-chevron { width: 14px; height: 14px; opacity: 0.6; }
            .pnav-dropdown {
                position: absolute; top: calc(100% + 10px); right: 0;
                min-width: 220px; background: #111118;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 14px; box-shadow: 0 16px 48px rgba(0,0,0,0.5);
                z-index: 500; overflow: hidden;
            }
            .pnav-dropdown.hidden { display: none; }
            .pnav-drop-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1rem 0.75rem; }
            .pnav-drop-avatar {
                width: 40px; height: 40px; border-radius: 50%;
                background: linear-gradient(135deg, #10b981, #34d399);
                display: flex; align-items: center; justify-content: center;
                font-size: 0.85rem; font-weight: 700; color: #0a0a0f;
                flex-shrink: 0; overflow: hidden;
            }
            .pnav-drop-name { font-weight: 700; font-size: 0.9rem; color: #f1f0ee; margin: 0; }
            .pnav-drop-role { font-size: 0.75rem; color: #34d399; margin: 0; text-transform: capitalize; }
            .pnav-drop-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 0.25rem 0; }
            .pnav-drop-item {
                display: flex; align-items: center; gap: 0.65rem;
                padding: 0.65rem 1rem; color: #a09f9c;
                text-decoration: none; font-size: 0.88rem; font-weight: 600;
                transition: background 0.15s, color 0.15s;
            }
            .pnav-drop-item:hover { background: rgba(255,255,255,0.04); color: #f1f0ee; }
            .pnav-drop-item svg { width: 15px; height: 15px; flex-shrink: 0; }
            .pnav-drop-item--danger { color: #ef4444; }
            .pnav-drop-item--danger:hover { background: rgba(239,68,68,0.08); color: #ef4444; }
            .pnav-mobile-user {
                display: flex; align-items: center; gap: 0.75rem;
                padding: 0.65rem 0.75rem; font-weight: 700;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 0.25rem; color: #f1f0ee;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Init ───────────────────────────────────────────────────────────────
    async function init() {
        injectStyles();

        const authData = getAuthData();
        if (!authData?.token) {
            injectGuestNav();
            return;
        }

        const decoded = decodeToken(authData.token);
        if (!decoded) {
            injectGuestNav();
            return;
        }

        if (decoded.exp && Date.now() / 1000 > decoded.exp) {
            localStorage.removeItem('authData');
            localStorage.removeItem('authToken');
            injectGuestNav();
            return;
        }

        // Build user object — priority: authData.user > decoded token > cached pnav_ keys
        const cached = {
            firstName: authData.user?.firstName || decoded.firstName || localStorage.getItem('pnav_firstname') || '',
            lastName:  authData.user?.lastName  || decoded.lastName  || localStorage.getItem('pnav_lastname')  || '',
            avatar:    authData.user?.avatar    || localStorage.getItem('pnav_avatar')    || '',
            role:      authData.user?.role      || decoded.role      || localStorage.getItem('pnav_role')      || 'buyer',
        };

        // Render immediately with what we have
        injectUserNav(cached);

        // Fetch fresh data from API in background
        const fresh = await fetchAndCacheUser(authData.token);
        if (fresh) {
            const changed =
                fresh.firstName !== cached.firstName ||
                fresh.lastName  !== cached.lastName  ||
                (fresh.avatar || '') !== cached.avatar ||
                fresh.role !== cached.role;
            if (changed) injectUserNav(fresh);
        }
    }

    function injectGuestNav() {
        const depth = getDepth();
        const sellerHref = `${prefix(depth)}auth/seller/register.html`;

        // Desktop nav — add Sell on UniMartX text link if not already present
        const navActions = document.querySelector('.nav-actions');
        if (navActions && !document.getElementById('pnav-shop-btn')) {
            const link = document.createElement('a');
            link.id = 'pnav-shop-btn';
            link.href = sellerHref;
            link.style.cssText = 'font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.55);text-decoration:none;white-space:nowrap;transition:color 0.2s;padding:0 0.25rem;';
            link.textContent = 'Sell on UniMartX';
            link.addEventListener('mouseenter', () => { link.style.color = '#34d399'; });
            link.addEventListener('mouseleave', () => { link.style.color = 'rgba(255,255,255,0.55)'; });
            // Insert before the first .nav-btn so it sits left of Log In
            const firstBtn = navActions.querySelector('.nav-btn');
            if (firstBtn) navActions.insertBefore(link, firstBtn);
            else navActions.appendChild(link);
        }

        // Mobile nav — add Sell on UniMartX link if not already present
        const navMobile = document.getElementById('nav-mobile');
        if (navMobile && !document.getElementById('pnav-mobile-shop-btn')) {
            const link = document.createElement('a');
            link.id = 'pnav-mobile-shop-btn';
            link.href = sellerHref;
            link.textContent = 'Sell on UniMartX';
            navMobile.appendChild(link);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
