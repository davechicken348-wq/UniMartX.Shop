lucide.createIcons();

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

// ── Auth ──────────────────────────────────────
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
        } catch {}
    }
    const fallback = localStorage.getItem('authToken');
    if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
    return fallback;
}

function authHeaders() {
    const token = getAuthToken();
    return token
        ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

// ── API ───────────────────────────────────────
async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}), ...authHeaders() },
    });
    if (!res.ok && res.status !== 404) throw new Error(`API ${res.status}`);
    return res;
}

// ── Helpers ───────────────────────────────────
function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}

function fmt(n) {
    return `GH₵ ${Number(n).toFixed(2)}`;
}

function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── Look up order id ──────────────────────────
function getOrderIds() {
    try {
        const raw = localStorage.getItem('lastOrderDbIds');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search);
    const single = params.get('orderId');
    return single ? [single] : [];
}

function groupBySeller(orders) {
    const map = new Map();
    orders.forEach(order => {
        const orderSubtotal = order.items.reduce((s, i) => s + ((Number(i.price) || 0) * (i.quantity || 0)), 0);
        const orderDeliveryFee = Math.max(0, Number(order.totalAmount || 0) - orderSubtotal);
        const orderTotal = Number(order.totalAmount || 0);

        const key = order.seller?.storeName || order.seller?.id || 'unknown';
        if (!map.has(key)) {
            map.set(key, {
                seller: order.seller,
                address: order.address,
                paymentMethod: order.paymentMethod,
                paymentDetails: order.paymentDetails,
                items: [],
                subtotal: 0,
                deliveryFee: 0,
                total: 0,
                orders: [],
            });
        }
        const group = map.get(key);
        order.items.forEach(item => {
            const lineTotal = (Number(item.price) || 0) * (item.quantity || 0);
            group.items.push({ ...item, lineTotal });
        });
        group.subtotal += orderSubtotal;
        group.deliveryFee += orderDeliveryFee;
        group.total += orderTotal;
        group.orders.push({ orderNumber: order.orderNumber, subtotal: orderSubtotal, deliveryFee: orderDeliveryFee, total: orderTotal });
    });
    return Array.from(map.values());
}

function renderOrderItems(items) {
    const container = document.getElementById('order-items');
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        const node = document.createElement('div');
        node.className = 'order-item';
        const imgSrc = item.product?.image && !String(item.product.image).startsWith('data:');
        node.innerHTML = `
            <div class="order-item-img">
                ${imgSrc
                    ? `<img src="${esc(item.product.image)}" alt="${esc(item.product.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.parentElement.innerHTML='<div class=\\'order-img-placeholder\\'></div>'">`
                    : `<div class="order-img-placeholder"></div>`}
            </div>
            <div class="order-item-info">
                <p class="order-item-name">${esc(item.product?.name || 'Item')}</p>
                <p class="order-item-meta">Qty: ${item.quantity}</p>
            </div>
            <span class="order-item-price">${fmt(item.lineTotal || (Number(item.price) || 0) * (item.quantity || 0))}</span>
        `;
        container.appendChild(node);
    });
}

function renderSellerGroup(group) {
    const subtotalEl = document.getElementById('order-subtotal');
    const deliveryEl = document.getElementById('order-delivery');
    const totalEl = document.getElementById('order-total');
    if (subtotalEl) subtotalEl.textContent = fmt(group.subtotal);
    if (deliveryEl) deliveryEl.textContent = group.deliveryFee > 0 ? fmt(group.deliveryFee) : 'Free';
    if (totalEl) totalEl.textContent = fmt(group.total);
}

function renderTotals(subtotal, deliveryFee, total) {
    const subtotalEl = document.getElementById('order-subtotal');
    const deliveryEl = document.getElementById('order-delivery');
    const totalEl = document.getElementById('order-total');
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (deliveryEl) deliveryEl.textContent = deliveryFee > 0 ? fmt(deliveryFee) : 'Free';
    if (totalEl) totalEl.textContent = fmt(total);
}

function renderDeliveryInfoAll(groups) {
    const deliveryEl = document.getElementById('delivery-info');
    const paymentEl = document.getElementById('payment-info');
    if (!deliveryEl) return;
    if (paymentEl) paymentEl.innerHTML = '';

    deliveryEl.innerHTML = groups.map(group => {
        const addr = group.address || {};
        const fullAddress = [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ');
        const pm = group.paymentMethod || 'cod';
        const pd = group.paymentDetails || {};
        let html = `<p style="font-weight:700;font-size:0.85rem;color:var(--text);margin-bottom:0.5rem;">${esc(group.seller?.storeName || 'Seller')}</p>`;
        if (addr.fullName) {
            html += `<div class="delivery-row"><i data-lucide="user"></i><span>${esc(addr.fullName)}</span></div>`;
        }
        if (fullAddress) {
            html += `<div class="delivery-row"><i data-lucide="map-pin"></i><span>${esc(fullAddress)}</span></div>`;
        }
        if (addr.notes) {
            html += `<div class="delivery-row"><i data-lucide="file-text"></i><span>${esc(addr.notes)}</span></div>`;
        }
        html += `<div class="delivery-row"><i data-lucide="package"></i><span>${esc(pm === 'cod' ? 'Pay on Delivery' : 'Mobile Money')} · 3–5 business days</span></div>`;
        if (pm === 'momo') {
            if (pd.momoNetwork) {
                html += `<div class="delivery-row"><i data-lucide="wifi"></i><span>${esc(pd.momoNetwork)}</span></div>`;
            }
            if (pd.momoNumber) {
                html += `<div class="delivery-row"><i data-lucide="phone"></i><span>${esc(pd.momoNumber)}</span></div>`;
            }
        }
        return html;
    }).join('<hr style="border-color:var(--border);margin:0.75rem 0;">');
    lucide.createIcons();
}

function renderSellerGroups(groups) {
    const container = document.getElementById('seller-groups');
    const flatItems = document.getElementById('order-items');
    const totalsEl = document.getElementById('order-totals');
    if (!container) return;
    container.innerHTML = '';

    let grandSubtotal = 0;
    let grandDelivery = 0;
    let grandTotal = 0;

    groups.forEach(group => {
        const div = document.createElement('div');
        div.className = 'seller-group';
        div.innerHTML = `
            <div class="seller-group-header">
                <div class="seller-avatar">${esc(group.seller?.initials || group.seller?.storeName?.charAt(0)?.toUpperCase() || '?')}</div>
                <div class="seller-info">
                    <h4>${esc(group.seller?.storeName || 'Seller')}</h4>
                    <p>${group.items.length} item${group.items.length !== 1 ? 's' : ''} · ${esc((group.paymentMethod || 'cod') === 'cod' ? 'Pay on Delivery' : 'Mobile Money')}</p>
                </div>
                <div class="seller-delivery-fee">${group.deliveryFee > 0 ? esc(fmt(group.deliveryFee)) : 'Free delivery'}</div>
            </div>
            <div class="seller-items">
                ${group.items.map(item => `
                    <div class="seller-item">
                        <div class="seller-item-img">
                            ${item.product?.image && !String(item.product.image).startsWith('data:')
                                ? `<img src="${esc(item.product.image)}" alt="${esc(item.product.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
                                : ''}
                        </div>
                        <div class="seller-item-details">
                            <p class="seller-item-name">${esc(item.product?.name || 'Item')}</p>
                            <p class="seller-item-meta">Qty: ${item.quantity}</p>
                        </div>
                        <span class="seller-item-price">${fmt(item.lineTotal || (Number(item.price) || 0) * (item.quantity || 0))}</span>
                    </div>
                `).join('')}
            </div>
            <div class="seller-group-totals">
                <span class="seller-total-line">Subtotal <strong>${fmt(group.subtotal)}</strong></span>
                <span class="seller-total-line">Delivery <strong>${group.deliveryFee > 0 ? fmt(group.deliveryFee) : 'Free'}</strong></span>
                <span class="seller-total-line seller-total-line--grand">Seller Total <strong>${fmt(group.total)}</strong></span>
            </div>
        `;
        container.appendChild(div);
        grandSubtotal += group.subtotal;
        grandDelivery += group.deliveryFee;
        grandTotal += group.total;
    });

    if (flatItems) flatItems.innerHTML = '';
    if (totalsEl) {
        const subtotalEl = document.getElementById('order-subtotal');
        const deliveryEl = document.getElementById('order-delivery');
        const totalEl = document.getElementById('order-total');
        if (subtotalEl) subtotalEl.textContent = fmt(grandSubtotal);
        if (deliveryEl) deliveryEl.textContent = grandDelivery > 0 ? fmt(grandDelivery) : 'Free';
        if (totalEl) totalEl.textContent = fmt(grandTotal);
    }

    lucide.createIcons();
}

function renderDeliveryInfo(address, paymentMethod, paymentDetails, seller) {
    const fullAddress = [address.street, address.city, address.state, address.country].filter(Boolean).join(', ');
    const deliveryEl = document.getElementById('delivery-info');
    deliveryEl.innerHTML = `
        <div class="delivery-row">
            <i data-lucide="user"></i>
            <span>${esc(address.label || 'Customer')}</span>
        </div>
        <div class="delivery-row">
            <i data-lucide="map-pin"></i>
            <span>${esc(fullAddress)}</span>
        </div>
        ${address.notes ? `<div class="delivery-row"><i data-lucide="file-text"></i><span>${esc(address.notes)}</span></div>` : ''}
        <div class="delivery-row">
            <i data-lucide="package"></i>
            <span>${esc(paymentMethod === 'cod' ? 'Pay on Delivery' : 'Mobile Money')} · 3–5 business days</span>
        </div>
    `;

    const paymentEl = document.getElementById('payment-info');
    if (!paymentEl) return;
    if (paymentMethod === 'momo') {
        const network = paymentDetails?.momoNetwork || '';
        const number = paymentDetails?.momoNumber || '';
        paymentEl.innerHTML = `
            <div class="delivery-row">
                <i data-lucide="smartphone"></i>
                <span>${esc(seller?.storeName || 'Store')}</span>
            </div>
            ${network ? `<div class="delivery-row"><i data-lucide="wifi"></i><span>${esc(network)}</span></div>` : ''}
            ${number ? `<div class="delivery-row"><i data-lucide="phone"></i><span>${esc(number)}</span></div>` : ''}
        `;
    } else if (paymentMethod === 'cod') {
        paymentEl.innerHTML = `
            <div class="delivery-row">
                <span>Pay on Delivery – ${esc(seller?.storeName || 'seller')}</span>
            </div>
        `;
    }
}

async function apiFetchWithRetry(path, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        const res = await apiFetch(path);
        if (res.ok) return res;
        if (i === retries) return res;
    }
    throw new Error('Network error');
}

async function loadOrder() {
    const ids = getOrderIds();
    document.getElementById('order-ref').textContent = ids.length ? `#UMX-2026-${ids[0]}` : 'Loading…';

    try {
        let orderResponses;
        if (ids.length) {
            orderResponses = await Promise.all(ids.map(id => apiFetchWithRetry(`/api/buyer/orders/${encodeURIComponent(id)}`)));
        } else {
            orderResponses = [await apiFetchWithRetry('/api/buyer/orders/latest')];
        }

        const payloads = await Promise.all(orderResponses.map(r => r.json()));
        const orders = payloads.filter(p => p.success).map(p => p.data);

        if (!orders.length) throw new Error('No orders found');

        document.getElementById('order-ref').textContent = orders[0].orderNumber || `#UMX-2026-${ids[0]}`;

        const sellerGroups = groupBySeller(orders);
        renderSellerGroups(sellerGroups);

        const sellers = new Set(sellerGroups.map(g => g.seller?.storeName || 'Seller'));
        let totalQty = 0;
        sellerGroups.forEach(g => {
            g.items.forEach(item => { totalQty += Number(item.quantity) || 0; });
        });

        document.getElementById('conf-title').textContent = 'Order Confirmed!';
        const metaEl = document.getElementById('order-meta');
        if (metaEl) metaEl.textContent = `${totalQty} item(s) across ${sellers.size} seller(s)`;

        renderDeliveryInfoAll(sellerGroups);

        const emailHint = document.getElementById('email-sent-hint');
        if (emailHint) emailHint.style.display = '';

        lucide.createIcons();
    } catch (err) {
        console.error('[order-confirmation] Load failed:', err);
        const refEl = document.getElementById('order-ref');
        if (refEl) refEl.textContent = '#UMX-2026-ERROR';
    }
}

// ── Copy button ───────────────────────────────
document.getElementById('copy-btn').addEventListener('click', () => {
    const text = document.getElementById('order-ref').textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.innerHTML = '<i data-lucide="check"></i>';
        lucide.createIcons();
        btn.style.color = '#34d399';
        setTimeout(() => {
            btn.innerHTML = '<i data-lucide="copy"></i>';
            lucide.createIcons();
            btn.style.color = '';
        }, 2000);
    });
});

// ── Stagger next-step items ───────────────────
const steps = document.querySelectorAll('.next-step');
steps.forEach((step, i) => {
    step.style.opacity = '0';
    step.style.transform = 'translateX(-12px)';
    step.style.transition = `opacity 0.4s ease ${2.1 + i * 0.12}s, transform 0.4s ease ${2.1 + i * 0.12}s`;
    setTimeout(() => {
        step.style.opacity = '1';
        step.style.transform = 'translateX(0)';
    }, 2100 + i * 120);
});

// ── Init ──────────────────────────────────────
loadOrder();
