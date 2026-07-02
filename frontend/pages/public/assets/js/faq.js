lucide.createIcons();

const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('nav-mobile');
if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
        const isOpen = mobileNav.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', String(isOpen));
        hamburger.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
        lucide.createIcons();
    });
}

window.addEventListener('scroll', () => {
    const header = document.getElementById('navbar');
    if (header) {
        header.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
    }
});

const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealEls.forEach((el) => observer.observe(el));
}

// ── Accordion ────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item    = btn.closest('.faq-item');
        const answer  = item.querySelector('.faq-answer');
        const isOpen  = btn.getAttribute('aria-expanded') === 'true';

        // close all others in same group
        item.closest('.faq-grid').querySelectorAll('.faq-question').forEach(b => {
            b.setAttribute('aria-expanded', 'false');
            b.closest('.faq-item').querySelector('.faq-answer').classList.remove('open');
        });

        if (!isOpen) {
            btn.setAttribute('aria-expanded', 'true');
            answer.classList.add('open');
        }
    });
});

// ── Tabs ─────────────────────────────────────
const tabs   = document.querySelectorAll('.faq-tab');
const groups = document.querySelectorAll('.faq-group');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const selected = tab.dataset.tab;

        groups.forEach(group => {
            if (selected === 'all' || group.dataset.category === selected) {
                group.classList.remove('hidden');
            } else {
                group.classList.add('hidden');
            }
        });

        // clear search when switching tabs
        document.getElementById('faq-search').value = '';
        document.getElementById('faq-no-results').classList.add('hidden');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('hidden'));
    });
});

// ── Quick link cards → activate tab ──────────
document.querySelectorAll('.quick-card').forEach(card => {
    card.addEventListener('click', e => {
        e.preventDefault();
        const target = card.dataset.tab;
        const tab = document.querySelector(`.faq-tab[data-tab="${target}"]`);
        if (tab) {
            tab.click();
            document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ── Live search ───────────────────────────────
const searchInput  = document.getElementById('faq-search');
const noResults    = document.getElementById('faq-no-results');
const searchTerm   = document.getElementById('search-term');

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
        // reset
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('hidden'));
        groups.forEach(g => g.classList.remove('hidden'));
        noResults.classList.add('hidden');

        // restore active tab filter
        const activeTab = document.querySelector('.faq-tab.active').dataset.tab;
        if (activeTab !== 'all') {
            groups.forEach(g => {
                if (g.dataset.category !== activeTab) g.classList.add('hidden');
            });
        }
        return;
    }

    // show all groups while searching
    groups.forEach(g => g.classList.remove('hidden'));

    // reset tab active state to "all" visually
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelector('.faq-tab[data-tab="all"]').classList.add('active');

    let totalVisible = 0;

    document.querySelectorAll('.faq-item').forEach(item => {
        const question = item.querySelector('.faq-question span').textContent.toLowerCase();
        const answer   = item.querySelector('.faq-answer p').textContent.toLowerCase();
        const matches  = question.includes(query) || answer.includes(query);

        item.classList.toggle('hidden', !matches);
        if (matches) totalVisible++;
    });

    // hide groups that have no visible items
    groups.forEach(group => {
        const visible = [...group.querySelectorAll('.faq-item')].some(i => !i.classList.contains('hidden'));
        group.classList.toggle('hidden', !visible);
    });

    if (totalVisible === 0) {
        noResults.classList.remove('hidden');
        searchTerm.textContent = `"${searchInput.value.trim()}"`;

    }
});
