lucide.createIcons();

window.addEventListener('scroll', () => {
    document.getElementById('navbar').style.boxShadow =
        window.scrollY > 10 ? '0 4px 0 #1a1612' : 'none';
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
