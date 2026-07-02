lucide.createIcons();

// (API_BASE, apiFetch, fetchCartCount, getAuthToken, authHeaders
//  are all provided by ../../shared/js/cart.js — loaded before this script)

// ── Cart state ─────────────────────────────────
let deliveryFee = 0;
let promoApplied = false;
let promoDiscount = 0;
let cartItems = [];

// ── Scroll reveal ──────────────────────────────
(function initReveal() {
    const hero = document.querySelector('.navbar, .page-header, .cart-layout');
    hero?.classList.add('reveal');
    requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add('in-view')));

    const onEnter = (entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            }
        });
    };
    const io = new IntersectionObserver(onEnter, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.order-summary, .empty-cart, .footer').forEach(el => io.observe(el));
})();

// ── Skeleton loading ───────────────────────────
function renderSkeletons() {
    const grid = document.getElementById('cart-items');
    if (!grid) return;
    const skeletons = Array(3).fill(`
        <div class="cart-skeleton">
            <div class="skel-circle"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:10px;justify-content:center">
                <div class="skel-bar w-60"></div>
                <div class="skel-bar w-40"></div>
                <div class="skel-bar w-80"></div>
            </div>
        </div>`).join('');
    grid.querySelector('.cart-items-header')?.insertAdjacentHTML('afterend', skeletons);
}

function clearSkeletons() {
    document.querySelectorAll('.cart-skeleton').forEach(el => el.remove());
}

// ── Cart state ─────────────────────────────────
function getCartItems() {
    return cartItems.map(item => ({
        el: document.querySelector(`.cart-item[data-id="${item.id}"]`),
        price: parseFloat(item.price),
        qty: item.qty
    })).filter(i => i.el);
}

function updateTotals() {
    const items = getCartItems();
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const total = subtotal + deliveryFee - promoDiscount;
    const count = items.reduce((sum, i) => sum + i.qty, 0);

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('summary-subtotal', `GH₵ ${subtotal.toFixed(2)}`);
    setText('summary-total', `GH₵ ${Math.max(0, total).toFixed(2)}`);
    setText('summary-count', `(${count} item${count !== 1 ? 's' : ''})`);
    setText('cart-item-count', `(${count} item${count !== 1 ? 's' : ''})`);
    setText('cart-count', String(count));

    checkEmpty(items.length);
}

function checkEmpty(count) {
    const layout = document.getElementById('cart-layout');
    const empty  = document.getElementById('empty-cart');
    if (count === 0) {
        layout.style.display = 'none';
        empty.classList.remove('hidden');
        const msg = document.getElementById('empty-cart-msg');
        if (msg) msg.textContent = 'Your cart is empty.';
    } else {
        layout.style.display = '';
        empty.classList.add('hidden');
    }
}

// ── Render cart item from data ──────────────────
function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function buildCartItemHTML(item) {
    const price = Number(item.price);
    const safePrice = isNaN(price) ? '—' : price.toFixed(2);
    const total = (Number(item.price) * Number(item.qty)).toFixed(2);
    return `
    <div class="cart-item" data-id="${esc(item.id)}" data-price="${esc(item.price)}">
        <div class="cart-item-product">
            <div class="cart-item-img">
                ${item.image && !item.image.startsWith('data:')
                    ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy">`
                    : `<div class="cart-item-img-placeholder"></div>`}
            </div>
            <div class="cart-item-details">
                <p class="cart-item-store">${esc(item.storeName || 'Store')}</p>
                <h3 class="cart-item-name">${esc(item.name)}</h3>
                <p class="cart-item-meta">${esc(item.variant || '')}</p>
                <span class="cart-item-price-mobile">GH₵ ${safePrice}</span>
                <button class="cart-item-remove" aria-label="Remove item">
                    <i data-lucide="trash-2"></i> Remove
                </button>
            </div>
        </div>
        <div class="cart-item-price">GH₵ ${safePrice}</div>
        <div class="cart-item-bottom">
            <div class="cart-item-qty">
                <button class="qty-btn" aria-label="Decrease quantity"><i data-lucide="minus"></i></button>
                <span class="qty-value">${esc(item.qty)}</span>
                <button class="qty-btn" aria-label="Increase quantity"><i data-lucide="plus"></i></button>
            </div>
            <div class="cart-item-total">GH₵ ${total}</div>
        </div>
    </div>`;
}

function renderCartItems(items) {
    const section = document.getElementById('cart-items');
    if (!section) return;
    section.querySelectorAll('.cart-item, .cart-skeleton').forEach(el => el.remove());
    if (!items.length) {
        checkEmpty(0);
        return;
    }
    items.forEach(item => {
        const html = buildCartItemHTML(item);
        if (section.querySelector('.cart-continue')) {
            section.querySelector('.cart-continue').insertAdjacentHTML('beforebegin', html);
        } else {
            section.insertAdjacentHTML('beforeend', html);
        }
    });
    lucide.createIcons();
    bindItemEvents();
    requestAnimationFrame(() => {
        const rendered = section.querySelectorAll('.cart-item').length;
        const expected = items.length;
        if (rendered !== expected) {
            console.error(`[cart] DOM mismatch: expected ${expected} items, found ${rendered}`);
            const banner = document.getElementById('cart-error-banner');
            if (banner) {
                banner.textContent = `Cart error: expected ${expected} items, found ${rendered}. Check console.`;
                banner.style.display = 'block';
            }
        }
        section.querySelectorAll('.cart-item').forEach((el, i) => {
            el.style.transitionDelay = (i * 70) + 'ms';
            el.classList.add('in-view');
        });
        updateTotals();
    });
}

// ── Quantity & remove bindings ─────────────────
function bindItemEvents() {
    document.querySelectorAll('.cart-item').forEach(itemEl => {
        const id = itemEl.dataset.id;
        const price = parseFloat(itemEl.dataset.price);
        const minusBtn = itemEl.querySelectorAll('.qty-btn')[0];
        const plusBtn  = itemEl.querySelectorAll('.qty-btn')[1];
        const qtyEl    = itemEl.querySelector('.qty-value');

        minusBtn?.addEventListener('click', async () => {
            const item = cartItems.find(i => i.id == id);
            if (!item || item.qty <= 1) return;
            item.qty--;
            updateLocalItem(itemEl, item);
            updateTotals();
            persistItemQty(item.cartItemId, item.qty);
        });

        plusBtn?.addEventListener('click', async () => {
            const item = cartItems.find(i => i.id == id);
            if (!item) return;
            item.qty++;
            updateLocalItem(itemEl, item);
            updateTotals();
            persistItemQty(item.cartItemId, item.qty);
        });
    });

    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemEl = btn.closest('.cart-item');
            const id = itemEl.dataset.id;
            const item = cartItems.find(i => i.id == id);
            itemEl.style.opacity = '0';
            itemEl.style.transform = 'translateX(-16px)';
            cartItems = cartItems.filter(i => i.id != id);
            setTimeout(() => {
                itemEl.remove();
                updateTotals();
            }, 300);
            if (item?.cartItemId) removeItemFromAPI(item.cartItemId);
        });
    });
}

function updateLocalItem(el, item) {
    const qtyEl = el.querySelector('.qty-value');
    const totalEl = el.querySelector('.cart-item-total');
    if (qtyEl) qtyEl.textContent = item.qty;
    if (totalEl) totalEl.textContent = `GH₵ ${(item.price * item.qty).toFixed(2)}`;
}

async function persistItemQty(cartItemId, qty) {
    try {
        await apiFetch(`/api/cart/update/${cartItemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity: qty }),
        });
    } catch { /* silent fail */ }
}

async function removeItemFromAPI(cartItemId) {
    try {
        await apiFetch(`/api/cart/remove/${cartItemId}`, { method: 'DELETE' });
    } catch { /* silent fail */ }
}

// ── Fetch cart from backend ─────────────────────
async function loadCart() {
    renderSkeletons();

    try {
        const res = await apiFetch('/api/cart');
        const json = await res.json();
        console.log('[cart] API response:', JSON.stringify(json));
        if (json.success && json.data?.items?.length) {
            let highestFee = 0;
            cartItems = json.data.items
                .filter(i => i.product)
                .map(i => {
                    const fee = parseFloat(i.product.seller?.deliveryFee);
                    if (!isNaN(fee) && fee > highestFee) highestFee = fee;
                    return {
                        cartItemId: i.id,
                        id: i.product.id,
                        name: i.product.name,
                        storeName: i.product.seller?.storeName || '',
                        price: Number(i.product.price),
                        qty: i.quantity,
                        image: i.product.image || '',
                        variant: ''
                    };
                });
            deliveryFee = highestFee;
            const deliveryEl = document.getElementById('summary-delivery');
            if (deliveryEl) deliveryEl.textContent = `GH₵ ${deliveryFee.toFixed(2)}`;
            console.log('[cart] Mapped items:', cartItems.length, 'deliveryFee:', deliveryFee);
            renderCartItems(cartItems);
            await fetchCartCount();
            return;
        }
        console.log('[cart] Empty or no items, showing empty state');
    } catch (err) {
        console.error('[cart] Load failed:', err);
    }

    clearSkeletons();
    checkEmpty(0);
}

// ── Init ───────────────────────────────────────
loadCart();
