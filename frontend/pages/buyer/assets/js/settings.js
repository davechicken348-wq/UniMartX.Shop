/* ═══════════════════════════════════════════════════════════════
   SETTINGS PAGE JS — Fully Backend-Backed
   ═══════════════════════════════════════════════════════════════ */

(function () {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    // ── Auth ──────────────────────────────────────────────────────
    function getAuthToken() {
        const raw = localStorage.getItem('authData');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed.expiry && Date.now() > parsed.expiry) {
                    localStorage.removeItem('authData');
                } else {
                    const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
                    if (authData.token) return authData.token;
                }
            } catch {}
        }
        const fallback = localStorage.getItem('authToken');
        if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
        return fallback;
    }

    function authHeaders() {
        const token = getAuthToken();
        return token
            ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' };
    }

    // ── Password toggles ──────────────────────────────────────────
    document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
            lucide.createIcons();
        });
    });

    // ── Password strength ─────────────────────────────────────────
    const newPwInput = document.getElementById('new-password');
    const strengthBar = document.getElementById('pw-strength-bar');
    if (newPwInput && strengthBar) {
        newPwInput.addEventListener('input', () => {
            const val = newPwInput.value;
            let score = 0;
            if (val.length >= 8) score++;
            if (val.length >= 12) score++;
            if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
            if (/\d/.test(val)) score++;
            if (/[@$!%*?&]/.test(val)) score++;

            const pct = (score / 5) * 100;
            strengthBar.style.width = `${pct}%`;

            if (score <= 2) strengthBar.className = 'pw-strength-bar pw-weak';
            else if (score <= 3) strengthBar.className = 'pw-strength-bar pw-fair';
            else if (score <= 4) strengthBar.className = 'pw-strength-bar pw-good';
            else strengthBar.className = 'pw-strength-bar pw-strong';
        });
    }

    // ── Password form ─────────────────────────────────────────────
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPw = document.getElementById('current-password').value;
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('confirm-password').value;
            const saveBtn = document.getElementById('save-password-btn');

            const currentError = document.getElementById('current-pw-error');
            const newError = document.getElementById('new-pw-error');
            const confirmError = document.getElementById('confirm-pw-error');

            [currentError, newError, confirmError].forEach(el => { if (el) el.textContent = ''; });

            if (!currentPw || !newPw || !confirmPw) {
                if (!currentPw && currentError) currentError.textContent = 'Current password is required';
                if (!newPw && newError) newError.textContent = 'New password is required';
                if (!confirmPw && confirmError) confirmError.textContent = 'Please confirm your password';
                return;
            }

            if (newPw !== confirmPw) {
                if (newError) newError.textContent = 'Passwords do not match';
                if (confirmError) confirmError.textContent = 'Passwords do not match';
                return;
            }

            if (newPw.length < 8) {
                if (newError) newError.textContent = 'Password must be at least 8 characters';
                return;
            }

            saveBtn.classList.add('loading');
            saveBtn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/api/users/password`, {
                    method: 'PATCH',
                    headers: authHeaders(),
                    body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
                });

                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(json.error || json.message || 'Failed to update password');
                }

                showToast('Password updated successfully', 'success');
                passwordForm.reset();
                if (strengthBar) strengthBar.style.width = '0%';
            } catch (err) {
                if (currentError && err.message.includes('Current password')) {
                    currentError.textContent = err.message;
                } else if (newError) {
                    newError.textContent = err.message;
                } else {
                    showToast(err.message, 'error');
                }
            } finally {
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
            }
        });
    }

    // ── Active Sessions ───────────────────────────────────────────
    async function loadSessions() {
        const sessionsList = document.getElementById('sessions-list');
        const loadingEl = document.getElementById('sessions-loading');
        if (!sessionsList) return;

        if (loadingEl) loadingEl.classList.remove('hidden');
        sessionsList.innerHTML = '';

        try {
            const res = await fetch(`${API_BASE}/api/users/sessions`, {
                headers: authHeaders(),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to load sessions');
            }

            const sessions = json.data || [];
            if (sessions.length === 0) {
                sessionsList.innerHTML = '<p style="color:var(--text-3);font-size:0.88rem;">No active sessions found.</p>';
                return;
            }

            sessionsList.innerHTML = sessions.map(s => `
                <div class="session-item${s.isCurrent ? ' current' : ''}">
                    <div class="session-info">
                        <strong>${esc(s.deviceInfo)}</strong>
                        <span>${esc(s.os)} · ${esc(s.browser)} · ${esc(s.deviceType)}</span>
                        <span class="session-meta">IP: ${esc(s.ipAddress)} · Last active: ${formatDate(s.lastActiveAt)}</span>
                    </div>
                    <div class="session-actions">
                        ${s.isCurrent
                            ? '<span class="badge-status badge-status--delivered" style="font-size:0.72rem;">Current</span>'
                            : `<button class="btn btn-ghost btn-sm revoke-session-btn" data-session-id="${s.id}">
                                <i data-lucide="log-out"></i> Revoke
                              </button>`
                        }
                    </div>
                </div>
            `).join('');

            lucide.createIcons();

            sessionsList.querySelectorAll('.revoke-session-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const sessionId = btn.dataset.sessionId;
                    btn.disabled = true;
                    btn.innerHTML = '<i data-lucide="loader" class="spin"></i>';

                    try {
                        const res = await fetch(`${API_BASE}/api/users/sessions/${sessionId}`, {
                            method: 'DELETE',
                            headers: authHeaders(),
                        });
                        const json = await res.json();
                        if (!res.ok || !json.success) {
                            throw new Error(json.error || 'Failed to revoke session');
                        }
                        btn.closest('.session-item').remove();
                        showToast('Session revoked', 'success');
                    } catch (err) {
                        showToast(err.message, 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<i data-lucide="log-out"></i> Revoke';
                        lucide.createIcons();
                    }
                });
            });

        } catch (err) {
            sessionsList.innerHTML = `<p style="color:var(--danger);font-size:0.88rem;">${esc(err.message)}</p>`;
        } finally {
            if (loadingEl) loadingEl.classList.add('hidden');
        }
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c] || c));
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
               ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;padding:0.85rem 1.25rem;background:var(--color-bg);color:var(--color-text);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;animation:toast-in 0.3s ease-out forwards;';
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ── Notification Preferences ───────────────────────────────────
    async function loadNotificationPreferences() {
        try {
            const res = await fetch(`${API_BASE}/api/users/notification-preferences`, {
                headers: authHeaders(),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to load preferences');
            }

            const prefs = json.data;
            document.querySelectorAll('.notification-toggle').forEach(toggle => {
                const key = toggle.dataset.notification;
                if (key && prefs[key] !== undefined) {
                    toggle.checked = prefs[key];
                }
            });

            document.querySelectorAll('.privacy-toggle').forEach(toggle => {
                const key = toggle.dataset.privacy;
                if (key && prefs[key] !== undefined) {
                    toggle.checked = prefs[key];
                }
            });
        } catch (err) {
            console.error('Failed to load preferences:', err);
        }
    }

    async function saveNotificationPreferences() {
        const payload = {};

        document.querySelectorAll('.notification-toggle').forEach(toggle => {
            payload[toggle.dataset.notification] = toggle.checked;
        });

        document.querySelectorAll('.privacy-toggle').forEach(toggle => {
            payload[toggle.dataset.privacy] = toggle.checked;
        });

        try {
            const res = await fetch(`${API_BASE}/api/users/notification-preferences`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to save preferences');
            }
            showToast('Preferences updated', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    document.querySelectorAll('.notification-toggle, .privacy-toggle').forEach(toggle => {
        toggle.addEventListener('change', () => {
            saveNotificationPreferences();
        });
    });

    // ── Download Data ─────────────────────────────────────────────
    const downloadDataBtn = document.getElementById('download-data-btn');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', async () => {
            downloadDataBtn.disabled = true;
            downloadDataBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Preparing...';
            if (window.lucide) lucide.createIcons();

            try {
                const res = await fetch(`${API_BASE}/api/users/data-export`, {
                    headers: authHeaders(),
                });
                if (!res.ok) {
                    const json = await res.json();
                    throw new Error(json.error || 'Failed to export data');
                }

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `unimartx-data-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                showToast('Data export downloaded', 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                downloadDataBtn.disabled = false;
                downloadDataBtn.innerHTML = '<i data-lucide="download"></i> Download My Data';
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // ── Logout All Devices ────────────────────────────────────────
    const logoutAllBtn = document.getElementById('logout-all-btn');
    if (logoutAllBtn) {
        logoutAllBtn.addEventListener('click', async () => {
            if (!confirm('Log out from all other devices? You will need to sign in again on those devices.')) return;

            logoutAllBtn.disabled = true;
            logoutAllBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Logging out...';
            if (window.lucide) lucide.createIcons();

            try {
                const res = await fetch(`${API_BASE}/api/users/logout-all`, {
                    method: 'POST',
                    headers: authHeaders(),
                });
                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(json.error || 'Failed to log out from other devices');
                }
                showToast(json.message || 'Logged out from other devices', 'success');
                await loadSessions();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                logoutAllBtn.disabled = false;
                logoutAllBtn.innerHTML = '<i data-lucide="log-out"></i> Log Out All';
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // ── Delete Account ────────────────────────────────────────────
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteModal = document.getElementById('delete-modal');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const deletePasswordInput = document.getElementById('delete-account-password');

    if (deleteAccountBtn && deleteModal) {
        deleteAccountBtn.addEventListener('click', () => {
            deleteModal.classList.remove('hidden');
            if (deletePasswordInput) deletePasswordInput.value = '';
        });

        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                deleteModal.classList.add('hidden');
            });
        }

        if (modalConfirm) {
            modalConfirm.addEventListener('click', async () => {
                const password = deletePasswordInput?.value;
                if (!password) {
                    showToast('Please enter your password', 'error');
                    return;
                }

                modalConfirm.disabled = true;
                modalConfirm.innerHTML = '<i data-lucide="loader" class="spin"></i> Deleting...';
                if (window.lucide) lucide.createIcons();

                try {
                    const res = await fetch(`${API_BASE}/api/users/account`, {
                        method: 'DELETE',
                        headers: authHeaders(),
                        body: JSON.stringify({ password }),
                    });
                    const json = await res.json();
                    if (!res.ok || !json.success) {
                        throw new Error(json.error || 'Failed to delete account');
                    }
                    showToast('Account deleted. Redirecting...', 'success');
                    deleteModal.classList.add('hidden');
                    setTimeout(() => {
                        window.location.href = '../../auth/login.html';
                    }, 1500);
                } catch (err) {
                    showToast(err.message, 'error');
                } finally {
                    modalConfirm.disabled = false;
                    modalConfirm.innerHTML = '<i data-lucide="trash-2"></i> Yes, Delete';
                    if (window.lucide) lucide.createIcons();
                }
            });
        }

        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) deleteModal.classList.add('hidden');
        });
    }

    // ── Settings Nav ──────────────────────────────────────────────
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    const settingsSections = document.querySelectorAll('.settings-section');

    settingsNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;
            const target = document.getElementById(`section-${sectionId}`);
            if (!target) return;

            settingsNavItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            settingsSections.forEach(s => s.classList.add('hidden'));
            target.classList.remove('hidden');

            if (sectionId === 'security') loadSessions();
        });
    });

    // ── Init ──────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const token = getAuthToken();
        if (!token) {
            window.location.href = '../../auth/login.html';
            return;
        }

        loadSessions();
        loadNotificationPreferences();
    });

})();
