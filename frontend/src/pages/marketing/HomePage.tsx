import { useEffect, useState } from 'react';
import { initMarketingInteractions } from '../../components/marketing/marketingInteractions';
import CustomSelect from '../../components/ui/CustomSelect';

export default function HomePage() {
  const [featuredCategory, setFeaturedCategory] = useState('');
  useEffect(() => initMarketingInteractions(), []);
  return (
    <>

    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <nav className="nav wrap" aria-label="Main navigation">
        <a className="brand" href="/marketing" aria-label="UniMartX home"><span className="brand-mark">u</span><span>unimart<span className="brand-x">x</span></span></a>
        <button className="menu-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Open navigation"><span></span><span></span></button>
        <div className="nav-links" id="nav-links">
          <a href="#discover"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-2 4.3-4.4 2 2-4.4 4.4-1.9Z"/></svg>Discover</a><a href="/shop"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-1 12H5L4 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg>Marketplace</a>
          <a href="#sellers"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10 12 4l8.5 6v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19v-9Z"/><path d="M9 20.5v-7h6v7"/></svg>For sellers</a>
          <a href="/marketing/about"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></svg>Our story</a>
          <a href="/marketing/faq"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.8 1.7c-.9.7-1.6 1.1-1.6 2.3M12 16.5h.01"/></svg>FAQs</a>
          <div className="nav-mobile-actions"><a className="mobile-login" href="/auth/login">Log in</a><a className="mobile-store" href="/auth/seller/register">Open a store <span>↗</span></a></div>
        </div>
        <div className="nav-actions"><a className="login-link" href="/auth/login"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H3"/></svg>Log in</a><a className="button button-dark button-small" href="/auth/seller/register">Open a store <span>↗</span></a></div>
      </nav>
    </header>
    <main id="main">
      <section className="hero-carousel" aria-label="Featured on UniMartX" aria-roledescription="carousel">
        <div className="hero-slides" aria-live="off">
          <article className="hero-slide hero-slide--form is-active" data-slide="0" aria-roledescription="slide" aria-label="1 of 6">
            <div className="slide-inner">
              <div className="slide-meta"><span>U/MX — CAMPUS MARKETPLACE</span><span>MADE HERE · FOUND EVERYWHERE</span></div>
              <div className="slide-copy"><p className="slide-kicker">01 / BUILT FROM AN IDEA</p><h1>Build your<br /><span>own</span> FORM.</h1><p>Big ideas begin in small places. Make your student business something people can find, follow, and love.</p><a className="slide-cta" href="#sellers">Build your store <b>↗</b></a></div>
              <div className="form-image"><img src="https://images.unsplash.com/photo-1746911779503-f16ee2088257?auto=format&fit=crop&w=1500&q=85" alt="Angular concrete architecture with bold geometric forms"/><span className="image-outline"></span><span className="form-label">FORM<br /><i>//</i><br />FOLLOWS<br />IDEA</span><span className="form-index">STUDENT BUSINESS<br />SYSTEM 001</span></div>
              <span className="form-number">01</span>
              <div className="slide-bottom"><span>SHOP STUDENT-OWNED</span><span>ACCRA · GHANA</span></div>
            </div>
          </article>

          <article className="hero-slide hero-slide--clay" data-slide="1" aria-roledescription="slide" aria-label="2 of 6" aria-hidden="true">
            <div className="slide-inner">
              <div className="slide-meta"><span>UMX / MAKER SERIES</span><span>OBJECTS WITH A STORY</span></div>
              <div className="clay-topline"><span>EST. ON CAMPUS<br />INDEPENDENT MAKERS</span><span className="clay-brand">The fusion<br />of imagination.</span></div>
              <div className="clay-main"><div className="clay-title"><p className="slide-kicker">02 / MADE BY HAND</p><h1>Good things<br />take <i>shape.</i></h1><a className="slide-cta" href="#discover">Meet the makers <b>↗</b></a></div><div className="clay-product"><img src="https://images.unsplash.com/photo-1687191883721-257d8cad5b54?auto=format&fit=crop&w=1200&q=85" alt="Minimal white ceramic vase displayed on a table"/><span className="clay-chip">HANDMADE<br />ON CAMPUS</span></div></div>
              <div className="clay-footer"><span>ONE OF A KIND, JUST LIKE YOU.</span><span>01 — 05</span></div>
            </div>
          </article>

          <article className="hero-slide hero-slide--signal" data-slide="2" aria-roledescription="slide" aria-label="3 of 6" aria-hidden="true">
            <div className="slide-inner">
              <div className="fashion-nav"><span>MENU <i>＋</i></span><a href="/marketing" className="fashion-logo">MORI<span>®</span></a><span>NEW SEASON&nbsp;&nbsp; / &nbsp;&nbsp;ACCRA</span></div>
              <div className="fashion-feature">
                <figure className="fashion-image fashion-image-main"><img src="https://images.unsplash.com/photo-1783013957035-e28473afa2ab?auto=format&fit=crop&w=1400&q=85" alt="Black woman wearing an embellished fashion dress"/><figcaption>01 — THE EVERYDAY EDIT</figcaption></figure>
                <div className="fashion-copy"><p className="slide-kicker">03 / STYLE, WITH A POINT OF VIEW</p><h1>THE ART OF<br/><span>SIMPLICITY.</span></h1><p>Good style is never loud. Find the pieces, handmade details, and fresh finds that feel unmistakably like you.</p><a href="#discover" className="fashion-link">Explore the collection <b>↗</b></a><span className="fashion-index">VOL. 03<br/>2026</span></div>
                <figure className="fashion-image fashion-image-side"><img src="https://images.unsplash.com/photo-1520367745676-56196632073f?auto=format&fit=crop&w=900&q=85" alt="Black male model posing in a streetwear look"/><figcaption>CURATED FOR YOU</figcaption></figure>
                <div className="fashion-bottom"><span>INDEPENDENT FINDS · STUDENT OWNED</span><span>STYLE THAT FEELS LIKE YOURS <b>↗</b></span></div>
              </div>
            </div>
          </article>

          <article className="hero-slide hero-slide--groove" data-slide="3" aria-roledescription="slide" aria-label="4 of 6" aria-hidden="true">
            <div className="slide-inner">
              <div className="slide-meta"><span>U/MX SELECTS</span><span>CURATED ON CAMPUS</span><a href="#discover">EXPLORE THE MARKET ↗</a></div>
              <div className="groove-layout"><div className="groove-heading"><p className="slide-kicker">04 / FIND YOUR FREQUENCY</p><h1>Good finds.<br /><em>Good feeling.</em></h1><p>From handmade details to the perfect vintage spin, discover the little things that feel like you.</p><a className="groove-link" href="#discover">Shop the student edit <b>↗</b></a></div><figure className="groove-image"><img src="https://images.unsplash.com/photo-1701374929875-37125c54cb29?auto=format&fit=crop&w=1600&q=85" alt="White turntable and vinyl record, a collectible music product"/><figcaption>THE LISTENING ROOM · STUDENT CURATED</figcaption><span className="groove-stamp">PLAY<br />IT<br />LOCAL</span></figure><span className="groove-ghost">SIDE A</span></div>
              <div className="groove-bottom"><span>SMALL SHOPS, BIG PERSONALITY</span><span>VOL. 04 — 2025</span></div>
            </div>
          </article>

          <article className="hero-slide hero-slide--claystore" data-slide="4" aria-roledescription="slide" aria-label="5 of 6" aria-hidden="true">
            <div className="slide-inner">
              <div className="claystore-cover"><img src="https://images.unsplash.com/photo-1687191883721-257d8cad5b54?auto=format&fit=crop&w=1800&q=90" alt="Handmade ceramic vessel displayed in a pottery studio"/></div>
              <header className="claystore-header"><div className="claystore-est"><span>EST</span><i></i><span>2010</span></div><p>Unique ceramics<br/>and pottery shop</p><p>Our mission is<br/>preserving long-term<br/>handmade pottery<br/>traditions</p><span className="claystore-scribble" aria-hidden="true">／⌁</span><div className="claystore-title">THE FUSION<br/>OF IMAGINATION</div><span className="claystore-bars" aria-hidden="true"></span><div className="claystore-tools"><a href="/shop" aria-label="Shop ceramics"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4L21 9H6M10 21h.01M18 21h.01"/></svg></a><a href="#discover">MENU <span>☰</span></a></div></header>
              <div className="claystore-mid"><h1>UCLAY<sup>©</sup></h1><a href="#discover">(shop all) <span>⟶</span></a><div className="claystore-swatches"><b>▮</b><b>◉</b><b>▰</b><b>◉</b><b>♧</b><small>(259)</small></div></div>
              <a className="claystore-image-link" href="/shop?category=art" aria-label="Shop handmade ceramics"></a>
            </div>
          </article>

          <article className="hero-slide hero-slide--lucko" data-slide="5" aria-roledescription="slide" aria-label="6 of 6" aria-hidden="true">
            <div className="slide-inner">
              <div className="lucko-nav"><div><a href="#discover">Home</a><a href="#discover">Directory</a></div><a className="lucko-logo" href="/marketing">Lucko</a><div className="lucko-actions"><a href="/shop" aria-label="Browse shop"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4L21 9H6M10 21h.01M18 21h.01"/></svg></a><a href="/auth/login" aria-label="Your account"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6.8 19a6 6 0 0 1 10.4 0"/></svg></a></div></div>
              <div className="lucko-cover"><div className="lucko-model lucko-model-one"><img src="https://images.unsplash.com/photo-1714383613168-5dd87a20a660?auto=format&fit=crop&w=1300&q=85" alt="African male fashion model photographed in Cape Town"/></div><div className="lucko-model lucko-model-two"><img src="https://images.unsplash.com/photo-1616259178174-b9bdb2b9913a?auto=format&fit=crop&w=1100&q=85" alt="Black woman wearing urban streetwear"/></div><div className="lucko-shade"></div><div className="lucko-pitch"><p>YOUR GUIDE TO EVERY BRAND’S SALE.</p><a href="#discover">Browse the directory <b>↗</b></a></div></div>
              <div className="lucko-wordmark" aria-hidden="true">LUCKO</div>
              <div className="lucko-search"><p>Curated finds from independent campus brands — all in one place.</p><form action="/shop" method="get"><label className="visually-hidden" htmlFor="lucko-query">Search brands, products, or discounts</label><input id="lucko-query" name="q" type="search" placeholder="⌕  Find your favourite brands, products, or discounts"/><CustomSelect value={featuredCategory} onChange={setFeaturedCategory} ariaLabel="Choose a category" options={[{ value: "", label: "All categories" }, { value: "style", label: "Style" }, { value: "food", label: "Food" }, { value: "art", label: "Art & handmade" }]}/><input type="hidden" name="category" value={featuredCategory}/></form></div>
            </div>
          </article>
        </div>
        <div className="carousel-controls" aria-label="Carousel controls"><div className="carousel-dots" role="group" aria-label="Choose a featured slide"><button className="carousel-dot is-active" type="button" aria-label="Show slide 1" aria-current="true"><span>01</span><i></i></button><button className="carousel-dot" type="button" aria-label="Show slide 2"><span>02</span><i></i></button><button className="carousel-dot" type="button" aria-label="Show slide 3"><span>03</span><i></i></button><button className="carousel-dot" type="button" aria-label="Show slide 4"><span>04</span><i></i></button><button className="carousel-dot" type="button" aria-label="Show slide 5"><span>05</span><i></i></button><button className="carousel-dot" type="button" aria-label="Show slide 6"><span>06</span><i></i></button></div><div className="carousel-actions"><button className="carousel-pause" type="button" aria-label="Pause slideshow" aria-pressed="false">Ⅱ</button><button className="carousel-prev" type="button" aria-label="Previous slide">←</button><button className="carousel-next" type="button" aria-label="Next slide">→</button></div></div>
      </section>
      <div className="ticker" aria-label="Shop student-owned, support your campus"><div className="ticker-track"><span>SHOP STUDENT-OWNED</span><b>✳</b><span>SUPPORT YOUR CAMPUS</span><b>✳</b><span>FIND YOUR NEXT FAVOURITE</span><b>✳</b><span>SHOP STUDENT-OWNED</span><b>✳</b><span>SUPPORT YOUR CAMPUS</span><b>✳</b></div></div>
      <section className="section wrap discover" id="discover">
        <div className="section-heading"><div><p className="eyebrow">A MARKETPLACE WITH A POINT OF VIEW</p><h2>Find the <span className="serif">good stuff.</span></h2></div><a className="text-link" href="/shop">Browse everything <span>→</span></a></div>
        <div className="category-row">
          <a href="/shop?category=style" className="category cat-style"><span className="category-photo"><img src="https://images.unsplash.com/photo-1681747685985-a401c271156c?auto=format&fit=crop&w=900&q=85" alt="Pink leather handbag with gold hardware" loading="lazy"/><span className="category-number">01 / STYLE</span></span><span className="category-content"><span className="category-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14l1 12H4l1-12Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg></span><span className="category-copy"><b>Style & accessories</b><small>Pieces with personality</small></span><span className="category-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span></span></a>
          <a href="/shop?category=food" className="category cat-food"><span className="category-photo"><img src="https://images.unsplash.com/photo-1747459707225-65744d0ae6be?auto=format&fit=crop&w=900&q=85" alt="Freshly baked croissants arranged on a tray" loading="lazy"/><span className="category-number">02 / FOOD</span></span><span className="category-content"><span className="category-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v7M9 3v7M6 7h3M7.5 10v11M16 3c-2 2-3 5-3 8h3v10M16 3v8"/></svg></span><span className="category-copy"><b>Food & treats</b><small>A little something good</small></span><span className="category-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span></span></a>
          <a href="/shop?category=art" className="category cat-art"><span className="category-photo"><img src="https://images.unsplash.com/photo-1687191883721-257d8cad5b54?auto=format&fit=crop&w=900&q=85" alt="Handmade ceramic vase in a minimal studio setting" loading="lazy"/><span className="category-number">03 / HANDMADE</span></span><span className="category-content"><span className="category-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c4 0 7 2.8 7 6.2 0 2.1-1.1 3.5-2.5 4.8-.9.9-1.5 1.7-1.5 3.1V19a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1.9c0-1.4-.6-2.2-1.5-3.1C6.1 12.7 5 11.3 5 9.2 5 5.8 8 3 12 3Z"/><path d="M9 8c1-1 2-1 3 0s2 1 3 0M9 11h.01M15 11h.01"/></svg></span><span className="category-copy"><b>Art & handmade</b><small>Made by hand, made with heart</small></span><span className="category-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span></span></a>
          <a href="/shop?category=services" className="category cat-services"><span className="category-photo"><img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=85" alt="Laptop and tools at a creative workspace" loading="lazy"/><span className="category-number">04 / SERVICES</span></span><span className="category-content"><span className="category-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4M7 9l2 2 4-4M15 12h3"/></svg></span><span className="category-copy"><b>Services & more</b><small>Local talent lives here</small></span><span className="category-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></span></span></a>
        </div>
      </section>
      <section className="seller-band" id="sellers"><div className="seller-inner wrap"><div className="seller-copy"><p className="eyebrow">YOUR IDEA DESERVES A SHELF</p><h2>Make your side<br />thing your <span className="serif">main thing.</span></h2><p>Set up your store, show off what you make, and find the people who are looking for exactly that. Your next chapter starts here.</p><a className="button button-dark" href="/auth/seller/register">Start your store <span>↗</span></a><small>Free to get started · Built for student businesses</small></div><div className="seller-visual"><div className="seller-window"><div className="window-bar"><i></i><i></i><i></i><span>yourbrand.unimartx.com</span></div><div className="window-cover"><span className="cover-label">YOUR BRAND, YOUR WAY</span><strong>the little<br /><em>things studio</em></strong><span className="cover-cta">SHOP THE COLLECTION　↗</span></div><div className="window-items"><span>Handmade with intention</span><span>01 / NEW ARRIVALS</span></div></div><div className="seller-stamp">YOUR<br />STORE<br /><b>✳</b></div><div className="seller-spark">✳</div></div></div></section>
      <section className="steps wrap"><div className="section-heading"><div><p className="eyebrow">EASY AS ONE, TWO, YOU</p><h2>Good things <span className="serif">start small.</span></h2></div><p className="steps-aside">You bring the idea.<br />We’ll help with the rest.</p></div><div className="step-grid"><article><span className="step-number">01</span><span className="step-icon">⌕</span><h3>Find your thing</h3><p>Explore student-led shops and discover thoughtful products and services from your community.</p></article><article><span className="step-number">02</span><span className="step-icon">✳</span><h3>Bring your idea</h3><p>Set up your own storefront and make it feel like you. No code or complicated setup required.</p></article><article><span className="step-number">03</span><span className="step-icon">↗</span><h3>Grow together</h3><p>Meet customers, share your work, and build something that can grow beyond campus.</p></article></div></section>
      <section className="closing wrap"><div><p className="eyebrow">A LITTLE MORE YOU. A LITTLE MORE US.</p><h2>There’s room for<br /><span className="serif">your kind of good.</span></h2></div><a className="button button-light" href="/auth/seller/register">Come make it yours <span>↗</span></a><span className="closing-flower" aria-hidden="true">✳</span></section>
    </main>
    <footer className="footer"><div className="footer-main wrap"><div className="footer-brand"><a className="brand" href="/marketing"><span className="brand-mark">u</span> unimart<span className="brand-x">x</span></a><p>A marketplace for ideas made<br />right here in our community.</p></div><div className="footer-col"><b>Explore</b><a href="/shop">Marketplace</a><a href="/shop/stores">Student stores</a><a href="#sellers">Sell with us</a></div><div className="footer-col"><b>UniMartX</b><a href="/marketing/about">Our story</a><a href="/marketing/faq">FAQs</a><a href="/marketing/contact">Contact</a></div><div className="footer-col"><b>Say hello</b><a href="mailto:hello@unimartx.com">hello@unimartx.com</a><span>Made for the makers.</span></div></div><div className="footer-bottom wrap"><span>© 2025 UniMartX</span><div><a href="/public/info/terms.html">Terms</a><a href="/public/info/privacy.html">Privacy</a></div><span>Made with care in Ghana <b>✳</b></span></div></footer>
  
    </>
  );
}
