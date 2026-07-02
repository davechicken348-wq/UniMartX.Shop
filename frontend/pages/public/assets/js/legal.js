lucide.createIcons();

// Navbar
const hamburger = document.getElementById('nav-hamburger');
const mobileNav  = document.getElementById('nav-mobile');
hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const isOpen = mobileNav.classList.contains('open');
    hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
    lucide.createIcons();
});
window.addEventListener('scroll', () => {
    document.getElementById('navbar').style.boxShadow =
        window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
});

// ── Active TOC link on scroll ─────────────────
const tocLinks  = document.querySelectorAll('.toc-link');
const sections  = document.querySelectorAll('.legal-section');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            tocLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
        }
    });
}, {
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
});

sections.forEach(section => observer.observe(section));

// smooth scroll for TOC links
tocLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});
