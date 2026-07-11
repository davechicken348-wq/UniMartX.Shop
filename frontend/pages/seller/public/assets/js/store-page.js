// STORE PAGE — fetches seller data and populates the public store page

(function () {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

function apiFetchWithTimeout(url, options = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    fetch(url, { ...options, signal: controller.signal })
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

    // Reuse profile.js animation setup if available, otherwise define here
    window.observeNewElements = null;

    function initScrollAnimations() {
        if (!window.IntersectionObserver) {
            document.querySelectorAll('.store-hero,.stat-card,#stats-section-animated,#trust-badges-section-animated,#meet-seller-section-animated,#collections-section-animated,#policies-section-animated,#related-stores-section-animated,.trust-badge,.badge-pill,.section-header,.product-card,.empty-state').forEach(el => el.classList.add('animated'));
            return;
        }
        if (window._scrollAnimObserver) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    // Stagger trust-badge pills
                    const badges = entry.target.querySelectorAll('.trust-badge');
                    badges.forEach((b, i) => {
                        setTimeout(() => b.classList.add('visible'), i * 80);
                    });
                    // Stagger badge-pills
                    const pills = entry.target.querySelectorAll('.badge-pill');
                    pills.forEach((p, i) => {
                        setTimeout(() => p.classList.add('visible'), i * 80);
                    });
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

        document.querySelectorAll('.store-hero,#stats-section-animated,#trust-badges-section-animated,#meet-seller-section-animated,#collections-section-animated,#policies-section-animated,#related-stores-section-animated,.stat-card,.section-header,.product-card,.empty-state').forEach(el => observer.observe(el));
        window._scrollAnimObserver = observer;
    }

    function observeNewElements() {
        const observer = window._scrollAnimObserver;
        if (!observer) return;
        document.querySelectorAll('.product-card').forEach(el => {
            if (!el.classList.contains('animated')) observer.observe(el);
        });
        window.observeNewElements = observeNewElements;
    }

    // -- Get sellerId from URL or localStorage -----------------------------
    function getSellerId() {
        return new URLSearchParams(window.location.search).get('id')
            || new URLSearchParams(window.location.search).get('sellerId')
            || localStorage.getItem('seller_id');
    }
    window.getSellerId = getSellerId;

    // -- Helpers ------------------------------------------------------------
    function set(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function getInitials(name) {
        return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    }

    function formatJoinDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    function starsFromRating(rating) {
        const filled = Math.round(rating);
        return '★'.repeat(filled) + '☆'.repeat(5 - filled);
    }

    const CATEGORY_LABELS = {
        electronics:   'Electronics & Gadgets',
        fashion:       'Fashion & Apparel',
        home:          'Home & Living',
        beauty:        'Beauty & Health',
        sports:        'Sports & Outdoors',
        books:         'Books & Stationery',
        food:          'Food & Snacks',
        other:         'Other',
    };

    // -- Apply fallbacks before API responds -------------------------------
    function applyFallbacks() {
        set('store-name', 'Store');
        set('store-bio', 'No description available.');
        set('store-location', 'Location not set');
        set('store-joined', '—');
        set('store-product-count', '0');
        set('store-category', '');
        set('stat-sales', '—');
        set('stat-rating', '—');
        set('stat-followers', '—');

        const stars = document.getElementById('stat-stars');
        if (stars) stars.textContent = '☆☆☆☆☆';

        const avatar = document.getElementById('store-avatar');
        if (avatar && !avatar.textContent.trim()) avatar.textContent = '?';

        const meetAvatar = document.getElementById('meet-seller-avatar');
        if (meetAvatar && !meetAvatar.textContent.trim()) meetAvatar.textContent = '?';
    }

    // -- Populate trust badges inside hero ---------------------------------
    function populateTrustBadges(stats, sellerId) {
        const wrap = document.getElementById('trust-badges');
        if (!wrap) return;
        const badges = [];

        if (stats.totalReviews >= 5) {
            badges.push({ cls: 'trust-badge--verified', icon: 'badge-check', text: 'Verified Student' });
        }
        if (stats.totalSales >= 50 || stats.avgRating >= 4.8) {
            badges.push({ cls: 'trust-badge--top-seller', icon: 'trophy', text: 'Top Seller' });
        }
        badges.push({ cls: 'trust-badge--fast-response', icon: 'zap', text: 'Fast Response' });
        if (stats.avgRating >= 4.5) {
            badges.push({ cls: 'trust-badge--highly-rated', icon: 'star', text: 'Highly Rated' });
        }
        if (stats.productCount >= 10) {
            badges.push({ cls: 'trust-badge--trending', icon: 'trending-up', text: 'Trending' });
        }

        wrap.innerHTML = badges.map(b =>
            `<span class="trust-badge ${b.cls}"><i data-lucide="${b.icon}"></i>${b.text}</span>`
        ).join('');

        if (window.lucide && lucide.createIcons) lucide.createIcons();

        // Stagger fade-in
        const allBadges = wrap.querySelectorAll('.trust-badge');
        allBadges.forEach((b, i) => setTimeout(() => b.classList.add('visible'), i * 80));
    }

    // -- Populate trust badges section (full-width strip) ------------------
    function populateTrustBadgesSection(stats) {
        const row = document.getElementById('trust-badges-row');
        if (!row) return;
        const pills = [];

        if (stats.totalReviews >= 5) {
            pills.push({ cls: 'badge-pill--verified', icon: 'badge-check', text: '✓ Verified Student' });
        }
        if (stats.totalSales >= 50 || stats.avgRating >= 4.8) {
            pills.push({ cls: 'badge-pill--top-seller', icon: 'trophy', text: '★ Top Seller' });
        }
        pills.push({ cls: 'badge-pill--fast-response', icon: 'zap', text: '⚡ Fast Response' });
        if (stats.avgRating >= 4.5) {
            pills.push({ cls: 'badge-pill--highly-rated', icon: 'star', text: '↗ Highly Rated' });
        }
        if (stats.productCount >= 10) {
            pills.push({ cls: 'badge-pill--trending', icon: 'flame', text: '🔥 Trending' });
        }

        row.innerHTML = pills.map(p =>
            `<span class="badge-pill ${p.cls}"><i data-lucide="${p.icon}"></i>${p.text}</span>`
        ).join('');

        if (window.lucide && lucide.createIcons) lucide.createIcons();

        // Trigger stagger via observer
        const section = document.getElementById('trust-badges-section-animated');
        if (section) {
            const pillsEls = section.querySelectorAll('.badge-pill');
            pillsEls.forEach((p, i) => setTimeout(() => p.classList.add('visible'), i * 80));
        }
    }

    // -- Populate Meet the Seller -----------------------------------------
    function populateMeetSeller(profile, stats) {
        const avatarEl = document.getElementById('meet-seller-avatar');
        if (avatarEl) {
            if (profile.storeAvatar) {
                avatarEl.innerHTML = `<img src="${profile.storeAvatar}" alt="${profile.storeName}" loading="lazy">`;
            } else {
                avatarEl.textContent = getInitials(profile.storeName || profile.name);
            }
        }
        set('meet-seller-name', profile.storeName || profile.name || 'Store');
        set('meet-store-name', `@${(profile.storeName || profile.name || 'store').toLowerCase().replace(/\s+/g, '')}`);
        set('meet-seller-bio', profile.storeDescription || profile.bio || '');
        set('meet-seller-location', [profile.city, profile.country].filter(Boolean).join(', ') || profile.location || 'Not specified');
        set('meet-seller-joined', profile.joinedDate ? formatJoinDate(profile.joinedDate) : '—');
        set('meet-seller-products', stats.productCount ?? '0');

        // Social links
        const socialsEl = document.getElementById('meet-seller-socials');
        if (socialsEl) {
            const links = [];
            const socialMap = [
                { key: 'instagram', icon: 'instagram', label: 'Instagram' },
                { key: 'twitter', icon: 'twitter', label: 'X / Twitter' },
                { key: 'tiktok', icon: 'music', label: 'TikTok' },
                { key: 'website', icon: 'globe', label: 'Website', direct: true },
            ];
            socialMap.forEach(item => {
                const val = profile[item.key];
                if (!val) return;
                const href = item.direct && !val.startsWith('http') ? `https://${val}` : val;
                links.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" class="meet-social-link" aria-label="${item.label}"><i data-lucide="${item.icon}"></i>${item.label}</a>`);
            });
            socialsEl.innerHTML = links.join('');
            if (window.lucide && lucide.createIcons) lucide.createIcons();
        }
    }

    // -- Populate featured collections counts -----------------------------
    window._collectionData = null;

    function populateCollections(products) {
        const list = products || [];
        const bestSellers = [...list].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)).slice(0, 8);
        const newArrivals = list.slice(0, 8);
        const studentFavs = [...list].filter(p => (p.rating || 0) >= 4.5).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
        const specialOffers = list.filter(p => p.comparePrice && p.comparePrice > p.price);

        window._collectionData = { bestSellers, newArrivals, studentFavs, specialOffers };

        set('col-count-best-sellers', `${bestSellers.length} products`);
        set('col-count-new-arrivals', `${newArrivals.length} products`);
        set('col-count-student-favorites', `${studentFavs.length} products`);
        set('col-count-special-offers', `${specialOffers.length} products`);
    }

    // Collection click: filter store products to collection
    function initCollectionCards() {
        document.querySelectorAll('.collection-card').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.collection;
                const data = window._collectionData;
                if (!data || !window._storeProducts) return;

                let filtered;
                switch (key) {
                    case 'best-sellers':    filtered = data.bestSellers; break;
                    case 'new-arrivals':    filtered = data.newArrivals; break;
                    case 'student-favorites': filtered = data.studentFavs; break;
                    case 'special-offers':  filtered = data.specialOffers; break;
                    default: filtered = window._storeProducts;
                }

                if (window.initStore) {
                    window.initStore({
                        products: filtered,
                        categorycounts: {},
                        pagination: { page: 1, limit: filtered.length, total: filtered.length, hasMore: false },
                        sellerId: document.getElementById('store-products')?.dataset?.sellerId || '',
                        isPreview: false,
                    });
                }

                const productsSection = document.getElementById('products');
                if (productsSection) {
                    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // -- Populate store policies ------------------------------------------
    function populatePolicies() {
        // Static - always shown
    }

    // -- Populate related stores (placeholder) ----------------------------
    function populateRelatedStores() {
        const grid = document.getElementById('related-stores-grid');
        if (!grid) return;
        // Substitute Browse CTA if nothing in grid yet
        const existing = grid.querySelector('.related-store-card:not([data-placeholder])');
        if (!existing) {
            grid.innerHTML = `
                <a href="../../../public/stores/stores.html" class="related-store-card" aria-label="Browse all student stores">
                    <div class="related-store-initial"><i data-lucide="compass"></i></div>
                    <h4>Browse All Stores</h4>
                    <p>Discover 100+ student-run shops on UniMartX</p>
                </a>
            `;
            if (window.lucide && lucide.createIcons) lucide.createIcons();
        }
    }

    // -- Populate reviews summary with rating distribution -----------------
    function populateReviewsSummary(reviews, avgRating) {
        const scoreEl = document.getElementById('reviews-score');
        const totalEl = document.getElementById('reviews-total-count');
        const distEl = document.getElementById('rating-distribution');

        if (scoreEl) scoreEl.textContent = avgRating != null ? avgRating.toFixed(1) : '—';
        if (totalEl) totalEl.textContent = `${(reviews || []).length} reviews`;

        if (!distEl) return;

        const counts = [0, 0, 0, 0, 0];
        (reviews || []).forEach(r => {
            const s = Math.min(5, Math.max(1, Math.round(r.rating) || 1));
            counts[5 - s]++;
        });
        const total = counts.reduce((a, b) => a + b, 0) || 1;
        distEl.innerHTML = [5, 4, 3, 2, 1].map((star, i) => {
            const count = counts[5 - star];
            const pct = (count / total * 100).toFixed(0);
            return `
                <div class="rating-bar-row">
                    <span class="rating-bar-label">${star}★</span>
                    <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
                    <span class="rating-bar-count">${count}</span>
                </div>
            `;
        }).join('');
    }

    // -- Populate all elements from API data -------------------------------
    function populate(data) {
        const { profile, stats, products, reviews, ratingBreakdown, pagination, categorycounts } = data;

        // Page title
        document.title = `${profile.storeName || profile.name} | UnimartX`;

        // Hero banner
        const heroBg = document.querySelector('.store-hero-bg img');
        if (heroBg && profile.storeBanner) {
            heroBg.src = profile.storeBanner;
            heroBg.style.display = '';
        }

        // Store avatar
        const avatarEl = document.getElementById('store-avatar');
        if (avatarEl) {
            if (profile.storeAvatar) {
                avatarEl.innerHTML = `<img src="${profile.storeAvatar}" alt="${profile.storeName}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;">`;
            } else {
                avatarEl.textContent = getInitials(profile.storeName || profile.name);
            }
        }

        // Store color — apply as CSS variable
        if (profile.storeColor) {
            document.documentElement.style.setProperty('--primary', profile.storeColor);
            // simple darken for --primary-d
            const hex = profile.storeColor.replace('#', '');
            const num = parseInt(hex, 16);
            const amt = 30;
            const r = Math.max((num >> 16) - amt, 0);
            const g = Math.max(((num >> 8) & 0xff) - amt, 0);
            const b = Math.max((num & 0xff) - amt, 0);
            const dark = '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
            document.documentElement.style.setProperty('--primary-d', dark);
        }

        // Identity
        set('store-name', profile.storeName || profile.name || 'Store');
        set('store-bio', profile.storeDescription || profile.bio || 'No description available.');
        set('store-category', CATEGORY_LABELS[profile.category] || profile.category || '');
        set('store-location', [profile.city, profile.country].filter(Boolean).join(', ') || profile.location || 'Location not set');
        set('store-joined', profile.joinedDate ? formatJoinDate(profile.joinedDate) : '—');
        set('store-product-count', stats.productCount ?? '0');

        const studentBadge = document.getElementById('store-student-badge');
        if (studentBadge) studentBadge.textContent = 'Student Seller';

        // View Profile link
        const profileLink = document.getElementById('visit-store-btn');
        if (profileLink) {
            profileLink.href = `../profile/profile.html?sellerId=${profile.sellerId}`;
        }

        // Contact modal store name
        set('contact-modal-store-name', profile.storeName || profile.name || 'Seller');

        // Stats
        set('stat-sales', stats.totalSales ?? '—');
        set('stat-followers', stats.followerCount ?? '—');

        if (stats.avgRating != null) {
            set('stat-rating', stats.avgRating.toFixed(1));
            const starsEl = document.getElementById('stat-stars');
            if (starsEl) starsEl.textContent = starsFromRating(stats.avgRating);
        }

        const seeAllLink = document.getElementById('see-all-reviews-link');
        if (seeAllLink) seeAllLink.href = `../profile/profile.html?sellerId=${profile.sellerId}`;

        // Hand off products + reviews to store.js
        if (typeof window.initStore === 'function') {
            window.initStore({ products, reviews, categorycounts, pagination, sellerId: profile.sellerId });
        }

        // New section population
        populateTrustBadges(stats, profile.sellerId);
        populateTrustBadgesSection(stats);
        populateMeetSeller(profile, stats);
        populateCollections(products);
        populatePolicies();
        populateRelatedStores();
        populateReviewsSummary(reviews, stats.avgRating);
    }

    // -- Show error banner -------------------------------------------------
    function showError(msg) {
        const heroError = document.getElementById('store-hero-error');
        const errorMsg  = document.getElementById('store-error-msg');
        const errorIcon = document.getElementById('store-error-icon');
        if (heroError) {
            if (errorMsg) errorMsg.textContent = msg;
            if (errorIcon) errorIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
            document.body.classList.add('page-has-error');
        } else {
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;z-index:9999;font-size:0.9rem;';
            banner.textContent = msg;
            document.body.appendChild(banner);
        }
    }

    // -- Main --------------------------------------------------------------
    async function init() {
        applyFallbacks();
        initScrollAnimations();

        const sellerId = getSellerId();
        if (!sellerId) {
            showError('No store specified. Please check the URL.');
            return;
        }

        try {
            const res = await apiFetchWithTimeout(`${API_BASE}/api/public/seller/${sellerId}`);
            const json = await res.json();

            if (!res.ok || !json.success) {
                showError(json.error || 'Failed to load store.');
                return;
            }

            json.data.profile.sellerId = sellerId;
            populate(json.data);
            observeNewElements();
            if (typeof initCollectionCards === 'function') initCollectionCards();

        } catch (err) {
            console.error('Store page load error:', err);
            showError('Could not connect to the server. Please try again later.');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();

// ── Copy Shop Link ──────────────────────────────────────────────────────────
(function () {
    const btn = document.getElementById('copy-link-btn');
    if (!btn) return;

    function showToast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:#ffffff;border:1px solid #059669;color:#1c1917;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:9999;transform:translateY(120%);opacity:0;transition:transform 0.3s,opacity 0.3s;font-size:0.95rem;font-weight:600;max-width:380px;';
        document.body.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }));
        setTimeout(() => {
            toast.style.transform = 'translateY(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    btn.addEventListener('click', async () => {
        const sellerId = window.getSellerId ? window.getSellerId() : new URLSearchParams(window.location.search).get('id');
        if (!sellerId) {
            showToast('Could not determine shop link.', 'error');
            return;
        }

        const shopUrl = `${window.location.origin}/pages/seller/public/store/store.html?sellerId=${encodeURIComponent(sellerId)}`;

        try {
            await navigator.clipboard.writeText(shopUrl).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = shopUrl;
                ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            });
            showToast('Shop link copied! Share it everywhere.');
            btn.classList.add('copied');
            btn.innerHTML = '<i data-lucide="check"></i>';
            if (window.lucide && lucide.createIcons) lucide.createIcons();
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<i data-lucide="share-2"></i>';
                if (window.lucide && lucide.createIcons) lucide.createIcons();
            }, 2000);
        } catch {
            showToast('Failed to copy. Please copy the URL manually.', 'error');
        }
    });
})();

fetchCartCount();

// -- Single live sync loop --------------------------------------------------
(function liveStoreSync() {
    let _fetching = false;
    let _productSnap = null;
    let _statsSnap   = null;

    function snap(arr, key) { return (arr || []).map(x => x[key]).join(',') || '__empty__'; }

    function applyStats(s) {
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('stat-sales',   s.totalSales ?? '—');
        setText('stat-followers', s.followerCount ?? '—');
        if (s.avgRating != null) {
            setText('stat-rating', s.avgRating.toFixed(1));
            const starsEl = document.getElementById('stat-stars');
            if (starsEl) starsEl.textContent = starsFromRating(s.avgRating);
        }
    }

    async function tick() {
        if (_fetching) return;
        const sellerId = window.getSellerId ? window.getSellerId() : null;
        if (!sellerId) return;
        _fetching = true;
        try {
            const res = await apiFetchWithTimeout(`${API_BASE}/api/public/seller/${sellerId}`);
            if (!res.ok) return;
            const json = await res.json();
            if (!json.success) return;

            const { stats, products, categorycounts, pagination, profile } = json.data;

            // Stats — update only on change
            const newStatsSnap = `${stats.totalSales}|${stats.avgRating}|${stats.followerCount}`;
            if (newStatsSnap !== _statsSnap) {
                _statsSnap = newStatsSnap;
                applyStats(stats);
            }

            // Products — re-init store only on change
            const newProductSnap = snap(products, 'id');
            if (newProductSnap !== _productSnap) {
                _productSnap = newProductSnap;
                if (typeof window.initStore === 'function') {
                    window.initStore({
                        products: products || [],
                        categorycounts: categorycounts || {},
                        pagination,
                        sellerId: profile?.sellerId || sellerId,
                    });
                }
            }
        } catch {}
        _fetching = false;
    }

    const pollId = setInterval(tick, 60000);
    window.addEventListener('beforeunload', () => clearInterval(pollId));

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { _fetching = false; tick(); }
    });
    window.addEventListener('online', () => { _fetching = false; tick(); });
})();
