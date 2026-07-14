// ── Settings navigation ─────────────────────
const settingsNavItems = document.querySelectorAll('.settings-nav-item');
const settingsSections = document.querySelectorAll('.settings-section');

function showSettingsSection(target) {
    if (!target) return;
    settingsNavItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-target') === target));
    settingsSections.forEach(section => {
        section.style.display = section.id === target ? 'block' : 'none';
    });
}

if (settingsNavItems.length) {
    settingsNavItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            showSettingsSection(item.getAttribute('data-target'));
        });
    });

    const initial = document.querySelector('.settings-nav-item.active');
    showSettingsSection(initial ? initial.getAttribute('data-target') : settingsNavItems[0].getAttribute('data-target'));

    document.querySelectorAll('.settings-link[data-target]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSettingsSection(link.getAttribute('data-target'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ── Password toggle visibility ─────────────────
document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.closest('.input-icon-wrap').querySelector('input');
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    });
});

// ── Auth helpers ──────────────────────────────────
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

function getAuthToken() {
    const raw = localStorage.getItem('authData');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.expiry && Date.now() > parsed.expiry) {
                localStorage.removeItem('authData');
                return null;
            }
            const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
            if (authData.token) return authData.token;
        } catch {}
    }
    const fallback = localStorage.getItem('authToken');
    if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
    return fallback;
}

async function fetchJSON(url, options = {}) {
    const token = getAuthToken();
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || `Request failed (${res.status})`);
    }
    return res.json();
}

// ── Change Password ──────────────────────────────
const passwordForm = document.getElementById('password-form');
const currentPwInput = document.getElementById('current-password');
const currentPwStatus = document.getElementById('current-pw-status');
let currentPwVerified = false;

function setCurrentPwStatus(state, message) {
    if (!currentPwStatus) return;
    currentPwStatus.className = 'field-status' + (state ? ` field-status--${state}` : '');
    currentPwStatus.textContent = message || '';
    if (currentPwInput) {
        currentPwInput.classList.toggle('input-valid', state === 'valid');
        currentPwInput.classList.toggle('input-invalid', state === 'invalid');
    }
}

async function verifyCurrentPassword() {
    if (!currentPwInput || !currentPwStatus) return;
    const value = currentPwInput.value;
    if (!value) {
        currentPwVerified = false;
        setCurrentPwStatus('', '');
        return;
    }
    setCurrentPwStatus('checking', 'Verifying…');
    try {
        const data = await fetchJSON(`${API_BASE}/api/users/verify-password`, {
            method: 'POST',
            body: JSON.stringify({ currentPassword: value }),
        });
        currentPwVerified = !!data.valid;
        if (currentPwVerified) {
            setCurrentPwStatus('valid', 'Password verified');
        } else {
            setCurrentPwStatus('invalid', 'Current password is incorrect');
        }
    } catch (err) {
        currentPwVerified = false;
        setCurrentPwStatus('invalid', err.message || 'Could not verify password');
    }
}

if (currentPwInput) {
    currentPwInput.addEventListener('blur', verifyCurrentPassword);
    currentPwInput.addEventListener('input', () => {
        currentPwVerified = false;
        if (currentPwInput.value) setCurrentPwStatus('', '');
        else setCurrentPwStatus('', '');
    });
}

if (passwordForm) {
    passwordForm.addEventListener('submit', async e => {
        e.preventDefault();
        const currentPw = currentPwInput ? currentPwInput.value.trim() : '';
        const newPw = document.getElementById('new-password').value.trim();
        const confirmPw = document.getElementById('confirm-password').value.trim();

        if (newPw !== confirmPw) {
            alert('Passwords do not match');
            return;
        }

        if (newPw.length < 8) {
            alert('New password must be at least 8 characters');
            return;
        }

        if (!currentPwVerified) {
            if (!currentPw) {
                alert('Please enter your current password');
                return;
            }
            await verifyCurrentPassword();
            if (!currentPwVerified) {
                alert('Current password is incorrect');
                currentPwInput && currentPwInput.focus();
                return;
            }
        }

        try {
            await fetchJSON(`${API_BASE}/api/users/password`, {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
            });
            alert('Password changed successfully');
            passwordForm.reset();
            currentPwVerified = false;
            setCurrentPwStatus('', '');
        } catch (err) {
            alert(err.message || 'Failed to change password');
        }
    });
}

// ── Delete Account ────────────────────────────────
const deleteBtn = document.getElementById('delete-account-btn');
const deleteModal = document.getElementById('delete-modal');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');

function showDeleteReason() {
    const reason = prompt('Please tell us why you are deleting your account (optional):');
    return reason;
}

if (deleteBtn && deleteModal) {
    deleteBtn.addEventListener('click', () => deleteModal.classList.remove('hidden'));
}
if (cancelDelete && deleteModal) {
    cancelDelete.addEventListener('click', () => deleteModal.classList.add('hidden'));
}
if (confirmDelete) {
    confirmDelete.addEventListener('click', async () => {
        const password = prompt('Enter your password to confirm account deletion:');
        if (!password) return;

        try {
            await fetchJSON(`${API_BASE}/api/users/account`, {
                method: 'DELETE',
                body: JSON.stringify({ password }),
            });
            alert('Account deleted successfully. Redirecting...');
            localStorage.removeItem('authData');
            localStorage.removeItem('authToken');
            window.location.href = '../../../auth/logout.html';
        } catch (err) {
            alert(err.message || 'Failed to delete account');
        }
    });
}

// ── Account Activity ──────────────────────────────
async function loadSessions() {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    try {
        const data = await fetchJSON(`${API_BASE}/api/users/sessions`);
        const sessions = data.data || [];

        if (!sessions.length) {
            activityList.innerHTML = '<div class="activity-empty">No recent account activity to display.</div>';
            return;
        }

        activityList.innerHTML = sessions.map(s => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i data-lucide="${s.deviceType === 'mobile' ? 'smartphone' : 'monitor'}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-info">
                        <h4><strong>${s.browser}</strong> on ${s.os}${s.isCurrent ? ' <span class="badge-current">Current</span>' : ''}</h4>
                        <p>${s.deviceInfo} &middot; ${s.ipAddress}</p>
                        <p class="activity-time">Last active: ${new Date(s.lastActiveAt).toLocaleString()}</p>
                    </div>
                </div>
                ${s.isCurrent ? '' : `
                <button class="btn btn-ghost btn-sm revoke-btn" data-session-id="${s.id}">
                    Revoke
                </button>`}
            </div>
        `).join('');

        lucide.createIcons();

        activityList.querySelectorAll('.revoke-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sessionId = btn.dataset.sessionId;
                if (!confirm('Revoke this session? The user will be signed out.')) return;
                try {
                    await fetchJSON(`${API_BASE}/api/users/sessions/${sessionId}`, { method: 'DELETE' });
                    loadSessions();
                } catch (err) {
                    alert(err.message || 'Failed to revoke session');
                }
            });
        });
    } catch (err) {
        activityList.innerHTML = `<div class="activity-empty">Failed to load activity: ${err.message}</div>`;
    }
}

async function logoutAllDevices() {
    if (!confirm('Log out from all other devices? You will remain logged in on this device.')) return;
    try {
        await fetchJSON(`${API_BASE}/api/users/logout-all`, { method: 'POST' });
        alert('Logged out from all other devices.');
        loadSessions();
    } catch (err) {
        alert(err.message || 'Failed to log out from other devices');
    }
}

(function wireActivitySection() {
    const btnLogoutAll = document.getElementById('logout-all-btn');
    if (btnLogoutAll) btnLogoutAll.addEventListener('click', logoutAllDevices);
    loadSessions();
})();

// ── Notification Preferences ──────────────────────────
const NOTIF_PREF_ENDPOINT = `${API_BASE}/api/users/notification-preferences`;

async function loadNotificationPrefs() {
    const token = getAuthToken();
    if (!token) {
        console.warn('No auth token available');
        return;
    }
    try {
        const data = await fetchJSON(NOTIF_PREF_ENDPOINT);
        const prefs = data.data;
        document.querySelectorAll('#notifications input[data-preference-field]').forEach(input => {
            const field = input.getAttribute('data-preference-field');
            if (prefs[field] !== undefined) {
                input.checked = prefs[field];
            }
        });
    } catch (err) {
        console.error('Error loading notification preferences:', err);
    }
}

async function updateNotificationPref(field, value) {
    const token = getAuthToken();
    if (!token) {
        console.warn('No auth token available');
        return;
    }
    try {
        await fetchJSON(NOTIF_PREF_ENDPOINT, {
            method: 'PATCH',
            body: JSON.stringify({ [field]: value }),
        });
    } catch (err) {
        console.error('Error updating preference:', err);
        alert('Failed to save preference. Please try again.');
    }
}

document.querySelectorAll('#notifications input[data-preference-field]').forEach(input => {
    input.addEventListener('change', e => {
        const field = e.target.getAttribute('data-preference-field');
        updateNotificationPref(field, e.target.checked);
    });
});

loadNotificationPrefs();

// ── Sidebar notification badge ─────────────────────────
async function updateSidebarNotifBadge() {
    const badge = document.getElementById('sidebar-notif-count');
    if (!badge) return;
    const token = getAuthToken();
    if (!token) return;
    try {
        const data = await fetchJSON(`${API_BASE}/api/notifications/unread-count`);
        const count = data.data?.count ?? 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    } catch {
        badge.style.display = 'none';
    }
}

updateSidebarNotifBadge();
