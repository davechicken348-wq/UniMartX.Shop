lucide.createIcons();

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── PASSWORD TOGGLE ────────────────────────────────────────
document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        const svg = btn.querySelector('svg');
        if (svg) {
            svg.innerHTML = isHidden
                ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        }
    });
});

// ── TOKEN EXTRACTION ──────────────────────────────────────
function extractTokenFromUrl() {
    let token = null;

    if (window.location.hash && window.location.hash.length > 1) {
        const hashStr = window.location.hash.substring(1);
        if (hashStr.startsWith('error=')) {
            const errorType = hashStr.split('=')[1];
            handleRedirectError(errorType);
            return { token: null, errorHandled: true };
        }
        const hashParams = new URLSearchParams(hashStr);
        token = hashParams.get('token');
    }

    if (!token) {
        const urlParams = new URLSearchParams(window.location.search);
        token = urlParams.get('token');
    }

    if (!token) {
        const href = window.location.href;
        const tokenMatch = href.match(/[?&#]token=([^&#]+)/);
        if (tokenMatch) token = decodeURIComponent(tokenMatch[1]);
    }

    return { token, errorHandled: false };
}

function handleRedirectError(errorType) {
    const resetForm = document.getElementById('reset-form');
    if (resetForm) resetForm.classList.add('hidden');

    let message = 'An error occurred. Please try again.';
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

    errorText.textContent = message;
    alertError.classList.add('visible');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
}

// ── FORM VALIDATION ────────────────────────────────────────
const form = document.getElementById('reset-form');
const newPwdInput = document.getElementById('new-password');
const confirmPwdInput = document.getElementById('confirm-password');
const pwdError = document.getElementById('password-error');
const confirmError = document.getElementById('confirm-error');
const submitBtn = document.getElementById('submit-btn');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');
const viewForm = document.getElementById('view-form');
const viewSuccess = document.getElementById('view-success');
const strengthBar = document.getElementById('strength-bar');

let resetToken = '';

document.addEventListener('DOMContentLoaded', () => {
    const { token, errorHandled } = extractTokenFromUrl();
    resetToken = token || '';

    const tokenInput = document.getElementById('reset-token');
    if (tokenInput) tokenInput.value = resetToken;

    if (errorHandled) return;

    if (!resetToken) {
        errorText.textContent = 'Invalid password reset link. Please request a new one.';
        alertError.classList.add('visible');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
    }
});

function setPwdError(msg) {
    newPwdInput.classList.add('error');
    newPwdInput.classList.remove('success');
    pwdError.textContent = msg;
    pwdError.classList.add('visible');
}

function clearPwdError() {
    newPwdInput.classList.remove('error');
    pwdError.classList.remove('visible');
}

function validatePwd() {
    const val = newPwdInput.value.trim();
    if (!val) { setPwdError('Please enter a new password.'); return false; }
    if (val.length < 8) { setPwdError('Password must be at least 8 characters.'); return false; }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(val)) { setPwdError('Must contain uppercase, lowercase, number, and special character (@$!%*?&).'); return false; }
    clearPwdError();
    newPwdInput.classList.add('success');
    return true;
}

function setConfirmError(msg) {
    confirmPwdInput.classList.add('error');
    confirmPwdInput.classList.remove('success');
    confirmError.textContent = msg;
    confirmError.classList.add('visible');
}

function clearConfirmError() {
    confirmPwdInput.classList.remove('error');
    confirmError.classList.remove('visible');
}

function validateConfirm() {
    const val = confirmPwdInput.value.trim();
    if (!val) { setConfirmError('Please confirm your new password.'); return false; }
    if (val !== newPwdInput.value) { setConfirmError('Passwords do not match.'); return false; }
    clearConfirmError();
    confirmPwdInput.classList.add('success');
    return true;
}

newPwdInput.addEventListener('blur', validatePwd);
newPwdInput.addEventListener('input', () => { if (newPwdInput.classList.contains('error')) validatePwd(); });
confirmPwdInput.addEventListener('blur', validateConfirm);
confirmPwdInput.addEventListener('input', () => { if (confirmPwdInput.classList.contains('error')) validateConfirm(); });

newPwdInput.addEventListener('input', function () {
    strengthBar.className = 'password-strength-bar';
    if (this.value) {
        let score = 0;
        if (this.value.length >= 8) score++;
        if (this.value.length >= 12) score++;
        if (/[a-z]/.test(this.value) && /[A-Z]/.test(this.value)) score++;
        if (/\d/.test(this.value)) score++;
        if (/[^a-zA-Z0-9]/.test(this.value)) score++;
        const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
        strengthBar.classList.add(strength);
    }
});

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const validPwd = validatePwd();
    const validConfirm = validateConfirm();
    if (!validPwd || !validConfirm) return;

    if (!resetToken) {
        errorText.textContent = 'Missing reset token. Please use the link from your email.';
        alertError.classList.add('visible');
        return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertError.classList.remove('visible');

    try {
        const response = await fetch(`${API_BASE}/api/auth/reset-password`, { credentials: 'include', 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: resetToken,
                newPassword: newPwdInput.value.trim(),
            }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            viewForm.classList.add('hidden');
            viewSuccess.classList.remove('hidden');
            lucide.createIcons();

        }
    } catch (err) {
        console.error('Reset password error:', err);
        errorText.textContent = 'Network error. Please check your connection and try again.';
        alertError.classList.add('visible');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});
