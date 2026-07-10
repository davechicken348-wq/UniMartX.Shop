lucide.createIcons();

// ── ENTRANCE ANIMATIONS ───────────────────────────────────────
const formGroups = document.querySelectorAll('.form-group');
formGroups.forEach((group, i) => {
    group.style.opacity = '0';
    group.style.transform = 'translateY(20px)';
    group.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    group.style.transitionDelay = `${0.2 + i * 0.08}s`;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            group.style.opacity = '1';
            group.style.transform = 'translateY(0)';
        });
    });
});

// ── PASSWORD TOGGLE ───────────────────────────────────────────
function togglePassword(btn, input) {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
}

document.getElementById('toggle-password').addEventListener('click', function () {
    togglePassword(this, document.getElementById('password'));
});

document.getElementById('toggle-confirm').addEventListener('click', function () {
    togglePassword(this, document.getElementById('confirm-password'));
});

// ── PASSWORD STRENGTH ─────────────────────────────────────────
const passwordInput = document.getElementById('password');
const strengthBar = document.getElementById('strength-bar');
const strengthLabel = document.getElementById('strength-label');

function getStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
}

passwordInput.addEventListener('input', function () {
    strengthBar.className = 'password-strength-bar';
    if (this.value) {
        const strength = getStrength(this.value);
        strengthBar.classList.add(strength);
        strengthLabel.textContent = strength === 'weak'
            ? 'Weak password'
            : strength === 'medium'
                ? 'Medium strength'
                : 'Strong password! 🔐';
        strengthLabel.className = `strength-label visible ${strength}`;

    }
});

// ── FORM VALIDATION ───────────────────────────────────────────
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

function clearAllFieldErrors() {
    ['name', 'email', 'phone', 'password', 'confirm-password'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.classList.remove('error');
            input.classList.remove('success');
        }
        const err = document.getElementById(`${id}-error`);
        if (err) err.classList.remove('visible');
    });
}

function validateField(id) {
    const el = document.getElementById(id);
    const value = el.value.trim();

    if (id === 'name') {
        if (!value) return setError(id, 'Please enter your full name.'), false;
        if (value.length < 2) return setError(id, 'Name must be at least 2 characters.'), false;
        return setSuccess(id), true;
    }
    if (id === 'email') {
        if (!value) return setError(id, 'Please enter your email address.'), false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError(id, 'Please enter a valid email address.'), false;
        if (!/^[^\s@]+@gmail\.com$/i.test(value)) return setError(id, 'Only Gmail addresses are allowed. Please use a @gmail.com email.'), false;
        return setSuccess(id), true;
    }
    if (id === 'phone') {
        if (!value) return setError(id, 'Please enter your phone number.'), false;
        if (!/^\+?[\d\s\-().]{7,20}$/.test(value)) return setError(id, 'Please enter a valid phone number.'), false;
        return setSuccess(id), true;
    }
    if (id === 'password') {
        if (!value) return setError(id, 'Please enter a password.'), false;
        if (value.length < 8) return setError(id, 'Password must be at least 8 characters.'), false;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(value)) return setError(id, 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&).'), false;
        return setSuccess(id), true;
    }
    if (id === 'confirm-password') {
        if (!value) return setError(id, 'Please confirm your password.'), false;
        if (value !== passwordInput.value) return setError(id, 'Passwords do not match.'), false;
        return setSuccess(id), true;
    }
    if (id === 'terms') {
        const termsErr = document.getElementById('terms-error');
        if (!el.checked) {
            termsErr.textContent = 'You must agree to the terms.';
            termsErr.classList.add('visible');
            return false;
        }
        termsErr.classList.remove('visible');
        return true;
    }
    return true;
}

['name', 'email', 'phone', 'password', 'confirm-password'].forEach(id => {
    document.getElementById(id).addEventListener('blur', () => validateField(id));
});

document.getElementById('confirm-password').addEventListener('input', function () {
    if (this.value && this.value === passwordInput.value) setSuccess('confirm-password');
});

document.getElementById('terms').addEventListener('change', () => validateField('terms'));

// ── FORM SUBMIT ───────────────────────────────────────────────
const form = document.getElementById('register-form');
const submitBtn = document.getElementById('submit-btn');
const alertSuccess = document.getElementById('alert-success');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');

// Backend API endpoint (adjust for production)
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const valid = ['name', 'email', 'password', 'confirm-password', 'terms']
        .map(id => validateField(id))
        .every(Boolean);

    if (!valid) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertSuccess.classList.remove('visible');
    alertError.classList.remove('visible');

    try {
        const response = await fetch(`${API_BASE}/api/auth/register/buyer`, { credentials: 'include', 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                password: document.getElementById('password').value,
            }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alertSuccess.classList.add('visible');
            form.reset();
            strengthBar.className = 'password-strength-bar';
            strengthLabel.className = 'strength-label';
            strengthLabel.textContent = '';
            document.querySelectorAll('.input-wrapper.success').forEach(w => w.classList.remove('success'));
            setTimeout(() => { window.location.href = '../login.html'; }, 1500);
        } else {
            if (result.error) {
                errorText.textContent = result.error;
            } else {
                errorText.textContent = 'Registration failed. Please try again.';
            }
            alertError.classList.add('visible');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error('Registration error:', err);
        errorText.textContent = 'Network error. Please check your connection and try again.';
        alertError.classList.add('visible');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});
