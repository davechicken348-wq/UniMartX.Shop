/* ═══════════════════════════════════════════
   SHARED AUTH UTILITY
═══════════════════════════════════════════ */

window.AuthUtils = {
    getToken: function() {
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
            } catch { /* fall through */ }
        }
        const fallback = localStorage.getItem('authToken');
        if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
        return fallback;
    },

    enforce2FA: function(redirectUrl) {
        // 2FA enforcement is handled server-side during login.
        // The server returns { requires2FA: true } if the user has 2FA enabled,
        // and the login page should show the TOTP input instead of completing auth.
        // This stub exists so existing calls don't throw.
        // TODO: implement 2FA UI flow in Phase 3.
        return true;
    }
};
