// UniMartX Auth V2 — login logic (vanilla, no dependencies)

// ── SEGMENTED ROLE CONTROL ──────────────────────────────────
const segmented = document.querySelector('.segmented');
const segButtons = Array.from(document.querySelectorAll('.seg-btn'));
const indicator = document.querySelector('.segmented-indicator');
const supportText = document.getElementById('support-text');

const ROLE_LABEL = { buyer: 'Buyer', seller: 'Seller', admin: 'Admin' };
let activeRole = 'buyer';

function moveIndicator(btn) {
    if (!indicator || !btn) return;
    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
}

function selectRole(btn, focus = false) {
    if (!btn || btn.dataset.role === activeRole) {
        if (btn) moveIndicator(btn);
        return;
    }
    segButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-checked', String(isActive));
        b.tabIndex = isActive ? 0 : -1;
    });
    activeRole = btn.dataset.role;
    moveIndicator(btn);
    if (supportText) {
        supportText.textContent = `Log in to your ${ROLE_LABEL[activeRole]} account to continue.`;
    }
    if (focus) btn.focus();
}

segButtons.forEach((btn, i) => {
    btn.addEventListener('click', () => selectRole(btn));
    btn.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = segButtons[(i + 1) % segButtons.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = segButtons[(i - 1 + segButtons.length) % segButtons.length];
        else if (e.key === 'Home') next = segButtons[0];
        else if (e.key === 'End') next = segButtons[segButtons.length - 1];
        if (next) {
            e.preventDefault();
            selectRole(next, true);
        }
    });
});

function syncIndicator() {
    const active = segButtons.find((b) => b.classList.contains('is-active')) || segButtons[0];
    moveIndicator(active);
}

window.addEventListener('resize', syncIndicator);
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncIndicator);
}
window.addEventListener('load', syncIndicator);
syncIndicator();

// ── PASSWORD TOGGLE ─────────────────────────────────────────
const toggleBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');

toggleBtn.addEventListener('click', () => {
    const revealed = passwordInput.type === 'text';
    passwordInput.type = revealed ? 'password' : 'text';
    toggleBtn.setAttribute('aria-pressed', String(!revealed));
    toggleBtn.setAttribute('aria-label', revealed ? 'Show password' : 'Hide password');
    passwordInput.focus();
});

// ── FORM VALIDATION ─────────────────────────────────────────
function setError(id, message) {
    const input = document.getElementById(id);
    input.classList.add('error');
    input.classList.remove('success');
    const err = document.getElementById(`${id}-error`);
    err.textContent = message;
    err.classList.add('visible');
}

function setSuccess(id) {
    const input = document.getElementById(id);
    input.classList.remove('error');
    input.classList.add('success');
    const err = document.getElementById(`${id}-error`);
    if (err) err.classList.remove('visible');
}

function validateField(id) {
    const el = document.getElementById(id);
    const value = el.value.trim();

    if (id === 'email') {
        if (!value) return setError(id, 'Please enter your email address.'), false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError(id, 'Please enter a valid email address.'), false;
        return setSuccess(id), true;
    }
    if (id === 'password') {
        if (!value) return setError(id, 'Please enter your password.'), false;
        return setSuccess(id), true;
    }
    return true;
}

['email', 'password'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('input', () => {
        if (el.classList.contains('error')) validateField(id);
    });
});

// ── FORM SUBMIT ─────────────────────────────────────────────
const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');
const rememberCheckbox = document.getElementById('remember');

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const REMEMBER_ME_EXPIRY = 30 * 24 * 60 * 60 * 1000;

function decodeJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function saveAuthData(user, rememberMe) {
    const token = localStorage.getItem('authToken');
    const payload = { token, user };
    const entry = rememberMe ? { expiry: Date.now() + REMEMBER_ME_EXPIRY, value: JSON.stringify(payload) } : payload;
    localStorage.setItem('authData', JSON.stringify(entry));
    localStorage.setItem('pnav_firstname', user.firstName || '');
    localStorage.setItem('pnav_lastname', user.lastName || '');
    localStorage.setItem('pnav_avatar', user.avatar || '');
    localStorage.setItem('pnav_role', user.role || 'buyer');
}

function showAlert(message) {
    errorText.textContent = message;
    alertError.hidden = false;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const valid = ['email', 'password'].map(validateField).every(Boolean);
    if (!valid) return;

    const rememberMe = rememberCheckbox.checked;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertError.hidden = true;

    try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const response = await fetch(`${API_BASE}/api/auth/login`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const { user, token } = result.data;
            if (token) localStorage.setItem('authToken', token);
            saveAuthData(user, rememberMe);
            localStorage.setItem('userRole', user.role);

            const redirectMap = {
                buyer: '../buyer/dashboard/dashboard.html',
                seller: '../seller/private/dashboard/overview.html',
                admin: '../admin/admin-landing/admin-landing.html',
            };
            const destination = redirectMap[user.role];
            if (destination) window.location.href = destination;
        } else {
            showAlert(result?.error || 'Login failed. Please check your credentials and try again.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error('Login error:', err);
        showAlert('Network error. Please check your connection and try again.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

// ── ERROR FROM QUERY PARAMETER ──────────────────────────────
(function showErrorFromQuery() {
    const error = new URLSearchParams(window.location.search).get('error');
    if (!error) return;

    const messages = {
        invalid_credentials: 'Invalid email or password.',
        session_invalid: 'Your session has expired. Please log in again.',
        auth_required: 'Please log in to continue.',
    };
    showAlert(messages[error] || 'An error occurred. Please try again.');
})();
