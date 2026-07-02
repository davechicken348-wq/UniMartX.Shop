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
const stepEls = document.querySelectorAll('.step');
const stepLines = document.querySelectorAll('.step-line');

function showStep(n) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    const currentStepEl = document.getElementById(`step-${n}`);
    if (currentStepEl) currentStepEl.classList.add('active');

    const indicator = currentStepEl ? currentStepEl.querySelector('.step-indicator') : null;
    if (indicator) {
        const steps = indicator.querySelectorAll('.step');
        const lines = indicator.querySelectorAll('.step-line');
        steps.forEach((el, i) => {
            el.classList.remove('active', 'completed');
            if (i + 1 < n) el.classList.add('completed');
            else if (i + 1 === n) el.classList.add('active');
        });
        lines.forEach((line, i) => line.classList.toggle('completed', i + 1 < n));
    }

    currentStep = n;
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
    if (!val('email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) { setError('email', 'Please enter a valid email address.'); ok = false; } else setSuccess('email');
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

// ── REVIEW POPULATION ──────────────────────────────────────
function populateReview() {
    document.getElementById('r-name').textContent = val('name');
    document.getElementById('r-email').textContent = val('email');
    document.getElementById('r-phone').textContent = val('phone');

    const selected = document.querySelector('.persona-card input[name="seller-type"]:checked');
    const type = selected?.value;

    document.getElementById('r-seller-type').textContent = type === 'campus' ? 'Campus Seller' : 'Independent Seller';

    const rowUniversity = document.getElementById('r-row-university');
    const rowBizType = document.getElementById('r-row-biz-type');
    const rowPlatform = document.getElementById('r-row-platform');

    rowUniversity.style.display = 'none';
    rowBizType.style.display = 'none';
    rowPlatform.style.display = 'none';

    if (type === 'campus') {
        rowUniversity.style.display = '';
        document.getElementById('r-university').textContent = val('university') || '—';
    }

    if (type === 'independent') {
        const bizEl = document.getElementById('biz-type');
        const platEl = document.getElementById('current-platform');
        rowBizType.style.display = '';
        document.getElementById('r-biz-type').textContent = bizEl.options[bizEl.selectedIndex]?.text || '—';
        if (platEl.value) {
            rowPlatform.style.display = '';
            document.getElementById('r-platform').textContent = platEl.options[platEl.selectedIndex]?.text || '—';
        }
    }
}

const catEl = document.getElementById('category');
document.getElementById('r-store-name').textContent = val('store-name');
document.getElementById('r-category').textContent = catEl.options[catEl.selectedIndex]?.text || '—';
document.getElementById('r-location').textContent = `${val('city')}, ${val('country')}`;
document.getElementById('r-desc').textContent = document.getElementById('store-desc').value.trim();

// ── BLUR VALIDATION ────────────────────────────────────────
['name', 'email', 'phone', 'password', 'confirm-password'].forEach(id => {
    document.getElementById(id).addEventListener('blur', () => {
        if (document.getElementById(id).value) validateStep1();
    });
});

document.getElementById('confirm-password').addEventListener('input', function () {
    if (this.value && this.value === passwordInput.value) setSuccess('confirm-password');
});

// ── LIVE REVIEW UPDATES ────────────────────────────────────
const allReviewIds = ['name','email','phone','university','biz-type','current-platform','store-name','category','store-desc','country','city'];
const reviewInputs = allReviewIds.map(id => document.getElementById(id)).filter(Boolean);

reviewInputs.forEach(el => {
    el.addEventListener('input', populateReview);
    el.addEventListener('change', populateReview);
});

document.querySelectorAll('.persona-card input[name="seller-type"]').forEach(radio => {
    radio.addEventListener('change', populateReview);
});

populateReview();

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

        }
    } catch (err) {
        console.error('Registration error:', err);
        errorText.textContent = 'Network error. Please check your connection and try again.';
        alertError.classList.add('visible');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});
