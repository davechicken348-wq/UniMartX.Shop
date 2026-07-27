// UniMartX Auth V2 — Seller Onboarding wizard (vanilla, no dependencies)

var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const STEP_NAMES = { 1: 'Account & Store', 2: 'What You Sell', 3: 'Location', 4: 'Launch' };
const TOTAL_STEPS = 4;

const form = document.getElementById('register-form');
const progress = document.getElementById('progress');
const fill = document.getElementById('onb-fill');
const stepCount = document.getElementById('step-count');
const stepName = document.getElementById('step-name');
const dots = document.querySelectorAll('.onb-dot');

let current = 0;
const state = {};
let buyerConflict = false;
let sellerType = 'campus';

function showPane(n) {
    document.querySelectorAll('.step-pane').forEach((p) => { p.hidden = true; });
    const target = document.querySelector(`.step-pane[data-pane="${n === 0 ? 'welcome' : n}"]`);
    if (target) target.hidden = false;

    progress.hidden = (n === 0 || n === 'success');

    if (typeof n === 'number' && n >= 1 && n <= TOTAL_STEPS) {
        stepCount.textContent = `Step ${n} of ${TOTAL_STEPS}`;
        stepName.textContent = STEP_NAMES[n];
        const pct = ((n - 1) / (TOTAL_STEPS - 1)) * 100;
        fill.style.width = `${pct}%`;
        dots.forEach((d) => {
            const i = Number(d.dataset.dot);
            d.classList.toggle('done', i < n);
            d.classList.toggle('current', i === n);
        });
    }

    if (n === 4) populateReview();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
}

document.getElementById('start-btn').addEventListener('click', () => showPane(1));

document.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
        const from = Number(btn.dataset.next) - 1;
        if (validateStep(from)) showPane(Number(btn.dataset.next));
    });
});
document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => showPane(Number(btn.dataset.back)));
});
document.querySelectorAll('.skip-btn').forEach((btn) => {
    btn.addEventListener('click', () => showPane(Number(btn.dataset.skip)));
});

function setError(id, message) {
    const input = document.getElementById(id);
    if (input) { input.classList.add('error'); input.classList.remove('success'); }
    const err = document.getElementById(`${id}-error`);
    if (err) { err.textContent = message; err.classList.add('visible'); }
}
function setSuccess(id) {
    const input = document.getElementById(id);
    if (input) { input.classList.remove('error'); input.classList.add('success'); }
    const err = document.getElementById(`${id}-error`);
    if (err) err.classList.remove('visible');
}
const val = (id) => (document.getElementById(id).value || '').trim();

function validateStep(n) {
    if (n === 1) return validatePersonalStore();
    if (n === 2) return validateDetails();
    return true;
}

function validatePersonalStore() {
    let ok = true;
    if (!val('name') || val('name').length < 2) { setError('name', 'Please enter your full name.'); ok = false; } else setSuccess('name');
    if (!val('email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) { setError('email', 'Please enter a valid email address.'); ok = false; }
    else if (buyerConflict) { ok = false; }
    else setSuccess('email');
    if (!val('phone') || !/^\+?[\d\s\-().]{7,20}$/.test(val('phone'))) { setError('phone', 'Please enter a valid phone number.'); ok = false; } else setSuccess('phone');
    if (!val('password') || val('password').length < 8) { setError('password', 'Password must be at least 8 characters.'); ok = false; }
    else setSuccess('password');
    if (!val('confirm-password') || val('confirm-password') !== document.getElementById('password').value) { setError('confirm-password', 'Passwords do not match.'); ok = false; } else setSuccess('confirm-password');
    if (!val('store-name') || val('store-name').length < 2) { setError('store-name', 'Please enter a store name.'); ok = false; } else setSuccess('store-name');
    if (!document.getElementById('seller-type').value) { setError('seller-type', 'Please select a seller type.'); ok = false; } else setSuccess('seller-type');
    return ok;
}

function validateDetails() {
    let ok = true;
    if (!document.getElementById('category').value) { setError('category', 'Please select a category.'); ok = false; } else setSuccess('category');
    const desc = val('store-desc');
    if (desc && desc.length < 10) { setError('store-desc', 'Description must be at least 10 characters.'); ok = false; } else setSuccess('store-desc');
    return ok;
}

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
    reqItems.forEach((li) => li.classList.toggle('met', passwordChecks(pw)[li.dataset.req]));
    strengthBar.className = 'pw-strength-bar';
    strengthLabel.className = 'pw-strength-label';
    strengthLabel.textContent = '';
    if (pw) {
        const level = getStrength(pw);
        strengthBar.classList.add(level);
        strengthLabel.textContent = { weak: 'Weak password', fair: 'Fair — add more variety', strong: 'Strong password', excellent: 'Excellent password' }[level];
        strengthLabel.classList.add('visible', level);
    }
}
function refreshMatch() {
    const match = confirmInput.value && confirmInput.value === passwordInput.value;
    document.getElementById('match-indicator').classList.toggle('visible', match);
    if (match) { confirmInput.classList.add('success'); confirmInput.classList.remove('error'); }
    else confirmInput.classList.remove('success');
}
passwordInput.addEventListener('input', () => { refreshStrength(); if (confirmInput.value) refreshMatch(); if (passwordInput.classList.contains('error')) validatePersonalStore(); });
confirmInput.addEventListener('input', () => { refreshMatch(); if (passwordInput.classList.contains('error')) validatePersonalStore(); });

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

document.getElementById('store-desc').addEventListener('input', function () {
    document.getElementById('desc-count').textContent = this.value.length;
});

const emailInput = document.getElementById('email');
emailInput.addEventListener('blur', async () => {
    const email = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
        const res = await fetch(`${API_BASE}/api/public/check-buyer-email?email=${encodeURIComponent(email)}`, { credentials: 'include', cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data?.isBuyer) {
            buyerConflict = true;
            setError('email', 'This email is already registered as a buyer account.');
        } else {
            buyerConflict = false;
        }
    } catch { /* non-blocking */ }
});

const sellerTypeInput = document.getElementById('seller-type');
if (sellerTypeInput) {
    sellerTypeInput.addEventListener('change', () => {
        sellerType = sellerTypeInput.value;
        const campusFields = document.getElementById('review-campus-fields');
        const indepFields = document.getElementById('review-independent-fields');
        if (campusFields) campusFields.hidden = sellerType !== 'campus';
        if (indepFields) indepFields.hidden = sellerType !== 'independent';
    });
}

function populateReview() {
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    setText('review-name', val('store-name') || 'Your Store');
    setText('review-tagline', val('tagline') || '');
    const cat = document.getElementById('category');
    setText('review-category', cat && cat.value ? cat.options[cat.selectedIndex].textContent : 'Category');
    setText('review-seller-type', sellerType === 'independent' ? 'Independent Seller' : 'Campus Seller');
    setText('review-full-name', val('name'));
    setText('review-email', val('email'));
    setText('review-phone', val('phone'));
    setText('review-university', val('university'));
    setText('review-campus', val('campus'));
    setText('review-city', val('city'));
    setText('review-country', val('country') || 'Ghana');
    const campusFields = document.getElementById('review-campus-fields');
    if (campusFields) campusFields.hidden = sellerType !== 'campus';
}

const submitBtn = document.getElementById('submit-btn');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');

function showAlert(msg) { errorText.textContent = msg; alertError.hidden = false; }

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    populateReview();

    const termsEl = document.getElementById('terms');
    const termsErr = document.getElementById('terms-error');
    if (!termsEl.checked) { termsErr.textContent = 'You must agree to the Terms and Privacy Policy.'; termsErr.classList.add('visible'); return; }
    termsErr.classList.remove('visible');

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertError.hidden = true;

    const payload = {
        name: val('name'),
        email: val('email'),
        phone: val('phone'),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirm-password').value,
        sellerType: document.getElementById('seller-type')?.value || 'campus',
        storeName: val('store-name'),
        category: document.getElementById('category').value,
    };

    const storeDesc = val('store-desc');
    if (storeDesc) payload.storeDescription = storeDesc;

    const city = val('city');
    if (city) payload.city = city;
    payload.country = val('country') || 'Ghana';

    const campus = val('campus');
    if (campus) payload.campus = campus;

    const university = val('university');
    if (university) payload.university = university;

    const tagline = val('tagline');
    if (tagline) payload.storeTagline = tagline;

    const tags = (val('store-tags') || '').split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0).slice(0, 12);
    if (tags.length) payload.storeTags = tags;

    try {
        const response = await fetch(`${API_BASE}/api/seller-auth/register`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (response.ok && result.success) {
            if (result.data?.token) {
                localStorage.setItem('authToken', result.data.token);
                const u = result.data.user;
                const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
                localStorage.setItem('authData', JSON.stringify({ expiry, value: JSON.stringify({ token: result.data.token, user: u }) }));
                localStorage.setItem('pnav_firstname', u.firstName || '');
                localStorage.setItem('pnav_lastname', u.lastName || '');
                localStorage.setItem('pnav_role', 'seller');
                const wb = document.getElementById('verify-login-btn');
                if (wb) wb.href = '../../seller/private/dashboard/overview.html';
            }
            localStorage.setItem('umx_show_welcome', '1');
            showPane('success');
        } else {
            let msg = result?.error || 'Registration failed. Please check your information and try again.';
            if (Array.isArray(result?.details) && result.details.length) {
                msg += ' (' + result.details.map((d) => d.message).join(', ') + ')';
            }
            showAlert(msg);
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('Network error. Please check your connection and try again.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

showPane(0);
