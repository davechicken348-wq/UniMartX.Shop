lucide.createIcons();

function getApiBase() {
    return (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
}

const AUTH_KEYS = ['authData', 'authToken', 'seller_id', 'userRole', 'pnav_firstname', 'pnav_lastname', 'pnav_avatar', 'pnav_role'];

function getToken() {
    const raw = localStorage.getItem('authData');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            const data = parsed.value ? JSON.parse(parsed.value) : parsed;
            if (data.token) return data.token;
        } catch {}
    }
    return localStorage.getItem('authToken');
}

async function performLogout() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        await fetch(`${getApiBase()}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers,
        });
    } catch {
        // ignore network errors during logout
    }

    AUTH_KEYS.forEach(key => localStorage.removeItem(key));
}

performLogout();
