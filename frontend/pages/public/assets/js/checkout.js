lucide.createIcons();

// (API_BASE, apiFetch, getToken, fetchCartCount
//  are all provided by ../../shared/js/cart.js — loaded before this script)

// ── State ─────────────────────────────────────
let cartItems   = [];
let sellerGroups = {};
let userProfile = null;

// ── Helpers ───────────────────────────────────
function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmt(n) {
    return `GH₵ ${Number(n || 0).toFixed(2)}`;
}

function sellerInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Detect logged-in user ──────────────────────
async function loadUserProfile() {
    const token = typeof getToken === 'function' ? getToken() : null;
    if (!token) return null;

    try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) return null;
        const json = await res.json();
        return json.success ? json.data : null;
    } catch {
        return null;
    }
}

function populateAddressFields(user) {
    const addr = user?.addresses?.[0] || {};
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('full-name', fullName);
    setVal('phone', user?.phone || '');
    setVal('address', addr.street || '');
    setVal('city', addr.city || '');
    setVal('region', addr.state || '');
    setVal('notes', addr.notes || '');

    // Hide login nudge if user is present
    const nudge = document.getElementById('login-nudge');
    if (nudge) nudge.style.display = 'none';
}

// ── Fetch cart from backend ─────────────────────
async function loadCart() {
    try {
        const res = await apiFetch('/api/cart');
        const json = await res.json();
        if (json.success && json.data?.items?.length) {
            cartItems = json.data.items
                .filter(i => i.product)
                .map(i => ({
                    id: i.product.id,
                    name: i.product.name,
                    price: Number(i.product.price),
                    qty: i.quantity,
                    image: i.product.image || '',
                    variant: '',
                    product: i.product,
                }));
            groupBySeller();
            return;
        }
    } catch (err) {
        console.error('[checkout] Load failed:', err);
    }
    const main = document.getElementById('checkout-main');
    if (main) {
        main.innerHTML = `
            <div class="empty-cart" style="text-align:center;padding:4rem 1rem;">
                <h2>Your cart is empty</h2>
                <p>Add some products before checking out.</p>
                <a href="../shop/shop.html" class="btn btn-primary" style="margin-top:1rem;">Continue Shopping</a>
            </div>`;
    }
}

function groupBySeller() {
    sellerGroups = {};
    cartItems.forEach(item => {
        const sellerId = item.product.seller?.id || 'unknown';
        const sellerName = item.product.seller?.storeName || 'Store';
        if (!sellerGroups[sellerId]) {
            sellerGroups[sellerId] = {
                sellerName,
                items: [],
                canPickup: false,
                canDeliver: false,
                deliveryFee: 0,
            };
        }
        sellerGroups[sellerId].items.push(item);

        const f = item.product.details?._fulfillment || item.product.fulfillment;
        if (f === 'pickup' || f === 'both') sellerGroups[sellerId].canPickup = true;
        if (f === 'delivery' || f === 'both') sellerGroups[sellerId].canDeliver = true;

        const fee = parseFloat(item.product.seller?.deliveryFee);
        if (!isNaN(fee) && fee > sellerGroups[sellerId].deliveryFee) {
            sellerGroups[sellerId].deliveryFee = fee;
        }
    });
}

// ── Render seller groups (Step 1) ─────────────
function renderSellerGroups() {
    const container = document.getElementById('seller-groups');
    if (!container) return;

    const ids = Object.keys(sellerGroups);
    if (!ids.length) {
        container.innerHTML = '<p style="color:var(--text-3);font-size:0.88rem;">No items in cart.</p>';
        return;
    }

    let html = '';
    ids.forEach(sellerId => {
        const group = sellerGroups[sellerId];
        const initials = sellerInitials(group.sellerName);
        const fulfillmentBadge = group.canDeliver && group.canPickup
            ? '<span class="seller-badge">Delivery & Pickup</span>'
            : group.canDeliver
                ? '<span class="seller-badge seller-badge--delivery">Delivery</span>'
                : '<span class="seller-badge seller-badge--pickup">Pickup Only</span>';

        html += `
        <div class="seller-group" data-seller-id="${esc(sellerId)}">
            <div class="seller-group-header">
                <div class="seller-avatar">${initials}</div>
                <div class="seller-info">
                    <h4>${esc(group.sellerName)}</h4>
                    <p>${group.items.length} item${group.items.length !== 1 ? 's' : ''} · ${fulfillmentBadge}</p>
                </div>
                <div class="seller-delivery-fee">
                    ${group.canDeliver ? `<span>Delivery: ${fmt(group.deliveryFee)}</span>` : '<span>No delivery fee</span>'}
                </div>
            </div>
            <div class="seller-items">
                ${group.items.map(item => `
                    <div class="seller-item">
                        <div class="seller-item-img">
                            ${item.image && !item.image.startsWith('data:')
                                ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy">`
                                : `<div class="seller-item-img-placeholder"><i data-lucide="package"></i></div>`}
                        </div>
                        <div class="seller-item-details">
                            <p class="seller-item-name">${esc(item.name)}</p>
                            <p class="seller-item-meta">Qty: ${item.qty}</p>
                        </div>
                        <div class="seller-item-price">${fmt(item.price * item.qty)}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });

    container.innerHTML = html;
    lucide.createIcons();

    // Always show the delivery step — user may need to enter address
    // even when all sellers are pickup-only (for contact/recipient info)
    const deliveryCard = document.getElementById('step-delivery');
    if (deliveryCard) {
        deliveryCard.style.display = '';
    }
}

// ── Render order summary (right panel) ────────
function renderSummary() {
    const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totalDelivery = Object.values(sellerGroups).reduce((sum, g) => sum + g.deliveryFee, 0);
    const total = subtotal + totalDelivery;

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText('summary-subtotal', fmt(subtotal));
    setText('summary-delivery', fmt(totalDelivery));
    setText('summary-total', fmt(total));

    // Update cart badge
    const count = cartItems.reduce((sum, i) => sum + i.qty, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// ── Submit order ───────────────────────────────
document.getElementById('place-order-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('place-order-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cod';

        const res = await apiFetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
                items: cartItems.flatMap(item => ({
                    productId: item.id,
                    quantity: item.qty,
                })),
                sellerFulfillments: Object.fromEntries(
                    Object.entries(sellerGroups).map(([sid, g]) => [
                        sid,
                        { fulfillment: g.canDeliver ? 'delivery' : 'pickup', deliveryFee: g.deliveryFee || 0 },
                    ])
                ),
                address: {
                    fullName: document.getElementById('full-name')?.value || '',
                    street: document.getElementById('address')?.value || '',
                    city: document.getElementById('city')?.value || '',
                    state: document.getElementById('region')?.value || '',
                    notes: document.getElementById('notes')?.value || '',
                    country: 'Ghana',
                },
                payment: paymentMethod === 'momo'
                    ? {
                        method: 'momo',
                        momoNetwork: document.getElementById('momo-network')?.value || '',
                        momoNumber: document.getElementById('momo-number')?.value || '',
                    }
                    : { method: 'cod' },
            }),
        });
        const json = await res.json();
        if (json.success) {
            const orderId = json.data?.orderId || '';
            const orderIds = json.data?.orderIds || (orderId ? [orderId] : []);
            localStorage.setItem('lastOrderDbIds', JSON.stringify(orderIds));
            window.location.href = `../shop/order-confirmation.html`;
        } else {
            throw new Error(json.error || 'Failed to place order');
        }
    } catch (err) {
        console.error('[checkout] Order failed:', err);
        alert('Failed to place order: ' + err.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});

// ── Payment method toggle ──────────────────────
document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.querySelectorAll('.payment-card').forEach(card => card.classList.remove('active'));
        radio.closest('.payment-card')?.classList.add('active');

        const fieldsMomo = document.getElementById('fields-momo');
        const fieldsCod = document.getElementById('fields-cod');
        if (radio.value === 'momo') {
            fieldsMomo?.classList.remove('hidden');
            fieldsCod?.classList.add('hidden');
        } else {
            fieldsMomo?.classList.add('hidden');
            fieldsCod?.classList.remove('hidden');
        }
    });
});

// ── Init ───────────────────────────────────────
(async function init() {
    // Load user profile first, then cart
    userProfile = await loadUserProfile();
    if (userProfile) {
        populateAddressFields(userProfile);
    }

    await loadCart();

    if (cartItems.length === 0) return;

    // Re-render after profile + cart are both ready
    renderSellerGroups();
    renderSummary();
})();
