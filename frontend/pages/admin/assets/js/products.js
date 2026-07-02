/* ═══════════════════════════════════════════════
   ADMIN PRODUCTS PAGE — Fixed JS
   ═══════════════════════════════════════════════ */

(function () {
    const API = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

    function getAuthToken() {
        const raw = localStorage.getItem('authData');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed.expiry && Date.now() > parsed.expiry) {
                    localStorage.removeItem('authData');
                } else {
                    const data = parsed.value ? JSON.parse(parsed.value) : parsed;
                    if (data.token) return data.token;
                }
            } catch {}
        }
        const fallback = localStorage.getItem('authToken');
        if (!fallback || fallback === 'undefined' || fallback === 'null') return null;
        return fallback;
    }

    async function apiFetch(path, options = {}) {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API}${path}`, {
            credentials: 'include',
            headers: { ...headers, ...(options.headers || {}) },
            ...options,
        });
        if (!res.ok) {
            if (res.status === 401) window.location.href = '../../auth/login.html?error=auth_required';
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Request failed (${res.status})`);
        }
        return res.json();
    }

    const PER_PAGE = 18;
    let state = {
        page: 1, total: 0, pages: 1,
        active: '', category: '', search: '',
        products: [], view: 'grid',
    };

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toast(msg, type = '') {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast toast--${type}`;
        const icons = { success: 'check-circle', danger: 'x-circle', error: 'alert-circle' };
        const iconName = icons[type] || 'info';
        el.innerHTML = `<i data-lucide="${iconName}"></i><span>${escapeHtml(msg)}</span>`;
        container.appendChild(el);
        if (window.lucide) lucide.createIcons({ nodes: [el] });
        setTimeout(() => {
            el.classList.add('toast-out');
            el.addEventListener('animationend', () => el.remove());
        }, 3200);
    }

    /* ── Profile ── */
    async function loadProfile() {
        try {
            const result = await apiFetch('/api/auth/me');
            if (!result || !result.success) return;
            const data = result.data;
            const first = data.firstName || '';
            const last  = data.lastName || '';
            const full  = `${first}${last ? ' ' + last : ''}` || 'Admin';
            const ini   = full.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'AD';

            setText('sidebar-name', full);
            setText('sidebar-role', 'Super Admin');
            setText('sidebar-avatar', ini);
            setText('topnav-username', first || 'Admin');
            setText('topnav-avatar', ini);

            const ap = document.getElementById('sidebar-avatar');
            if (ap && data.avatar) ap.innerHTML = `<img src="${data.avatar}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } catch (err) {
            console.error('[Products] loadProfile failed:', err);
        }
    }

    /* ── Helpers ── */
    function initials(name = '') {
        return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '??';
    }
    function dateStr(d) {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
    function currency(v) { return `GH₵ ${parseFloat(v).toFixed(2)}`; }
    function imgUrl(path) {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${API}/${String(path).replace(/^\//, '')}`;
    }
    function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—'; }

    /* ── Stats ── */
    async function loadStats() {
        try {
            const result = await apiFetch('/api/admin/products/stats');
            if (!result) return;
            const data = result.data;
            if (!data) return;
            document.getElementById('stat-total').textContent     = fmt(data.total    ?? 0);
            document.getElementById('stat-active').textContent    = fmt(data.active   ?? 0);
            document.getElementById('stat-inactive').textContent  = fmt(data.inactive ?? 0);
            document.getElementById('stat-low-stock').textContent = fmt(data.lowStock ?? 0);
        } catch (err) {
            console.error('[Products] loadStats failed:', err);
        }
    }

    /* ── Drawer ── */
    const drawer        = document.getElementById('product-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerBody    = document.getElementById('drawer-body');
    const drawerClose   = document.getElementById('drawer-close');

    function openDrawer(product) {
        const img       = imgUrl(product.image);
        const storeName = product.seller?.storeName ?? '—';
        const sellerUser = product.seller?.user;
        const sellerName = sellerUser ? `${sellerUser.firstName} ${sellerUser.lastName}` : storeName;
        const isActive  = product.isActive;

        drawerBody.innerHTML = `
            ${img
                ? `<img class="drawer-product-img" src="${img}" alt="${escapeHtml(product.name)}" onerror="this.style.display='none'">`
                : `<div class="drawer-product-img-placeholder"><i data-lucide="package"></i></div>`}

            <div class="drawer-product-name">${product.name}</div>
            <div class="drawer-product-category">${cap(product.category)}${product.subcategory ? ' · ' + cap(product.subcategory) : ''}</div>

            <div class="drawer-section">
                <div class="drawer-section-title">Details</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Price</span>
                    <span class="drawer-field-value">${currency(product.price)}</span>
                </div>
                ${product.comparePrice ? `
                <div class="drawer-field">
                    <span class="drawer-field-label">Compare Price</span>
                    <span class="drawer-field-value" style="color:var(--text-3);text-decoration:line-through">${currency(product.comparePrice)}</span>
                </div>` : ''}
                <div class="drawer-field">
                    <span class="drawer-field-label">Stock</span>
                    <span class="drawer-field-value" ${product.stock <= 5 ? 'style="color:var(--danger)"' : ''}>${product.stock} units</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Rating</span>
                    <span class="drawer-field-value">⭐ ${product.rating?.toFixed(1) ?? '—'} (${product.reviewCount ?? 0} reviews)</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Status</span>
                    <span class="drawer-field-value">
                        <span class="badge badge--${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Listed</span>
                    <span class="drawer-field-value">${dateStr(product.createdAt)}</span>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Seller</div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Store</span>
                    <span class="drawer-field-value">${storeName}</span>
                </div>
                <div class="drawer-field">
                    <span class="drawer-field-label">Seller</span>
                    <span class="drawer-field-value">${sellerName}</span>
                </div>
            </div>

            ${product.description ? `
            <div class="drawer-section">
                <div class="drawer-section-title">Description</div>
                <div class="drawer-desc">${product.description}</div>
            </div>` : ''}

            <div class="drawer-actions">
                <button class="drawer-btn ${isActive ? 'drawer-btn--warning' : 'drawer-btn--success'}" id="toggle-btn" data-id="${product.id}" data-active="${isActive}">
                    <i data-lucide="${isActive ? 'eye-off' : 'eye'}"></i>
                    ${isActive ? 'Deactivate Listing' : 'Activate Listing'}
                </button>
                <button class="drawer-btn drawer-btn--danger" id="delete-btn" data-id="${product.id}" data-name="${product.name}">
                    <i data-lucide="trash-2"></i> Delete Product
                </button>
                <button class="drawer-btn drawer-btn--ghost" id="copy-btn" data-id="${product.id}">
                    <i data-lucide="copy"></i> Copy Product ID
                </button>
            </div>
        `;

        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
        lucide.createIcons();

        document.getElementById('toggle-btn')?.addEventListener('click', async (e) => {
            const { id, active } = e.currentTarget.dataset;
            const newActive = active === 'true' ? false : true;
            e.currentTarget.disabled = true;
            try {
                await apiFetch(`/api/admin/products/${id}/toggle`, {
                    method: 'PATCH',
                    body: JSON.stringify({ isActive: newActive }),
                });
                toast(`Product ${newActive ? 'activated' : 'deactivated'}.`, 'success');
                closeDrawer();
                loadProducts();
            } catch {
                toast('Failed to update product.', 'danger');
                e.currentTarget.disabled = false;
            }
        });

        document.getElementById('delete-btn')?.addEventListener('click', async (e) => {
            const { id, name } = e.currentTarget.dataset;
            if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
            e.currentTarget.disabled = true;
            try {
                await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
                toast(`"${name}" deleted.`, 'success');
                closeDrawer();
                loadProducts();
            } catch {
                toast('Failed to delete.', 'danger');
                e.currentTarget.disabled = false;
            }
        });

        document.getElementById('copy-btn')?.addEventListener('click', (e) => {
            navigator.clipboard.writeText(e.currentTarget.dataset.id).then(() => toast('Product ID copied.', 'success'));
        });
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    }
    drawerClose.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    /* ── Load products ── */
    async function loadProducts() {
        renderSkeletons();
        try {
            const params = new URLSearchParams({
                page:  state.page,
                limit: PER_PAGE,
                ...(state.active !== '' && { isActive: state.active }),
                ...(state.category    && { category: state.category }),
                ...(state.search      && { search: state.search }),
            });

            const result = await apiFetch(`/api/admin/products?${params}`);
            const data = result.data;

            const products = data?.products ?? data ?? [];
            state.products = products;
            state.total    = data?.total ?? products.length;
            state.pages    = data?.pages ?? Math.ceil(state.total / PER_PAGE);

            state.view === 'grid' ? renderGrid(products) : renderTable(products);
            renderPagination();
        } catch (err) {
            console.error('[Products] loadProducts failed:', err);
            renderError();
        }
        lucide.createIcons();
    }

    function renderSkeletons() {
        if (state.view === 'grid') {
            document.getElementById('products-grid').innerHTML = Array(6).fill(`
                <div class="product-card skel-card">
                    <div class="skel-img"></div>
                    <div class="skel-body"><div class="skel-line"></div><div class="skel-line short"></div></div>
                </div>`).join('');
        } else {
            document.getElementById('products-tbody').innerHTML = Array(6).fill(`<tr class="skel-row"><td colspan="9"><div class="skel-line"></div></td></tr>`).join('');
        }
    }

    function renderError() {
        const errHtml = `
            <div class="empty-icon"><i data-lucide="wifi-off"></i></div>
            <h3>Could not load products</h3>
            <p>Check that the backend is running and try again.</p>`;

        if (state.view === 'grid') {
            document.getElementById('products-grid').innerHTML = `<div class="empty-grid">${errHtml}</div>`;
        } else {
            document.getElementById('products-tbody').innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-state">${errHtml}</div></td></tr>`;
        }
        lucide.createIcons();
    }

    /* ── Grid render ── */
    function renderGrid(products) {
        const grid = document.getElementById('products-grid');
        if (!products.length) {
            grid.innerHTML = `
                <div class="empty-grid">
                    <div class="empty-icon"><i data-lucide="package"></i></div>
                    <h3>No products found</h3>
                    <p>Try adjusting the filter or search term.</p>
                </div>`;
            lucide.createIcons();
            return;
        }

        grid.innerHTML = products.map(p => {
            const img      = imgUrl(p.image);
            const isActive = p.isActive;
            const stock    = p.stock ?? 0;
            const storeName = p.seller?.storeName ?? '—';

            return `
                <div class="product-card" data-id="${p.id}">
                    <div class="pc-img">
                        ${img
                            ? `<img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'pc-img-placeholder\\'><i data-lucide=\\'package\\'></i></div>'; lucide.createIcons();">`
                            : `<div class="pc-img-placeholder"><i data-lucide="package"></i></div>`}
                        <span class="pc-status pc-status--${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
                        <div class="pc-actions-overlay">
                            <button class="pc-act-btn toggle-btn" data-id="${p.id}" data-active="${isActive}" title="${isActive ? 'Deactivate' : 'Activate'}">
                                <i data-lucide="${isActive ? 'eye-off' : 'eye'}"></i>
                            </button>
                            <button class="pc-act-btn pc-act-btn--danger delete-btn" data-id="${p.id}" data-name="${escapeHtml(p.name)}" title="Delete">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    <div class="pc-body">
                        <div class="pc-category">${cap(p.category)}</div>
                        <div class="pc-name">${escapeHtml(p.name)}</div>
                        <div class="pc-seller">by ${storeName}</div>
                        <div class="pc-meta">
                            <span><i data-lucide="star"></i>${p.rating?.toFixed(1) ?? '—'}</span>
                            <span><i data-lucide="shopping-bag"></i>${p.reviewCount ?? 0} reviews</span>
                        </div>
                        <div class="pc-footer">
                            <span class="pc-price">${currency(p.price)}</span>
                            <span class="pc-stock ${stock <= 5 ? 'pc-stock--low' : ''}">${stock <= 5 ? '⚠ ' : ''}${stock} left</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { id, active } = btn.dataset;
                const newActive = active === 'true' ? false : true;
                btn.disabled = true;
                try {
                    await apiFetch(`/api/admin/products/${id}/toggle`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: newActive }),
                    });
                    toast(`Product ${newActive ? 'activated' : 'deactivated'}.`, 'success');
                    loadProducts();
                } catch {
                    toast('Failed to update product.', 'danger');
                    btn.disabled = false;
                }
            });
        });

        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { id, name } = btn.dataset;
                if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
                btn.disabled = true;
                try {
                    await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
                    toast(`"${name}" deleted.`, 'success');
                    loadProducts();
                } catch {
                    toast('Failed to delete.', 'danger');
                    btn.disabled = false;
                }
            });
        });

        lucide.createIcons();
    }

    /* ── Table render ── */
    function renderTable(products) {
        const tbody = document.getElementById('products-tbody');
        if (!products.length) {
            tbody.innerHTML = `
                <tr class="empty-row"><td colspan="9">
                    <div class="empty-state">
                        <div class="empty-icon"><i data-lucide="package"></i></div>
                        <h3>No products found</h3>
                        <p>Try adjusting the filter or search term.</p>
                    </div>
                </td></tr>`;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = products.map(p => {
            const img       = imgUrl(p.image);
            const isActive  = p.isActive;
            const stock     = p.stock ?? 0;
            const storeName = p.seller?.storeName ?? '—';

            return `
                <tr data-id="${p.id}">
                    <td>
                        <div class="prod-cell">
                            ${img
                                ? `<img class="prod-thumb" src="${img}" alt="" onerror="this.outerHTML='<div class=\\'prod-thumb-placeholder\\'><i data-lucide=\\'package\\'></i></div>'; lucide.createIcons();">`
                                : `<div class="prod-thumb-placeholder"><i data-lucide="package"></i></div>`}
                            <div>
                                <div class="prod-name">${escapeHtml(p.name)}</div>
                                <div class="prod-cat">${cap(p.category)}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="seller-cell">
                            <div class="s-avatar">${initials(storeName)}</div>
                            <span class="s-name">${storeName}</span>
                        </div>
                    </td>
                    <td>${cap(p.category)}</td>
                    <td style="font-weight:700;color:var(--text)">${currency(p.price)}</td>
                    <td ${stock <= 5 ? 'style="color:var(--danger);font-weight:700"' : ''}>${stock}</td>
                    <td>${p.rating?.toFixed(1) ?? '—'}</td>
                    <td><span class="badge badge--${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style="color:var(--text-3);font-size:0.82rem">${dateStr(p.createdAt)}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="act-btn view-btn" data-id="${p.id}" title="View details"><i data-lucide="eye"></i></button>
                            <button class="act-btn ${isActive ? 'act-btn--warning' : 'act-btn--success'} toggle-btn" data-id="${p.id}" data-active="${isActive}" title="${isActive ? 'Deactivate' : 'Activate'}">
                                <i data-lucide="${isActive ? 'eye-off' : 'eye'}"></i>
                            </button>
                            <button class="act-btn act-btn--danger delete-btn" data-id="${p.id}" data-name="${escapeHtml(p.name)}" title="Delete"><i data-lucide="trash-2"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const p = state.products.find(x => x.id === row.dataset.id);
                if (p) openDrawer(p);
            });
        });

        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const p = state.products.find(x => x.id === btn.dataset.id);
                if (p) openDrawer(p);
            });
        });

        bindCardButtons(tbody);
        lucide.createIcons();
    }

    function bindCardButtons(container) {
        container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { id, active } = btn.dataset;
                const newActive = active === 'true' ? false : true;
                btn.disabled = true;
                try {
                    await apiFetch(`/api/admin/products/${id}/toggle`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: newActive }),
                    });
                    toast(`Product ${newActive ? 'activated' : 'deactivated'}.`, 'success');
                    loadProducts();
                } catch {
                    toast('Failed to update product.', 'danger');
                    btn.disabled = false;
                }
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { id, name } = btn.dataset;
                if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
                btn.disabled = true;
                try {
                    await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
                    toast(`"${name}" deleted.`, 'success');
                    loadProducts();
                } catch {
                    toast('Failed to delete.', 'danger');
                    btn.disabled = false;
                }
            });
        });
    }

    /* ── Pagination ── */
    function renderPagination() {
        const info    = document.getElementById('page-info');
        const numbers = document.getElementById('page-numbers');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        const start = (state.page - 1) * PER_PAGE + 1;
        const end   = Math.min(state.page * PER_PAGE, state.total);
        info.textContent = state.total ? `Showing ${start}–${end} of ${state.total} products` : '';

        prevBtn.disabled = state.page <= 1;
        nextBtn.disabled = state.page >= state.pages;

        const pages = [];
        if (state.pages <= 7) {
            for (let i = 1; i <= state.pages; i++) pages.push(i);
        }

        numbers.innerHTML = pages.map(p =>
            p === '…'
                ? `<span class="page-ellipsis">…</span>`
                : `<button class="page-num${p === state.page ? ' active' : ''}" data-p="${p}">${p}</button>`
        ).join('');

        numbers.querySelectorAll('.page-num').forEach(btn => {
            btn.addEventListener('click', () => { state.page = +btn.dataset.p; loadProducts(); });
        });
        prevBtn.onclick = () => { if (state.page > 1)            { state.page--; loadProducts(); } };
        nextBtn.onclick = () => { if (state.page < state.pages)  { state.page++; loadProducts(); } };
        lucide.createIcons();
    }

    /* ── Layout toggle ── */
    document.getElementById('btn-grid').addEventListener('click', () => {
        state.view = 'grid';
        document.getElementById('btn-grid').classList.add('active');
        document.getElementById('btn-table').classList.remove('active');
        document.getElementById('grid-view').style.display  = '';
        document.getElementById('table-view').style.display = 'none';
        loadProducts();
    });
    document.getElementById('btn-table').addEventListener('click', () => {
        state.view = 'table';
        document.getElementById('btn-table').classList.add('active');
        document.getElementById('btn-grid').classList.remove('active');
        document.getElementById('table-view').style.display = '';
        document.getElementById('grid-view').style.display  = 'none';
        loadProducts();
    });

    /* ── Filter pills ── */
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.active = pill.dataset.active;
            state.page   = 1;
            loadProducts();
        });
    });

    /* ── Category select ── */
    document.getElementById('category-select').addEventListener('change', (e) => {
        state.category = e.target.value;
        state.page     = 1;
        loadProducts();
    });

    /* ── Search ── */
    let searchTimer;
    function bindSearch(id) {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.search = input.value.trim();
                state.page   = 1;
                loadProducts();
            }, 380);
        });
    }
    bindSearch('search-input');
    bindSearch('topnav-search-input');

    /* ── Export CSV ── */
    document.getElementById('export-btn')?.addEventListener('click', () => {
        if (!state.products.length) { toast('No products to export.', 'danger'); return; }
        const rows = [['Name', 'Category', 'Price', 'Stock', 'Status', 'Seller', 'Listed']];
        state.products.forEach(p => {
            rows.push([
                p.name,
                cap(p.category),
                parseFloat(p.price).toFixed(2),
                p.stock ?? 0,
                p.isActive ? 'Active' : 'Inactive',
                p.seller?.storeName ?? '—',
                dateStr(p.createdAt),
            ]);
        });
        const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a    = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: 'unimartx-products.csv',
        });
        a.click();
        toast('CSV exported.', 'success');
    });

    /* ── Init ── */
    loadProfile();
    loadStats();
    loadProducts();

    window.addEventListener('admin:profileUpdated', () => {
        loadProfile();
        Promise.all([loadStats(), loadProducts()]);
    });
    window.addEventListener('focus', () => {
        Promise.all([loadStats(), loadProducts()]);
    });
})();
