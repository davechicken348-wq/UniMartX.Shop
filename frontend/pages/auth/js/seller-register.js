// UniMartX Auth V2 — Seller Onboarding wizard (vanilla, no dependencies)

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const STEP_NAMES = { 1: 'Personal Info', 2: 'Store Details', 3: 'Branding', 4: 'Location', 5: 'Verification', 6: 'Review' };
const TOTAL_STEPS = 6;

const form = document.getElementById('register-form');
const progress = document.getElementById('progress');
const fill = document.getElementById('onb-fill');
const stepCount = document.getElementById('step-count');
const stepName = document.getElementById('step-name');
const dots = document.querySelectorAll('.onb-dot');

let current = 0; // 0 = welcome
const state = { logo: null, banner: null, accent: '' };
let buyerConflict = false;

// ── PANE NAVIGATION ──────────────────────────────────────────
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

    if (n === 6) populateReview();

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
document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => showPane(Number(btn.dataset.edit)));
});

// ── VALIDATION HELPERS ───────────────────────────────────────
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

// ── STEP VALIDATORS ──────────────────────────────────────────
function validateStep(n) {
    if (n === 1) return validatePersonal();
    if (n === 2) return validateStore();
    if (n === 3) return true; // branding optional
    if (n === 4) return validateLocation();
    if (n === 5) return validateVerify();
    return true;
}

function validatePersonal() {
    let ok = true;
    if (!val('name') || val('name').length < 2) { setError('name', 'Please enter your full name.'); ok = false; } else setSuccess('name');
    if (!val('email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) { setError('email', 'Please enter a valid email address.'); ok = false; }
    else if (buyerConflict) { ok = false; }
    else setSuccess('email');
    if (!val('phone') || !/^\+?[\d\s\-().]{7,20}$/.test(val('phone'))) { setError('phone', 'Please enter a valid phone number.'); ok = false; } else setSuccess('phone');
    if (!val('password') || val('password').length < 8) { setError('password', 'Password must be at least 8 characters.'); ok = false; }
    else setSuccess('password');
    if (!val('confirm-password') || val('confirm-password') !== document.getElementById('password').value) { setError('confirm-password', 'Passwords do not match.'); ok = false; } else setSuccess('confirm-password');
    return ok;
}

function validateStore() {
    let ok = true;
    if (!val('store-name') || val('store-name').length < 2) { setError('store-name', 'Please enter a store name.'); ok = false; } else setSuccess('store-name');
    const cat = document.getElementById('category');
    if (!cat.value) { setError('category', 'Please select a category.'); ok = false; } else setSuccess('category');
    const desc = val('store-desc');
    if (!desc || desc.length < 20) { setError('store-desc', 'Description must be at least 20 characters.'); ok = false; } else setSuccess('store-desc');
    return ok;
}

function validateLocation() {
    let ok = true;
    if (!val('university')) { setError('university', 'Please select your university.'); ok = false; } else setSuccess('university');
    if (!val('campus')) { setError('campus', 'Please enter your campus.'); ok = false; } else setSuccess('campus');
    if (!val('city')) { setError('city', 'Please enter your city.'); ok = false; } else setSuccess('city');
    if (!val('country')) { setError('country', 'Please select your country.'); ok = false; } else setSuccess('country');
    if (!val('pickup')) { setError('pickup', 'Please enter a pickup location.'); ok = false; } else setSuccess('pickup');

    const delivery = Array.from(document.querySelectorAll('input[name="delivery"]:checked')).map((c) => c.value);
    const deliveryErr = document.getElementById('delivery-error');
    if (!delivery.length) { deliveryErr.textContent = 'Select at least one delivery option.'; deliveryErr.classList.add('visible'); ok = false; }
    else deliveryErr.classList.remove('visible');

    if (!val('hours')) { setError('hours', 'Please select your availability.'); ok = false; } else setSuccess('hours');
    return ok;
}

function validateVerify() {
    let ok = true;
    if (!val('student-id')) { setError('student-id', 'Please enter your student/staff ID.'); ok = false; } else setSuccess('student-id');
    const semail = val('student-email');
    if (semail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(semail)) { setError('student-email', 'Please enter a valid email.'); ok = false; } else setSuccess('student-email');
    if (!val('verify-method')) { setError('verify-method', 'Please choose a verification method.'); ok = false; } else setSuccess('verify-method');
    return ok;
}

// ── PASSWORD (reused from buyer flow) ────────────────────────
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
passwordInput.addEventListener('input', () => { refreshStrength(); if (confirmInput.value) refreshMatch(); if (passwordInput.classList.contains('error')) validatePersonal(); });
confirmInput.addEventListener('input', () => { refreshMatch(); if (confirmInput.classList.contains('error')) validatePersonal(); });

// ── PASSWORD TOGGLE ──────────────────────────────────────────
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

// ── CHAR COUNT ───────────────────────────────────────────────
document.getElementById('store-desc').addEventListener('input', function () {
    document.getElementById('desc-count').textContent = this.value.length;
});

// ── BUYER EMAIL CHECK ────────────────────────────────────────
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

// ── UPLOADS ──────────────────────────────────────────────────
function bindUpload(inputId, previewId, imgId, removeId, setter) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const img = document.getElementById(imgId);
    const remove = document.getElementById(removeId);
    const zone = input.closest('.dropzone');
    const empty = zone.querySelector('.upload-empty');

    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Please choose an image under 5MB.'); input.value = ''; return; }
        const reader = new FileReader();
        reader.onload = () => {
            preview.hidden = false;
            img.src = reader.result;
            empty.style.display = 'none';
            setter(reader.result);
        };
        reader.readAsDataURL(file);
    });

    remove.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        preview.hidden = true; img.src = '';
        empty.style.display = '';
        input.value = '';
        setter(null);
    });

    zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
}
bindUpload('logo-input', 'logo-preview', 'logo-img', 'logo-remove', (d) => { state.logo = d; });
bindUpload('banner-input', 'banner-preview', 'banner-img', 'banner-remove', (d) => { state.banner = d; });

// ── ACCENT COLOR ─────────────────────────────────────────────
const accentSwatches = document.querySelectorAll('.accent-swatch');
const accentCustom = document.getElementById('accent-custom');
const accentHidden = document.getElementById('accent-color');

function setAccent(color, sourceEl) {
    state.accent = color;
    accentHidden.value = color;
    accentSwatches.forEach((s) => s.setAttribute('aria-checked', String(s === sourceEl)));
    if (sourceEl !== accentCustom) accentCustom.value = color;
    const banner = document.getElementById('review-banner');
    if (banner) banner.style.background = `linear-gradient(120deg, ${color}, ${shade(color, -18)})`;
}
accentSwatches.forEach((s) => s.addEventListener('click', () => setAccent(s.dataset.color, s)));
accentCustom.addEventListener('input', () => setAccent(accentCustom.value, accentCustom));

function shade(hex, percent) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r + Math.round(2.55 * percent)));
    g = Math.max(0, Math.min(255, g + Math.round(2.55 * percent)));
    b = Math.max(0, Math.min(255, b + Math.round(2.55 * percent)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ── DELIVERY CHIPS (fallback for :has) ───────────────────────
document.querySelectorAll('#delivery-group input').forEach((cb) => {
    cb.addEventListener('change', () => cb.closest('.chip').classList.toggle('is-checked', cb.checked));
});

// ── REVIEW SUMMARY ───────────────────────────────────────────
function populateReview() {
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    setText('review-name', val('store-name') || 'Your Store');
    setText('review-tagline', val('tagline'));
    const cat = document.getElementById('category');
    setText('review-category', cat.value ? cat.options[cat.selectedIndex].textContent : 'Category');
    setText('review-university', val('university'));
    setText('review-campus', val('campus'));
    setText('review-pickup', val('pickup'));
    const delivery = Array.from(document.querySelectorAll('input[name="delivery"]:checked')).map((c) => c.nextElementSibling.textContent);
    setText('review-delivery', delivery.join(', '));

    const logoReview = document.getElementById('review-logo');
    logoReview.innerHTML = '';
    if (state.logo) { const im = document.createElement('img'); im.src = state.logo; logoReview.appendChild(im); }
    else { const s = document.createElement('span'); s.className = 'review-logo-empty'; s.textContent = 'LOGO'; logoReview.appendChild(s); }

    const bannerReview = document.getElementById('review-banner');
    bannerReview.querySelectorAll('.review-banner-empty, img').forEach((n) => n.remove());
    if (state.banner) { const im = document.createElement('img'); im.src = state.banner; bannerReview.appendChild(im); }
    else { const s = document.createElement('span'); s.className = 'review-banner-empty'; s.textContent = 'No banner'; bannerReview.appendChild(s); }

    if (state.accent) bannerReview.style.background = `linear-gradient(120deg, ${state.accent}, ${shade(state.accent, -18)})`;
    else bannerReview.style.background = '';
}

// ── SUBMIT ───────────────────────────────────────────────────
const submitBtn = document.getElementById('submit-btn');
const alertError = document.getElementById('alert-error');
const errorText = document.getElementById('error-text');

function showAlert(msg) { errorText.textContent = msg; alertError.hidden = false; }

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const termsEl = document.getElementById('terms');
    const termsErr = document.getElementById('terms-error');
    if (!termsEl.checked) { termsErr.textContent = 'You must agree to the Terms and Privacy Policy.'; termsErr.classList.add('visible'); return; }
    termsErr.classList.remove('visible');

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    alertError.hidden = true;

    const delivery = Array.from(document.querySelectorAll('input[name="delivery"]:checked')).map((c) => c.value);

    const payload = {
        name: val('name'),
        email: val('email'),
        phone: val('phone'),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirm-password').value,
        sellerType: 'campus',
        university: val('university'),
        studentId: val('student-id'),
        storeName: val('store-name'),
        category: document.getElementById('category').value,
        storeDescription: val('store-desc'),
        country: val('country'),
        city: val('city'),
        storeTagline: val('tagline') || undefined,
        accentColor: state.accent || undefined,
        storeLogo: state.logo || undefined,
        storeBanner: state.banner || undefined,
        pickupLocation: val('pickup'),
        deliveryOptions: delivery,
        businessHours: val('hours'),
        studentEmail: val('student-email') || undefined,
        verificationMethod: val('verify-method'),
    };

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
                // Already signed in — send them straight to the dashboard (skips login)
                const wb = document.getElementById('verify-login-btn');
                if (wb) wb.href = '../../seller/private/dashboard/overview.html';
            }
            // Tell the dashboard to show the post-registration welcome flow
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

// ── INIT ─────────────────────────────────────────────────────
showPane(0);
