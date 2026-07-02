lucide.createIcons();

// ── ROLE SELECTION ───────────────────────────────────────────
const roleCards = document.querySelectorAll('.role-card');
const roleLabel = document.getElementById('role-label');

const ROLE_THEMES = {
    buyer: {
        primary: '#4a90d9',
        primaryD: '#3a7bc8',
        accent: '#4ecdc4',
        bgStart: '#0a1622',
        bgMid: '#0f1f35',
        bgEnd: '#0a1622',
        shape1: '#4a90d9',
        shape2: '#1e3a5f',
        shape3: '#4ecdc4',
        shape4: '#f5a623',
        shape5: '#162d4a',
        cardBg: '#0f1f35',
        text: '#e8f1ff',
        text2: '#bcc8e0',
        text3: '#7a8fab',
        border: 'rgba(74,144,217,0.2)',
    },
    seller: {
        primary: '#f5a623',
        primaryD: '#d4911c',
        accent: '#4ecdc4',
        bgStart: '#140e04',
        bgMid: '#1f1608',
        bgEnd: '#140e04',
        shape1: '#f5a623',
        shape2: '#5c3d08',
        shape3: '#4ecdc4',
        shape4: '#ffd93d',
        shape5: '#2e200a',
        cardBg: '#1f1608',
        text: '#fff3e0',
        text2: '#d4b896',
        text3: '#a08b6e',
        border: 'rgba(245,166,35,0.2)',
    },
    admin: {
        primary: '#6c5ce7',
        primaryD: '#5a4bd1',
        accent: '#8b7cf0',
        bgStart: '#0e0c18',
        bgMid: '#16132a',
        bgEnd: '#0e0c18',
        shape1: '#6c5ce7',
        shape2: '#2a2550',
        shape3: '#8b7cf0',
        shape4: '#3d3660',
        shape5: '#1a1735',
        cardBg: '#16132a',
        text: '#f1efff',
        text2: '#d4d0e8',
        text3: '#a29bfe',
        border: 'rgba(140,124,240,0.2)',
    },
};

function applyRoleTheme(role) {
    const t = ROLE_THEMES[role] || ROLE_THEMES.buyer;
    const root = document.documentElement;

    root.style.setProperty('--primary', t.primary);
    root.style.setProperty('--primary-d', t.primaryD);
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--shadow-hover', `0 12px 40px ${t.primary}55, 0 4px 12px rgba(0,0,0,0.4)`);
    root.style.setProperty('--bg-start', t.bgStart);
    root.style.setProperty('--bg-mid', t.bgMid);
    root.style.setProperty('--bg-end', t.bgEnd);
    root.style.setProperty('--shape-1', t.shape1);
    root.style.setProperty('--shape-2', t.shape2);
    root.style.setProperty('--shape-3', t.shape3);
    root.style.setProperty('--shape-4', t.shape4);
    root.style.setProperty('--shape-5', t.shape5);
    root.style.setProperty('--bg-card', t.cardBg);
    root.style.setProperty('--text', t.text);
    root.style.setProperty('--text-2', t.text2);
    root.style.setProperty('--text-3', t.text3);
    root.style.setProperty('--border', t.border);

    const card = document.querySelector('.card');
    if (card) {
        card.style.background = t.cardBg;
        card.style.borderColor = t.border;
        card.style.color = t.text;
    }

    const labels = card ? card.querySelectorAll('label, .label-row label') : [];
    labels.forEach((label) => (label.style.color = t.text));

    const inputs = card ? card.querySelectorAll('input') : [];
    inputs.forEach((input) => {
        input.style.background = '#0b1220';
        input.style.color = t.text;
    });

    const remember = document.querySelector('.form-check');
    if (remember) {
        remember.style.color = t.text2;
    }

    const footer = document.querySelector('.auth-footer');
    if (footer) {
        footer.style.color = t.text2;
    }
}

function selectRole(card) {
    if (!card || card.classList.contains('active')) return;
    roleCards.forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    if (roleLabel) {
        roleLabel.textContent = card.dataset.role;
    }
    applyRoleTheme(card.dataset.role);
}

roleCards.forEach((card) => {
    card.addEventListener('click', () => selectRole(card));
});

selectRole(document.querySelector('.role-card.active') || roleCards[0]);

// ── PASSWORD TOGGLE ──────────────────────────────────────────
function togglePassword(btn, input) {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
}

document.getElementById('toggle-password').addEventListener('click', function () {
    togglePassword(this, document.getElementById('password'));
});

// ── FORM VALIDATION ────────────────────────────────────────
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

['email', 'password'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('input', () => {
        if (el.classList.contains('error')) validateField(id);
    });
});

// ── FORM SUBMIT ────────────────────────────────────────────
const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');
const rememberCheckbox = document.getElementById('remember');

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

const LANDING_PAGES = {
    buyer: '../buyer/buyer-landing/buyer-landing.html',
    seller: '../seller/private/seller-landing/landing.html',
    admin: '../admin/admin-landing/admin-landing.html',
};

const REMEMBER_ME_EXPIRY = 30 * 24 * 60 * 60 * 1000;

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

function saveAuthData(user, rememberMe) {
    const token = localStorage.getItem('authToken');
    const expiry = rememberMe ? Date.now() + REMEMBER_ME_EXPIRY : null;
    const payload = { token, user };
    const entry = expiry ? { expiry, value: JSON.stringify(payload) } : payload;
    localStorage.setItem('authData', JSON.stringify(entry));
    localStorage.setItem('pnav_firstname', user.firstName || '');
    localStorage.setItem('pnav_lastname', user.lastName || '');
    localStorage.setItem('pnav_avatar', user.avatar || '');
    localStorage.setItem('pnav_role', user.role || 'buyer');
}

function clearAuthData() {
    // cookie auth
    // cookie auth
}

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const valid = ['email', 'password'].map(id => validateField(id)).every(Boolean);
    if (!valid) return;

    const rememberMe = rememberCheckbox.checked;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertError.classList.remove('visible');

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
            if (token) {
                localStorage.setItem('authToken', token);
            }
            saveAuthData(user, rememberMe);
            localStorage.setItem('userRole', user.role);

            const redirectMap = {
                buyer: '../buyer/buyer-landing/buyer-landing.html',
                seller: '../seller/private/dashboard/overview.html',
                admin: '../admin/admin-landing/admin-landing.html',
            };
            const destination = redirectMap[user.role];
            if (destination) {
                window.location.href = destination;
            }
        } else {
            const errorMessage = result?.error || 'Login failed. Please check your credentials and try again.';
            errorText.textContent = errorMessage;
            alertError.classList.add('visible');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error('Login error:', err);
        errorText.textContent = 'Network error. Please check your connection and try again.';
        alertError.classList.add('visible');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', () => {
});

// ── DISPLAY ERROR FROM QUERY PARAMETER ──────────────────────
(function showErrorFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (!error) return;

    const messages = {
        invalid_credentials: 'Invalid email or password.',
        session_invalid: 'Your session has expired. Please log in again.',
        auth_required: 'Please log in to continue.',
    };
    const message = messages[error] || 'An error occurred. Please try again.';
    errorText.textContent = message;
    alertError.classList.add('visible');
})();
