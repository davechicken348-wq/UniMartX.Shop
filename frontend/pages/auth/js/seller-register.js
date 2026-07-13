lucide.createIcons();

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── BUYER EMAIL CHECK ────────────────────────────────────────
const emailInput = document.getElementById('email');
const buyerNotice = document.getElementById('buyer-notice');

if (emailInput) {
    emailInput.addEventListener('blur', async () => {
        const email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

        try {
            const res = await fetch(`${API_BASE}/api/public/check-buyer-email?email=${encodeURIComponent(email)}`, {
                credentials: 'include',
                cache: 'no-store',
            });
            const json = await res.json();
            if (json.success && json.data?.isBuyer) {
                emailInput.classList.add('error');
                emailInput.classList.remove('success');
                const errEl = document.getElementById('email-error');
                if (errEl) {
                    errEl.textContent = 'This email is already registered as a buyer. Seller registration will be available soon. Stay tuned!';
                    errEl.classList.add('visible');
                }
            }
        } catch {
            // silent — don't block registration on network error
        }
    });
}

// ── STEP NAVIGATION ────────────────────────────────────────
let currentStep = 1;

const STEP_COLORS = {
    1: '#6366f1',
    2: '#8b5cf6',
    3: '#f97316'
};

function updateProgress(n) {
    const fill = document.getElementById('progress-fill');
    const labels = document.querySelectorAll('.progress-label');
    const visualSteps = document.querySelectorAll('.visual-step');

    fill.style.width = `${(n / 3) * 100}%`;
    fill.style.background = `linear-gradient(90deg, ${STEP_COLORS[n]}, ${STEP_COLORS[n]}dd)`;
    fill.style.boxShadow = `0 0 12px ${STEP_COLORS[n]}44`;

    labels.forEach((label, i) => {
        label.classList.remove('active', 'completed');
        if (i + 1 < n) label.classList.add('completed');
        else if (i + 1 === n) {
            label.classList.add('active');
            label.style.color = STEP_COLORS[n];
        }
    });

    visualSteps.forEach((step, i) => {
        step.classList.toggle('active', i + 1 === n);
        const iconWrap = step.querySelector('.visual-step-icon');
        if (iconWrap && i + 1 === n) {
            iconWrap.style.background = `${STEP_COLORS[n]}44`;
            iconWrap.style.borderColor = `${STEP_COLORS[n]}66`;
        } else if (iconWrap && i + 1 !== n) {
            iconWrap.style.background = '';
            iconWrap.style.borderColor = '';
        }
    });

    const panelBorder = document.querySelector('.visual-panel');
    if (panelBorder) {
        panelBorder.style.boxShadow = `0 20px 60px ${STEP_COLORS[n]}33, 0 0 0 1px ${STEP_COLORS[n]}22`;
    }
}

function showStep(n) {
    document.querySelectorAll('.form-step').forEach(s => {
        s.classList.remove('active');
    });

    const currentStepEl = document.getElementById(`step-${n}`);
    if (currentStepEl) currentStepEl.classList.add('active');

    currentStep = n;
    updateProgress(n);

    const body = document.body;
    body.classList.remove('theme-step-1', 'theme-step-2', 'theme-step-3');
    body.classList.add(`theme-step-${n}`);

    const cardBody = document.querySelector('.card-body');
    const stepBgs = { 1: '#fafbff', 2: '#fdfbff', 3: '#fffaf7' };
    if (cardBody) cardBody.style.background = stepBgs[n] || '#fff';

    const panel = document.querySelector('.visual-panel');
    const panelBgs = {
        1: 'linear-gradient(160deg, #4f46e5 0%, #6366f1 40%, #8b5cf6 100%)',
        2: 'linear-gradient(160deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 100%)',
        3: 'linear-gradient(160deg, #ea580c 0%, #f97316 40%, #fb923c 100%)',
    };
    const panelShadows = {
        1: '0 20px 60px rgba(99,102,241,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
        2: '0 20px 60px rgba(139,92,246,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
        3: '0 20px 60px rgba(249,115,22,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
    };
    if (panel) {
        panel.style.background = panelBgs[n] || panelBgs[1];
        panel.style.boxShadow = panelShadows[n] || panelShadows[1];
    }

    const card = document.querySelector('.card');
    if (card) card.scrollTop = 0;
    if (window.lucide) lucide.createIcons();
}

document.getElementById('next-1').addEventListener('click', () => { if (validateStep1()) showStep(2); });
document.getElementById('next-2').addEventListener('click', () => { if (validateStep2()) showStep(3); });
document.getElementById('back-1').addEventListener('click', () => showStep(1));
document.getElementById('back-2').addEventListener('click', () => showStep(2));

// ── SELLER TYPE TOGGLE ─────────────────────────────────────
const campusFields = document.getElementById('campus-fields');
const independentFields = document.getElementById('independent-fields');

document.querySelectorAll('.persona-card input[name="seller-type"]').forEach(radio => {
    radio.addEventListener('change', function () {
        campusFields.classList.toggle('visible', this.value === 'campus');
        independentFields.classList.toggle('visible', this.value === 'independent');
        document.getElementById('seller-type-error').classList.remove('visible');

        if (this.value === 'campus') {
            const universityInput = document.getElementById('university');
            universityInput.classList.remove('error', 'success');
            universityInput.classList.add('error');
            const universityError = document.getElementById('university-error');
            if (universityError) { universityError.textContent = 'Please enter your university name.'; universityError.classList.add('visible'); }
        } else {
            const universityInput = document.getElementById('university');
            universityInput.classList.remove('error', 'success');
            const universityError = document.getElementById('university-error');
            if (universityError) universityError.classList.remove('visible');

            const bizInput = document.getElementById('biz-type');
            if (bizInput) bizInput.classList.remove('error');
            const bizError = document.getElementById('biz-type-error');
            if (bizError) bizError.classList.remove('visible');
        }
    });
});

// ── PASSWORD TOGGLE ────────────────────────────────────────
function togglePassword(btn, input) {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    const svg = btn.querySelector('svg');
    if (svg) {
        svg.innerHTML = isHidden
            ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
            : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

document.getElementById('toggle-password').addEventListener('click', function () {
    togglePassword(this, document.getElementById('password'));
});
document.getElementById('toggle-confirm').addEventListener('click', function () {
    togglePassword(this, document.getElementById('confirm-password'));
});

// ── PASSWORD STRENGTH ──────────────────────────────────────
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
    return score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
}

passwordInput.addEventListener('input', function () {
    strengthBar.className = 'password-strength-bar';
    strengthLabel.className = 'strength-label';
    if (this.value) {
        const s = getStrength(this.value);
        strengthBar.classList.add(s);
        strengthLabel.classList.add(s, 'visible');
        const labels = { weak: 'Weak password', medium: 'Medium strength', strong: 'Strong password' };
        strengthLabel.textContent = labels[s];

    }
});

// ── CHAR COUNT ─────────────────────────────────────────────
document.getElementById('store-desc').addEventListener('input', function () {
    document.getElementById('desc-count').textContent = this.value.length;
});

// ── VALIDATION HELPERS ─────────────────────────────────────
function setError(id, message) {
    const input = document.getElementById(id);
    input.classList.add('error'); input.classList.remove('success');
    const err = document.getElementById(`${id}-error`);
    if (err) { err.textContent = message; err.classList.add('visible'); }
}

function setSuccess(id) {
    const input = document.getElementById(id);
    input.classList.remove('error'); input.classList.add('success');
    document.getElementById(`${id}-error`)?.classList.remove('visible');
}

function val(id) { return document.getElementById(id).value.trim(); }

function validateStep1() {
    let ok = true;
    if (!val('name') || val('name').length < 2) { setError('name', 'Please enter your full name (min 2 chars).'); ok = false; } else setSuccess('name');
    if (!val('email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) { setError('email', 'Please enter a valid email address.'); ok = false; } else if (!/^[^\s@]+@gmail\.com$/i.test(val('email'))) { setError('email', 'Only Gmail addresses are allowed. Please use a @gmail.com email.'); ok = false; } else setSuccess('email');
    if (!val('phone') || !/^\+?[\d\s\-().]{7,20}$/.test(val('phone'))) { setError('phone', 'Please enter a valid phone number.'); ok = false; } else setSuccess('phone');
    if (!val('password') || val('password').length < 8) { setError('password', 'Password must be at least 8 characters.'); ok = false; } else setSuccess('password');
    if (!val('confirm-password') || val('confirm-password') !== document.getElementById('password').value) { setError('confirm-password', 'Passwords do not match.'); ok = false; } else setSuccess('confirm-password');
    return ok;
}

function validateStep2() {
    let ok = true;
    const selected = document.querySelector('.persona-card input[name="seller-type"]:checked');
    const typeErr = document.getElementById('seller-type-error');

    if (!selected) {
        typeErr.textContent = 'Please select a seller type.';
        typeErr.classList.add('visible');
        ok = false;
    } else {
        if (selected.value === 'campus') {
            if (!val('university')) { setError('university', 'Please enter your university name.'); ok = false; } else setSuccess('university');
        } else {
            const universityInput = document.getElementById('university');
            universityInput.classList.remove('error', 'success');
            const universityError = document.getElementById('university-error');
            if (universityError) universityError.classList.remove('visible');
        }
        if (selected.value === 'independent') {
            const biz = document.getElementById('biz-type');
            if (!biz.value) {
                biz.classList.add('error');
                document.getElementById('biz-type-error').textContent = 'Please select a business type.';
                document.getElementById('biz-type-error').classList.add('visible');
                ok = false;
            }
        }
    }
    return ok;
}

function validateStep3() {
    let ok = true;
    if (!val('store-name') || val('store-name').length < 2) { setError('store-name', 'Please enter a store name.'); ok = false; } else setSuccess('store-name');

    const cat = document.getElementById('category');
    if (!cat.value) {
        cat.classList.add('error');
        document.getElementById('category-error').textContent = 'Please select a category.';
        document.getElementById('category-error').classList.add('visible');
        ok = false;

    }

    const desc = document.getElementById('store-desc').value.trim();
    if (!desc || desc.length < 20) { setError('store-desc', 'Description must be at least 20 characters.'); ok = false; } else setSuccess('store-desc');
    if (!val('country')) { setError('country', 'Please enter your country.'); ok = false; } else setSuccess('country');
    if (!val('city')) { setError('city', 'Please enter your city.'); ok = false; } else setSuccess('city');
    return ok;
}

// ── BLUR VALIDATION ────────────────────────────────────────
['name', 'email', 'phone', 'password', 'confirm-password'].forEach(id => {
    document.getElementById(id).addEventListener('blur', () => {
        if (document.getElementById(id).value) validateStep1();
    });
});

document.getElementById('confirm-password').addEventListener('input', function () {
    if (this.value && this.value === passwordInput.value) setSuccess('confirm-password');
});

// ── FORM SUBMIT ────────────────────────────────────────────
const form = document.getElementById('register-form');
const submitBtn = document.getElementById('submit-btn');
const alertSuccess = document.getElementById('alert-success');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const termsEl = document.getElementById('terms');
    const termsErr = document.getElementById('terms-error');
    if (!termsEl.checked) {
        termsErr.textContent = 'You must agree to the terms.';
        termsErr.classList.add('visible');
        return;
    }
    termsErr.classList.remove('visible');

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertSuccess.classList.remove('visible');
    alertError.classList.remove('visible');

    try {
        const payload = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirm-password').value,
            sellerType: document.querySelector('.persona-card input[name="seller-type"]:checked')?.value,
            university: document.getElementById('university')?.value.trim() || undefined,
            studentId: document.getElementById('student-id')?.value.trim() || undefined,
            businessType: document.getElementById('biz-type')?.value || undefined,
            currentPlatform: document.getElementById('current-platform')?.value || undefined,
            storeName: document.getElementById('store-name').value.trim(),
            category: document.getElementById('category').value,
            storeDescription: document.getElementById('store-desc').value.trim(),
            country: document.getElementById('country').value.trim(),
            city: document.getElementById('city').value.trim(),
        };

        const response = await fetch(`${API_BASE}/api/seller-auth/register`, { credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alertSuccess.classList.add('visible');
            form.reset();
            strengthBar.className = 'password-strength-bar';
            strengthLabel.className = 'strength-label';
            strengthLabel.textContent = '';
            if (result.data?.token) {
                localStorage.setItem('authToken', result.data.token);
                const u = result.data.user;
                const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
                localStorage.setItem('authData', JSON.stringify({ expiry, value: JSON.stringify({ token: result.data.token, user: u }) }));
                localStorage.setItem('pnav_firstname', u.firstName || '');
                localStorage.setItem('pnav_lastname', u.lastName || '');
                localStorage.setItem('pnav_role', 'seller');
            }
            setTimeout(() => { window.location.href = '../login.html'; }, 1000);
        } else {
            let errorMessage = result?.error || 'Registration failed. Please check your information and try again.';
            if (Array.isArray(result?.details) && result.details.length) {
                const fieldMsgs = result.details
                    .map(d => `${d.field ? d.field + ': ' : ''}${d.message}`)
                    .join(' ');
                errorMessage = `${errorMessage} (${fieldMsgs})`;
            }
            errorText.textContent = errorMessage;
            alertError.classList.add('visible');
        }
    } catch (err) {
        console.error('Registration error:', err);
        errorText.textContent = 'Network error. Please check your connection and try again.';
        alertError.classList.add('visible');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

// ── INIT ───────────────────────────────────────────────────
document.body.classList.add('theme-step-1');
updateProgress(1);
