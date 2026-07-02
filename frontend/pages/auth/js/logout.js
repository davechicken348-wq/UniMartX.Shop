lucide.createIcons();

function getApiBase() {
    return (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
}

const AUTH_KEYS = ['authData', 'authToken', 'seller_id', 'userRole', 'pnav_firstname', 'pnav_lastname', 'pnav_avatar', 'pnav_role'];

function getToken() {
    const raw = localStorage.getItem('authData');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            const data = parsed.value ? JSON.parse(parsed.value) : parsed;
            if (data.token) return data.token;
        } catch {}
    }
    return localStorage.getItem('authToken');
}

async function performLogout() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        await fetch(`${getApiBase()}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers,
        });
    } catch {
        // ignore network errors during logout
    }

    AUTH_KEYS.forEach(key => localStorage.removeItem(key));

    window.location.replace('../public/home.html');
}

document.addEventListener('DOMContentLoaded', performLogout);

const slides      = document.querySelectorAll('.slide');
const taglines    = document.querySelectorAll('.slide-tagline');
const dots        = document.querySelectorAll('.dot');
const counterEl   = document.querySelector('.counter-current');
const progressBar = document.querySelector('.progress-bar');
const prevBtn     = document.querySelector('.prev-btn');
const nextBtn     = document.querySelector('.next-btn');

let current         = 0;
let isPaused        = false;
let progressElapsed = 0;
let lastTimestamp   = 0;
const slideDuration = 6000;

slides.forEach(slide => {
    const match = slide.style.backgroundImage.match(/url\(['"']?(.*?)['"']?\)/);
    if (match) { const img = new Image(); img.src = match[1]; }
});

function goTo(index) {
    slides[current].classList.add('exit');
    slides[current].classList.remove('active');
    taglines[current].classList.remove('active');
    dots[current].classList.remove('active');

    const exiting = slides[current];
    setTimeout(() => exiting.classList.remove('exit'), 1200);

    current = (index + slides.length) % slides.length;

    slides[current].classList.add('active');
    taglines[current].classList.add('active');
    dots[current].classList.add('active');
    counterEl.textContent = String(current + 1).padStart(2, '0');

    progressElapsed = 0;
}

function next() { goTo(current + 1); }
function prev() { goTo(current - 1); }

function animateProgress(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (!isPaused) {
        progressElapsed += delta;
        progressBar.style.width = `${Math.min((progressElapsed / slideDuration) * 100, 100)}%`;
        if (progressElapsed >= slideDuration) next();
    }

    requestAnimationFrame(animateProgress);
}

const controls = document.querySelector('.slideshow-controls');
if (controls) {
    controls.addEventListener('mouseenter', () => { isPaused = true; });
    controls.addEventListener('mouseleave', () => { isPaused = false; });
}

prevBtn?.addEventListener('click', prev);
nextBtn?.addEventListener('click', next);
dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
});

let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
document.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
}, { passive: true });

requestAnimationFrame(animateProgress);
