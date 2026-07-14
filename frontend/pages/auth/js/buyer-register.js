// UniMartX Auth V2 — Buyer Registration (vanilla, no dependencies)

// ── PASSWORD TOGGLE ───────────────────────────────────────────
function bindToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    btn.addEventListener('click', () => {
        const revealed = input.type === 'text';
        input.type = revealed ? 'password' : 'text';
        btn.setAttribute('aria-pressed', String(!revealed));
        btn.setAttribute('aria-label', revealed ? 'Show password' : 'Hide password');
        input.focus();
    });
}
bindToggle('toggle-password', 'password');
bindToggle('toggle-confirm', 'confirm-password');

// ── PASSWORD STRENGTH + CHECKLIST ────────────────────────────
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm-password');
const strengthBar = document.getElementById('strength-bar');
const strengthLabel = document.getElementById('strength-label');
const reqItems = document.querySelectorAll('#req-list li');

function passwordChecks(pw) {
    return {
        length: pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        number: /\d/.test(pw),
        special: /[^A-Za-z0-9]/.test(pw),
    };
}

function getStrength(pw) {
    const c = passwordChecks(pw);
    let points = 0;
    if (c.length) points++;
    if (pw.length >= 12) points++;
    if (c.upper && c.lower) points++;
    if (c.number) points++;
    if (c.special) points++;
    if (points <= 2) return 'weak';
    if (points === 3) return 'fair';
    if (points === 4) return 'strong';
    return 'excellent';
}

function refreshStrength() {
    const pw = passwordInput.value;
    const checks = passwordChecks(pw);

    reqItems.forEach((li) => {
        li.classList.toggle('met', checks[li.dataset.req]);
    });

    strengthBar.className = 'pw-strength-bar';
    strengthLabel.className = 'pw-strength-label';
    strengthLabel.textContent = '';

    if (pw) {
        const level = getStrength(pw);
        strengthBar.classList.add(level);
        const text = {
            weak: 'Weak password',
            fair: 'Fair — add more variety',
            strong: 'Strong password',
            excellent: 'Excellent password',
        }[level];
        strengthLabel.textContent = text;
        strengthLabel.classList.add('visible', level);
    }
}

function refreshMatch() {
    const indicator = document.getElementById('match-indicator');
    const match = confirmInput.value && confirmInput.value === passwordInput.value;
    indicator.classList.toggle('visible', match);
    if (match) {
        confirmInput.classList.add('success');
        confirmInput.classList.remove('error');
    } else {
        confirmInput.classList.remove('success');
    }
}

passwordInput.addEventListener('input', () => {
    refreshStrength();
    if (confirmInput.value) refreshMatch();
    if (passwordInput.classList.contains('error')) validateField('password');
});

confirmInput.addEventListener('input', () => {
    refreshMatch();
    if (confirmInput.classList.contains('error')) validateField('confirm-password');
});

// ── FORM VALIDATION ───────────────────────────────────────────
function setError(id, message) {
    const input = document.getElementById(id);
    if (input) {
        input.classList.add('error');
        input.classList.remove('success');
    }
    const err = document.getElementById(`${id}-error`);
    if (err) { err.textContent = message; err.classList.add('visible'); }
}

function setSuccess(id) {
    const input = document.getElementById(id);
    if (input) {
        input.classList.remove('error');
        input.classList.add('success');
    }
    const err = document.getElementById(`${id}-error`);
    if (err) err.classList.remove('visible');
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
        if (!/^[^\s@]+@gmail\.com$/i.test(value)) return setError(id, 'Please use a valid @gmail.com email address.'), false;
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
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!re.test(value)) return setError(id, 'Use uppercase, lowercase, number & a special character (@$!%*?&).'), false;
        return setSuccess(id), true;
    }
    if (id === 'confirm-password') {
        if (!value) return setError(id, 'Please confirm your password.'), false;
        if (value !== passwordInput.value) return setError(id, 'Passwords do not match.'), false;
        return setSuccess(id), true;
    }
    if (id === 'terms') {
        const err = document.getElementById('terms-error');
        if (!el.checked) {
            err.textContent = 'You must agree to the Terms and Privacy Policy.';
            err.classList.add('visible');
            return false;
        }
        err.classList.remove('visible');
        return true;
    }
    return true;
}

['name', 'email', 'phone', 'password', 'confirm-password'].forEach((id) => {
    document.getElementById(id).addEventListener('blur', () => validateField(id));
});

document.getElementById('terms').addEventListener('change', () => validateField('terms'));

// ── SUBMIT ────────────────────────────────────────────────────
const form = document.getElementById('register-form');
const submitBtn = document.getElementById('submit-btn');
const alertSuccess = document.getElementById('alert-success');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const valid = ['name', 'email', 'phone', 'password', 'confirm-password', 'terms']
        .map(validateField)
        .every(Boolean);
    if (!valid) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertError.hidden = true;
    alertSuccess.hidden = true;

    try {
        const response = await fetch(`${API_BASE}/api/auth/register/buyer`, {
            credentials: 'include',
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
            alertSuccess.hidden = false;
            form.reset();
            refreshStrength();
            confirmInput.classList.remove('success');
            document.getElementById('match-indicator').classList.remove('visible');
            setTimeout(() => { window.location.href = '../login.html'; }, 2000);
        } else {
            const msg = result?.error || 'Registration failed. Please try again.';
            errorText.textContent = msg;
            alertError.hidden = false;
            if (result?.error && /already registered/i.test(result.error)) {
                setError('email', result.error);
            }
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error('Registration error:', err);
        errorText.textContent = 'Network error. Please check your connection and try again.';
        alertError.hidden = false;
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});
