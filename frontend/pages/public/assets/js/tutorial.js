// ── Home Page Tutorial Walkthrough ──
// Interactive, self-contained mockup of the UniMartX buyer/seller flow.
// Mirrors the standalone tutorial page but lives inline on the homepage.

(function () {
    const steps = [
        {
            section: "Intro", path: "/",
            caption: "This is UniMartX — Ghana's marketplace for student entrepreneurs. Build a storefront, share one link, and reach students across your campus.",
            render: () => `
                <div class="tut-eyebrow">● Home</div>
                <h3 class="tut-h">The digital campus of student entrepreneurs.</h3>
                <p class="tut-lede">Build your professional storefront. Share one link. Reach students across campus. No website required.</p>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <a class="tut-btn tut-btn--gold" href="stores/stores.html">Explore Student Shops</a>
                    <a class="tut-btn tut-btn--ghost" href="../auth/seller/register.html">Start Selling</a>
                </div>`
        },
        {
            section: "Buyer", path: "/pages/public/stores/stores.html",
            caption: "Browse student-run shops by category — from handmade goods to tutoring services to campus deals.",
            render: () => `
                <div class="tut-eyebrow">● Discover shops</div>
                <h3 class="tut-h" style="font-size:26px;">Explore Shops</h3>
                <p class="tut-lede">Verified storefronts run by students across campus.</p>
                <div class="tut-grid">
                    ${["Kente & Co.", "Ama's Baked Goods", "Campus Tech Fix", "Braids by Naa", "Notes4Less", "Vibes Print Shop"].map(n => `
                        <div class="tut-card"><div class="tut-thumb"></div><h4>${n}</h4><p>Student-run · Legon</p><span class="tut-tag">Open now</span></div>
                    `).join("")}
                </div>`
        },
        {
            section: "Buyer", path: "/pages/public/shop/shop.html?id=kente-co",
            caption: "Click into any shop to see their full catalog, story, and contact info.",
            render: () => `
                <div class="tut-eyebrow">● Shop</div>
                <h3 class="tut-h" style="font-size:26px;">Kente & Co.</h3>
                <p class="tut-lede">Handwoven accessories, made between classes. Free campus delivery on orders over ₵50.</p>
                <div class="tut-grid">
                    ${["Woven Wristband", "Kente Tote Bag", "Phone Case — Adinkra"].map(n => `
                        <div class="tut-card"><div class="tut-thumb"></div><h4>${n}</h4><p>₵${(Math.random() * 60 + 20).toFixed(0)}.00</p></div>
                    `).join("")}
                </div>`
        },
        {
            section: "Buyer", path: "/pages/public/product/product.html?id=wristband-04",
            caption: "Tap any listing to see full details, pricing, and photos.",
            render: () => `
                <div class="tut-eyebrow">● Product</div>
                <div class="tut-product-hero">
                    <div class="tut-product-img"></div>
                    <div>
                        <h3 class="tut-h" style="font-size:24px;">Woven Wristband — Adinkra Set</h3>
                        <div class="tut-price">₵35.00</div>
                        <p class="tut-lede" style="margin-bottom:18px;">Handwoven, adjustable, made to order — ready in 2 days.</p>
                        <div class="tut-btn tut-btn--gold">Buy Now</div>
                    </div>
                </div>`
        },
        {
            section: "Buyer", path: "/pages/auth/buyer/register.html",
            caption: "When you're ready to buy, UniMartX asks you to create a quick buyer account — right from inside the shop.",
            render: () => `
                <div class="tut-eyebrow">● Create your account</div>
                <h3 class="tut-h" style="font-size:26px;">Create Your Account</h3>
                <p class="tut-lede">Join the campus marketplace and start shopping in minutes.</p>
                <div class="tut-field"><label>Full Name</label><div class="tut-input">e.g. Efua Mensah</div></div>
                <div class="tut-field"><label>Email Address</label><div class="tut-input">efua@st.ug.edu.gh</div></div>
                <div class="tut-field"><label>Phone Number</label><div class="tut-input">024 000 0000</div></div>
                <div class="tut-field"><label>Password</label><div class="tut-input">••••••••••</div>
                    <div class="tut-req">8+ chars · uppercase · lowercase · number · special char</div>
                </div>
                <div class="tut-btn">Create Account</div>`
        },
        {
            section: "Buyer", path: "/pages/public/product/product.html?id=wristband-04",
            caption: "Message the seller directly to confirm your order and arrange pickup or delivery.",
            render: () => `
                <div class="tut-eyebrow">● Order placed</div>
                <h3 class="tut-h" style="font-size:26px;">You're set, Efua 🎉</h3>
                <p class="tut-lede">Your order for the Woven Wristband — Adinkra Set has been sent to Kente & Co. They'll message you to confirm pickup or delivery.</p>
                <div class="tut-btn tut-btn--ghost">Message Seller</div>`
        },
        {
            section: "Buyer", path: "/",
            caption: "That's the buyer side. Now let's flip it — creating your own shop as a seller.",
            render: () => `
                <div class="tut-eyebrow">● Back to home</div>
                <h3 class="tut-h">Ready to sell instead?</h3>
                <p class="tut-lede">Click "Create My Shop" from the homepage to launch your own storefront.</p>
                <a class="tut-btn" href="../auth/seller/register.html">Create My Shop →</a>`
        },
        {
            section: "Seller", path: "/pages/auth/seller/register.html",
            caption: "This is where you launch your student business. It's a guided setup — six quick steps, about three minutes.",
            render: () => `
                <div class="tut-eyebrow">● Become a seller</div>
                <h3 class="tut-h">Launch Your Student Business</h3>
                <p class="tut-lede">Create your own online storefront, reach thousands of students across campus, and start growing your business.</p>
                <div class="tut-grid" style="grid-template-columns:repeat(3,1fr);">
                    <div class="tut-card"><h4>Launch in Minutes</h4><p>Guided, step-by-step setup.</p></div>
                    <div class="tut-card"><h4>Reach Campus Buyers</h4><p>Connect with verified students.</p></div>
                    <div class="tut-card"><h4>Grow Your Brand</h4><p>Customize and build trust.</p></div>
                </div>
                <div style="margin-top:22px;" class="tut-btn tut-btn--gold">Start My Store → &nbsp; <span style="opacity:.8;font-weight:400;">6 quick steps · ~3 min</span></div>`
        },
        {
            section: "Seller", path: "/pages/auth/seller/onboarding.html?step=1", stepper: [1, 6],
            caption: "Step one — set up your account details.",
            render: () => stepScreen(1, "Account details", "Your name, student email, phone, and a password.")
        },
        {
            section: "Seller", path: "/pages/auth/seller/onboarding.html?step=2", stepper: [2, 6],
            caption: "Step two — choose your shop name. This becomes part of your shareable link.",
            render: () => stepScreen(2, "Shop name", "Pick a name — this becomes unimartxshop.vercel.app/shop/your-name.")
        },
        {
            section: "Seller", path: "/pages/auth/seller/onboarding.html?step=3", stepper: [3, 6],
            caption: "Step three — tell buyers what you sell with a short description and category.",
            render: () => stepScreen(3, "Shop description", "What do you sell, and who's it for? Pick a category.")
        },
        {
            section: "Seller", path: "/pages/auth/seller/onboarding.html?step=4", stepper: [4, 6],
            caption: "Step four — add your branding, like a logo or banner, so your shop stands out.",
            render: () => stepScreen(4, "Branding", "Upload a logo and banner so buyers recognize your shop.")
        },
        {
            section: "Seller", path: "/pages/auth/seller/onboarding.html?step=5", stepper: [5, 6],
            caption: "Step five — set how buyers can reach you and how you'll handle payment or delivery.",
            render: () => stepScreen(5, "Contact & payment", "How buyers reach you, and how you're paid — mobile money, cash, or bank.")
        },
        {
            section: "Seller", path: "/pages/auth/seller/onboarding.html?step=6", stepper: [6, 6],
            caption: "Step six — review everything and confirm. And that's it — your store is live.",
            render: () => stepScreen(6, "Review & confirm", "Check everything looks right, then launch your store.")
        },
        {
            section: "Seller", path: "/pages/seller/dashboard.html",
            caption: "You're dropped straight into your seller dashboard, where you'll manage your shop going forward.",
            render: () => `
                <div class="tut-eyebrow">● Seller dashboard</div>
                <h3 class="tut-h" style="font-size:26px;">Welcome back, Kente & Co.</h3>
                <div class="tut-dash">
                    <div class="tut-side">
                        <div class="tut-item tut-item--active">Overview</div>
                        <div class="tut-item">Products</div>
                        <div class="tut-item">Orders</div>
                        <div class="tut-item">Shop settings</div>
                        <div class="tut-item">Share link</div>
                    </div>
                    <div>
                        <div class="tut-stat-row">
                            <div class="tut-stat"><div class="n">0</div><div class="l">Products</div></div>
                            <div class="tut-stat"><div class="n">0</div><div class="l">Orders</div></div>
                            <div class="tut-stat"><div class="n">Live</div><div class="l">Status</div></div>
                        </div>
                        <p class="tut-lede" style="margin-top:18px;">Your shop is live but empty — add your first product to start selling.</p>
                        <div class="tut-btn tut-btn--gold">+ Add Product</div>
                    </div>
                </div>`
        },
        {
            section: "Seller", path: "/pages/seller/products/new.html",
            caption: "To list a product, click 'Add Product.' Add a photo, title, price, and a short description, then publish.",
            render: () => `
                <div class="tut-eyebrow">● Add product</div>
                <h3 class="tut-h" style="font-size:26px;">New Product</h3>
                <div class="tut-field"><label>Product Photo</label><div class="tut-input" style="height:70px;">Upload image</div></div>
                <div class="tut-field"><label>Title</label><div class="tut-input">Woven Wristband — Adinkra Set</div></div>
                <div class="tut-field"><label>Price (₵)</label><div class="tut-input">35.00</div></div>
                <div class="tut-field" style="max-width:520px;"><label>Description</label><div class="tut-input">Handwoven, adjustable, made to order.</div></div>
                <div class="tut-btn">Publish Product</div>`
        },
        {
            section: "Seller", path: "/pages/public/shop/shop.html?id=kente-co",
            caption: "And just like that, your product is live — visible to every student browsing UniMartX.",
            render: () => `
                <div class="tut-eyebrow">● Live shop</div>
                <h3 class="tut-h" style="font-size:26px;">Kente & Co.</h3>
                <p class="tut-lede">Your first listing is live.</p>
                <div class="tut-grid" style="grid-template-columns:1fr 1fr 1fr;">
                    <div class="tut-card"><div class="tut-thumb"></div><h4>Woven Wristband</h4><p>₵35.00</p><span class="tut-tag">New</span></div>
                </div>`
        },
        {
            section: "Seller", path: "/pages/seller/dashboard.html?tab=share",
            caption: "Share your shop's unique link anywhere — group chats, Instagram, class WhatsApp groups — and students can shop with you directly.",
            render: () => `
                <div class="tut-eyebrow">● Share your shop</div>
                <h3 class="tut-h" style="font-size:26px;">One link. Every buyer.</h3>
                <p class="tut-lede">Share this everywhere — no separate website needed.</p>
                <div class="tut-linkbox">🔗 unimartxshop.vercel.app/shop/kente-co <span style="margin-left:auto;color:#1c8c6e;font-weight:600;">Copy</span></div>`
        },
        {
            section: "Outro", path: "/",
            caption: "Browse and buy from student shops, or launch your own store in about three minutes. Head to unimartxshop.vercel.app to get started.",
            render: () => `
                <div class="tut-endcard">
                    <div class="tut-eyebrow" style="justify-content:center;">● UniMartX</div>
                    <h3 class="tut-h">Your campus.<br>Your storefront.<br>One link.</h3>
                    <p class="tut-lede" style="margin:0 auto 24px;">unimartxshop.vercel.app</p>
                    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <a class="tut-btn tut-btn--gold" href="stores/stores.html">Explore Student Shops</a>
                        <a class="tut-btn tut-btn--ghost" href="../auth/seller/register.html">Start Selling</a>
                    </div>
                </div>`
        }
    ];

    function stepScreen(n, title, desc) {
        let segs = "";
        for (let i = 1; i <= 6; i++) {
            const cls = i < n ? "done" : (i === n ? "now" : "");
            segs += `<div class="tut-seg ${cls}"></div>`;
        }
        return `
            <div class="tut-eyebrow">● Store setup — step ${n} of 6</div>
            <div class="tut-stepper">${segs}</div>
            <h3 class="tut-h" style="font-size:26px;">${title}</h3>
            <p class="tut-lede">${desc}</p>
            <div style="display:flex;gap:10px;">
                <div class="tut-btn tut-btn--ghost">Back</div>
                <div class="tut-btn">Continue</div>
            </div>`;
    }

    const shell = document.getElementById('tutorial-screen');
    if (!shell) return;

    const inner = document.getElementById('tutorial-inner');
    const addr = document.getElementById('tutorial-addr');
    const stepCount = document.getElementById('tutorial-stepcount');
    const captionText = document.getElementById('tutorial-caption-text');
    const captionBar = document.getElementById('tutorial-caption');
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');
    const flowTabs = document.querySelectorAll('.tutorial-flowtab');

    let idx = 0;
    let autoTimer = null;

    function render() {
        const s = steps[idx];
        inner.innerHTML = s.render();
        addr.textContent = "unimartxshop.vercel.app" + s.path;
        stepCount.textContent = `${s.section} · ${idx + 1} of ${steps.length}`;
        captionText.textContent = s.caption;
        prevBtn.disabled = idx === 0;
        nextBtn.disabled = idx === steps.length - 1;
        flowTabs.forEach(t => {
            const jump = parseInt(t.dataset.jump, 10);
            t.classList.toggle('active', idx >= jump && (flowTabs[Array.from(flowTabs).indexOf(t) + 1] ? idx < parseInt(flowTabs[Array.from(flowTabs).indexOf(t) + 1].dataset.jump, 10) : true));
        });
        shell.scrollTop = 0;
        if (window.lucide) lucide.createIcons();
    }

    function go(delta) {
        idx = Math.max(0, Math.min(steps.length - 1, idx + delta));
        render();
    }

    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));

    flowTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            idx = parseInt(btn.dataset.jump, 10);
            render();
        });
    });

    document.getElementById('tutorial-caption-toggle').addEventListener('change', (e) => {
        captionBar.classList.toggle('tutorial-caption--hidden', !e.target.checked);
    });

    document.getElementById('tutorial-auto-toggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            autoTimer = setInterval(() => {
                if (idx < steps.length - 1) { go(1); }
                else { clearInterval(autoTimer); e.target.checked = false; }
            }, 4000);
        } else {
            clearInterval(autoTimer);
        }
    });

    // don't hijack page scroll arrows; only react when the section is in view
    document.addEventListener('keydown', (e) => {
        const sec = document.getElementById('tutorial-section');
        if (!sec) return;
        const r = sec.getBoundingClientRect();
        const inView = r.top < window.innerHeight && r.bottom > 0;
        if (!inView) return;
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
    });

    render();
})();
