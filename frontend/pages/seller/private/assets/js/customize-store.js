// SELLER CUSTOMIZE STORE — REWORKED
// Advanced store customization with validation, auto-save, undo/redo, and more

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI components first
    initSettingsNavigation();
    initDescriptionCounter();
    initImageUploads();
    initColorScheme();
    initForms();
    initPreviewButton();
    initModals();
    initUnsavedChanges();
    initExportImport();
    initAccessibility();

    // Bind location/bio/category preview updates
    const countryInput = document.getElementById('store-country');
    const cityInput = document.getElementById('store-city');
    const descInput2 = document.getElementById('store-description');
    const categorySelect2 = document.getElementById('store-category');
    if (countryInput) countryInput.addEventListener('input', updateStoreLocationPreview);
    if (cityInput) cityInput.addEventListener('input', updateStoreLocationPreview);
    if (descInput2) descInput2.addEventListener('input', updateStoreBioPreview);
    if (categorySelect2) categorySelect2.addEventListener('change', updateStoreCategoryPreview);

    const taglineInput = document.getElementById('store-tagline');
    if (taglineInput) {
        taglineInput.addEventListener('input', updateStoreTaglinePreview);
        updateStoreTaglinePreview();
    }

    // Fulfillment form
    const fulfillmentForm = document.getElementById('store-fulfillment-form');
    if (fulfillmentForm) fulfillmentForm.addEventListener('submit', handleFulfillmentSubmit);
    const deliveryFeeInput = document.getElementById('delivery-fee');
    const pickupAddressInput = document.getElementById('pickup-address');
    if (deliveryFeeInput) deliveryFeeInput.addEventListener('input', updateFulfillmentPreview);
    if (pickupAddressInput) pickupAddressInput.addEventListener('input', updateFulfillmentPreview);

    // Then load store data from backend (which will trigger color preset selection after presets exist)
    await loadStoreData();

    // Real-time store name preview
    const nameInput = document.getElementById('store-name');
    if (nameInput) {
        nameInput.addEventListener('input', updateStoreNamePreview);
        // Initial update
        updateStoreNamePreview();
    }

    // Initial location preview
    updateStoreLocationPreview();

    // Restore draft if exists
    restoreDraft();
});

// ── State Management ──
const state = {
    original: {},
    current: {},
    history: [],
    historyIndex: -1,
    maxHistory: 20
};

const defaultColor = '#f59e0b';
let currentColor = defaultColor;
let autoSaveTimer = null;
let formBaselineReady = false;
const DEBOUNCE_MS = 1000;
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── Color Utilities (global) ──────────────────────────────────────
function darkenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function getLuminanceContrast(hex) {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 255) / 255;
    const g = ((rgb >> 8) & 255) / 255;
    const b = (rgb & 0x0000FF) / 255;
    const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722);
    const contrast = (1.05) / (luminance + 0.05);
    return { ratio: Math.round(contrast * 100) / 100 };
}

function updateContrastCheck(color, indicator, hint) {
    const contrast = getLuminanceContrast(color);
    let className, hintText;
    if (contrast.ratio >= 7) {
        className = 'pass';
        hintText = 'Excellent contrast for all text sizes';
    } else if (contrast.ratio >= 4.5) {
        className = 'pass';
        hintText = 'Meets WCAG AA standard';
    } else if (contrast.ratio >= 3) {
        className = 'warn';
        hintText = 'Meets AA for large text only';
    } else {
        className = 'fail';
        hintText = 'Low contrast - consider a brighter color';
    }
    indicator.className = 'contrast-indicator ' + className;
    if (hint) hint.textContent = hintText;
}

function updateColorUI(color) {
    const colorInput = document.getElementById('custom-color');
    const colorCode = document.querySelector('.color-code');
    const storeColorInput = document.getElementById('store-color');
    const preview = document.getElementById('color-preview');
    const storeIcon = document.querySelector('.preview-store-icon');
    const contrastIndicator = document.getElementById('contrast-indicator');
    const contrastHint = document.getElementById('contrast-hint');
    if (colorInput) colorInput.value = color;
    if (colorCode) colorCode.textContent = color;
    if (storeColorInput) storeColorInput.value = color;
    if (preview) {
        preview.style.borderTopColor = color;
        preview.style.setProperty('--primary', color);
        preview.style.setProperty('--primary-d', darkenColor(color, 20));
    }
    if (storeIcon) storeIcon.style.background = color;
    if (contrastIndicator && contrastHint) updateContrastCheck(color, contrastIndicator, contrastHint);
    // Update live store preview primary color
    const storePreview = document.getElementById('store-preview');
    if (storePreview) storePreview.style.setProperty('--sp-primary', color);
}

// ── Auth Token Helper ──────────────────────────────────────
function getAuthToken() {
    const raw = localStorage.getItem('authData');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.expiry && Date.now() > parsed.expiry) {
                localStorage.removeItem('authData');
                return null;
            }
            const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
            if (authData.token) return authData.token;
        } catch {}
    }
    const fallback = localStorage.getItem('authToken');
    if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
    return fallback;
}

// ── Toast Helper (if not already present) ──────────────────
function showToast(message, type = 'info', duration = 3000) {
    // Try to use existing Toast from inline script or create one
    if (window.Toast && typeof window.Toast.show === 'function') {
        window.Toast.show(message, type, duration);
        return;
    }
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;padding:0.85rem 1.25rem;background:var(--color-bg);color:var(--color-text);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;animation:toast-in 0.3s ease-out forwards;';
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ── Load Store Data from Backend ───────────────────────────────
const colorPresets = [
    { name: 'Amber (Default)', value: '#f59e0b' },
    { name: 'Emerald', value: '#34d399' },
    { name: 'Sky Blue', value: '#38bdf8' },
    { name: 'Purple', value: '#a78bfa' },
    { name: 'Pink', value: '#f472b6' },
    { name: 'Orange', value: '#fb923c' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Fuchsia', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Ocean Blue', value: '#0ea5e9' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Burnt Orange', value: '#f97316' },
    { name: 'Apple Green', value: '#84cc16' }
];

// ── Update Store Name Preview ──
function updateStoreNamePreview() {
    const nameInput = document.getElementById('store-name');
    const previewName1 = document.getElementById('preview-store-name');
    const previewName2 = document.getElementById('preview-store-name-colors');
    const avatarInner = document.getElementById('avatar-inner');
    const mockAvatar = document.getElementById('mock-avatar');
    const mockAvatarInitials = document.getElementById('mock-avatar-initials');

    if (nameInput) {
        const value = nameInput.value.trim() || 'Your Store Name';
        if (previewName1) previewName1.textContent = value;
        if (previewName2) previewName2.textContent = value;
    }

    const hasAvatarImage = mockAvatar?.classList.contains('has-image') || avatarInner?.querySelector('img');
    if (avatarInner && !hasAvatarImage) {
        const storeName = nameInput?.value.trim() || 'Your Store';
        const initials = getInitials(storeName);
        avatarInner.textContent = initials;
        if (mockAvatarInitials) mockAvatarInitials.textContent = initials;
    }
}

function updateStoreLocationPreview() {
    const country = document.getElementById('store-country')?.value.trim() || '';
    const city = document.getElementById('store-city')?.value.trim() || '';
    const locationEl = document.getElementById('preview-location');
    if (!locationEl) return;
    let text = city && country ? `${city}, ${country}` : (country || city || 'Location');
    locationEl.innerHTML = `<i data-lucide="map-pin"></i> ${text}`;
    if (window.lucide) window.lucide.createIcons({ nodes: [locationEl] });
}

function updateStoreBioPreview() {
    const bio = document.getElementById('store-description')?.value.trim() || 'Your store description will appear here';
    const el = document.getElementById('preview-bio');
    if (el) el.textContent = bio;
}

function updateStoreTaglinePreview() {
    const tagline = document.getElementById('store-tagline')?.value.trim() || '';
    const el = document.getElementById('preview-tagline');
    if (el) el.textContent = tagline;
}

function updateStoreCategoryPreview() {
    const select = document.getElementById('store-category');
    const el = document.getElementById('preview-category');
    if (!el || !select) return;
    const opt = select.options[select.selectedIndex];
    el.textContent = (opt && opt.value) ? opt.text : '';
}

function updateFulfillmentPreview() {
    const fee = document.getElementById('delivery-fee')?.value.trim();
    const pickup = document.getElementById('pickup-address')?.value.trim();
    const deliveryRow = document.getElementById('mock-delivery-row');
    const deliveryText = document.getElementById('mock-delivery-text');
    const pickupRow = document.getElementById('mock-pickup-row');
    const pickupText = document.getElementById('mock-pickup-text');
    const fulfillmentBar = document.getElementById('sp-fulfillment');

    let hasAny = false;
    if (fee !== '' && fee != null) {
        const feeNum = parseFloat(fee);
        if (!isNaN(feeNum)) {
            if (deliveryRow) deliveryRow.style.display = '';
            if (deliveryText) deliveryText.textContent = feeNum === 0 ? 'Free delivery' : `Delivery: GH₵${feeNum.toFixed(2)}`;
            hasAny = true;
        } else {
            if (deliveryRow) deliveryRow.style.display = 'none';
        }
    } else {
        if (deliveryRow) deliveryRow.style.display = 'none';
    }

    if (pickup) {
        if (pickupRow) pickupRow.style.display = '';
        if (pickupText) pickupText.textContent = `Pickup: ${pickup}`;
        hasAny = true;
    } else {
        if (pickupRow) pickupRow.style.display = 'none';
    }

    const hours = document.getElementById('store-hours')?.value;
    const hoursRow = document.getElementById('mock-hours-row');
    const hoursText = document.getElementById('mock-hours-text');
    if (hours) {
        if (hoursRow) hoursRow.style.display = '';
        if (hoursText) hoursText.textContent = `Hours: ${hours}`;
        hasAny = true;
    } else {
        if (hoursRow) hoursRow.style.display = 'none';
    }

    if (fulfillmentBar) fulfillmentBar.style.display = hasAny ? '' : 'none';
}

// ── Load Store Data from Backend ───────────────────────────────
async function loadStoreData() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '../../../auth/login.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/seller/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('authData');
                window.location.href = '../../../auth/login.html';
            } else {
                throw new Error(json.error || 'Failed to load store data');
            }
            return;
        }

        const data = json.data;
        console.log('[loadStoreData] profile data:', data);

        // ── General Section ──
        const nameInput = document.getElementById('store-name');
        if (nameInput) nameInput.value = data.storeName || '';
        const categorySelect = document.getElementById('store-category');
        if (categorySelect && data.category) categorySelect.value = data.category;
        const descInput = document.getElementById('store-description');
        if (descInput) descInput.value = data.storeDescription || '';
        const countryInput = document.getElementById('store-country');
        if (countryInput) countryInput.value = data.country || '';
        const cityInput = document.getElementById('store-city');
        if (cityInput) cityInput.value = data.city || '';

        // ── Newly editable store fields ──
        const taglineInput = document.getElementById('store-tagline');
        if (taglineInput) taglineInput.value = data.storeTagline || '';
        const universityInput = document.getElementById('store-university');
        if (universityInput && data.universityAffiliation) universityInput.value = data.universityAffiliation;
        const campusInput = document.getElementById('store-campus');
        if (campusInput) campusInput.value = data.campus || '';
        const hoursInput = document.getElementById('store-hours');
        if (hoursInput && data.businessHours) hoursInput.value = data.businessHours;

        // Delivery options (stored as JSON string)
        try {
            const opts = data.deliveryOptions ? JSON.parse(data.deliveryOptions) : [];
            document.querySelectorAll('#store-delivery-options input[type="checkbox"]').forEach(cb => {
                cb.checked = Array.isArray(opts) && opts.includes(cb.value);
            });
        } catch (e) { /* ignore malformed */ }

        // ── Policies Section ──
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('processing-time', data.processingTime);
        setVal('return-policy', data.returnPolicy);
        setVal('shipping-policy', data.shippingPolicy);
        setVal('refund-policy', data.refundPolicy);
        setVal('exchange-policy', data.exchangePolicy);
        setVal('cancellation-policy', data.cancellationPolicy);

        // ── Branding Section ──
        const brandingForm = document.getElementById('store-branding-form');
        const bannerImg = document.getElementById('banner-img');
        const emptyBanner = document.getElementById('banner-empty');
        const previewDiv = document.getElementById('banner-preview');
        const avatarInner = document.getElementById('avatar-inner');

        console.log('[loadStoreData] elements:', { bannerImg, emptyBanner, previewDiv, avatarInner });

        // Store initial server values on form for reset
        if (brandingForm) {
            brandingForm.dataset.initialBanner = data.storeBanner || '';
            brandingForm.dataset.initialAvatar = data.storeAvatar || '';
        }

        // Banner preview
        if (data.storeBanner) {
            const bannerSrc = (data.storeBanner.startsWith('data:') || data.storeBanner.startsWith('http') || data.storeBanner.startsWith('/')) ? data.storeBanner : `data:image/webp;base64,${data.storeBanner}`;
            console.log('[loadStoreData] banner found:', bannerSrc.substring(0, 50) + '...');
            if (bannerImg) {
                const showPreview = () => {
                    console.log('banner onload fired - naturalWidth:', bannerImg.naturalWidth);
                    if (emptyBanner) {
                        emptyBanner.classList.add('hidden');
                        console.log('emptyBanner hidden class added, now:', emptyBanner.className);
                    }
                    if (previewDiv) {
                        previewDiv.classList.remove('hidden');
                        previewDiv.classList.add('show');
                        console.log('previewDiv classes:', previewDiv.className, '; img src:', bannerImg.src.substring(0, 50));
                    }
                };
                const failPreview = () => {
                    console.error('banner failed to load - src:', data.storeBanner.substring(0, 50));
                    // Keep empty state visible, optionally show error
                };
                // Set handlers BEFORE src
                bannerImg.onload = showPreview;
                bannerImg.onerror = failPreview;
                // If already loaded (cached), show immediately; else wait for onload
                if (bannerImg.complete && bannerImg.naturalWidth > 0) {
                    console.log('banner already complete, showing now');
                    showPreview();
                }
                bannerImg.src = bannerSrc;
            } else {
                console.warn('bannerImg element not found');
            }

            // Also update mock banner in live preview
            const mockBannerImg = document.getElementById('mock-banner-img');
            const mockBannerEmpty = document.getElementById('mock-banner-empty');
            if (mockBannerImg) {
                mockBannerImg.src = bannerSrc;
                mockBannerImg.classList.remove('hidden');
            }
            if (mockBannerEmpty) mockBannerEmpty.classList.add('hidden');
        } else {
            console.log('no storeBanner in data');
            if (emptyBanner) emptyBanner.classList.remove('hidden');
            if (previewDiv) {
                previewDiv.classList.add('hidden');
                previewDiv.classList.remove('show');
            }
            // Clear mock banner
            const mockBannerImg = document.getElementById('mock-banner-img');
            const mockBannerEmpty = document.getElementById('mock-banner-empty');
            if (mockBannerImg) {
                mockBannerImg.src = '';
                mockBannerImg.classList.add('hidden');
            }
            if (mockBannerEmpty) mockBannerEmpty.classList.remove('hidden');
        }

        // Avatar preview
        if (avatarInner) {
            console.log('[loadStoreData] avatarInner found, storeAvatar:', data.storeAvatar ? 'present' : 'absent');
            const avatarPreview = document.getElementById('avatar-preview');
            const avatarEmpty = document.getElementById('avatar-empty');
            const mockAvatar = document.getElementById('mock-avatar');
            const mockAvatarInitials = document.getElementById('mock-avatar-initials');
            if (data.storeAvatar) {
                if (avatarPreview) {
                    avatarPreview.classList.add('show');
                    console.log('avatarPreview show class added, classes:', avatarPreview.className);
                }
                if (avatarEmpty) avatarEmpty.classList.add('hidden');
                avatarInner.innerHTML = `<img src="${data.storeAvatar}" alt="Store avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                // Update mock avatar in live preview using background-image
                if (mockAvatar) {
                    mockAvatar.style.backgroundImage = `url(${data.storeAvatar})`;
                    mockAvatar.classList.add('has-image');
                }
                if (mockAvatarInitials) mockAvatarInitials.classList.add('hidden');
            } else {
                if (avatarPreview) avatarPreview.classList.remove('show');
                if (avatarEmpty) avatarEmpty.classList.remove('hidden');
                const initials = getInitials(data.storeName || 'Store');
                avatarInner.textContent = initials;
                avatarInner.style.background = '';
                // Reset mock avatar to initials
                if (mockAvatar) {
                    mockAvatar.style.backgroundImage = '';
                    mockAvatar.classList.remove('has-image');
                }
                if (mockAvatarInitials) {
                    mockAvatarInitials.textContent = initials;
                    mockAvatarInitials.classList.remove('hidden');
                }
            }
        } else {
            console.warn('avatarInner element not found');
        }

        // ── Colors Section ──
        const colorInput = document.getElementById('custom-color');
        if (colorInput && data.storeColor) {
            colorInput.value = data.storeColor;
            // Try to find matching preset; if found, click it (which updates UI via updateColorUI)
            // If not found (custom color), apply directly
            const matchingPreset = Array.from(document.querySelectorAll('.color-preset'))
                .find(p => p.dataset.color.toLowerCase() === data.storeColor.toLowerCase());
            if (matchingPreset) {
                matchingPreset.click();
            } else {
                // Custom color not in presets — apply directly
                currentColor = data.storeColor;
                updateColorUI(data.storeColor);
                document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
            }
        }

        // Fulfillment fields
        const deliveryFeeEl = document.getElementById('delivery-fee');
        const pickupAddressEl = document.getElementById('pickup-address');
        if (deliveryFeeEl) deliveryFeeEl.value = data.deliveryFee != null ? data.deliveryFee : '';
        if (pickupAddressEl) pickupAddressEl.value = data.pickupAddress || '';

        // Initialize previews
        updateStoreNamePreview();
        updateStoreBioPreview();
        updateStoreTaglinePreview();
        updateStoreCategoryPreview();
        updateFulfillmentPreview();

        // Cache sellerId for the View Store button
        if (data.sellerId) {
            localStorage.setItem('seller_id', data.sellerId);
            const viewStoreBtn = document.getElementById('view-store-btn');
            if (viewStoreBtn) {
                viewStoreBtn.href = `../../public/store/store.html?sellerId=${data.sellerId}`;
            }
        }

        // Capture initial form state
        const forms = ['store-general-form', 'store-branding-form', 'store-colors-form', 'store-policies-form'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) captureFormState(form);
        });

        // Reset dirty flags
        if (window.formStates) {
            Object.values(window.formStates).forEach(state => {
                if (state && state.original !== undefined) state.original = true;
            });
        }

        // Re-evaluate banner visibility now that baseline is established
        formBaselineReady = true;
        updateDirtyFlags();

    } catch (err) {
        console.error('Store data load error:', err);
        showToast('Failed to load store data: ' + err.message, 'error');
    }
}


// ── Settings Section Navigation ──
function initSettingsNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');

    sections.forEach(sec => {
        const activeNav = document.querySelector(`.settings-nav-item[data-target="${sec.id}"].active`);
        sec.style.display = activeNav ? 'block' : 'none';
        if (activeNav) sec.classList.add('active');
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.dataset.target;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(sec => {
                sec.classList.remove('active');
                sec.style.display = (sec.id === targetId) ? 'block' : 'none';
            });

            // Focus first input for accessibility
            const activeSection = document.getElementById(targetId);
            if (activeSection) {
                const firstInput = activeSection.querySelector('input, textarea, select, button');
                if (firstInput) firstInput.focus();
            }
        });
    });
}

// ── Description Character Counter ──
function initDescriptionCounter() {
    const descriptionTextarea = document.getElementById('store-description');
    const counter = document.getElementById('description-count');
    const progressBar = document.getElementById('description-progress');
    if (!descriptionTextarea || !counter) return;

    const maxLength = 1000;
    const warningThreshold = 950;
    const dangerThreshold = 990;

    const updateCount = (shouldMarkDirty = true) => {
        const count = descriptionTextarea.value.length;
        const percentage = (count / maxLength) * 100;

        counter.textContent = `${count}/${maxLength}`;
        counter.className = 'char-counter';

        if (count > dangerThreshold) {
            counter.classList.add('danger');
            if (progressBar) progressBar.style.background = 'var(--danger)';
        } else if (count > warningThreshold) {
            counter.classList.add('warning');
            if (progressBar) progressBar.style.background = 'var(--warning)';
        } else {
            counter.classList.remove('warning', 'danger');
            if (progressBar) progressBar.style.background = 'linear-gradient(90deg, var(--primary), var(--primary-d))';
        }

        if (progressBar) progressBar.style.width = `${Math.min(percentage, 100)}%`;
        if (shouldMarkDirty) markDirty();
    };

    descriptionTextarea.addEventListener('input', () => updateCount(true));
    updateCount(false);
}

// ── Image Uploads ──
function initImageUploads() {
    setupImageUpload('banner');
    setupImageUpload('avatar');

    // Additional handler for secondary banner remove button (in info bar)
    const bannerRemoveSecondary = document.getElementById('banner-remove-secondary');
    if (bannerRemoveSecondary) {
        bannerRemoveSecondary.addEventListener('click', async () => {
            const bannerInput = document.getElementById('banner-input');
            const bannerImg = document.getElementById('banner-img');
            const emptyBanner = document.getElementById('banner-empty');
            const previewDiv = document.getElementById('banner-preview');

            bannerInput.value = '';
            if (bannerImg) bannerImg.src = '';
            if (previewDiv) {
                previewDiv.classList.add('hidden');
                previewDiv.classList.remove('show');
            }
            if (emptyBanner) emptyBanner.classList.remove('hidden');
            // Clear mock banner
            const mockBannerImg = document.getElementById('mock-banner-img');
            const mockBannerEmpty = document.getElementById('mock-banner-empty');
            if (mockBannerImg) {
                mockBannerImg.src = '';
                mockBannerImg.classList.add('hidden');
            }
            if (mockBannerEmpty) mockBannerEmpty.classList.remove('hidden');

            try {
                const res = await updateBrandingOnServer({ storeBanner: null });
                const brandingForm = document.getElementById('store-branding-form');
                if (brandingForm) brandingForm.dataset.initialBanner = '';
                showToast('Banner removed', 'success');
                markDirty();
            } catch (err) {
                showToast('Failed to remove banner: ' + err.message, 'error');
            }
        });
    }
}

function setupImageUpload(type) {
    const input = document.getElementById(`${type}-input`);
    const btn = document.getElementById(`${type}-btn`);
    const secondaryBtn = document.getElementById(`${type}-btn-secondary`);
    const emptyDiv = document.getElementById(`${type}-empty`);
    const previewDiv = document.getElementById(`${type}-preview`);
    const imgPreview = document.getElementById(`${type}-img`);
    const avatarInner = document.getElementById(`${type}-inner`);
    const removeBtn = document.getElementById(`${type}-remove`);
    const reuploadBtn = document.getElementById(`${type}-reupload`);
    const fileInfoRow = document.getElementById(`${type}-file-info`);
    const fileNameEl = document.getElementById(`${type}-file-name`);
    const fileSizeEl = document.getElementById(`${type}-file-size`);

    if (!input || !btn) return;

    const triggerUpload = () => input.click();

    btn.addEventListener('click', triggerUpload);
    if (secondaryBtn) secondaryBtn.addEventListener('click', triggerUpload);

    // Drop zone click - only bind if emptyDiv exists
    if (emptyDiv) {
        const dropZone = emptyDiv.closest('.banner-zone') || emptyDiv;
        dropZone.addEventListener('click', (e) => {
            if (e.target === dropZone ||
                e.target.closest('.banner-drop, .avatar-drop, .banner-zone, .avatar-drop-wrap')) {
                triggerUpload();
            }
        });
    }

    // Keyboard accessibility
    ['banner-zone', 'avatar-drop', 'avatar-empty', 'avatar-drop-wrap'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerUpload();
                }
            });
        }
    });

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const errors = validateImageFile(file, type);
        if (errors.length > 0) {
            Toast.show(errors[0], 'error');
            input.value = '';
            return;
        }

            const reader = new FileReader();
            reader.onload = (event) => {
                if (imgPreview) {
                    imgPreview.src = event.target.result;
                    imgPreview.onload = () => {
                        if (previewDiv) {
                            previewDiv.classList.remove('hidden');
                            previewDiv.classList.add('show');
                        }
                        if (emptyDiv) emptyDiv.classList.add('hidden');
                    };
                }

                if (type === 'banner') {
                    // Update mock banner in live preview
                    const mockBannerImg = document.getElementById('mock-banner-img');
                    const mockBannerEmpty = document.getElementById('mock-banner-empty');
                    if (mockBannerImg) {
                        mockBannerImg.src = event.target.result;
                        mockBannerImg.classList.remove('hidden');
                    }
                    if (mockBannerEmpty) mockBannerEmpty.classList.add('hidden');
                }

                if (type === 'avatar' && avatarInner) {
                    const storeName = document.getElementById('store-name')?.value || 'Your Store';
                    // Defensive: check avatarInner still exists
                    const inner = document.getElementById('avatar-inner');
                    const avatarPreview = document.getElementById('avatar-preview');
                    const avatarEmpty = document.getElementById('avatar-empty');
                    const mockAvatar = document.getElementById('mock-avatar');
                    const mockAvatarInitials = document.getElementById('mock-avatar-initials');
                    if (inner) {
                        inner.textContent = getInitials(storeName);
                        inner.style.background = `url(${event.target.result}) center/cover`;
                        if (avatarPreview) avatarPreview.classList.add('show');
                        if (avatarEmpty) avatarEmpty.classList.add('hidden');
                    }
                    // Update mock avatar in live preview using background-image
                    if (mockAvatar) {
                        mockAvatar.style.backgroundImage = `url(${event.target.result})`;
                        mockAvatar.classList.add('has-image');
                    }
                    if (mockAvatarInitials) mockAvatarInitials.classList.add('hidden');
                }

                // File info only exists for banner, not avatar
                if (fileInfoRow) {
                    fileInfoRow.hidden = false;
                    if (fileNameEl) fileNameEl.textContent = file.name;
                    if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
                }

                markDirty();
                showToast(`${type === 'banner' ? 'Banner' : 'Logo'} uploaded`);
            };
            reader.readAsDataURL(file);
    });

    if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
            input.value = '';
            if (type === 'banner') {
                emptyDiv.classList.remove('hidden');
                previewDiv.classList.add('hidden');
                previewDiv.classList.remove('show');
                // Clear mock banner
                const mockBannerImg = document.getElementById('mock-banner-img');
                const mockBannerEmpty = document.getElementById('mock-banner-empty');
                if (mockBannerImg) {
                    mockBannerImg.src = '';
                    mockBannerImg.classList.add('hidden');
                }
                if (mockBannerEmpty) mockBannerEmpty.classList.remove('hidden');
                // Clear banner on server
                try {
                    await updateBrandingOnServer({ storeBanner: null });
                    showToast('Banner removed', 'success');
                    markDirty();
                } catch (err) {
                    showToast('Failed to remove banner: ' + err.message, 'error');
                }
            } else if (type === 'avatar') {
                const storeName = document.getElementById('store-name')?.value.trim() || 'Your Store';
                avatarInner.textContent = getInitials(storeName);
                avatarInner.style.background = `linear-gradient(135deg, var(--primary-d), var(--primary))`;
                const avatarPreview = document.getElementById('avatar-preview');
                const avatarEmpty = document.getElementById('avatar-empty');
                if (avatarPreview) avatarPreview.classList.remove('show');
                if (avatarEmpty) avatarEmpty.classList.remove('hidden');
                // Reset mock avatar to initials using background-image clear
                const mockAvatar = document.getElementById('mock-avatar');
                const mockAvatarInitials = document.getElementById('mock-avatar-initials');
                if (mockAvatar) {
                    mockAvatar.style.backgroundImage = '';
                    mockAvatar.classList.remove('has-image');
                }
                if (mockAvatarInitials) {
                    mockAvatarInitials.textContent = getInitials(storeName);
                    mockAvatarInitials.classList.remove('hidden');
                }
                // Clear avatar on server
                try {
                    await updateBrandingOnServer({ storeAvatar: null });
                    showToast('Logo removed', 'success');
                    markDirty();
                } catch (err) {
                    showToast('Failed to remove logo: ' + err.message, 'error');
                }
            }
            fileInfoRow.hidden = true;
        });
    }

    if (reuploadBtn) {
        reuploadBtn.addEventListener('click', () => {
            input.value = '';
            input.click();
        });
    }
}

function validateImageFile(file, type) {
    const errors = [];
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
        errors.push('Invalid file type. Use JPEG, PNG, or WebP.');
    }
    if (file.size > maxSize) {
        errors.push('File too large. Maximum size is 2MB.');
    }
    return errors;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'TH';
}

// ── Color Scheme Control ──
function initColorScheme() {
    const colorInput = document.getElementById('custom-color');
    const colorCode = document.querySelector('.color-code');
    const presetsContainer = document.getElementById('color-presets');
    const storeColorInput = document.getElementById('store-color');
    const applyBtn = document.getElementById('apply-custom-color');
    const resetBtn = document.getElementById('colors-reset');
    const randomBtn = document.getElementById('random-color-btn');
    const preview = document.getElementById('color-preview');
    const storeIcon = document.querySelector('.preview-store-icon');
    const contrastIndicator = document.getElementById('contrast-indicator');
    const contrastHint = document.getElementById('contrast-hint');

    currentColor = defaultColor;

    // Generate preset buttons
    colorPresets.forEach((preset, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `color-preset ${index === 0 ? 'active' : ''}`;
        btn.dataset.color = preset.value;
        btn.style.setProperty('--preset-color', preset.value);
        btn.style.background = preset.value;
        btn.title = preset.name;
        btn.setAttribute('aria-label', `Select ${preset.name} color`);
        presetsContainer.appendChild(btn);
    });

    // Preset clicks
    presetsContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('color-preset')) return;
        const preset = e.target;
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        currentColor = preset.dataset.color;
        updateColorUI(currentColor);
        markDirty();
    });

    function darkenColor(hex, percent) {
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max(((num >> 8) & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    function updateColorUI(color) {
        if (colorInput) colorInput.value = color;
        if (colorCode) colorCode.textContent = color;
        if (storeColorInput) storeColorInput.value = color;
        if (preview) {
            preview.style.borderTopColor = color;
            preview.style.setProperty('--primary', color);
            preview.style.setProperty('--primary-d', darkenColor(color, 20));
        }
        if (storeIcon) storeIcon.style.background = color;
        updateContrastCheck(color, contrastIndicator, contrastHint);
        // Update live store preview
        const storePreview = document.getElementById('store-preview');
        if (storePreview) storePreview.style.setProperty('--sp-primary', color);
    }

    function updateContrastCheck(color, indicator, hint) {
        const contrast = getLuminanceContrast(color);
        let className, hintText;

        if (contrast.ratio >= 7) {
            className = 'pass';
            hintText = 'Excellent contrast for all text sizes';
        } else if (contrast.ratio >= 4.5) {
            className = 'pass';
            hintText = 'Meets WCAG AA standard';
        } else if (contrast.ratio >= 3) {
            className = 'warn';
            hintText = 'Meets AA for large text only';
        } else {
            className = 'fail';
            hintText = 'Low contrast - consider a brighter color';
        }

        indicator.className = 'contrast-indicator ' + className;
        if (hint) hint.textContent = hintText;
    }

    function getLuminanceContrast(hex) {
        const rgb = parseInt(hex.slice(1), 16);
        const r = ((rgb >> 16) & 255) / 255;
        const g = ((rgb >> 8) & 255) / 255;
        const b = (rgb & 255) / 255;

        const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722);
        const contrast = (1.05) / (luminance + 0.05);

        return { ratio: Math.round(contrast * 100) / 100 };
    }

    // Custom color input
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            currentColor = e.target.value;
            colorCode.textContent = currentColor;
            updateColorUI(currentColor);
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
            markDirty();
        });
    }

    // Apply custom color
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            storeColorInput.value = currentColor;
            highlightSaveButtons();
            markDirty();
            showToast('Custom color applied');
        });
    }

    // Reset to default
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const firstPreset = document.querySelector('.color-preset');
            if (firstPreset) firstPreset.click();
            storeColorInput.value = defaultColor;
            currentColor = defaultColor;
            updateColorUI(defaultColor);
            markDirty();
            showToast('Colors reset to default');
        });
    }

    // Random color
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
            currentColor = randomColor;
            colorInput.value = randomColor;
            updateColorUI(randomColor);
            markDirty();
            showToast('Random color selected');
        });
    }

    // Initialize contrast
    updateContrastCheck(defaultColor, contrastIndicator, contrastHint);
}

function highlightSaveButtons() {
    const primaryButtons = document.querySelectorAll('button[type="submit"]');
    primaryButtons.forEach(btn => {
        btn.style.transform = 'scale(1.02)';
        setTimeout(() => btn.style.transform = '', 200);
    });
}

// ── Form Handling ──
function initForms() {
    const forms = [
        'store-general-form',
        'store-branding-form',
        'store-colors-form',
        'store-policies-form',
        'store-fulfillment-form'
    ];

    forms.forEach(id => {
        const form = document.getElementById(id);
        if (!form) return;

        captureFormState(form);

        if (id !== 'store-fulfillment-form') form.addEventListener('submit', handleFormSubmit);

        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                clearFieldError(input);
                markDirty();
                updateStoreNamePreview();
            });
        });

        // Per-form reset button
        const resetBtnId = '#' + id.replace('form-', '') + '-reset'; // e.g. store-general-form -> #general-reset
        const resetBtn = document.querySelector(resetBtnId);
        if (resetBtn) {
            resetBtn.addEventListener('click', () => resetForm(id));
        }
    });
}

function captureFormState(form) {
    const formData = new FormData(form);
    const state = {};
    for (const [key, value] of formData.entries()) {
        state[key] = value;
    }
    form.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(cb => {
        state[cb.name] = cb.checked;
    });
    state.original = true;
    state.formId = form.id;
    state.timestamp = Date.now();
    state.current = Object.assign({}, state);

    window.formStates = window.formStates || {};
    window.formStates[form.id] = state;
}

function validateField(input) {
    const field = input.closest('.field');
    const errorEl = field?.querySelector('.field-error');
    const value = input.value.trim();
    let error = '';

    if (input.required && !value) {
        error = 'This field is required';
    } else if (input.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            error = 'Please enter a valid email address';
        }
    } else if (input.type === 'tel' && value) {
        const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/;
        if (!phoneRegex.test(value)) {
            error = 'Please enter a valid phone number';
        }
    } else if (input.maxLength && value.length > input.maxLength) {
        error = `Maximum ${input.maxLength} characters allowed`;
    }

    if (error) {
        input.classList.add('error');
        if (errorEl) errorEl.textContent = error;
        return false;
    } else {
        input.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
        return true;
    }
}

function clearFieldError(input) {
    input.classList.remove('error');
    const field = input.closest('.field');
    const errorEl = field?.querySelector('.field-error');
    if (errorEl) errorEl.textContent = '';
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    const savedState = window.formStates?.[formId];
    if (!form || !savedState) return;

    // Restore values from saved state for text/select/textarea
    Object.keys(savedState).forEach(key => {
        if (['original', 'formId', 'timestamp', 'current', 'originalForms'].includes(key)) return;
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = savedState[key];
            } else {
                input.value = savedState[key];
            }
        }
    });

    // Clear errors
    form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    // Special handling for general form: update description counter and previews
    if (formId === 'store-general-form') {
        updateStoreNamePreview();
        updateStoreLocationPreview();
        const desc = document.getElementById('store-description');
        const counter = document.getElementById('description-count');
        const progress = document.getElementById('description-progress');
        if (desc && counter && progress) {
            const count = desc.value.length;
            counter.textContent = `${count}/1000`;
            counter.className = 'char-counter';
            if (count > 990) {
                counter.classList.add('danger');
                progress.style.background = 'var(--danger)';
            } else if (count > 950) {
                counter.classList.add('warning');
                progress.style.background = 'var(--warning)';
            } else {
                progress.style.background = 'linear-gradient(90deg, var(--primary), var(--primary-d))';
            }
            progress.style.width = `${Math.min((count/1000)*100, 100)}%`;
        }
    }

    // Special handling for branding form: reset file inputs and previews to initial server values
    if (formId === 'store-branding-form') {
        const bannerInput = document.getElementById('banner-input');
        const avatarInput = document.getElementById('avatar-input');
        const emptyBanner = document.getElementById('banner-empty');
        const previewDiv = document.getElementById('banner-preview');
        const bannerImg = document.getElementById('banner-img');
        const avatarInner = document.getElementById('avatar-inner');
        const avatarPreview = document.getElementById('avatar-preview');
        const avatarEmpty = document.getElementById('avatar-empty');

        // Clear file inputs
        if (bannerInput) bannerInput.value = '';
        if (avatarInput) avatarInput.value = '';

        // Reset banner preview
        const initialBanner = form.dataset.initialBanner || '';
        if (initialBanner) {
            if (bannerImg) {
                bannerImg.onload = () => {
                    if (emptyBanner) emptyBanner.classList.add('hidden');
                    if (previewDiv) {
                        previewDiv.classList.remove('hidden');
                        previewDiv.classList.add('show');
                    }
                };
                bannerImg.src = initialBanner;
                // Update mock banner
                const mockBannerImg = document.getElementById('mock-banner-img');
                const mockBannerEmpty = document.getElementById('mock-banner-empty');
                if (mockBannerImg) {
                    mockBannerImg.src = initialBanner;
                    mockBannerImg.classList.remove('hidden');
                }
                if (mockBannerEmpty) mockBannerEmpty.classList.add('hidden');
            }
        } else {
            if (emptyBanner) emptyBanner.classList.remove('hidden');
            if (previewDiv) {
                previewDiv.classList.remove('show');
            }
            // Clear mock banner
            const mockBannerImg = document.getElementById('mock-banner-img');
            const mockBannerEmpty = document.getElementById('mock-banner-empty');
            if (mockBannerImg) {
                mockBannerImg.src = '';
                mockBannerImg.classList.add('hidden');
            }
            if (mockBannerEmpty) mockBannerEmpty.classList.remove('hidden');
        }

        // Reset avatar preview
        const initialAvatar = form.dataset.initialAvatar || '';
        if (initialAvatar) {
            if (avatarPreview) avatarPreview.classList.add('show');
            if (avatarEmpty) avatarEmpty.classList.add('hidden');
            if (avatarInner) {
                avatarInner.innerHTML = `<img src="${initialAvatar}" alt="Store avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover);">`;
            }
            // Update mock avatar using background-image
            const mockAvatar = document.getElementById('mock-avatar');
            const mockAvatarInitials = document.getElementById('mock-avatar-initials');
            if (mockAvatar) {
                mockAvatar.style.backgroundImage = `url(${initialAvatar})`;
                mockAvatar.classList.add('has-image');
            }
            if (mockAvatarInitials) mockAvatarInitials.classList.add('hidden');
        } else {
            if (avatarPreview) avatarPreview.classList.remove('show');
            if (avatarEmpty) avatarEmpty.classList.remove('hidden');
            if (avatarInner) {
                const name = document.getElementById('store-name')?.value.trim() || 'Your Store';
                avatarInner.textContent = getInitials(name);
                avatarInner.style.background = '';
            }
            // Reset mock avatar to initials
            const mockAvatar = document.getElementById('mock-avatar');
            const mockAvatarInitials = document.getElementById('mock-avatar-initials');
            if (mockAvatar) {
                mockAvatar.style.backgroundImage = '';
                mockAvatar.classList.remove('has-image');
            }
            if (mockAvatarInitials) {
                const name = document.getElementById('store-name')?.value.trim() || 'Your Store';
                mockAvatarInitials.textContent = getInitials(name);
                mockAvatarInitials.classList.remove('hidden');
            }
        }
    }

    updateDirtyFlags();
    showToast('Form reset to last saved', 'info');
}

function isAnyFormDirty() {
    const forms = ['store-general-form', 'store-branding-form', 'store-colors-form', 'store-policies-form', 'store-fulfillment-form'];
    for (const formId of forms) {
        const form = document.getElementById(formId);
        const original = window.formStates?.[formId];
        if (!form || !original) continue;

        // Compare text/select/textarea inputs via FormData
        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
            if (original[key] !== value) return true;
        }

        // Compare checkboxes/radios (FormData excludes unchecked boxes)
        const checkboxes = form.querySelectorAll('input[type="checkbox"], input[type="radio"]');
        for (const cb of checkboxes) {
            if (original[cb.name] !== cb.checked) return true;
        }
    }
    return false;
}

function updateDirtyFlags() {
    const banner = document.getElementById('unsaved-banner');
    if (!formBaselineReady) {
        if (banner) banner.classList.add('hidden');
        return;
    }

    // Re-evaluate if any form is dirty and toggle unsaved banner
    if (isAnyFormDirty()) {
        if (banner) banner.classList.remove('hidden');
    } else {
        if (banner) banner.classList.add('hidden');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formId = form.id;

    let isValid = true;
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.required && !validateField(input)) {
            isValid = false;
        }
    });

    if (!isValid) {
        showToast('Please fix the errors before submitting', 'error');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const resetBtn = form.querySelector('button[type="button"]');

    try {
        if (submitBtn) {
            submitBtn.classList.add('saving');
            submitBtn.disabled = true;
        }
        if (resetBtn) resetBtn.disabled = true;

        const token = getAuthToken();
        if (!token) throw new Error('Authentication required');

        let payload = {};

        if (formId === 'store-general-form') {
            payload = {
                storeName: document.getElementById('store-name')?.value.trim(),
                category: document.getElementById('store-category')?.value,
                storeDescription: document.getElementById('store-description')?.value.trim(),
                country: document.getElementById('store-country')?.value.trim(),
                city: document.getElementById('store-city')?.value.trim(),
                storeTagline: document.getElementById('store-tagline')?.value.trim() || null,
                universityAffiliation: document.getElementById('store-university')?.value || null,
                campus: document.getElementById('store-campus')?.value.trim() || null,
                businessHours: document.getElementById('store-hours')?.value || null,
            };
        } else if (formId === 'store-branding-form') {
            // Convert image files to base64
            const bannerInput = document.getElementById('banner-input');
            const avatarInput = document.getElementById('avatar-input');
            const bannerFile = bannerInput?.files?.[0];
            const avatarFile = avatarInput?.files?.[0];

            if (bannerFile) {
                payload.storeBanner = await fileToBase64(bannerFile);
            }
            if (avatarFile) {
                payload.storeAvatar = await fileToBase64(avatarFile);
            }

            // If no files selected, nothing to send
            if (!bannerFile && !avatarFile) {
                showToast('No changes to save', 'info');
                if (submitBtn) {
                    submitBtn.classList.remove('saving');
                    submitBtn.disabled = false;
                }
                if (resetBtn) resetBtn.disabled = false;
                return;
            }
        } else if (formId === 'store-colors-form') {
            payload = {
                storeColor: document.getElementById('custom-color')?.value,
            };
        } else if (formId === 'store-policies-form') {
            payload = {
                processingTime: document.getElementById('processing-time')?.value.trim() || null,
                returnPolicy: document.getElementById('return-policy')?.value.trim() || null,
                shippingPolicy: document.getElementById('shipping-policy')?.value.trim() || null,
                refundPolicy: document.getElementById('refund-policy')?.value.trim() || null,
                exchangePolicy: document.getElementById('exchange-policy')?.value.trim() || null,
                cancellationPolicy: document.getElementById('cancellation-policy')?.value.trim() || null,
            };
        }

        const response = await fetch(`${API_BASE}/api/seller/profile`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('authData');
                window.location.href = '../../../auth/login.html';
            } else {
                throw new Error(json.error || 'Failed to save changes');
            }
            return;
        }

        // Success — update form state from server response
        captureFormState(form);
        clearUnsavedBanner();

        if (formId === 'store-branding-form') {
            // Update preview with saved images from response
            const brandingForm = document.getElementById('store-branding-form');
            if (json.data.storeBanner !== undefined) {
                if (brandingForm) brandingForm.dataset.initialBanner = json.data.storeBanner || '';
                const bannerImg = document.getElementById('banner-img');
                if (bannerImg) {
                    bannerImg.src = json.data.storeBanner || '';
                    if (json.data.storeBanner) {
                        const emptyBanner = document.getElementById('banner-empty');
                        const previewDiv = document.getElementById('banner-preview');
                        if (emptyBanner) emptyBanner.classList.add('hidden');
                        if (previewDiv) {
                            previewDiv.classList.remove('hidden');
                            previewDiv.classList.add('show');
                        }
                        // Update mock banner in live preview
                        const mockBannerImg = document.getElementById('mock-banner-img');
                        const mockBannerEmpty = document.getElementById('mock-banner-empty');
                        if (mockBannerImg) {
                            mockBannerImg.src = json.data.storeBanner;
                            mockBannerImg.classList.remove('hidden');
                        }
                        if (mockBannerEmpty) mockBannerEmpty.classList.add('hidden');
                    }
                }
            }
            if (json.data.storeAvatar !== undefined) {
                if (brandingForm) brandingForm.dataset.initialAvatar = json.data.storeAvatar || '';
                const avatarInner = document.getElementById('avatar-inner');
                const mockAvatar = document.getElementById('mock-avatar');
                const mockAvatarInitials = document.getElementById('mock-avatar-initials');
                if (avatarInner) {
                    if (json.data.storeAvatar) {
                        avatarInner.innerHTML = `<img src="${json.data.storeAvatar}" alt="Store avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                        // Update mock avatar in live preview using background-image
                        if (mockAvatar) {
                            mockAvatar.style.backgroundImage = `url(${json.data.storeAvatar})`;
                            mockAvatar.classList.add('has-image');
                        }
                        if (mockAvatarInitials) mockAvatarInitials.classList.add('hidden');
                    } else {
                        const name = document.getElementById('store-name')?.value.trim() || 'Your Store';
                        avatarInner.textContent = getInitials(name);
                        avatarInner.style.background = '';
                        // Reset mock avatar to initials
                        if (mockAvatar) {
                            mockAvatar.style.backgroundImage = '';
                            mockAvatar.classList.remove('has-image');
                        }
                        if (mockAvatarInitials) {
                            mockAvatarInitials.textContent = getInitials(name);
                            mockAvatarInitials.classList.remove('hidden');
                        }
                    }
                }
            }
            showToast('Branding updated', 'success');
        } else if (formId === 'store-colors-form') {
            showToast('Store color updated', 'success');
        } else {
            showToast('Store info updated', 'success');
        }

    } catch (error) {
        console.error('Error saving changes:', error);
        showToast('Failed to save: ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.classList.remove('saving');
            submitBtn.disabled = false;
        }
        if (resetBtn) resetBtn.disabled = false;
    }
}

// ── Fulfillment Form Submit ──
async function handleFulfillmentSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const token = getAuthToken();
    if (!token) { window.location.href = '../../../auth/login.html'; return; }

    const deliveryFee = document.getElementById('delivery-fee')?.value.trim();
    const pickupAddress = document.getElementById('pickup-address')?.value.trim();

    const payload = {};
    if (deliveryFee !== '') payload.deliveryFee = parseFloat(deliveryFee) || 0;
    if (pickupAddress !== undefined) payload.pickupAddress = pickupAddress;

    const deliveryOptions = Array.from(
        document.querySelectorAll('#store-delivery-options input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    payload.deliveryOptions = JSON.stringify(deliveryOptions);

    try {
        if (submitBtn) { submitBtn.classList.add('saving'); submitBtn.disabled = true; }
        const res = await fetch(`${API_BASE}/api/seller/profile`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save');
        showToast('Delivery settings saved', 'success');
    } catch (err) {
        showToast('Failed to save: ' + err.message, 'error');
    } finally {
        if (submitBtn) { submitBtn.classList.remove('saving'); submitBtn.disabled = false; }
    }
}

// ── File to Base64 Helper ─────────────────────────────────
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ── Update Branding on Server (for remove operations) ─────
async function updateBrandingOnServer(payload) {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');

    const res = await fetch(`${API_BASE}/api/seller/profile`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
        throw new Error(json.error || 'Update failed');
    }

    // Update initial dataset values from server response
    const brandingForm = document.getElementById('store-branding-form');
    if (brandingForm) {
        if (json.data.storeBanner !== undefined) {
            brandingForm.dataset.initialBanner = json.data.storeBanner || '';
        }
        if (json.data.storeAvatar !== undefined) {
            brandingForm.dataset.initialAvatar = json.data.storeAvatar || '';
        }
    }

    // Update local state baseline
    if (brandingForm) {
        captureFormState(brandingForm);
    }
    clearUnsavedBanner();
}

// ── Draft Auto-save ──
function markDirty() {
    if (!formBaselineReady || !window.formStates) return;

    clearTimeout(autoSaveTimer);
    if (!isAnyFormDirty()) {
        updateDirtyFlags();
        return;
    }

    autoSaveTimer = setTimeout(() => {
        saveCurrentDraft();
    }, DEBOUNCE_MS);

    updateDirtyFlags();
}

function saveCurrentDraft() {
    const forms = ['store-general-form', 'store-branding-form', 'store-colors-form', 'store-policies-form', 'store-fulfillment-form'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        const files = {};
        ['banner', 'avatar'].forEach(type => {
            const input = document.getElementById(`${type}-input`);
            if (input?.files?.[0]) {
                files[type] = input.files[0].name;
            }
        });
        if (Object.keys(files).length) data._files = files;

        localStorage.setItem(`draft_${formId}`, JSON.stringify(data));
    });
    console.log('Draft auto-saved');
}

function restoreDraft() {
    const forms = ['store-general-form', 'store-branding-form', 'store-colors-form'];
    forms.forEach(formId => {
        const draft = localStorage.getItem(`draft_${formId}`);
        if (draft) {
            try {
                const data = JSON.parse(draft);
                // Draft available - don't auto-restore to avoid overwriting
            } catch (e) {
                console.error('Failed to restore draft:', e);
            }
        }
    });
}

function clearUnsavedBanner() {
    const banner = document.getElementById('unsaved-banner');
    if (banner) banner.classList.add('hidden');
}

// ── Unsaved Changes Detection ──
function initUnsavedChanges() {
    const discardBtn = document.getElementById('discard-changes');
    const saveNowBtn = document.getElementById('save-now');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const resetModal = document.getElementById('reset-modal');
    const confirmReset = document.getElementById('confirm-reset');
    const cancelReset = document.getElementById('cancel-reset');

    if (discardBtn) {
        discardBtn.addEventListener('click', () => {
            if (confirm('Discard all unsaved changes?')) {
                clearDrafts();
                clearUnsavedBanner();
                location.reload();
            }
        });
    }

    if (saveNowBtn) {
        saveNowBtn.addEventListener('click', () => {
            let activeForm = document.querySelector('.settings-section.active form');
            if (!activeForm) {
                const visibleSection = Array.from(document.querySelectorAll('.settings-section'))
                    .find(sec => window.getComputedStyle(sec).display !== 'none');
                activeForm = visibleSection?.querySelector('form');
            }
            if (activeForm) {
                const submitBtn = activeForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                } else if (typeof activeForm.requestSubmit === 'function') {
                    activeForm.requestSubmit();
                } else {
                    activeForm.submit();
                }
            } else {
                console.warn('Save Now: no active form found to submit');
            }
        });
    }

    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            if (resetModal) resetModal.classList.remove('hidden');
        });
    }

    if (cancelReset) {
        cancelReset.addEventListener('click', () => {
            if (resetModal) resetModal.classList.add('hidden');
        });
    }

    if (confirmReset) {
        confirmReset.addEventListener('click', () => {
            clearDrafts();
            const activeSection = document.querySelector('.settings-section.active');
            const form = activeSection?.querySelector('form');
            if (form) {
                form.reset();
                const firstPreset = document.querySelector('.color-preset');
                if (firstPreset) firstPreset.click();
            }
            if (resetModal) resetModal.classList.add('hidden');
            clearUnsavedBanner();
            showToast('All changes reset', 'info');
        });
    }
}

function clearDrafts() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('draft_'));
    keys.forEach(k => localStorage.removeItem(k));
}

// ── Export/Import Theme ──
function initExportImport() {
    const exportBtn = document.getElementById('export-theme-btn');
    const importBtn = document.getElementById('import-theme-btn');
    const importFile = document.getElementById('import-file');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const theme = collectThemeData();
            const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unimartx-store-theme-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Theme settings exported', 'success');
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => importFile.click());
    }

    if (importFile) {
        importFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const theme = JSON.parse(text);
                applyTheme(theme);
                showToast('Theme settings imported successfully', 'success');
            } catch (err) {
                showToast('Invalid theme file', 'error');
            }
            importFile.value = '';
        });
    }
}

function collectThemeData() {
    const forms = ['store-general-form', 'store-branding-form', 'store-colors-form'];
    const data = {};

    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;
        const formData = new FormData(form);
        data[formId] = Object.fromEntries(formData.entries());
    });

    data.accentColor = document.getElementById('custom-color')?.value || defaultColor;

    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data
    };
}

function applyTheme(theme) {
    if (theme.data) {
        Object.keys(theme.data).forEach(formId => {
            const form = document.getElementById(formId);
            const data = theme.data[formId];
            if (!form || !data) return;

            Object.keys(data).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        input.checked = data[key];
                    } else {
                        input.value = data[key];
                    }
                }
            });
        });

        if (theme.data.accentColor) {
            const color = theme.data.accentColor;
            document.getElementById('custom-color').value = color;
            const matchingPreset = Array.from(document.querySelectorAll('.color-preset'))
                .find(p => p.dataset.color.toLowerCase() === color.toLowerCase());
            if (matchingPreset) matchingPreset.click();
        }

        markDirty();
    }
}

// ── Preview Store Page ──
function initPreviewButton() {
    const previewBtn = document.getElementById('preview-store-btn');
    if (!previewBtn) return;

    previewBtn.addEventListener('click', () => {
        saveCurrentDraft();
        const sellerId = localStorage.getItem('seller_id');
        const storeUrl = sellerId
            ? `../../public/store/store.html?sellerId=${sellerId}`
            : '../../public/store/store.html';
        window.open(storeUrl, '_blank', 'noopener,noreferrer');
    });
}

// ── Modals ──
function initModals() {
    const successModal = document.getElementById('success-modal');
    const closeBtn = document.getElementById('modal-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            successModal.classList.add('hidden');
        });
    }

    if (successModal) {
        successModal.addEventListener('click', (e) => {
            if (e.target === successModal) {
                successModal.classList.add('hidden');
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
}

function showSuccessModal(title, message) {
    const modal = document.getElementById('success-modal');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-msg');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (modal) modal.classList.remove('hidden');

    setTimeout(() => {
        if (modal) modal.classList.add('hidden');
    }, 3000);
}

// ── Toast Helper ──
function showToast(message, type = 'success') {
    if (window.Toast) {
        window.Toast.show(message, type);
    } else {
        console.log(`[Toast ${type}]: ${message}`);
    }
}

// ── Accessibility ──
function initAccessibility() {
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.addEventListener('keydown', (e) => {
            const items = Array.from(document.querySelectorAll('.settings-nav-item'));
            const index = items.indexOf(item);

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                const next = items[index + 1] || items[0];
                next.focus();
                next.click();
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const prev = items[index - 1] || items[items.length - 1];
                prev.focus();
                prev.click();
            }
        });
    });

    // Add aria-labels to icon-only buttons
    document.querySelectorAll('.btn:not(:empty)').forEach(btn => {
        if (!btn.textContent.trim() && !btn.getAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.title || 'Button');
        }
    });
}

// ── Utility: Spin animation ──
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);
