// ── INIT ───────────────────────────────────────────────────────────
lucide.createIcons();

// API base URL
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── HANDLE REDIRECT ERRORS FROM HASH FRAGMENT ─────────────────────
// The forgot-password redirect endpoint can send errors via #error=...
// These never reach the server, so they survive email client proxies.
(function handleHashErrors() {
    if (!window.location.hash || window.location.hash.length <= 1) return;

    const hashStr = window.location.hash.substring(1);
    if (!hashStr.startsWith('error=')) return;

    const errorType = hashStr.split('=')[1];
    const alertError = document.getElementById('alert-error');
    const errorText = document.getElementById('error-text');
    const forgotForm = document.getElementById('forgot-form');
    const submitBtn = document.getElementById('submit-btn');

    let message = 'An unexpected error occurred. Please try again.';
    switch (errorType) {
        case 'invalid_token':
            message = 'Invalid reset link. Please request a new one.';
            break;
        case 'expired':
            message = 'Reset link has expired. Please request a new one.';
            break;
        case 'already_used':
            message = 'This reset link has already been used. Please request a new one.';
            break;
        case 'server_error':
            message = 'Server error. Please try again later.';
            break;
    }

    if (forgotForm) forgotForm.classList.add('hidden');
    errorText.textContent = message;
    alertError.classList.add('visible');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
    }
    console.log('[forgot-password] Error from redirect:', errorType);
})();

// ── IMAGE COLLAGE ENTRANCE ────────────────────────────────────────
document.querySelectorAll('.collage-img').forEach((img, i) => {
    img.style.opacity = '0';
    img.style.transform = 'scale(0.9)';
    img.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
    requestAnimationFrame(() => {
        img.style.opacity = '1';
        img.style.transform = 'scale(1)';
    });
});

// ── FORM LOGIC ────────────────────────────────────────────────────
const form = document.getElementById('forgot-form');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const submitBtn = document.getElementById('submit-btn');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');
const viewRequest = document.getElementById('view-request');
const viewSuccess = document.getElementById('view-success');
const sentTo = document.getElementById('sent-to');

let submittedEmail = '';

function setError(msg) {
    emailInput.classList.add('error');
    emailInput.classList.remove('success');
    emailError.textContent = msg;
    emailError.classList.add('visible');
}

function clearError() {
    emailInput.classList.remove('error');
    emailError.classList.remove('visible');
}

function validateEmail() {
    const val = emailInput.value.trim();
    if (!val) { setError('Please enter your email address.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { setError('Please enter a valid email address.'); return false; }
    clearError();
    emailInput.classList.add('success');
    return true;
}

emailInput.addEventListener('blur', () => { if (emailInput.value) validateEmail(); });

form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateEmail()) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertError.classList.remove('visible');

    try {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value.trim() }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            submittedEmail = emailInput.value.trim();
            sentTo.textContent = submittedEmail;
            viewRequest.classList.add('hidden');
            viewSuccess.classList.remove('hidden');
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Forgot password error:', err);
        errorText.textContent = 'Network error. Please check your connection and try again.';
        alertError.classList.add('visible');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

// ── RESEND ────────────────────────────────────────────────────────
const resendBtn = document.getElementById('resend-btn');
const resendConfirm = document.getElementById('resend-confirm');
let resendCooldown = false;

resendBtn.addEventListener('click', async function () {
    if (resendCooldown || !submittedEmail) return;

    resendBtn.classList.add('loading');
    resendBtn.disabled = true;
    resendConfirm.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: submittedEmail }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            resendConfirm.classList.remove('hidden');
            lucide.createIcons();

            resendCooldown = true;
            let seconds = 30;
            resendBtn.querySelector('.btn-text').textContent = `Resend in ${seconds}s`;

            const interval = setInterval(() => {
                seconds--;
                resendBtn.querySelector('.btn-text').textContent = `Resend in ${seconds}s`;
                if (seconds <= 0) {
                    clearInterval(interval);
                    resendBtn.querySelector('.btn-text').textContent = 'Resend Email';
                    resendBtn.disabled = false;
                    resendCooldown = false;
                }
            }, 1000);
        }
    } catch (err) {
        console.error('Resend error:', err);
        resendBtn.disabled = false;
    } finally {
        resendBtn.classList.remove('loading');
    }
});
