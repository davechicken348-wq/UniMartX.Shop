lucide.createIcons();

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

/* ═══════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════ */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ──────────────────────────────────────────────────────────────
   AUTH UTILITIES
   ────────────────────────────────────────────────────────────── */
function getAuth() {
    try {
        const raw = localStorage.getItem('authData');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.expiry && Date.now() > parsed.expiry) { localStorage.removeItem('authData'); }
            else {
                const data = parsed.value ? JSON.parse(parsed.value) : parsed;
                if (data?.token) return data;
            }
        }
        const token = localStorage.getItem('authToken');
        if (token) return { token };
    } catch {}
    return null;
}

function authHeaders() {
    const auth = getAuth();
    return auth?.token
        ? { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

/* ──────────────────────────────────────────────────────────────
   LOAD PROFILE
   ────────────────────────────────────────────────────────────── */
async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: authHeaders(),
            credentials: 'include'
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('authData');
                window.location.href = '../../auth/login.html';
            }
            return;
        }

        const data = result.data;
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'User';
        const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U';

        const pFirst = document.getElementById('first-name');
        const pLast = document.getElementById('last-name');
        const pEmail = document.getElementById('email');
        const pPhone = document.getElementById('phone');
        if (pFirst) pFirst.value = firstName;
        if (pLast) pLast.value = lastName;
        if (pEmail) pEmail.value = data.email || '';
        if (pPhone) pPhone.value = data.phone || '';

        const addresses = data.addresses || [];
        const addr = addresses[0] || {};
        const elAddr = document.getElementById('address');
        const elCity = document.getElementById('city');
        const elRegion = document.getElementById('region');
        const elNotes = document.getElementById('notes');
        if (elAddr) elAddr.value = addr.street || '';
        if (elCity) elCity.value = addr.city || '';
        if (elRegion) elRegion.value = addr.state || '';
        if (elNotes) elNotes.value = addr.notes || '';

        const topnavUsername = document.getElementById('topnav-username');
        const topnavAvatar = document.getElementById('topnav-avatar');
        const sidebarName = document.getElementById('sidebar-name');
        const sidebarAvatar = document.getElementById('sidebar-avatar');

        if (topnavUsername) topnavUsername.textContent = fullName;
        if (sidebarName) sidebarName.textContent = fullName;

        const updateAvatarEl = (el) => {
            if (!el) return;
            if (data.avatar) {
                el.innerHTML = '';
                const img = document.createElement('img');
                img.src = data.avatar;
                img.alt = 'Avatar';
                img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
                el.appendChild(img);
            } else {
                el.textContent = initials;
            }
        };

        updateAvatarEl(topnavAvatar);
        updateAvatarEl(sidebarAvatar);

        const avatarName = document.getElementById('avatar-name');
        const avatarEmail = document.getElementById('avatar-email');
        const avatarCircle = document.getElementById('avatar-circle');
        if (avatarName) avatarName.textContent = fullName;
        if (avatarEmail) avatarEmail.textContent = data.email || '';
        updateAvatarEl(avatarCircle);

        const avatarOrders = document.querySelector('.avatar-stat a strong');
        if (avatarOrders) avatarOrders.textContent = data.stats?.orders ?? 0;
        const avatarWishlist = document.querySelector('.avatar-stat div + div strong') || document.querySelectorAll('.avatar-stat strong')[1];
        if (avatarWishlist) avatarWishlist.textContent = data.stats?.wishlist ?? 0;
        const avatarJoined = document.querySelectorAll('.avatar-stat strong')[2];
        if (avatarJoined) {
            const d = data.memberSince ? new Date(data.memberSince) : null;
            avatarJoined.textContent = d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
        }

        updateProfileCompletion(data);

    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

function updateProfileCompletion(data) {
    let completed = 0;
    if (data.emailVerified) completed++;
    if (data.phone) completed++;
    if (data.avatar) completed++;
    if (data.addresses && data.addresses.length > 0) completed++;

    const pct = completed * 25;
    const pctEl = document.querySelector('.completion-pct');
    const barEl = document.querySelector('.completion-bar');
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;

    const setDone = (id, done) => {
        const el = document.getElementById(id);
        if (!el) return;
        const icon = el.querySelector('i');
        if (done) {
            el.classList.add('done');
            if (icon) icon.setAttribute('data-lucide', 'check-circle');
        } else {
            el.classList.remove('done');
            if (icon) icon.setAttribute('data-lucide', 'circle');
        }
    };

    setDone('comp-email', !!data.emailVerified);
    setDone('comp-phone', !!data.phone);
    setDone('comp-avatar', !!data.avatar);
    setDone('comp-address', !!(data.addresses && data.addresses.length > 0));

    lucide.createIcons();
}

/* ──────────────────────────────────────────────────────────────
   EDIT SECTION TOGGLES
   ────────────────────────────────────────────────────────────── */
function setupEditSection(editBtnId, formId, actionsId, cancelBtnId, saveBtnId, headerCancelBtnId) {
    const editBtn        = document.getElementById(editBtnId);
    const headerCancelBtn = document.getElementById(headerCancelBtnId);
    const form           = document.getElementById(formId);
    const actions        = document.getElementById(actionsId);
    const cancelBtn      = document.getElementById(cancelBtnId);
    const saveBtn        = document.getElementById(saveBtnId);
    if (!editBtn || !form) return;

    const inputs = form.querySelectorAll('input, select, textarea');
    let originalValues = {};

    function enterEditMode() {
        inputs.forEach(inp => { originalValues[inp.id] = inp.value; });
        inputs.forEach(inp => { inp.disabled = false; });
        actions.classList.remove('hidden');
        editBtn.classList.add('active');
        editBtn.classList.add('hidden');
        editBtn.setAttribute('aria-expanded', 'true');
        if (headerCancelBtn) {
            headerCancelBtn.classList.remove('hidden');
            headerCancelBtn.setAttribute('aria-expanded', 'true');
        }
    }

    function exitEditMode() {
        inputs.forEach(inp => { inp.value = originalValues[inp.id] || inp.value; inp.disabled = true; });
        actions.classList.add('hidden');
        editBtn.classList.remove('active');
        editBtn.classList.remove('hidden');
        editBtn.setAttribute('aria-expanded', 'false');
        if (headerCancelBtn) {
            headerCancelBtn.classList.add('hidden');
            headerCancelBtn.setAttribute('aria-expanded', 'false');
        }
    }

    editBtn.addEventListener('click', enterEditMode);
    cancelBtn?.addEventListener('click', exitEditMode);
    headerCancelBtn?.addEventListener('click', exitEditMode);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;

        try {
            const token = getAuth()?.token;
            if (!token) throw new Error('Authentication required');

            let apiUrl = '';
            let requestData = {};

            if (formId === 'personal-form') {
                apiUrl = `${API_BASE}/api/auth/me`;
                requestData = {
                    firstName: document.getElementById('first-name').value.trim(),
                    lastName: document.getElementById('last-name').value.trim(),
                    phone: document.getElementById('phone').value.trim() || null
                };
            } else if (formId === 'address-form') {
                apiUrl = `${API_BASE}/api/auth/me/address`;
                requestData = {
                    street: document.getElementById('address').value.trim(),
                    city: document.getElementById('city').value.trim(),
                    state: document.getElementById('region').value,
                    notes: document.getElementById('notes').value.trim()
                };
            }

            const response = await fetch(apiUrl, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (response.status === 401 || response.status === 403) {
                    // cookie auth
                    const errorType = response.status === 401 ? 'invalid_credentials' : 'session_invalid';
                    window.location.href = '../../auth/login.html?error=' + errorType;

                }
                return;
            }

            // Success — update shared nav bars immediately using response data
            const userData = result.data;
            const firstNameVal = userData.firstName || '';
            const lastNameVal = userData.lastName || '';
            const fullName = `${firstNameVal} ${lastNameVal}`.trim() || 'User';
            const initials = ((firstNameVal[0] || '') + (lastNameVal[0] || '')).toUpperCase() || 'U';

            const topnavUsername = document.getElementById('topnav-username');
            const topnavAvatar   = document.getElementById('topnav-avatar');
            const sidebarName    = document.getElementById('sidebar-name');
            const sidebarAvatar  = document.getElementById('sidebar-avatar');

            if (topnavUsername) topnavUsername.textContent = fullName;
            if (sidebarName)   sidebarName.textContent   = fullName;

            const updateAvatarEl = (el) => {
                if (!el) return;
                if (userData.avatar) {
                    el.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = userData.avatar;
                    img.alt = 'Avatar';
                    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
                    el.appendChild(img);

                }
            };
            updateAvatarEl(topnavAvatar);
            updateAvatarEl(sidebarAvatar);

            showToast('Profile updated successfully', 'success');
            await loadProfile();

        } catch (err) {
            console.error('Error saving changes:', err);
            showToast('Failed to save changes: ' + err.message, 'error');
        } finally {
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            exitEditMode();
        }
    });
}

setupEditSection('edit-personal-btn', 'personal-form', 'personal-actions', 'cancel-personal-btn', 'save-personal-btn', 'cancel-personal-header-btn');
setupEditSection('edit-address-btn',  'address-form',  'address-actions',  'cancel-address-btn',  'save-address-btn',  'cancel-address-header-btn');

/* ──────────────────────────────────────────────────────────────
   AVATAR UPLOAD
   ────────────────────────────────────────────────────────────── */
document.getElementById('avatar-input').addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;

    // Client-side validation
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file (JPEG, PNG, etc.).', 'error');
        return;
    }
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        showToast('Image is too large. Please choose a file under 5MB.', 'error');
        return;
    }

    // Disable input during upload
    this.disabled = true;
    const avatarCircle = document.getElementById('avatar-circle');
    const originalContent = avatarCircle.innerHTML;
    // Show spinner overlay
    avatarCircle.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border-radius:50%;"><div class="btn-spinner" style="width:24px;height:24px;border-width:2px;border-top-color:#fff;"></div></div>`;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;

        try {
            const token = getAuth()?.token;
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include',
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ avatar: base64 })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to upload avatar');
            }

            // Success — update shared nav bars immediately
            const userData = result.data;
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || 'User';
            const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U';

            const updateAvatarEl = (el) => {
                if (!el) return;
                if (userData.avatar) {
                    el.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = userData.avatar;
                    img.alt = 'Avatar';
                    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
                    el.appendChild(img);

                }
            };

            updateAvatarEl(document.getElementById('topnav-avatar'));
            updateAvatarEl(document.getElementById('sidebar-avatar'));
            updateAvatarEl(avatarCircle);

            showToast('Avatar updated successfully', 'success');
            await loadProfile();

        } catch (err) {
            console.error('Avatar upload error:', err);
            showToast('Avatar upload failed: ' + err.message, 'error');
            avatarCircle.innerHTML = originalContent;
        } finally {
            this.disabled = false;
        }
    };
    reader.onerror = () => {
        showToast('Failed to read image file.', 'error');
        avatarCircle.innerHTML = originalContent;
        this.disabled = false;
    };
    reader.readAsDataURL(file);
});

/* ──────────────────────────────────────────────────────────────
   INITIALISE
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', loadProfile);
