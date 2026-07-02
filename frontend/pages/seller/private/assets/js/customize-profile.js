// SELLER CUSTOMIZE PROFILE — COMPLETE REWORK
// Matches the actual HTML structure with tabs and avatar card

(function () {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── Auth Token Helper ──────────────────────────────────────
function getAuthToken() {
  const raw = localStorage.getItem('authData');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('authData');
      } else {
        const authData = parsed.value ? JSON.parse(parsed.value) : parsed;
        if (authData.token) return authData.token;
      }
    } catch { /* fall through */ }
  }
  return localStorage.getItem('authToken');
}

// ── Toast Notification Helper ─────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  // reuse existing toast pattern if present, else simple alert fallback
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

// ── Update shared navigation UI (topnav + sidebar) ───
function updateSharedUserInfo(data) {
  const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Store Owner';
  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TH';
  const storeName = data.storeName || localStorage.getItem('seller_store') || 'My Store';

  const topnavUsername = document.getElementById('topnav-username');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarStore = document.getElementById('sidebar-store');

  if (topnavUsername) topnavUsername.textContent = fullName;
  if (sidebarName) sidebarName.textContent = fullName;
  if (sidebarStore) sidebarStore.textContent = storeName;

  const setAvatar = (el) => {
    if (!el) return;
    if (data.avatar) {
      el.innerHTML = '';
      const img = document.createElement('img');
      img.src = data.avatar;
      img.alt = 'Avatar';
      img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
      el.appendChild(img);
    } else {
      el.textContent = initials;
    }
  };
  setAvatar(document.getElementById('topnav-avatar'));
  setAvatar(document.getElementById('sidebar-avatar'));

  // Cache user data in localStorage for offline fallback
  localStorage.setItem('seller_fullname', fullName);
  localStorage.setItem('seller_initials', initials);
  localStorage.setItem('seller_store', storeName);
}

// ── Avatar upload to server ───────────────────────────────
async function updateAvatarOnServer(base64) {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');

  const res = await fetch(`${API_BASE}/api/seller/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatar: base64 }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Avatar update failed');
  }

  // Update shared UI immediately
  updateSharedUserInfo(json.data);
}

// ── Load Profile from Backend ───────────────────────────────
async function loadProfile() {
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
        throw new Error(json.error || 'Failed to load profile');
      }
      return;
    }

    const p = json.data;
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();

    // ── General Tab ──
    document.getElementById('profile-name').value = fullName;
    document.getElementById('profile-bio').value = p.bio || '';
    document.getElementById('profile-location').value = p.location || '';

    // ── Contact Tab ──
    document.getElementById('profile-email').value = p.email || '';
    document.getElementById('profile-phone').value = p.phone || '';
    document.getElementById('profile-whatsapp').value = p.whatsapp || '';
    document.getElementById('profile-address').value = p.pickupAddress || '';

    // ── Social Tab ──
    document.getElementById('social-instagram').value = p.instagram || '';
    document.getElementById('social-twitter').value = p.twitter || '';
    document.getElementById('social-tiktok').value = p.tiktok || '';
    document.getElementById('social-website').value = p.website || '';

    // ── Avatar display ──
    const avatarImg = document.getElementById('avatar-img');
    const avatarInitials = document.getElementById('avatar-initials');
    if (avatarImg && avatarInitials) {
      if (p.avatar) {
        avatarImg.src = p.avatar;
        avatarImg.classList.remove('hidden');
        avatarImg.classList.add('show');
        avatarInitials.style.display = 'none';
      } else {
        avatarImg.classList.remove('show');
        avatarImg.classList.add('hidden');
        avatarInitials.style.display = 'flex';
        avatarInitials.textContent = getInitials(fullName);
      }
    }

    // Update shared navigation UI (topnav + sidebar)
    updateSharedUserInfo(p);

    // Update "View Public Profile" link with real sellerId
    if (p.sellerId) {
        localStorage.setItem('seller_id', p.sellerId);
        const profileLink = document.getElementById('view-public-profile-btn');
        if (profileLink) {
            profileLink.href = `../../public/profile/profile.html?sellerId=${p.sellerId}`;
        }
    }

    // Capture clean state baseline for all forms
    FORM_IDS.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) captureFormState(form);
    });

    // Reset dirty flags
    if (window.formStates) {
        Object.values(window.formStates).forEach((state) => {
            if (state && state.original !== undefined) state.original = true;
        });
    }

    updateAvatarInitials();
    updateBioPreview();
    updateCompleteness();

  } catch (err) {
    console.error('Profile load error:', err);
    showToast('Failed to load profile: ' + err.message, 'error');
    throw err;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadProfile();
    } catch (err) {
        console.error('Initial profile load failed:', err);
    }

    initTabs();
    initBioCounter();
    initAvatarUpload();
    initForms();
    initModals();
    initUnsavedChanges();
    initExportImport();
    initProfileCompleteness();
    initAccessibility();

    // Real-time preview updates
    const nameInput = document.getElementById('profile-name');
    if (nameInput) {
        nameInput.addEventListener('input', updateAvatarInitials);
        updateAvatarInitials(); // initial
    }

    // Restore draft if exists
    restoreDraft();
});

// ── State Management ──
let autoSaveTimer = null;
let completenessTimer = null;
const DEBOUNCE_MS = 1000;
const COMPLETENESS_DEBOUNCE_MS = 300; // faster debounce for completeness
const FORM_IDS = ['form-general', 'form-contact', 'form-social'];

// ── Tab Navigation ──
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab; // "general", "contact", "social"
            const targetId = `tab-${targetTab}`; // construct full panel ID

            // Update buttons
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            // Update panels
            tabPanels.forEach(panel => {
                const isActive = panel.id === targetId;
                panel.classList.remove('active');
                panel.setAttribute('hidden', !isActive);
            });

            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                targetPanel.removeAttribute('hidden');
            }

            // Focus first input for accessibility
            const firstInput = targetPanel?.querySelector('input, textarea, select, button');
            if (firstInput) firstInput.focus();
        });
    });
}

// ── Bio Character Counter ──
function initBioCounter() {
    const bioTextarea = document.getElementById('profile-bio');
    const counter = document.getElementById('bio-count');
    const progressBar = document.getElementById('bio-progress');
    if (!bioTextarea || !counter) return;

    const maxLength = 300;
    const warningThreshold = 280;
    const dangerThreshold = 295;

    const updateCount = () => {
        const count = bioTextarea.value.length;
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
        markDirty();
    };

    bioTextarea.addEventListener('input', updateCount);
    updateCount();
}

// ── Avatar Upload ──
function initAvatarUpload() {
    const avatarWrap = document.getElementById('avatar-wrap');
    const avatarDisplay = document.getElementById('avatar-display');
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarImg = document.getElementById('avatar-img');
    const avatarEditBtn = document.getElementById('avatar-edit-btn');
    const avatarUploadBtn = document.getElementById('avatar-upload-btn');
    const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
    const avatarInput = document.getElementById('avatar-input');
    const avatarNamePreview = document.getElementById('avatar-name-preview');

    if (!avatarWrap || !avatarInput) return;

    const triggerUpload = () => avatarInput.click();

    avatarEditBtn?.addEventListener('click', triggerUpload);
    avatarUploadBtn?.addEventListener('click', triggerUpload);

    // Click anywhere on avatar display to upload
    avatarDisplay?.addEventListener('click', (e) => {
        if (e.target === avatarDisplay || e.target === avatarInitials) {
            triggerUpload();
        }
    });

    // Keyboard accessibility
    avatarWrap.setAttribute('tabindex', '0');
    avatarWrap.setAttribute('role', 'button');
    avatarWrap.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerUpload();
        }
    });

    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const errors = validateImageFile(file);
        if (errors.length > 0) {
            showToast(errors[0], 'error');
            avatarInput.value = '';
            return;
        }

         const reader = new FileReader();
         reader.onload = async (event) => {
             const base64 = event.target.result;
             avatarImg.src = base64;
            avatarImg.onload = () => {
                avatarImg.classList.remove('hidden');
                avatarImg.classList.add('show');
                avatarInitials.style.display = 'none';
            };
            // Show remove button
            if (avatarRemoveBtn) avatarRemoveBtn.style.display = 'inline-flex';

            // Upload to server immediately
            try {
                await updateAvatarOnServer(base64);
                showToast('Profile photo updated', 'success');
            } catch (err) {
                console.error('Avatar upload failed:', err);
                showToast('Avatar upload failed: ' + err.message, 'error');
                // revert preview changes?
                avatarInput.value = '';
                avatarImg.classList.remove('show');
                avatarImg.classList.add('hidden');
                avatarInitials.style.display = 'flex';
                if (avatarRemoveBtn) avatarRemoveBtn.style.display = 'none';
                return;
            }

            markDirty();
            updateCompleteness();
        };
        reader.readAsDataURL(file);
    });

    avatarRemoveBtn?.addEventListener('click', async () => {
        avatarInput.value = '';
        avatarImg.classList.remove('show');
        avatarImg.classList.add('hidden');
        avatarInitials.style.display = 'flex';
        avatarRemoveBtn.style.display = 'none';

        // Clear avatar on server
        try {
            await updateAvatarOnServer(null);
        } catch (err) {
            console.error('Avatar removal failed:', err);
            showToast('Failed to remove avatar: ' + err.message, 'error');
            return;
        }

        markDirty();
        showToast('Profile photo removed', 'info');
        updateCompleteness();
    });
}

function validateImageFile(file) {
    const errors = [];
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
        errors.push('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
    }
    if (file.size > maxSize) {
        errors.push('File too large. Maximum size is 2MB.');
    }
    return errors;
}

// ── Form Handling ──
function initForms() {
    FORM_IDS.forEach(id => {
        const form = document.getElementById(id);
        if (!form) return;

        captureFormState(form);

        form.addEventListener('submit', handleFormSubmit);

        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                clearFieldError(input);
                markDirty();
                // Debounce completeness updates
                clearTimeout(completenessTimer);
                completenessTimer = setTimeout(updateCompleteness, COMPLETENESS_DEBOUNCE_MS);
            });
        });

        // Per-form reset button
        const resetBtnId = '#' + id.replace('form-', '') + '-reset'; // e.g. form-general -> #general-reset
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
    if (!window.formStates) window.formStates = {};
    window.formStates[form.id] = Object.assign({}, state);
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
    } else if (input.type === 'url' && value) {
        try {
            new URL(value);
        } catch {
            error = 'Please enter a valid URL';
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

    // Restore values from saved state
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

    // Special: if resetting general form, update avatar initials preview and bio counter
    if (formId === 'form-general') {
        updateAvatarInitials();
        // Update bio counter UI
        const bio = document.getElementById('profile-bio');
        const counter = document.getElementById('bio-count');
        const progress = document.getElementById('bio-progress');
        if (bio && counter && progress) {
            const count = bio.value.length;
            counter.textContent = `${count}/300`;
            counter.className = 'char-counter';
            if (count > 295) {
                counter.classList.add('danger');
                progress.style.background = 'var(--danger)';
            } else if (count > 280) {
                counter.classList.add('warning');
                progress.style.background = 'var(--warning)';
            } else {
                progress.style.background = 'linear-gradient(90deg, var(--primary), var(--primary-d))';
            }
            progress.style.width = `${Math.min((count/300)*100, 100)}%`;
        }
    }

    updateCompleteness();

    // Hide unsaved banner only if all forms are clean
    if (!isAnyFormDirty()) {
        clearUnsavedBanner();
    }

    showToast('Form reset to last saved', 'info');
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

        // Build payload from form fields
        const payload = buildPayloadFromForm(form);
        const token = getAuthToken();

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

        // Success — update local UI from response
        const data = json.data;
        updateSharedUserInfo(data);
        updateAvatarInitials();
        updateBioPreview();
        updateCompleteness();

        // Update original form state baseline
        captureFormState(form);

        clearUnsavedBanner();
        showSuccessModal('Saved!', 'Your profile has been updated.');
        showToast('Changes saved successfully', 'success');

        // Re-enable buttons
        if (submitBtn) {
            submitBtn.classList.remove('saving');
            submitBtn.disabled = false;
        }
        if (resetBtn) resetBtn.disabled = false;

    } catch (error) {
        console.error('Error saving changes:', error);
        showToast('Failed to save. Please try again.', 'error');
        if (submitBtn) {
            submitBtn.classList.remove('saving');
            submitBtn.disabled = false;
        }
        if (resetBtn) resetBtn.disabled = false;
    }
}

// ── Payload Builder ─────────────────────────────────────────
function buildPayloadFromForm(form) {
    const formId = form.id;
    const data = {};

    if (formId === 'form-general') {
        const fullName = (document.getElementById('profile-name')?.value || '').trim();
        const nameParts = fullName.split(/\s+/);
        data.firstName = nameParts[0] || '';
        data.lastName = nameParts.slice(1).join(' ') || '';
        data.bio = (document.getElementById('profile-bio')?.value || '').trim() || null;
        data.location = (document.getElementById('profile-location')?.value || '').trim() || null;
    } else if (formId === 'form-contact') {
        data.phone = (document.getElementById('profile-phone')?.value || '').trim() || null;
        data.whatsapp = (document.getElementById('profile-whatsapp')?.value || '').trim() || null;
        data.pickupAddress = (document.getElementById('profile-address')?.value || '').trim() || null;
        // email is readonly — not included
    } else if (formId === 'form-social') {
        data.instagram = (document.getElementById('social-instagram')?.value || '').trim() || null;
        data.twitter = (document.getElementById('social-twitter')?.value || '').trim() || null;
        data.tiktok = (document.getElementById('social-tiktok')?.value || '').trim() || null;
        data.website = (document.getElementById('social-website')?.value || '').trim() || null;
    }

    return data;
}

// ── Draft Auto-save ──
function markDirty() {
    const banner = document.getElementById('unsaved-banner');
    if (banner && !banner.classList.contains('hidden')) return;

    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveCurrentDraft();
    }, DEBOUNCE_MS);

    if (banner) banner.classList.remove('hidden');
}

function saveCurrentDraft() {
    FORM_IDS.forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        const files = {};
        ['avatar'].forEach(type => {
            const input = document.getElementById(`${type}-input`);
            if (input?.files?.[0]) {
                files[type] = input.files[0].name;
            }
        });
        if (Object.keys(files).length) data._files = files;

        localStorage.setItem(`draft_${formId}`, JSON.stringify(data));
    });
    console.log('Profile draft auto-saved');
}

function restoreDraft() {
    FORM_IDS.forEach(formId => {
        const draft = localStorage.getItem(`draft_${formId}`);
        if (draft) {
            try {
                const data = JSON.parse(draft);
                // Could auto-restore here if desired
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
    const discardModal = document.getElementById('discard-modal');
    const discardConfirm = document.getElementById('discard-confirm');
    const discardCancel = document.getElementById('discard-cancel');

    if (discardBtn) {
        discardBtn.addEventListener('click', () => {
            if (discardModal) discardModal.classList.remove('hidden');
        });
    }

    if (discardCancel) {
        discardCancel.addEventListener('click', () => {
            if (discardModal) discardModal.classList.add('hidden');
        });
    }

    if (discardConfirm) {
        discardConfirm.addEventListener('click', () => {
            clearDrafts();
            // Reset all forms to original state
            FORM_IDS.forEach(formId => {
                const form = document.getElementById(formId);
                if (form) form.reset();
            });
            // Reset avatar to initials
            const avatarImg = document.getElementById('avatar-img');
            const avatarInitials = document.getElementById('avatar-initials');
            const avatarInput = document.getElementById('avatar-input');
            if (avatarImg) avatarImg.classList.remove('show');
            if (avatarInitials) {
                const name = document.getElementById('profile-name')?.value.trim() || 'Your Name';
                avatarInitials.textContent = getInitials(name);
                avatarInitials.style.display = 'flex';
            }
            if (avatarInput) avatarInput.value = '';

            if (discardModal) discardModal.classList.add('hidden');
            clearUnsavedBanner();
            updateCompleteness();
            showToast('All changes discarded', 'info');
        });
    }

    if (saveNowBtn) {
        saveNowBtn.addEventListener('click', () => {
            const activeForm = document.querySelector('.tab-panel.active form');
            if (activeForm) {
                const submitBtn = activeForm.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.click();
            }
        });
    }
}

function clearDrafts() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('draft_'));
    keys.forEach(k => localStorage.removeItem(k));
}

// Check if any form has unsaved changes compared to its saved state
function isAnyFormDirty() {
    for (const formId of FORM_IDS) {
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

// ── Export/Import Profile ──
function initExportImport() {
    const exportBtn = document.getElementById('export-profile-btn');
    const importBtn = document.getElementById('import-profile-btn');
    const importFile = document.getElementById('import-file');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const profileData = collectProfileData();
            const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unimartx-profile-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Profile settings exported', 'success');
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
                const profileData = JSON.parse(text);
                applyProfileData(profileData);
                showToast('Profile settings imported successfully', 'success');
            } catch (err) {
                showToast('Invalid profile file', 'error');
            }
            importFile.value = '';
        });
    }
}

function collectProfileData() {
    const data = {};
    FORM_IDS.forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;
        const formData = new FormData(form);
        data[formId] = Object.fromEntries(formData.entries());
    });

    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data
    };
}

function applyProfileData(profileData) {
    if (profileData.data) {
        Object.keys(profileData.data).forEach(formId => {
            const form = document.getElementById(formId);
            const data = profileData.data[formId];
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

        markDirty();
        updateAllPreviews();
        updateCompleteness();
    }
}

// ── Real-time Preview Updates ──
function updateAvatarInitials() {
    const nameInput = document.getElementById('profile-name');
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarNamePreview = document.getElementById('avatar-name-preview');
    const avatarImg = document.getElementById('avatar-img');
    const avatarInput = document.getElementById('avatar-input');

    if (nameInput) {
        const name = nameInput.value.trim() || 'Your Name';
        const initials = getInitials(name);

        if (avatarInitials && !avatarImg.classList.contains('show') && !avatarInput?.files?.[0]) {
            avatarInitials.textContent = initials;
        }
        if (avatarNamePreview) {
            avatarNamePreview.textContent = name;
        }
    }
}

function updateBioPreview() {
    const bioInput = document.getElementById('profile-bio');
    const counter = document.getElementById('bio-count');
    if (bioInput && counter) {
        const count = bioInput.value.length;
        counter.textContent = `${count}/300`;
    }
}

function updateAllPreviews() {
    updateAvatarInitials();
    updateBioPreview();
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'TH';
}

// ── Profile Completeness Tracker ──
let lastCompletenessState = null; // Cache to prevent unnecessary re-renders

function initProfileCompleteness() {
    // Initial update
    updateCompleteness();

    // Listen for avatar uploads separately (not covered by input event)
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', () => {
            clearTimeout(completenessTimer);
            completenessTimer = setTimeout(updateCompleteness, COMPLETENESS_DEBOUNCE_MS);
        });
    }
}

function updateCompleteness() {
    const fields = [
        { selector: '#profile-name', weight: 20 },
        { selector: '#profile-bio', weight: 20 },
        { selector: '#profile-location', weight: 15 },
        { selector: '#profile-email', weight: 20 },
        { selector: '#profile-phone', weight: 10 },
        { selector: '#avatar-input', weight: 15, checkFile: true }
    ];

    let totalWeight = 0;
    let earnedWeight = 0;
    const currentStates = [];

    fields.forEach(field => {
        const el = document.querySelector(field.selector);
        if (!el) return;

        totalWeight += field.weight;

        let done = false;
        if (field.checkFile) {
            done = !!el.files?.[0];
        } else {
            const val = el.value.trim();
            done = val && (!el.maxLength || val.length <= el.maxLength);
        }
        currentStates.push(done);

        if (done) earnedWeight += field.weight;
    });

    const pct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    // Skip if nothing changed
    if (lastCompletenessState && lastCompletenessState.pct === pct) {
        const same = lastCompletenessState.states.every((s, i) => s === currentStates[i]);
        if (same) return;
    }

    lastCompletenessState = { pct, states: currentStates };

    const pctEl = document.getElementById('completeness-pct');
    const fillEl = document.getElementById('completeness-fill');
    const listEl = document.getElementById('completeness-list');

    if (pctEl) pctEl.textContent = `${pct}%`;
    if (fillEl) fillEl.style.width = `${pct}%`;

    // Build checklist
    if (listEl) {
        const labels = [
            'Display name',
            'Bio description',
            'Location',
            'Email address',
            'Phone number (optional)',
            'Profile photo'
        ];

        listEl.innerHTML = currentStates.map((done, idx) => `
            <li class="${done ? 'completed' : ''}">
                <i data-lucide="check" class="icon"></i>
                ${labels[idx]}
            </li>
        `).join('');

        // Only re-init icons on first render or when list actually changes
        if (window.lucide) window.lucide.createIcons();
    }
}

// ── Preview Store/Profile Page ──
function initPreviewButton() {
    const previewBtn = document.getElementById('preview-profile-btn');
    if (!previewBtn) return;

    previewBtn.addEventListener('click', () => {
        saveCurrentDraft();
        const profileUrl = '../../public/seller/profile.html';
        window.open(profileUrl, '_blank', 'noopener,noreferrer');
    });
}

// Initialize preview button if present
document.addEventListener('DOMContentLoaded', initPreviewButton);

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

// ── Accessibility ──
function initAccessibility() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('keydown', (e) => {
            const items = Array.from(document.querySelectorAll('.tab-btn'));
            const index = items.indexOf(btn);

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const next = items[index + 1] || items[0];
                next.focus();
                next.click();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
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
})();
