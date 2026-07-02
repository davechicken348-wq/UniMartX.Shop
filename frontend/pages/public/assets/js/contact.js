lucide.createIcons();

const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.5)' : 'none';
    });
}

const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('nav-mobile');
if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
        const isOpen = mobileNav.classList.contains('open');
        hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
        hamburger.setAttribute('aria-expanded', isOpen.toString());
        lucide.createIcons();
    });
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.innerHTML = `<i data-lucide="menu"></i>`;
            lucide.createIcons();
        });
    });
}

// ── Phone number anti-scraper reveal ─────────────────────
function revealPhoneNumber(el) {
    if (el.dataset.revealed) return;
    el.dataset.revealed = 'true';
    el.textContent = el.dataset.number;
    el.classList.add('revealed');
    const card = el.closest('.method-card');
    if (card) {
        if (card.dataset.phone) {
            card.href = `tel:${card.dataset.phone}`;
        } else if (card.dataset.whatsapp) {
            card.href = `https://wa.me/${card.dataset.whatsapp}`;
            card.target = '_blank';
            card.rel = 'noopener';
        }
    }
}

document.querySelectorAll('.phone-reveal').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        revealPhoneNumber(el);
    });
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            revealPhoneNumber(el);
        }
    });
});

document.querySelectorAll('.method-card[data-phone], .method-card[data-whatsapp]').forEach(card => {
    card.addEventListener('click', (e) => {
        const revealEl = card.querySelector('.phone-reveal');
        if (revealEl && !revealEl.dataset.revealed) {
            e.preventDefault();
            revealPhoneNumber(revealEl);
        }
    });
});

// ── Reveal animations ──────────────────────────
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
});
revealEls.forEach(el => observer.observe(el));

const subjectSelect = document.getElementById('subject');
const messageArea   = document.getElementById('message');

const placeholders = {
    general:  'Hi! I wanted to ask about…',
    buying:   'I placed an order on [date] and… (include your order number if you have one)',
    selling:  'I\'m having trouble with my store / listing… (include your store name)',
    payment:  'My payment was [declined / charged incorrectly] on [date]… (include transaction reference if available)',
    account:  'I\'m having trouble with my account… (describe the issue)',
    report:   'I\'d like to report a user / store for… (include their username or store name)',
    other:    'Describe your issue or question in detail…',
};

subjectSelect.addEventListener('change', () => {
    messageArea.placeholder = placeholders[subjectSelect.value] || placeholders.other;
});

const charCount = document.getElementById('char-count');
const MAX_CHARS = 1000;
messageArea.addEventListener('input', () => {
    const len = messageArea.value.length;
    charCount.textContent = len;
    charCount.style.color = len > MAX_CHARS * 0.9 ? '#ef4444' : '';
    if (messageArea.value.length > MAX_CHARS) {
        messageArea.value = messageArea.value.slice(0, MAX_CHARS);
    }
});

function showError(fieldId, msg) {
    const el = document.getElementById(`${fieldId}-error`);
    if (el) el.textContent = msg;
    const wrap = document.getElementById(fieldId)?.closest('.input-wrap');
    if (wrap) { wrap.classList.add('error'); wrap.classList.remove('success'); }
}

function clearError(fieldId) {
    const el = document.getElementById(`${fieldId}-error`);
    if (el) el.textContent = '';
    const wrap = document.getElementById(fieldId)?.closest('.input-wrap');
    if (wrap) { wrap.classList.remove('error'); wrap.classList.add('success'); }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

['name', 'email', 'subject', 'message'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => validateField(id, el.value));
});

function validateField(id, value) {
    value = value.trim();
    if (id === 'name') {
        if (!value) return showError('name', 'Name is required.');
        if (value.length < 2) return showError('name', 'Name must be at least 2 characters.');
        clearError('name');
    }
    if (id === 'email') {
        if (!value) return showError('email', 'Email is required.');
        if (!validateEmail(value)) return showError('email', 'Enter a valid email address.');
        clearError('email');
    }
    if (id === 'subject') {
        if (!value) return showError('subject', 'Please select a subject.');
        clearError('subject');
    }
    if (id === 'message') {
        if (!value) return showError('message', 'Message is required.');
        if (value.length < 20) return showError('message', 'Message must be at least 20 characters.');
        clearError('message');
    }
    return true;
}

const form       = document.getElementById('contact-form');
const submitBtn  = document.getElementById('submit-btn');
const successEl  = document.getElementById('form-success');
const successEmail = document.getElementById('success-email');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value.trim();
    const phoneEl = document.getElementById('phone');
    const phone   = phoneEl ? phoneEl.value.trim() : '';

    let valid = true;
    if (!name || name.length < 2)       { showError('name', 'Name is required.'); valid = false; }
    else clearError('name');
    if (!email || !validateEmail(email)) { showError('email', 'Enter a valid email address.'); valid = false; }
    else clearError('email');
    if (!subject)                        { showError('subject', 'Please select a subject.'); valid = false; }
    else clearError('subject');
    if (!message || message.length < 20){ showError('message', 'Message must be at least 20 characters.'); valid = false; }
    else clearError('message');

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    const payload = { name, email, subject, message };
    if (phone) payload.phone = phone;

    try {
        const res = await fetch(`${API_BASE}/api/public/contact`, { credentials: 'include', 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Something went wrong. Please try again.');
        }
        form.classList.add('hidden');
        successEmail.textContent = email;
        successEl.classList.remove('hidden');
    } catch (err) {
        showError('message', err.message || 'Failed to send. Please try again later.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
});

const resetForm = () => {
    form.reset();
    charCount.textContent = '0';
    messageArea.placeholder = 'Describe your issue or question in detail…';
    ['name', 'email', 'subject', 'message'].forEach(id => {
        const wrap = document.getElementById(id)?.closest('.input-wrap');
        if (wrap) { wrap.classList.remove('error', 'success'); }
        document.getElementById(`${id}-error`).textContent = '';
    });
    successEl.classList.add('hidden');
    form.classList.remove('hidden');
};

document.getElementById('send-another').addEventListener('click', resetForm);
