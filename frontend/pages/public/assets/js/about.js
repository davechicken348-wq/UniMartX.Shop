// about.js — About page interactions
(function () {
    'use strict';

    // Reveal animations on scroll
    function initReveal() {
        const els = document.querySelectorAll('.reveal');
        if (!els.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        );

        els.forEach((el, i) => {
            el.classList.add('reveal');
            el.style.transitionDelay = `${i * 80}ms`;
            observer.observe(el);
        });
    }

    // Animate stat counters
    function animateCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const target = parseInt(el.dataset.count, 10);
                        const suffix = el.dataset.suffix || '';
                        const duration = 1800;
                        const start = performance.now();

                        function tick(now) {
                            const elapsed = now - start;
                            const progress = Math.min(elapsed / duration, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            const current = Math.round(eased * target);
                            el.textContent = current.toLocaleString() + suffix;
                            if (progress < 1) requestAnimationFrame(tick);
                        }

                        requestAnimationFrame(tick);
                        observer.unobserve(el);
                    }
                });
            },
            { threshold: 0.5 }
        );

        counters.forEach((c) => observer.observe(c));
    }

    // Active nav-link highlighting
    function initNavHighlight() {
        const links = document.querySelectorAll('.about-nav a');
        links.forEach((link) => {
            link.addEventListener('click', () => {
                links.forEach((l) => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initReveal();
        animateCounters();
        initNavHighlight();
    });
})();
