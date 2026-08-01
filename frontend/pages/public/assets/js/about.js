// about.js — Story-driven About page interactions
(function () {
    'use strict';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Reveal on scroll ────────────────────────────────────────────────
    function initReveal() {
        const els = document.querySelectorAll('.reveal');
        if (!els.length) return;

        if (prefersReduced || !('IntersectionObserver' in window)) {
            els.forEach((el) => el.classList.add('in-view'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        els.forEach((el) => observer.observe(el));
    }

    // ── Timeline progress fill ───────────────────────────────────────────
    function initTimeline() {
        const tl = document.querySelector('.timeline');
        if (!tl || prefersReduced || !('IntersectionObserver' in window)) return;
        const line = document.createElement('span');
        line.className = 'timeline-progress';
        tl.appendChild(line);
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const rect = tl.getBoundingClientRect();
                        const vh = window.innerHeight;
                        const progress = Math.min(Math.max((vh * 0.6 - rect.top) / rect.height, 0), 1);
                        line.style.transform = `scaleY(${progress})`;
                    }
                });
            },
            { threshold: 0, rootMargin: '0px 0px -10% 0px' }
        );
        observer.observe(tl);
        const onScroll = () => {
            const rect = tl.getBoundingClientRect();
            const vh = window.innerHeight;
            const progress = Math.min(Math.max((vh * 0.6 - rect.top) / rect.height, 0), 1);
            line.style.transform = `scaleY(${progress})`;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initReveal();
        initTimeline();
        if (window.lucide) window.lucide.createIcons();
    });
})();
