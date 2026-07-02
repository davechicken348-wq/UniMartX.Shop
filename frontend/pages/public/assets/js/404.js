lucide.createIcons();

// Navbar hamburger
const hamburger = document.getElementById('nav-hamburger');
const mobileNav  = document.getElementById('nav-mobile');
hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const isOpen = mobileNav.classList.contains('open');
    hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
    lucide.createIcons();
});

// Navbar scroll shadow
window.addEventListener('scroll', () => {
    document.getElementById('navbar').style.boxShadow =
        window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
});

// ── Floating particles ────────────────────────
const container = document.getElementById('particles');
for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 2;
    p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        bottom: ${Math.random() * -10}%;
        --dur: ${Math.random() * 14 + 8}s;
        --delay: ${Math.random() * 10}s;
    `;
    container.appendChild(p);
}

// ── Search redirect ───────────────────────────
const searchInput = document.getElementById('search-input');
const searchBtn   = document.getElementById('search-btn');

function doSearch() {
    const q = searchInput.value.trim();
    if (q) window.location.href = `shop/shop.html?q=${encodeURIComponent(q)}`;
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
});
