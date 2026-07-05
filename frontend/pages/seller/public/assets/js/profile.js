// PROFILE PAGE — Public seller profile

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

function getCurrentUser() {
  const raw = localStorage.getItem('authData');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('authData');
      } else {
        const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
        if (authData.token) return authData;
      }
    } catch {}
  }
  const token = localStorage.getItem('authToken');
  if (token && token !== 'undefined' && token !== 'null') return { token };
  return null;
}

function getToken() {
  const user = getCurrentUser();
  return user?.token || null;
}

// ── Get sellerId from URL (?sellerId=xxx) ──────────────────────────────────
function getSellerIdFromUrl() {
    const id = new URLSearchParams(window.location.search).get('sellerId');
    if (!id) {
        showErrorBanner('No seller specified. Please check the URL.');
    }
    return id;
}

// ── DOMContentLoaded ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    applyProfileFallbacks();
    initModals();
    initFollowButton();
    initScrollAnimations();
    await loadSellerData();

    const loadMoreBtn = document.getElementById('load-more-reviews');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreProfileReviews);

    // Extra observer passes for late-rendered cards
    setTimeout(observeNewElements, 200);
    setTimeout(observeNewElements, 800);
    setTimeout(observeNewElements, 1600);
});

// ── Max featured products shown on profile ──────────────────────────────────
const MAX_PREVIEW = 4;

// ── Profile page review state ────────────────────────────────────────────────
const profileReviewState = {
    reviews: [],
    pagination: { page: 1, limit: 5, total: 0, hasMore: false },
    loadingMore: false,
    sellerId: null,
};

// ── Random product picker for profile preview ───────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getPreviewProducts(products) {
    if (products.length <= MAX_PREVIEW) return products;
    return shuffle(products).slice(0, MAX_PREVIEW);
}

// ── Fetch & populate everything ────────────────────────────────────────────
async function loadSellerData() {
    const sellerId = getSellerIdFromUrl();
    if (!sellerId) return;

    window._currentSellerId = sellerId;

    try {
        const res = await apiFetchWithTimeout(`${API_BASE}/api/public/seller/${sellerId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
            showErrorBanner(json.error || 'Failed to load seller profile.');
            return;
        }

        const { profile, stats, products, reviews, ratingBreakdown, pagination, categorycounts } = json.data;

        populateProfile(profile, stats);
        populateRatingBreakdown(ratingBreakdown, stats);

        profileReviewState.sellerId = sellerId;
        profileReviewState.reviews = reviews || [];
        profileReviewState.pagination = pagination || profileReviewState.pagination;
        renderProfileReviews();

        // Hand off to store.js — profile gets a small preview slice
        if (typeof window.initStore === 'function') {
            window.initStore({ products: getPreviewProducts(products), reviews, categorycounts, pagination, sellerId, isPreview: true });
        }

        observeNewElements();
        setupReviewForm(sellerId, profile.sellerId);

        if (typeof window.fetchHeroStats === 'function') {
            window.fetchHeroStats().catch(() => {});
        }

    } catch (err) {
        console.error('Failed to load seller data:', err);
        showErrorBanner('Could not connect to the server. Please try again later.');
    }
}

// ── Populate profile header and about ──────────────────────────────────────
function populateProfile(profile, stats) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    const displayName = profile.name || 'Seller';

    // Header
    set('profile-name', displayName);
    set('profile-location', profile.location || 'Location not set');
    set('profile-joined', profile.joinedDate ? formatJoinDate(profile.joinedDate) : '—');
    set('profile-product-count', stats.productCount ?? '0');
    set('profile-stat-sales', stats.totalSales ?? '—');
    set('profile-stat-reviews', stats.totalReviews ?? '—');

    const totalReviewsEl = document.getElementById('reviews-count-sub');
    if (totalReviewsEl) totalReviewsEl.textContent = (stats.totalReviews ?? 0) + ' reviews';

    if (stats.avgRating != null) {
        set('profile-stat-rating', stats.avgRating.toFixed(1));
        const starsEl = document.getElementById('profile-stat-stars');
        if (starsEl) starsEl.textContent = starsFromRating(stats.avgRating);
    } else {
        set('profile-stat-rating', '—');
    }

    // Avatar
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
        if (profile.avatar) {
            avatarEl.innerHTML = `<img src="${profile.avatar}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentNode.textContent='${getInitials(displayName)}'">`;
        } else {
            avatarEl.textContent = getInitials(displayName);
        }
    }

    // About
    const year = profile.joinedDate ? new Date(profile.joinedDate).getFullYear() : '—';
    set('about-founded', year);
    set('about-headline', 'About the seller');
    set('about-body', profile.bio || 'No bio provided.');

    // Page title
    document.title = `${profile.storeName || profile.name} | UnimartX`;

    // Wire up store links with sellerId
    const storeUrl = `../store/store.html?sellerId=${profile.sellerId}`;
    const viewAllBtn = document.getElementById('view-all-btn');
    if (viewAllBtn) viewAllBtn.href = storeUrl;
    const ctaViewAll = document.getElementById('cta-view-all-btn');
    if (ctaViewAll) ctaViewAll.href = storeUrl;
    const viewAllBtn2 = document.getElementById('view-all-btn-2');
    if (viewAllBtn2) viewAllBtn2.href = storeUrl;

    // Stats reference for follow
    _sellerStats = stats;
    refreshFollowState().catch(() => {});

    // Social links
    renderSocialLinks(profile);
}

// ── Rating breakdown bars ──────────────────────────────────────────────────
function populateRatingBreakdown(ratingBreakdown, stats) {
    const scoreBig = document.getElementById('score-big');
    const scoreStars = document.getElementById('score-stars');
    const reviewsBars = document.getElementById('reviews-bars');

    if (scoreBig) scoreBig.textContent = stats.avgRating != null ? stats.avgRating.toFixed(1) : '—';
    if (scoreStars) scoreStars.textContent = stats.avgRating != null ? starsFromRating(stats.avgRating) : '☆☆☆☆☆';

    if (reviewsBars && ratingBreakdown) {
        reviewsBars.innerHTML = [5, 4, 3, 2, 1].map(n => `
            <div class="rating-bar-row">
                <span>${n}★</span>
                <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${ratingBreakdown[n] ?? 0}%"></div></div>
                 <span>${ratingBreakdown[n] ?? 0}%</span>
            </div>`).join('');
    }
}

// ── Profile page review rendering ───────────────────────────────────────────
function renderProfileReviewCard(review) {
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const initials = (review.buyer?.name || 'B').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const avatarContent = review.buyer?.avatar
                ? `<img src="${review.buyer.avatar}" alt="${review.buyer?.name || 'Buyer'}" loading="lazy">`
                : initials;

            return `
                <article class="review-item">
                    <div class="review-avatar">${avatarContent}</div>
                    <div class="review-body">
                        <div class="review-header">
                            <span class="review-author">${review.buyer?.name || 'Buyer'}</span>
                            <span class="review-stars">${stars}</span>
                            <span class="review-date">${formatRelativeDate(review.createdAt)}</span>
                        </div>
                        <p class="review-text">${review.comment || ''}</p>
                        <span class="review-product-name">${review.productName || ''}</span>
                    </div>
                </article>`;
}

function renderProfileReviews() {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    const reviews = profileReviewState.reviews || [];
    if (reviews.length === 0) {
        list.innerHTML = '<p class="reviews-empty">No reviews yet.</p>';
        const btn = document.getElementById('load-more-reviews');
        if (btn) btn.classList.add('hidden');
        return;
    }

    list.innerHTML = reviews.map(renderProfileReviewCard).join('');
    if (window.lucide) window.lucide.createIcons();

    const btn = document.getElementById('load-more-reviews');
    if (btn) btn.classList.toggle('hidden', !profileReviewState.pagination.hasMore);
}

async function loadMoreProfileReviews() {
    if (!profileReviewState.sellerId || profileReviewState.loadingMore || !profileReviewState.pagination.hasMore) return;

    profileReviewState.loadingMore = true;
    const btn = document.getElementById('load-more-reviews');
    if (btn) btn.textContent = 'Loading…';

    try {
        const nextPage = profileReviewState.pagination.page + 1;
        const res = await apiFetchWithTimeout(`${API_BASE}/api/public/seller/${profileReviewState.sellerId}?page=${nextPage}&limit=${profileReviewState.pagination.limit}`);
        const json = await res.json();

        if (res.ok && json.success) {
            const newReviews = json.data.reviews || [];
            profileReviewState.reviews = [...profileReviewState.reviews, ...newReviews];
            profileReviewState.pagination = json.data.pagination;
            renderProfileReviews();
        }
    } catch (err) {
        console.error('Failed to load more reviews:', err);
    } finally {
        profileReviewState.loadingMore = false;
        if (btn) {
            btn.innerHTML = 'Load More Reviews <i data-lucide="chevron-down"></i>';
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

function formatRelativeDate(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}

// ── Social links ───────────────────────────────────────────────────────────
function renderSocialLinks(profile) {
    const container = document.getElementById('social-links');
    if (!container) return;

    const links = [
        { key: 'instagram', icon: 'instagram', label: 'Instagram' },
        { key: 'twitter',   icon: 'twitter',   label: 'X / Twitter' },
        { key: 'tiktok',    icon: 'video',      label: 'TikTok' },
        { key: 'website',   icon: 'globe',      label: 'Website' },
    ];

    const html = links
        .filter(l => profile[l.key])
        .map(l => `<a href="${profile[l.key]}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="${l.label}">
            <i data-lucide="${l.icon}"></i>
        </a>`)
        .join('');

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}

// ── Error banner ───────────────────────────────────────────────────────────
function showErrorBanner(message) {
    const existing = document.getElementById('profile-error-banner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'profile-error-banner';
    banner.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;z-index:9999;font-size:0.9rem;';
    banner.textContent = message;
    document.body.appendChild(banner);
}

// ── Helpers ────────────────────────────────────────────────────────────────
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

// ── Fallbacks (shown before API responds) ─────────────────────────────────
function applyProfileFallbacks() {
    const set = (id, val) => { const el = document.getElementById(id); if (el && !el.textContent.trim()) el.textContent = val; };

    set('profile-name', 'Seller');
    set('profile-location', 'Location not set');
    set('profile-joined', '—');
    set('profile-product-count', '0');
    set('profile-stat-sales', '—');
    set('profile-stat-rating', '—');
    set('profile-stat-reviews', '—');

    const stars = document.getElementById('profile-stat-stars');
    if (stars && !stars.textContent.trim()) stars.textContent = '☆☆☆☆☆';

    set('about-headline', 'About the seller');
    set('about-body', 'No bio provided.');
    set('about-founded', '—');

    const avatar = document.getElementById('profile-avatar');
    if (avatar && !avatar.textContent.trim() && !avatar.querySelector('img')) avatar.textContent = '?';

    const scoreBig = document.getElementById('score-big');
    if (scoreBig && !scoreBig.textContent.trim()) scoreBig.textContent = '—';

    const scoreStars = document.getElementById('score-stars');
    if (scoreStars && !scoreStars.textContent.trim()) scoreStars.textContent = '☆☆☆☆☆';

    const reviewsBars = document.getElementById('reviews-bars');
    if (reviewsBars && !reviewsBars.innerHTML.trim()) {
        reviewsBars.innerHTML = [5, 4, 3, 2, 1].map(n => `
            <div class="rating-bar-row">
                <span>${n}★</span>
                <div class="rating-bar-track"><div class="rating-bar-fill" style="width:0%"></div></div>
                <span>0%</span>
            </div>`).join('');
    }
}

// ── Modals ─────────────────────────────────────────────────────────────────
function initModals() {
    document.querySelectorAll('.modal-close').forEach(btn =>
        btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.add('hidden'))
    );

    const contactBtn = document.getElementById('contact-btn');
    const ctaContactBtn = document.getElementById('cta-contact-btn');
    const contactModal = document.getElementById('contact-modal');

    if (contactBtn && contactModal) {
        contactBtn.addEventListener('click', () => {
            contactModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }
    if (ctaContactBtn && contactModal) {
        ctaContactBtn.addEventListener('click', () => {
            contactModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    });

    // Cancel buttons
    const modalCancel = document.getElementById('modal-cancel');
    if (modalCancel && contactModal) {
        modalCancel.addEventListener('click', () => {
            contactModal.classList.add('hidden');
            document.body.style.overflow = '';
        });
    }
}

// ── State ─────────────────────────────────────────────────────────────────
let _followBtn = null;
let _followBtnText = null;
let _followBtnIcon = null;
let _followerCountEl = null;
window._currentSellerId = null;
let _isFollowing = false;
let _sellerStats = null;

// ── Follow Button ──────────────────────────────────────────────────────────
async function initFollowButton() {
    const sellerId = getSellerIdFromUrl();
    if (!sellerId) return;
    window._currentSellerId = sellerId;

    _followBtn = document.getElementById('follow-btn');
    _followBtnText = document.getElementById('follow-btn-text');
    _followBtnIcon = _followBtn?.querySelector('i');
    _followerCountEl = document.getElementById('follower-count');

    if (!_followBtn) return;

    await refreshFollowState();
    updateFollowUI(null);

    _followBtn.addEventListener('click', async () => {
        if (!_currentSellerId) return;

        const myStoreId = localStorage.getItem('seller_id');
        if (myStoreId && myStoreId === _currentSellerId) return;

        if (!_isFollowing) {
            const followModal = document.getElementById('follow-modal');
            if (followModal) followModal.classList.remove('hidden');
            return;
        }

        await toggleFollowApi();
    });

    const followConfirm = document.getElementById('follow-confirm');
    const followModal = document.getElementById('follow-modal');
    if (followConfirm && followModal) {
        followConfirm.addEventListener('click', async () => {
            followModal.classList.add('hidden');
            await toggleFollowApi();
        });
    }

    const followCancel = document.getElementById('follow-cancel');
    if (followCancel && followModal) {
        followCancel.addEventListener('click', () => followModal.classList.add('hidden'));
    }

    const followModalClose = document.getElementById('follow-modal-close');
    if (followModalClose && followModal) {
        followModalClose.addEventListener('click', () => followModal.classList.add('hidden'));
    }
}

function updateFollowUI(count) {
    if (_followBtnText) {
        _followBtnText.textContent = _isFollowing ? 'Following' : 'Follow';
    }
    if (_followBtnIcon) {
        _followBtnIcon.setAttribute('data-lucide', _isFollowing ? 'heart' : 'heart');
        if (window.lucide) window.lucide.createIcons();
    }
    if (_followBtn) {
        _followBtn.classList.toggle('following', _isFollowing);
    }
    if (_followerCountEl && typeof count === 'number') {
        _followerCountEl.textContent = `${count} ${count === 1 ? 'follower' : 'followers'}`;
        _followerCountEl.classList.remove('bump');
        void _followerCountEl.offsetWidth;
        _followerCountEl.classList.add('bump');
    }
}

async function refreshFollowState() {
    const sellerId = _currentSellerId;
    if (!sellerId) return;

    if (_followerCountEl) {
        const knownCount = _sellerStats?.followerCount ?? 0;
        _followerCountEl.textContent = `${knownCount} ${knownCount === 1 ? 'follower' : 'followers'}`;
    }

    try {
        const token = getToken();
        const headers = token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' };

        const res = await apiFetchWithTimeout(`${API_BASE}/api/follow/status/${sellerId}`, { headers });
        const json = await res.json();

        const myStoreId = localStorage.getItem('seller_id');
        const userRole = localStorage.getItem('userRole');
        const isSelfView = userRole === 'seller' && !!myStoreId && myStoreId === sellerId;

        if (res.ok && json.success) {
            if (isSelfView) {
                _isFollowing = false;
                if (_followBtnText) _followBtnText.textContent = 'Your Store';
                if (_followBtn) _followBtn.classList.remove('following');
                if (_followBtnIcon) {
                    _followBtnIcon.setAttribute('data-lucide', 'store');
                    if (window.lucide) window.lucide.createIcons();
                }
            } else {
                _isFollowing = json.data.isFollowing || false;
                if (_followerCountEl && typeof json.data.followerCount === 'number') {
                    const apiCount = json.data.followerCount;
                    _followerCountEl.textContent = `${apiCount} ${apiCount === 1 ? 'follower' : 'followers'}`;
                }
            }
            updateFollowUI(null);
        }
    } catch (err) {
        console.error('Failed to check follow status:', err);
    }
}

async function toggleFollowApi() {
    if (!_currentSellerId) return;

    const token = getToken();
    if (!token) {
        window.location.href = '../../../auth/login.html';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    if (_followBtn) _followBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/follow/toggle`, { credentials: 'include',
            method: 'POST',
            headers,
            body: JSON.stringify({ sellerId: _currentSellerId }),
        });

        const json = await res.json();

        if (res.ok && json.success) {
            _isFollowing = json.data.isFollowing;
            updateFollowUI(json.data.followerCount);
        } else if (res.status === 401) {
            window.location.href = '../../../auth/login.html';
        }
    } catch (err) {
        console.error('Failed to toggle follow:', err);
        alert('Network error. Please try again.');
    } finally {
        if (_followBtn) _followBtn.disabled = false;
    }
}

function setupReviewForm(sellerId, sellerUserId) {
    // Review form is handled by store.js if needed; profile page typically just shows reviews.
}

// ── Scroll Animations ──────────────────────────────────────────────────────
function initScrollAnimations() {
    if (!window.IntersectionObserver) {
        document.querySelectorAll('.product-card, .review-item, .load-more-btn, .empty-state').forEach(el => {
            el.classList.add('animated');
        });
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -30px 0px',
    });

    document.querySelectorAll('.product-card, .review-item, .load-more-btn, .empty-state').forEach(el => {
        observer.observe(el);
    });

    window._scrollAnimObserver = observer;
}

function observeNewElements() {
    const observer = window._scrollAnimObserver;
    if (!observer) return;
    document.querySelectorAll('.product-card, .review-item').forEach(el => {
        if (!el.classList.contains('animated')) observer.observe(el);
    });
    window.observeNewElements = observeNewElements;
}

// ── Utility: Spin animation ────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);

fetchCartCount();

// ── Live sync ─────────────────────────────────
    let _isFetching = false;
    let _pollId = null;

    async function liveFetchProfile() {
        const sellerId = window._currentSellerId;
        if (!sellerId || _isFetching) return;
        _isFetching = true;

        try {
            const res = await apiFetchWithTimeout(`${API_BASE}/api/public/seller/${sellerId}`);
            if (!res.ok) return;
            const json = await res.json();
            if (!json.success) return;

            const { profile, stats, products, reviews, ratingBreakdown, pagination, categorycounts } = json.data;

            const currentProductIds = (products || []).map(p => p.id).join(',');
            const currentReviewIds = (reviews || []).map(r => r.id).join(',');

            if (currentProductIds === window._lastProductIds && currentReviewIds === window._lastReviewIds) return;
            window._lastProductIds = currentProductIds;
            window._lastReviewIds = currentReviewIds;

            if (typeof populateProfile !== 'function' || typeof populateRatingBreakdown !== 'function') return;

            populateProfile(profile, stats);
            populateRatingBreakdown(ratingBreakdown, stats);

            if (typeof window.initStore === 'function') {
                window.initStore({ products: getPreviewProducts(products), reviews, categorycounts, pagination, sellerId: profile.sellerId, isPreview: true });
            }

            profileReviewState.reviews = reviews || [];
            profileReviewState.pagination = pagination || profileReviewState.pagination;
            renderProfileReviews();

            window.lucide?.createIcons?.();
            window.observeNewElements?.();

            if (typeof getCurrentUser === 'function' && getCurrentUser() && typeof refreshFollowState === 'function') refreshFollowState();
        } finally {
            _isFetching = false;
        }
    }

    function startProfileLiveSync() {
        let initialized = false;
        _pollId = setInterval(async () => {
            if (_isFetching) return;
            if (!initialized) { initialized = true; await liveFetchProfile(); return; }
            await liveFetchProfile();
        }, 60000);
        window.addEventListener('beforeunload', () => clearInterval(_pollId));
    }

    let _visibilityTimeout = null;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            clearTimeout(_visibilityTimeout);
            _visibilityTimeout = setTimeout(() => {
                _isFetching = false;
                liveFetchProfile();
            }, 500);
        }
    });

    window.addEventListener('online', () => {
        _isFetching = false;
        liveFetchProfile();
    });

    startProfileLiveSync();
})();
