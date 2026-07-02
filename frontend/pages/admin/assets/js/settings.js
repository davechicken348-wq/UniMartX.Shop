/* ═══════════════════════════════════════════
   ADMIN SETTINGS PAGE JS — Fixed
   ═══════════════════════════════════════════ */

(function () {
    if (window.lucide) lucide.createIcons();

    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
        const fallback = localStorage.getItem('authToken');
        if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
        return fallback;
    }

    async function apiFetch(path, options = {}) {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: { ...headers, ...(options.headers || {}) },
            ...options,
        });
        if (!res.ok) {
            if (res.status === 401) window.location.href = '../../auth/login.html?error=auth_required';
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Request failed (${res.status})`);
        }
        return res.json().then(d => d.data);
    }

    // ── UI Helpers ────────────────────────────────────────────────────────────
    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }
    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
    function initials(name) {
        return name.trim().split(/\s+/).map(w => (w[0] || '')).join('').toUpperCase().slice(0, 2) || 'AD';
    }

    function toast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
        const el = document.createElement('div');
        el.className = `toast toast--${type}`;
        el.innerHTML = `<i data-lucide="${icons[type]}"></i><span>${escapeHtml(message)}</span>`;
        container.appendChild(el);
        lucide.createIcons({ nodes: [el] });
        setTimeout(() => {
            el.classList.add('toast-out');
            el.addEventListener('animationend', () => el.remove());
        }, 3500);
    }

    function setBtnLoading(btn, label, loading = true) {
        if (!btn) return;
        btn.disabled = loading;
        btn.innerHTML = loading
            ? `<i data-lucide="loader" style="width:16px;height:16px;"></i> ${label}`
            : `<i data-lucide="save"></i> Save Changes`;
        lucide.createIcons({ nodes: [btn] });
    }

    // ── Section switching ────────────────────────────────────────────────────
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');

    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const targetId = `${item.dataset.section}-section`;
            const target = document.getElementById(targetId);
            if (!target) return;

            sections.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none';
            });

            target.style.display = 'block';
            target.classList.add('active');

            if (item.dataset.section === 'two-factor') {
                await loadTwoFactorStatus();
            }

            lucide.createIcons();
        });
    });

    // ── Password reveal ──────────────────────────────────────────────────────
    document.querySelectorAll('.reveal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const next = input.type === 'password' ? 'text' : 'password';
            input.type = next;
            btn.innerHTML = `<i data-lucide="${next === 'password' ? 'eye' : 'eye-off'}"></i>`;
            lucide.createIcons({ nodes: [btn] });
        });
    });

    // ── Save buttons ─────────────────────────────────────────────────────────
    document.querySelector('.save-btn[data-section="profile"]')?.addEventListener('click', saveProfile);
    document.querySelector('.save-btn[data-section="security"]')?.addEventListener('click', changePassword);

    // ── Profile ──────────────────────────────────────────────────────────────
    async function loadProfile() {
        try {
            const user = await apiFetch('/api/auth/me');
            const fullName = user.firstName + (user.lastName ? ' ' + user.lastName : '');
            setVal('profile-name', fullName);
            setVal('profile-email', user.email);
            setVal('profile-phone', user.phone || '');
            setVal('profile-role', user.role === 'admin' ? 'Super Admin' : user.role);
            setText('profile-display-name', fullName);
            setText('profile-display-role', user.role === 'admin' ? 'Super Admin' : user.role);
            setText('avatar-preview', initials(fullName));

            const preview = document.getElementById('avatar-preview');
            if (preview && user.avatar) {
                preview.innerHTML = `<img src="${user.avatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            }
            setText('sidebar-name', fullName);
            setText('topnav-username', user.firstName);
            setText('sidebar-avatar', initials(fullName));
            setText('topnav-avatar', initials(fullName));
            setText('sidebar-role', user.role === 'admin' ? 'Super Admin' : user.role);
        } catch (err) {
            console.error('Failed to load profile:', err);
            toast('Failed to load profile', 'error');
        }
    }

    async function saveProfile() {
        const fullName = (document.getElementById('profile-name')?.value || '').trim();
        const phone = (document.getElementById('profile-phone')?.value || '').trim();
        const parts = fullName.split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        const btn = document.querySelector('.save-btn[data-section="profile"]');

        setBtnLoading(btn, 'Saving…', true);
        try {
            await apiFetch('/api/admin/profile', {
                method: 'PATCH',
                body: JSON.stringify({ firstName, lastName, phone: phone || null }),
            });
            toast('Profile updated successfully');
            window.dispatchEvent(new Event('admin:profileUpdated'));
            await loadProfile();
        } catch (err) {
            toast(err.message || 'Failed to save profile', 'error');
        } finally {
            setBtnLoading(btn, 'Saving…', false);
        }
    }

    // ── Security ──────────────────────────────────────────────────────────────
    async function changePassword() {
        const current = document.getElementById('current-pass')?.value;
        const newPass = document.getElementById('new-pass')?.value;
        const confirm = document.getElementById('confirm-pass')?.value;

        if (!current) return toast('Enter your current password', 'error');
        if (!newPass) return toast('Enter a new password', 'error');
        if (newPass.length < 8) return toast('New password must be at least 8 characters', 'error');
        if (newPass !== confirm) return toast('Passwords do not match', 'error');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPass))
            return toast('Password require uppercase, lowercase, number, and special character (@$!%*?&)', 'error');

        const btn = document.querySelector('.save-btn[data-section="security"]');
        setBtnLoading(btn, 'Saving…', true);
        try {
            await apiFetch('/api/admin/password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
            });
            toast('Password changed successfully');
            ['current-pass', 'new-pass', 'confirm-pass'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        } catch (err) {
            toast(err.message || 'Failed to change password', 'error');
        } finally {
            setBtnLoading(btn, 'Saving…', false);
        }
    }

    // ── Two-Factor Auth ──────────────────────────────────────────────────────
    let _twoFactorSecret = null;

    const twoFactorPanel = document.getElementById('two-factor-panel');
    const twoFactorSetup = document.getElementById('two-factor-setup');
    const twoFactorEnabled = document.getElementById('two-factor-enabled');
    const twoFactorBadge = document.getElementById('two-factor-badge');

    async function loadTwoFactorStatus() {
        if (!twoFactorPanel) return;
        try {
            const data = await apiFetch('/api/admin/2fa/status');
            const enabled = !!data.enabled;
            if (twoFactorBadge) {
                twoFactorBadge.className = enabled
                    ? 'badge-status badge-status--confirmed'
                    : 'badge-status badge-status--pending';
                twoFactorBadge.textContent = enabled ? 'Enabled' : 'Disabled';
            }
            if (enabled) {
                twoFactorSetup.classList.add('hidden');
                twoFactorEnabled.classList.remove('hidden');
            } else {
                twoFactorSetup.classList.remove('hidden');
                twoFactorEnabled.classList.add('hidden');
            }
        } catch {
            if (twoFactorBadge) { twoFactorBadge.className = 'badge-status badge-status--pending'; twoFactorBadge.textContent = 'Disabled'; }
            twoFactorSetup.classList.remove('hidden');
            twoFactorEnabled.classList.add('hidden');
        }
    }

    async function startTwoFactorSetup() {
        const qrImage = document.getElementById('qr-image');
        const qrStep = document.getElementById('qr-step');
        try {
            const data = await apiFetch('/api/admin/2fa/setup', { method: 'POST' });
            _twoFactorSecret = data.secret;
            if (qrImage) qrImage.src = data.qrCode;
            if (qrStep) qrStep.classList.remove('hidden');
            document.getElementById('start-two-factor-btn')?.classList.add('hidden');
            setText('two-factor-token', '');
            lucide.createIcons();
        } catch (err) {
            toast(err.message || 'Failed to start 2FA setup', 'error');
        }
    }

    async function confirmTwoFactorSetup() {
        const token = document.getElementById('two-factor-token')?.value.trim();
        if (!token || token.length !== 6) return toast('Enter the 6-digit code', 'error');
        if (!_twoFactorSecret) return toast('Setup not started', 'error');

        const btn = document.getElementById('confirm-two-factor-btn');
        if (btn) btn.disabled = true;
        try {
            await apiFetch('/api/admin/2fa/confirm', {
                method: 'POST',
                body: JSON.stringify({ token, secret: _twoFactorSecret }),
            });
            toast('2FA enabled successfully');
            _twoFactorSecret = null;
            setText('two-factor-token', '');
            await loadTwoFactorStatus();
        } catch (err) {
            toast(err.message || 'Failed to enable 2FA', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function cancelTwoFactorSetup() {
        document.getElementById('start-two-factor-btn')?.classList.remove('hidden');
        document.getElementById('qr-step')?.classList.add('hidden');
        twoFactorSetup.classList.add('hidden');
        twoFactorEnabled.classList.add('hidden');
        _twoFactorSecret = null;
        setText('two-factor-token', '');
    }

    async function disableTwoFactor() {
        const password = prompt('Enter your current password to disable 2FA:');
        if (!password) return;

        const btn = document.getElementById('disable-two-factor-btn');
        if (btn) btn.disabled = true;
        try {
            await apiFetch('/api/admin/2fa/disable', {
                method: 'POST',
                body: JSON.stringify({ password }),
            });
            toast('2FA disabled');
            await loadTwoFactorStatus();
        } catch (err) {
            toast(err.message || 'Failed to disable 2FA', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function loadBackupCodes() {
        try {
            const data = await apiFetch('/api/admin/2fa/backup', { method: 'POST' });
            const grid = document.getElementById('backup-codes-grid');
            if (!grid) return;
            grid.innerHTML = data.backupCodes.map(c => `<code class="backup-code">${c}</code>`).join('');
        } catch (err) {
            toast(err.message || 'Failed to load backup codes', 'error');
        }
    }

    // 2FA event listeners
    document.getElementById('start-two-factor-btn')?.addEventListener('click', startTwoFactorSetup);
    document.getElementById('confirm-two-factor-btn')?.addEventListener('click', confirmTwoFactorSetup);
    document.getElementById('cancel-two-factor-btn')?.addEventListener('click', cancelTwoFactorSetup);
    document.getElementById('disable-two-factor-btn')?.addEventListener('click', disableTwoFactor);
    document.getElementById('show-backup-btn')?.addEventListener('click', loadBackupCodes);

    // ── Sidebar toggle ────────────────────────────────────────────────────────
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('admin-main').classList.toggle('collapsed');
    });

    // ── Topnav dropdown ───────────────────────────────────────────────────────
    document.getElementById('topnav-user')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('topnav-dropdown')?.classList.toggle('open');
    });
    document.addEventListener('click', () => {
        document.getElementById('topnav-dropdown')?.classList.remove('open');
    });

    // ── Mobile sidebar ────────────────────────────────────────────────────────
    document.getElementById('topnav-hamburger')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.add('open');
        document.getElementById('sidebar-overlay')?.classList.add('open');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('open');
    });

    // ── Init ─────────────────────────────────────────────────────────────────
    loadProfile();
    loadTwoFactorStatus();
})();
