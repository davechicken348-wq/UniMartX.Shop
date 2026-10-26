import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type FormEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL, type AuthUser } from '../../lib/auth';
import MarketIcon, { type MarketIconName } from '../../components/marketplace/MarketIcon';
import StoreProductImage from '../../components/marketplace/StoreProductImage';
import BuilderColorPicker from '../../components/seller/BuilderColorPicker';
import BuilderImagePicker from '../../components/seller/BuilderImagePicker';
import { STOREFRONT_FONT_GROUPS, storefrontFontStack } from '../../lib/storefront-typography';
import { DEFAULT_STOREFRONT_PAGE_LAYOUTS, STOREFRONT_PAGE_LAYOUTS, storefrontPageLayout, storefrontPageLayoutDefinition, type StorefrontPageKey } from '../../lib/storefront-page-layouts';
import './seller-workspace.css';
import './storefront-template-compositions.css';
import './product-card-customization.css';

type Profile = { firstName: string; lastName: string; email: string; storeName: string; storeDescription: string; storeTagline: string; category: string; city: string; country: string; slug: string; storeAvatar: string | null; storeBanner: string | null; storeColor: string; pickupAddress: string; deliveryFee: number | null; isActive: boolean; [key: string]: string | number | boolean | null };
type Product = { id: string; name: string; description?: string; price: number; comparePrice?: number | null; costPrice?: number | null; stock: number; category: string; subcategory?: string | null; condition?: string | null; tags?: string[]; image?: string | null; images?: (string | null)[]; details?: Record<string, unknown> | null; deliveryFee?: number | null; isActive: boolean; updatedAt: string };
type Order = { id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string; fulfillmentType?: string | null; buyer: { firstName: string; lastName: string }; items: { id?: string; quantity: number; price?: number | string; product: { id?: string; name: string; price?: number | string; image?: string | null } }[] };
type OrderDetail = Order & { fulfillmentType?: string | null; sellerDeliveryFee?: number | string | null; notes?: string | null; buyer: Order['buyer'] & { email?: string; phone?: string | null }; address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string; notes?: string | null } | null; items: { id: string; quantity: number; price: number | string; product: { id: string; name: string; price: number | string; image?: string | null } }[] };
type Dashboard = { stats: { revenue: number; orders: number; pending: number; processingOrShipped: number; delivered: number; rating: number | null; products: number; followers: number; lowStock: number }; recentOrders: { id: string; orderNumber: string; status: string; totalAmount: number; productName: string }[]; topProducts: { name: string; sales: number; revenue: number; image?: string | null }[]; chartData: number[]; chartLabels: string[] };
type SellerNotification = { id: string; type: string; title: string; message: string; read: boolean; createdAt: string; actionUrl?: string | null; icon?: string | null; priority?: string; orderId?: string | null; productId?: string | null };
type SellerAnalytics = { period: string; stats: { revenue: number; orders: number; customers: number; productsSold: number; revenueChange: number; ordersChange: number; customersChange: number; productsChange: number }; chartData: number[]; chartLabels: string[]; topProducts: { name: string; units: number; revenue: number; image?: string | null }[] };
type ApiEnvelope<T> = { success?: boolean; data?: T; message?: string; error?: string; details?: { field?: string; message?: string }[] };
type StorePageKey = 'products' | 'categories' | 'about' | 'contact' | 'reviews';
type StoreSection = { id: string; type: string; shopCategories?: unknown; productSelectionMode?: unknown; selectedProductIds?: unknown; [key: string]: unknown };
type StoreCanvasPage = { id: string; page: 'home' | StorePageKey; x: number; y: number };
type StoreConfig = { template: string; templateId?: string; colors: Record<string, string>; typography: Record<string, string>; layout: Record<string, string | number | boolean | undefined | Record<string, unknown>>; sections: StoreSection[]; pageSections?: Partial<Record<StorePageKey, StoreSection[]>>; pageLayouts?: Partial<Record<StorefrontPageKey, string>>; canvasPages?: StoreCanvasPage[]; pageConnections?: { from: 'home'; to: StorePageKey }[] };
type StorefrontTemplate = { id: string; name: string; category: string; style: string; description: string; place: string; colors: Record<string, string>; headingFont: string; bodyFont: string; layout: StoreConfig['layout'] & { productGrid: number; sectionSpacing: string; navBackground: string; navTextColor: string; navAccentColor: string; navShowSearch?: boolean; navShowLocation?: boolean; navHomeLabel?: string; navShopLabel?: string; navAboutLabel?: string; footerBackground: string; footerTextColor: string; footerAccentColor: string; footerMessage?: string; footerLinkText?: string }; sections: StoreSection[] };
const emptyProfile: Profile = { firstName: '', lastName: '', email: '', storeName: '', storeDescription: '', storeTagline: '', category: '', city: '', country: 'Ghana', slug: '', storeAvatar: null, storeBanner: null, storeColor: '#55764e', pickupAddress: '', deliveryFee: null, isActive: false };
const defaultConfig: StoreConfig = { template: 'minimal', colors: { primary: '#55764e', accent: '#d6a74f', background: '#ffffff', text: '#20291f', muted: '#788174' }, typography: { headingFont: 'DM Sans', bodyFont: 'DM Sans', headingStyle: 'clean', textScale: 'balanced' }, layout: { storeWidth: 'comfortable', productGrid: 3, sectionSpacing: 'comfortable', navShowLogo: true, navBrandMode: 'store', navShowLinks: true, navShowSearch: true, navShowLocation: true, navShowActions: true, navSticky: false, navLayout: 'standard', navHeight: 'theme', navLogoSize: 32, navLinkGap: 24, navDecoration: 'plain', navBackground: '#ffffff', navTextColor: '#303832', navAccentColor: '#55764e', navHomeLabel: 'Home', navShopLabel: 'Shop', navAboutLabel: 'About', footerVisible: true, footerShowBrand: true, footerShowSellerLink: true, footerMessage: 'Good things, close to home.', footerLinkText: 'Contact us', footerLinkUrl: '/marketing/contact', footerBackground: '#f5f6f2', footerTextColor: '#596258', footerAccentColor: '#55764e' }, canvasPages: [{ id: 'home-canvas', page: 'home', x: 60, y: 55 }], sections: [{ id: 'hero-1', type: 'hero', buttonText: 'Explore the shop', visible: true }, { id: 'about-1', type: 'about', heading: 'A little about our store', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'Made with care', visible: true }] };
const instrumentShopCategoryDefaults = ['New & Trending', 'Electric Guitars', 'Electric Basses', 'Acoustic Instruments', 'Amps & Effects', 'Parts'];
function instrumentShopCategories(section: { shopCategories?: unknown }) { return Array.isArray(section.shopCategories) ? section.shopCategories.map((item) => String(item).trim()).filter(Boolean) : instrumentShopCategoryDefaults; }
const nav = [{ id: 'overview', label: 'Home', icon: 'compass' }, { id: 'builder', label: 'Store builder', icon: 'shop' }, { id: 'products', label: 'Products', icon: 'package' }, { id: 'orders', label: 'Orders', icon: 'bag' }, { id: 'insights', label: 'Insights', icon: 'sparkle' }, { id: 'settings', label: 'Store settings', icon: 'settings' }, { id: 'help', label: 'Help center', icon: 'sparkle' }] as const;
const sellerHelpTopics = ['All topics', 'Getting started', 'Products', 'Orders & delivery', 'Storefront', 'Insights'];
const sellerHelpArticles = [
  { id: 'launch', topic: 'Getting started', question: 'What should I do before launching my store?', answer: 'Add your store name, a short description, and a recognizable logo or cover image. Then list at least one product, check your pickup and delivery details, and publish from Store builder when everything looks ready.', link: '/seller/settings/store', linkLabel: 'Complete store settings' },
  { id: 'first-product', topic: 'Products', question: 'How do I add a product with multiple photos?', answer: 'Open Products and choose Add product. Fill in the listing details, then select up to five clear photos. Use the left and right controls to choose their order; the first photo becomes the cover image.', link: '/seller/products/new', linkLabel: 'Add a product' },
  { id: 'categories', topic: 'Products', question: 'Can I create my own product categories?', answer: 'Yes. In the product form, choose an existing category or add a category for your own shop. Use names your customers will understand, such as “Handmade bags” or “Campus essentials”.', link: '/seller/products/new', linkLabel: 'Manage products' },
  { id: 'edit-product', topic: 'Products', question: 'How do I update a listing or its stock?', answer: 'Go to Products, find the item, and select Edit. Update its details, price, photos, or stock, then save your changes. The product list also shows low stock so you can restock in time.', link: '/seller/products', linkLabel: 'Open products' },
  { id: 'order-flow', topic: 'Orders & delivery', question: 'What happens when a new order comes in?', answer: 'A new order appears in Orders and in your notification menu. Open it to see the items and buyer details. Confirm the order, prepare it, and update its status as it moves toward delivery or collection.', link: '/seller/orders', linkLabel: 'View orders' },
  { id: 'delivery', topic: 'Orders & delivery', question: 'Where do I set pickup and delivery details?', answer: 'Open Store settings, then choose Delivery. Add your pickup address, city, country, and default delivery fee. Product listings also let you choose whether each item is available for pickup, delivery, or both.', link: '/seller/settings/delivery', linkLabel: 'Set delivery details' },
  { id: 'publish', topic: 'Storefront', question: 'How do I preview and publish my storefront?', answer: 'Open Store builder to arrange your pages and update the design. Preview the draft, make any final changes, then choose Publish. You can return to the builder whenever you want to update your shop.', link: '/seller/builder', linkLabel: 'Open Store builder' },
  { id: 'insights', topic: 'Insights', question: 'What does the Insights page show?', answer: 'Choose a period to see revenue, orders, customers, and units sold compared with the previous period of the same length. The chart and top products update to match your selection.', link: '/seller/insights', linkLabel: 'Explore insights' },
];

function money(value: number) { return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(Number(value || 0)); }
function storefrontNavHeight(template: string, setting: unknown) { return setting === 'compact' ? '52px' : setting === 'spacious' ? '76px' : setting === 'standard' ? '64px' : template === 'minimal' ? '50px' : template === 'editorial' ? '70px' : '66px'; }
function sectionProducts<T extends { id: string }>(products: T[], section: { productSelectionMode?: unknown; selectedProductIds?: unknown }) { if (section.productSelectionMode !== 'manual' || !Array.isArray(section.selectedProductIds)) return products; const byId = new Map(products.map((product) => [product.id, product])); return section.selectedProductIds.map((id) => byId.get(String(id))).filter((product): product is T => Boolean(product)); }
function sectionCategories(section: { shopCategories?: unknown }, products: Product[]) { return Array.isArray(section.shopCategories) ? section.shopCategories.map(String).map((item) => item.trim()).filter(Boolean) : [...new Set(products.map((product) => product.category).filter(Boolean))].slice(0, 4); }

const storefrontTemplates: StorefrontTemplate[] = [
  { id: 'accra-edit', name: 'The Accra Edit', category: 'Fashion', style: 'editorial', description: 'A bold fashion storefront with oversized campaign imagery and clean product edits.', place: 'Accra, Ghana', colors: { primary: '#b6382e', accent: '#e8ae44', background: '#fffaf3', text: '#241e1b', muted: '#81766d' }, headingFont: 'DM Sans', bodyFont: 'DM Sans', layout: { productGrid: 3, sectionSpacing: 'spacious', navBackground: '#fffaf3', navTextColor: '#241e1b', navAccentColor: '#b6382e', navShowSearch: false, navShowLocation: false, footerBackground: '#241e1b', footerTextColor: '#fffaf3', footerAccentColor: '#e8ae44' }, sections: [{ id: 'hero-1', type: 'hero', heading: 'The art of simplicity.', description: 'Designed for modern living. Refined silhouettes, premium fabrics, and versatile essentials made for every day.', buttonText: 'Explore collection', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'Most wanted', visible: true }, { id: 'about-1', type: 'about', heading: 'Less, better.', visible: true }] },
  { id: 'highlife-sound', name: 'Tone Forge', category: 'Music & instruments', style: 'market', description: 'A product-first guitar and gear shop with warm studio imagery and a clean catalog.', place: 'Osu, Accra', colors: { primary: '#24231c', accent: '#d6a74f', background: '#d9dac2', text: '#24231c', muted: '#777564' }, headingFont: 'Manrope', bodyFont: 'Inter', layout: { productGrid: 3, sectionSpacing: 'comfortable', navBackground: '#d9dac2', navTextColor: '#24231c', navAccentColor: '#24231c', navShowSearch: false, navShowLocation: false, navHomeLabel: 'Shop', navShopLabel: 'Events', navAboutLabel: 'About', footerBackground: '#2d2d22', footerTextColor: '#e5e5ce', footerAccentColor: '#d6a74f' }, sections: [{ id: 'hero-1', type: 'hero', eyebrow: '’60s Collection / Model #158842', heading: 'AMERICAN VINTAGE II 1966 JAZZMASTER', description: 'A faithful vintage-inspired electric guitar with a bright, expressive voice, carefully selected components, and a feel made for the stage.', buttonText: 'Add to cart', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'NEW & TRENDING', shopSidebarHeading: 'SHOP', shopCategories: instrumentShopCategoryDefaults, showShopSidebar: true, visible: true }, { id: 'about-1', type: 'about', heading: 'Made for the long way around', visible: true }] },
  { id: 'aburi-living', name: 'Aburi Living', category: 'Home & furniture', style: 'minimal', description: 'A calm, gallery-like shop for furniture, ceramics and thoughtful homewares.', place: 'Aburi, Eastern Region', colors: { primary: '#536452', accent: '#c5a878', background: '#f4f1e9', text: '#282b25', muted: '#7f8176' }, headingFont: 'DM Sans', bodyFont: 'DM Sans', layout: { productGrid: 3, sectionSpacing: 'spacious', navBackground: '#f4f1e9', navTextColor: '#282b25', navAccentColor: '#536452', footerBackground: '#e8e5da', footerTextColor: '#41453c', footerAccentColor: '#536452' }, sections: [{ id: 'hero-1', type: 'hero', heading: 'A softer kind of home', buttonText: 'Explore the collection', visible: true }, { id: 'about-1', type: 'about', heading: 'Made for everyday rituals', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'Objects to live with', visible: true }] },
  { id: 'kente-and-craft', name: 'Kente & Craft', category: 'Artisan goods', style: 'editorial', description: 'An expressive, story-first layout for handmade goods, textiles and makers.', place: 'Bonwire, Ashanti Region', colors: { primary: '#63383a', accent: '#e5b681', background: '#f5f4f1', text: '#241f1e', muted: '#786e68' }, headingFont: 'DM Sans', bodyFont: 'DM Sans', layout: { productGrid: 3, sectionSpacing: 'comfortable', navBackground: '#f5f4f1', navTextColor: '#241f1e', navAccentColor: '#63383a', footerBackground: '#241f1e', footerTextColor: '#fff8eb', footerAccentColor: '#e5b681' }, sections: [{ id: 'hero-1', type: 'hero', heading: 'GRAND PORCELAIN', eyebrow: 'TABLEWARE · HOME ACCENTS', description: 'A thoughtfully selected collection of tableware and home accents, designed to make every meal feel special.', buttonText: 'Explore the collection', visible: true }, { id: 'about-1', type: 'about', heading: 'Beautiful things make room for beautiful moments.', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'New collections', visible: true }] },
  { id: 'shea-ritual', name: 'Shea Ritual', category: 'Beauty & wellness', style: 'minimal', description: 'A fresh, ingredient-led canvas for skincare, beauty and self-care brands.', place: 'Tamale, Northern Region', colors: { primary: '#65724b', accent: '#d69a6b', background: '#fffaf2', text: '#292820', muted: '#858072' }, headingFont: 'DM Sans', bodyFont: 'DM Sans', layout: { productGrid: 3, sectionSpacing: 'comfortable', navBackground: '#fffaf2', navTextColor: '#292820', navAccentColor: '#65724b', footerBackground: '#e8eadb', footerTextColor: '#414638', footerAccentColor: '#65724b' }, sections: [{ id: 'hero-1', type: 'hero', heading: 'Care, rooted in Ghana', buttonText: 'Find your ritual', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'Your daily essentials', visible: true }, { id: 'about-1', type: 'about', heading: 'Simple ingredients. Thoughtful care.', visible: true }] },
  { id: 'market-day', name: 'Market Day', category: 'Food & groceries', style: 'market', description: 'A vibrant, flavor-first shop for pantry staples, spices, and local treats.', place: 'Makola Market, Accra', colors: { primary: '#111111', accent: '#dfff4f', background: '#fff0c7', text: '#111111', muted: '#675a4f' }, headingFont: 'Manrope', bodyFont: 'Inter', layout: { productGrid: 4, sectionSpacing: 'comfortable', navBackground: '#fff0c7', navTextColor: '#111111', navAccentColor: '#111111', footerBackground: '#111111', footerTextColor: '#fff0c7', footerAccentColor: '#dfff4f' }, sections: [{ id: 'hero-1', type: 'hero', eyebrow: 'FLAVO · BOLD BLENDS, BIG FLAVOR', heading: 'ELEVATE YOUR CULINARY CREATIONS', description: 'Versatile and easy to use, our blends bring bold flavor to every kitchen and every meal.', buttonText: 'Shop all products', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'Discover new tastes', visible: true }, { id: 'about-1', type: 'about', heading: 'A little more flavor in every day', visible: true }] },
  { id: 'coastline-tech', name: 'Coastline Tech', category: 'Electronics', style: 'minimal', description: 'A crisp, product-focused layout for devices, accessories and tech essentials.', place: 'Tema, Greater Accra', colors: { primary: '#171d20', accent: '#e92745', background: '#ffffff', text: '#111719', muted: '#667176' }, headingFont: 'Manrope', bodyFont: 'Inter', layout: { productGrid: 3, sectionSpacing: 'comfortable', navBackground: '#ffffff', navTextColor: '#111719', navAccentColor: '#e92745', footerBackground: '#171d20', footerTextColor: '#ffffff', footerAccentColor: '#e92745' }, sections: [{ id: 'hero-1', type: 'hero', eyebrow: 'UPTECH · EVERYDAY INNOVATION', heading: 'Redefining Your Tech Experience', description: 'Discover useful, well designed technology for work, play, and everything in between.', buttonText: 'Browse Products', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'Featured Products', maxProducts: 3, productColumns: 3, visible: true }, { id: 'tech-categories', type: 'categories', heading: 'Shop By Category', visible: true }, { id: 'tech-collection', type: 'catalog', heading: 'Explore Collection', maxProducts: 6, productColumns: 3, visible: true }] },
  { id: 'gold-coast-collective', name: 'Gold Coast Collective', category: 'Lifestyle & gifts', style: 'editorial', description: 'A premium editorial storefront for curated gifts, accessories and local finds.', place: 'Cape Coast, Central Region', colors: { primary: '#5e6651', accent: '#b28a5a', background: '#f2ebe2', text: '#20231f', muted: '#77756e' }, headingFont: 'DM Sans', bodyFont: 'DM Sans', layout: { productGrid: 3, sectionSpacing: 'spacious', navBackground: '#f2ebe2', navTextColor: '#20231f', navAccentColor: '#5e6651', footerBackground: '#20231f', footerTextColor: '#f2ebe2', footerAccentColor: '#b28a5a' }, sections: [{ id: 'hero-1', type: 'hero', eyebrow: 'GOLD COAST COLLECTIVE · CAPE COAST', heading: 'Discover the beauty of the world around you.', description: 'Thoughtful finds, memorable places, and everyday pieces that make life feel a little more considered.', buttonText: 'Explore the collection', visible: true }, { id: 'about-1', type: 'about', heading: 'A little piece of somewhere special', visible: true }, { id: 'featured-1', type: 'featured-products', heading: 'Find your next favourite', visible: true }] },
];

const templateHeroImages: Record<string, string> = {
  'accra-edit': 'https://images.unsplash.com/photo-1783013957035-e28473afa2ab?auto=format&fit=crop&w=1600&q=90',
  'highlife-sound': 'https://images.unsplash.com/photo-1616066959736-5983a58b2071?auto=format&fit=crop&w=1800&q=90',
  'aburi-living': 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1600&q=90',
  'kente-and-craft': 'https://images.unsplash.com/photo-1631125915973-e0d155a14e4e?auto=format&fit=crop&w=1800&q=90',
  'gold-coast-collective': 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=90',
  'shea-ritual': 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1600&q=90',
  'market-day': 'https://images.unsplash.com/photo-1678019964614-a6515d5efd44?auto=format&fit=crop&w=1600&q=90',
  'coastline-tech': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=2000&q=90',
};

const electronicsCategoryArtwork: Record<string, string> = {
  Audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
  Screens: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85',
  Camera: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85',
};
const fashionCampaignImages = {
  everyday: 'https://images.unsplash.com/photo-1783013957035-e28473afa2ab?auto=format&fit=crop&w=1400&q=90',
  streetwear: 'https://images.unsplash.com/photo-1616259178174-b9bdb2b9913a?auto=format&fit=crop&w=1400&q=90',
  editorial: 'https://images.unsplash.com/photo-1520367745676-56196632073f?auto=format&fit=crop&w=1400&q=90',
  campaign: 'https://images.unsplash.com/photo-1714383613168-5dd87a20a660?auto=format&fit=crop&w=1400&q=90',
};

function templateHomeLayout(templateId: string) {
  return ['accra-edit', 'gold-coast-collective', 'kente-and-craft'].includes(templateId) ? 'home-editorial' : ['market-day', 'coastline-tech'].includes(templateId) ? 'home-collection' : 'home-featured';
}

function StorefrontTemplatePreview({ template, products, profile }: { template: (typeof storefrontTemplates)[number]; products: Product[]; profile: Profile }) {
  const navStyle = { position: 'relative', backgroundColor: template.layout.navBackground, color: template.layout.navTextColor, '--builder-nav-accent': template.layout.navAccentColor, '--seller-nav-height': storefrontNavHeight(template.style, 'theme'), '--seller-nav-logo-size': '32px', '--seller-nav-link-gap': '24px' } as CSSProperties;
  const previewStyle = { backgroundColor: template.colors.background, color: template.colors.text, fontFamily: storefrontFontStack(template.bodyFont), '--seller-store-color': template.colors.primary, '--seller-store-accent': template.colors.accent, '--seller-store-background': template.colors.background, '--seller-store-ink': template.colors.text, '--seller-heading-font': storefrontFontStack(template.headingFont), '--seller-body-font': storefrontFontStack(template.bodyFont), '--builder-section-gap': template.layout.sectionSpacing === 'spacious' ? '42px' : '26px', '--seller-nav-height': storefrontNavHeight(template.style, 'theme'), '--seller-nav-logo-size': '32px', '--seller-nav-link-gap': '24px' } as CSSProperties;
  return <div className={`seller-store-canvas seller-builder-mini-store seller-template-preview-canvas is-${template.style} is-store-template-${template.id} seller-page-layout-home seller-page-style-${templateHomeLayout(template.id)}`} style={previewStyle}>
    <div className="seller-store-canvas-nav is-layout-standard is-decoration-plain" style={navStyle}><div className="seller-store-nav-brand"><a><b>{profile.storeAvatar ? <img src={profile.storeAvatar} alt=""/> : profile.storeName?.[0] || 'G'}</b></a><strong>{profile.storeName || (template.id === 'highlife-sound' ? 'TONE FORGE' : 'Your store')}</strong></div><nav className="seller-store-nav-links">{template.id === 'highlife-sound' ? <><a>Shop</a><a>Events</a><a>About</a><a>Contact</a></> : <><a>Home</a><a>Shop</a><a>About</a></>}</nav><div className="seller-store-nav-tools">{template.id !== 'highlife-sound' && <><label className="seller-storefront-search"><MarketIcon name="search" size={15}/><input placeholder="Search this store" disabled/></label><span className="seller-storefront-location"><MarketIcon name="location" size={14}/>{profile.city || 'Ghana'}</span></>}<span className="seller-storefront-cart"><MarketIcon name="bag" size={15}/></span></div></div>
    <div className="seller-store-content">{template.sections.map((section) => {
      if (section.type === 'hero') {
        const image = String(section.image || templateHeroImages[template.id] || '');
        const porcelainHero = template.id === 'kente-and-craft';
        const foodHero = template.id === 'market-day';
        const lifestyleHero = template.id === 'gold-coast-collective';
        const electronicsHero = template.id === 'coastline-tech';
        const heroProduct = products.find((product) => product.id === String(section.featuredProductId || '')) || products[0];
        return <div key={section.id} className={`seller-store-canvas-hero${electronicsHero ? ' is-electronics-hero' : ''}${porcelainHero ? ' is-grand-porcelain' : ''}${foodHero ? ' is-flavo-food' : ''}${lifestyleHero ? ' is-gold-coast-lifestyle' : ''}`} style={!image || porcelainHero || foodHero || lifestyleHero ? undefined : { backgroundImage: `${template.id === 'accra-edit' ? 'linear-gradient(90deg,transparent 0 48%,#fffaf3 48% 100%),' : template.id === 'highlife-sound' ? 'linear-gradient(90deg,#d9dac2 0 34%,rgb(217 218 194 / 88%) 44%,transparent 68%),' : electronicsHero ? 'linear-gradient(90deg,rgb(8 15 19 / 10%),rgb(8 15 19 / 25%)),' : 'linear-gradient(90deg,rgb(16 26 23 / 45%),rgb(16 26 23 / 10%)),'}url("${image}")`, backgroundPosition: template.id === 'highlife-sound' ? 'right center' : 'center', backgroundSize: 'cover' }}>{foodHero && <div className="food-template-hero-art"><img src={image} alt="Spices and seasonings"/><span>{String(section.mediaCaption || section.eyebrow || 'FLAVO · BLENDS FOR EVERY TABLE')}</span></div>}{lifestyleHero && <div className="gold-coast-hero-image"><img src={image} alt="A scenic destination at golden hour"/><span>{String(section.locationLabel || `${profile.city || 'CAPE COAST'} · GHANA`)}</span>{heroProduct && <div className="gold-coast-feature-card"><span><StoreProductImage sources={[heroProduct.image, ...(heroProduct.images || [])]} alt={heroProduct.name}/></span><div><small>{String(section.featureEyebrow || 'CURATED FOR YOU')}</small><b>{heroProduct.name}</b><p>{heroProduct.category || 'A thoughtful find for your everyday'}</p><i>{String(section.featureLinkText || 'Discover more')} ↗</i></div></div>}</div>}<div><small>{String(section.eyebrow || `${profile.city || 'GHANA'} · INDEPENDENT SHOP`)}</small><h1>{String(section.heading || template.name)}</h1><p>{String(section.description || template.description)}</p>{(!porcelainHero || foodHero || lifestyleHero) && <button>{String(section.buttonText || 'Explore the shop')} <MarketIcon name="arrow" size={15}/></button>}</div>{porcelainHero && <div className="grand-porcelain-hero-gallery">{sectionProducts(products, section).slice(0, Number(section.heroProductCount) || 5).map((product, index) => <div className={`grand-porcelain-hero-product is-item-${index + 1}`} key={product.id}><span><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><small>{product.category || 'TABLEWARE'}</small><b>{product.name}</b></div>)}{!products.length && <div className="grand-porcelain-hero-note">{String(section.emptyStateText || 'Objects for slow mornings, shared meals, and all the moments in between.')}</div>}</div>}</div>;
      }
      if (section.type === 'featured-products' || section.type === 'catalog') { const visibleProducts = sectionProducts(products, section); return <div key={section.id} className={`seller-store-canvas-products ${template.id === 'highlife-sound' ? 'is-instrument-shop' : ''} ${template.id === 'coastline-tech' ? 'is-electronics-products' : ''}`}>
        {template.id === 'highlife-sound' && section.showShopSidebar !== false && <aside className="seller-instrument-shop-sidebar"><h2>{String(section.shopSidebarHeading || 'SHOP')}</h2>{instrumentShopCategories(section).map((category, index) => <span key={`${category}-${index}`}>{category}</span>)}</aside>}
        <div><span><small>{String(section.eyebrow || (template.id === 'highlife-sound' ? 'TONE FORGE / SELECTED GEAR' : section.type === 'catalog' ? 'THE LATEST AND GREATEST' : 'THE COLLECTION'))}</small><h2>{String(section.heading || 'Featured products')}</h2></span><button>{String(section.buttonText || 'Shop all')} <MarketIcon name="arrow" size={13}/></button></div>
        <div className="seller-canvas-product-grid" style={{ '--seller-preview-columns': Number(section.productColumns || template.layout.productGrid || 3) } as CSSProperties}>{visibleProducts.slice(0, Number(section.maxProducts) || 3).map((product) => <article key={product.id}><span className="seller-canvas-product-media"><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><b>{product.name}</b><small>{money(product.price)}</small></article>)}{visibleProducts.length === 0 && <div className="seller-canvas-empty-products"><MarketIcon name="package" size={22}/><span>{section.productSelectionMode === 'manual' ? 'Choose products for this section' : 'Your products will appear here'}</span></div>}</div>
      </div>; }
      if (section.type === 'categories' && template.id === 'coastline-tech') {
        const tileNames = sectionCategories(section, products);
        return <section key={section.id} className="seller-store-canvas-added seller-store-category-directory is-electronics-categories"><small>{String(section.eyebrow || 'FIND YOUR NEXT FAVOURITE')}</small><h2>{String(section.heading || 'Shop By Category')}</h2>{Boolean(section.description) && <p>{String(section.description)}</p>}<div className="electronics-category-grid">{tileNames.map((name, index) => { const product = products.find((item) => item.category === name); const fallbackName = ['Audio', 'Screens', 'Camera'][index % 3]; return <article key={`${name}-${index}`}><span>{product ? <StoreProductImage sources={[product.image, ...(product.images || []), electronicsCategoryArtwork[fallbackName]]} alt={String(name)}/> : <img src={electronicsCategoryArtwork[String(name)] || electronicsCategoryArtwork[fallbackName]} alt=""/>}</span><b>{String(name).toUpperCase()}</b></article>; })}</div></section>;
      }
      if (section.type === 'about') return <div key={section.id} className="seller-store-canvas-feature"><div className="seller-store-canvas-about"><small>{String(section.eyebrow || 'THE STORY')}</small><h2>{String(section.heading || 'A little story about our shop.')}</h2><p>{String(section.description || profile.storeDescription || 'We bring together thoughtful pieces, made with care and chosen to make everyday moments feel special.')}</p><button>{String(section.linkText || 'Our story')} <MarketIcon name="arrow" size={13}/></button></div><div className="seller-store-canvas-image" style={section.image ? { backgroundImage: `url("${String(section.image)}")`, backgroundPosition: String(section.imagePosition || 'center'), backgroundSize: String(section.imageFit || 'cover') } : {}}><span>{String(section.imageCaption || 'MADE WITH CARE')}</span></div></div>;
      return null;
    })}</div>
    <footer className="seller-store-canvas-footer" style={{ backgroundColor: template.layout.footerBackground, color: template.layout.footerTextColor }}><b>{profile.storeName || 'Your store'}</b><span>{String(template.layout.footerMessage || 'Good things, close to home.')}</span><a>{String(template.layout.footerLinkText || 'Contact us')} ↗</a></footer>
  </div>;
}

function imageColorHsl(hex: string) {
  const red = parseInt(hex.slice(1, 3), 16) / 255; const green = parseInt(hex.slice(3, 5), 16) / 255; const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); const delta = max - min; let hue = 0;
  if (delta) { if (max === red) hue = ((green - blue) / delta) % 6; else if (max === green) hue = (blue - red) / delta + 2; else hue = (red - green) / delta + 4; hue *= 60; if (hue < 0) hue += 360; }
  return { h: hue, s: max === 0 ? 0 : delta / max * 100, l: (max + min) / 2 * 100 };
}

function imageStyleColor(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100; const section = hue / 60; const secondary = chroma * (1 - Math.abs(section % 2 - 1)); const offset = lightness / 100 - chroma / 2;
  const [red, green, blue] = section < 1 ? [chroma, secondary, 0] : section < 2 ? [secondary, chroma, 0] : section < 3 ? [0, chroma, secondary] : section < 4 ? [0, secondary, chroma] : section < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
  return `#${[red, green, blue].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function BuilderRangeControl({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const formattedValue = `${value}${suffix}`;
  return <label className="seller-inspector-field seller-inspector-range">
    <span className="seller-range-heading"><span>{label}</span><b>{formattedValue}</b></span>
    <span className="seller-range-control">
      <input aria-label={label} type="range" min={min} max={max} value={value} style={{ '--range-progress': `${percent}%`, '--range-tooltip-position': `clamp(23px, ${percent}%, calc(100% - 23px))` } as CSSProperties} onChange={(event) => onChange(Number(event.target.value))}/>
      <output>{formattedValue}</output>
    </span>
  </label>;
}

export default function SellerWorkspace() {
  const location = useLocation(); const navigate = useNavigate();
  const section = location.pathname.split('/')[2] || 'overview';
  const settingsPath = location.pathname.split('/')[3];
  const settingsView: 'personal' | 'store' | 'delivery' = settingsPath === 'personal' || settingsPath === 'delivery' ? settingsPath : 'store';
  const selectedOrderId = /^\/seller\/orders\/[^/]+\/?$/.test(location.pathname) ? location.pathname.split('/')[3] : '';
  const isCreatingProduct = location.pathname.replace(/\/$/, '') === '/seller/products/new';
  const editingProductId = /^\/seller\/products\/[^/]+\/edit\/?$/.test(location.pathname) ? location.pathname.split('/')[3] : '';
  const isEditingProduct = Boolean(editingProductId);
  const [user, setUser] = useState<AuthUser | null>(() => { try { return JSON.parse(localStorage.getItem('unimartxUser') || 'null') as AuthUser | null; } catch { return null; } });
  const [profile, setProfile] = useState<Profile>(emptyProfile); const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const profileRef = useRef(profile); profileRef.current = profile;
  const [brandImagePreviews, setBrandImagePreviews] = useState<Partial<Record<'storeAvatar' | 'storeBanner', string>>>({});
  const [products, setProducts] = useState<Product[]>([]); const [orders, setOrders] = useState<Order[]>([]); const [config, setConfig] = useState<StoreConfig>(defaultConfig); const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [productError, setProductError] = useState(''); const [notice, setNotice] = useState('');
  const [sellerNotifications, setSellerNotifications] = useState<SellerNotification[]>([]); const [notificationUnread, setNotificationUnread] = useState(0); const [notificationsOpen, setNotificationsOpen] = useState(false); const [notificationsLoading, setNotificationsLoading] = useState(false); const [notificationsError, setNotificationsError] = useState(''); const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const savedNoticeTimer = useRef<number | null>(null);
  const brandImageUploads = useRef<Set<Promise<void>>>(new Set());
  const profileLoadSequence = useRef(0);
  const [productSearch, setProductSearch] = useState(''); const [productFilter, setProductFilter] = useState<'all' | 'active' | 'draft' | 'low-stock'>('all'); const [productImages, setProductImages] = useState<File[]>([]); const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]); const productImagePreviewsRef = useRef(productImagePreviews); productImagePreviewsRef.current = productImagePreviews; const [orderSearch, setOrderSearch] = useState(''); const [orderFilter, setOrderFilter] = useState('all'); const [ordersPageFilter, setOrdersPageFilter] = useState('all'); const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null); const [orderDetailLoading, setOrderDetailLoading] = useState(false); const [orderDetailError, setOrderDetailError] = useState(''); const [productBusy, setProductBusy] = useState(false);
  const [helpQuery, setHelpQuery] = useState(''); const [helpTopic, setHelpTopic] = useState('All topics');
  const [selectedProductCategory, setSelectedProductCategory] = useState(''); const [newProductCategory, setNewProductCategory] = useState(''); const [addingProductCategory, setAddingProductCategory] = useState(false); const [categoryBusy, setCategoryBusy] = useState(false);
  const [productFulfillment, setProductFulfillment] = useState<'both' | 'pickup' | 'delivery'>('both');
  const editingProduct = products.find((product) => product.id === editingProductId);
  const storeHistory = useRef<{ profile: Profile; config: StoreConfig }[]>([]); const redoHistory = useRef<{ profile: Profile; config: StoreConfig }[]>([]); const historyMode = useRef(false); const historyStarted = useRef(false);
  const [canUndo, setCanUndo] = useState(false); const [canRedo, setCanRedo] = useState(false);
  const [builderPanel, setBuilderPanel] = useState<'templates' | 'layouts' | 'pages' | 'layers'>('templates'); const [builderPage, setBuilderPage] = useState<'home' | StorePageKey>('home'); const [inspectorTab, setInspectorTab] = useState<'design' | 'interact'>('design'); const [selectedBuilderBlock, setSelectedBuilderBlock] = useState('hero-1'); const [builderZoom, setBuilderZoom] = useState(80); const [showGuides, setShowGuides] = useState(false);
  const [expandedCanvasPageId, setExpandedCanvasPageId] = useState<string | null>(null);
  const [selectedProductCard, setSelectedProductCard] = useState<{ sectionId: string; productId: string } | null>(null);
  const [isConnectingPage, setIsConnectingPage] = useState(false);
  const pageConnectionPointer = useRef<number | null>(null);
  const [activeBuilderTool, setActiveBuilderTool] = useState<'select' | 'hand'>('select'); const [builderMenuOpen, setBuilderMenuOpen] = useState(false);
  const builderCanvasRef = useRef<HTMLDivElement>(null);
  const canvasStageRef = useRef<HTMLDivElement>(null);
  const canvasPan = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const suppressCanvasClick = useRef(false);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);

  useEffect(() => () => {
    if (savedNoticeTimer.current !== null) window.clearTimeout(savedNoticeTimer.current);
  }, []);
  useEffect(() => () => productImagePreviewsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => { if (!isCreatingProduct) setProductError(''); }, [isCreatingProduct]);
  useEffect(() => {
    if (!isEditingProduct) { setSelectedProductCategory(''); setProductFulfillment('both'); return; }
    if (!editingProduct) return;
    setSelectedProductCategory(editingProduct.category || '');
    const fulfillment = editingProduct.details?._fulfillment;
    setProductFulfillment(fulfillment === 'pickup' || fulfillment === 'delivery' ? fulfillment : 'both');
  }, [isEditingProduct, editingProduct?.id]);

  useEffect(() => {
    if (!expandedCanvasPageId) return;
    const collapseOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || !builderCanvasRef.current?.contains(event.target)) return;
      const targetElement = event.target instanceof Element ? event.target : event.target.parentElement;
      if (targetElement?.closest('.seller-builder-page-artboard.is-expanded')) return;
      setExpandedCanvasPageId(null);
    };
    document.addEventListener('click', collapseOnOutsideClick, true);
    return () => document.removeEventListener('click', collapseOnOutsideClick, true);
  }, [expandedCanvasPageId]);

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('unimartxToken');
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, cache: options.cache || 'no-store', headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
    const body = await response.json().catch(() => ({})) as ApiEnvelope<T>;
    if (!response.ok || body.success === false) {
      const detail = body.details?.map((item) => [item.field, item.message].filter(Boolean).join(': ')).filter(Boolean).join('; ');
      throw new Error([body.message || body.error || 'Could not complete that action. Try again.', detail].filter(Boolean).join(': '));
    }
    return (body.data ?? body) as T;
  }, []);

  const loadSellerNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setNotificationsLoading(true);
    try {
      const [feed, unread] = await Promise.all([
        request<{ notifications: SellerNotification[] }>('/notifications?limit=8&offset=0'),
        request<{ count: number }>('/notifications/unread-count'),
      ]);
      setSellerNotifications(feed.notifications || []);
      setNotificationUnread(unread.count || 0);
      setNotificationsError('');
    } catch (reason) {
      setNotificationsError(reason instanceof Error ? reason.message : 'Could not load notifications.');
    } finally { if (showLoading) setNotificationsLoading(false); }
  }, [request]);

  useEffect(() => {
    if (user?.role !== 'seller') return;
    let active = true;
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    const refresh = () => { if (active) void loadSellerNotifications(); };
    const connect = () => {
      const token = localStorage.getItem('unimartxToken');
      if (!active || !token) return;
      try {
        const wsBase = API_BASE_URL.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
        socket = new WebSocket(`${wsBase}/ws`, ['unimartx', token]);
        socket.onmessage = (message) => {
          try {
            const event = JSON.parse(String(message.data)) as { type?: string; resource?: string };
            if (event.type === 'notification.created' || event.resource === 'notifications') refresh();
          } catch { /* Ignore malformed realtime messages. */ }
        };
        socket.onclose = () => { if (active) retryTimer = window.setTimeout(connect, 5000); };
        socket.onerror = () => socket?.close();
      } catch { retryTimer = window.setTimeout(connect, 5000); }
    };
    void loadSellerNotifications(true);
    connect();
    const poll = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    const reconnectForAuth = () => { socket?.close(); window.clearTimeout(retryTimer); connect(); refresh(); };
    window.addEventListener('unimartx:auth-change', reconnectForAuth);
    return () => { active = false; window.clearInterval(poll); window.clearTimeout(retryTimer); window.removeEventListener('focus', refresh); window.removeEventListener('unimartx:auth-change', reconnectForAuth); socket?.close(); };
  }, [user?.role, loadSellerNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnOutside = (event: MouseEvent) => { if (event.target instanceof Node && !notificationsMenuRef.current?.contains(event.target)) setNotificationsOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNotificationsOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [notificationsOpen]);

  async function openSellerNotification(notification: SellerNotification) {
    if (!notification.read) {
      try {
        await request(`/notifications/${notification.id}/read`, { method: 'PATCH' });
        setSellerNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
        setNotificationUnread((count) => Math.max(0, count - 1));
      } catch { /* Navigation remains available if marking as read fails. */ }
    }
    setNotificationsOpen(false);
    const legacyOrderId = notification.actionUrl?.includes('/orders/') ? new URLSearchParams(notification.actionUrl.split('?')[1] || '').get('id') : null;
    navigate(notification.orderId || legacyOrderId ? `/seller/orders/${notification.orderId || legacyOrderId}` : notification.productId ? `/seller/products/${notification.productId}/edit` : '/seller/orders');
  }

  async function markAllSellerNotificationsRead() {
    if (!notificationUnread) return;
    try {
      await request('/notifications/read-all', { method: 'PATCH' });
      setSellerNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setNotificationUnread(0);
    } catch (reason) { setNotificationsError(reason instanceof Error ? reason.message : 'Could not mark notifications as read.'); }
  }

  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsRetry, setAnalyticsRetry] = useState(0);
  useEffect(() => {
    if (section !== 'insights' || user?.role !== 'seller') return;
    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError('');
    request<SellerAnalytics>(`/seller/analytics?period=${analyticsPeriod}`)
      .then((result) => { if (active) setAnalytics(result); })
      .catch((reason) => { if (active) setAnalyticsError(reason instanceof Error ? reason.message : 'Could not load your insights.'); })
      .finally(() => { if (active) setAnalyticsLoading(false); });
    return () => { active = false; };
  }, [section, user?.role, analyticsPeriod, analyticsRetry, request]);

  useEffect(() => {
    if (!selectedOrderId) { setOrderDetail(null); setOrderDetailError(''); return; }
    let active = true;
    setOrderDetail(null); setOrderDetailLoading(true); setOrderDetailError('');
    request<OrderDetail>(`/seller/orders/${selectedOrderId}`)
      .then((detail) => { if (active) setOrderDetail(detail); })
      .catch((reason) => { if (active) setOrderDetailError(reason instanceof Error ? reason.message : 'Could not load this order.'); })
      .finally(() => { if (active) setOrderDetailLoading(false); });
    return () => { active = false; };
  }, [selectedOrderId, request]);

  const load = useCallback(async () => {
    const loadSequence = ++profileLoadSequence.current;
    setLoading(true); setError('');
    try {
      const [profileResult, dashboardResult, productResult, orderResult, configResult, categoryResult] = await Promise.all([
        request<Profile>('/seller/profile'), request<Dashboard>('/seller/dashboard'), request<{ products?: Product[] }>('/seller/products?limit=100'), request<{ orders?: Order[] }>('/seller/orders?limit=100'), request<{ draft?: StoreConfig | null; publishedAt?: string | null }>('/seller/store-config'), request<{ id: string; name: string; slug: string }[]>('/categories/').catch(() => []),
      ]);
      const loadedConfig = configResult.draft || defaultConfig;
      if (loadSequence !== profileLoadSequence.current) return;
      setProfile({ ...emptyProfile, ...profileResult }); setDashboard(dashboardResult); setProducts(productResult.products || []); setOrders(orderResult.orders || []); setConfig(loadedConfig); setSelectedBuilderBlock(loadedConfig.sections[0]?.id || 'page');
      setPublishedAt(configResult.publishedAt || null);
      setCategories(categoryResult);
    } catch (reason) { if (loadSequence === profileLoadSequence.current) setError(reason instanceof Error ? reason.message : 'Could not load your seller workspace.'); }
    finally { if (loadSequence === profileLoadSequence.current) setLoading(false); }
  }, [request]);

  useEffect(() => { if (user?.role === 'seller') void load(); else setLoading(false); }, [user?.role, load]);
  useEffect(() => { const sync = () => { try { setUser(JSON.parse(localStorage.getItem('unimartxUser') || 'null') as AuthUser | null); } catch { setUser(null); } }; window.addEventListener('unimartx:auth-change', sync); return () => window.removeEventListener('unimartx:auth-change', sync); }, []);
  useEffect(() => { const snapshot = { profile, config }; if (historyMode.current) { historyMode.current = false; setCanUndo(storeHistory.current.length > 1); setCanRedo(redoHistory.current.length > 0); return; } if (!historyStarted.current) { historyStarted.current = true; storeHistory.current = [snapshot]; setCanUndo(false); setCanRedo(false); return; } const previous = storeHistory.current[storeHistory.current.length - 1]; if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return; storeHistory.current = [...storeHistory.current.slice(-39), snapshot]; redoHistory.current = []; setCanUndo(storeHistory.current.length > 1); setCanRedo(false); }, [profile, config]);


  const filteredProducts = useMemo(() => products.filter((item) => {
    const matchesSearch = `${item.name} ${item.category}`.toLowerCase().includes(productSearch.toLowerCase());
    const matchesFilter = productFilter === 'all' || (productFilter === 'active' && item.isActive) || (productFilter === 'draft' && !item.isActive) || (productFilter === 'low-stock' && item.stock <= 5);
    return matchesSearch && matchesFilter;
  }), [products, productSearch, productFilter]);
  const filteredHelpArticles = useMemo(() => sellerHelpArticles.filter((article) => {
    const matchesTopic = helpTopic === 'All topics' || article.topic === helpTopic;
    const matchesQuery = `${article.question} ${article.answer} ${article.topic}`.toLowerCase().includes(helpQuery.trim().toLowerCase());
    return matchesTopic && matchesQuery;
  }), [helpQuery, helpTopic]);
  const filteredOrders = useMemo(() => orders.filter((item) => `${item.orderNumber} ${item.buyer.firstName} ${item.buyer.lastName}`.toLowerCase().includes(orderSearch.toLowerCase())), [orders, orderSearch]);
  const ordersPageOrders = useMemo(() => filteredOrders.filter((item) => ordersPageFilter === 'all' || item.status === ordersPageFilter), [filteredOrders, ordersPageFilter]);
  const dashboardOrders = useMemo(() => filteredOrders.filter((item) => orderFilter === 'all' || item.status === orderFilter).slice(0, 8), [filteredOrders, orderFilter]);
  const completedSetupSteps = [profile.storeName, profile.storeTagline, profile.storeDescription, profile.storeAvatar, profile.storeBanner].filter(Boolean).length;
  const setupPercent = Math.round(completedSetupSteps / 5 * 100);
  const storeUrl = profile.slug ? `/shop/store/${encodeURIComponent(profile.slug)}` : '/shop/stores';
  const brandImage = (field: 'storeAvatar' | 'storeBanner') => brandImagePreviews[field] || profile[field] || '';
  const updateProfile = (field: keyof Profile, value: string | number | null) => {
    profileRef.current = { ...profileRef.current, [field]: value };
    setProfile((current) => ({ ...current, [field]: value }));
    if (field === 'storeColor' && typeof value === 'string') setConfig((current) => ({ ...current, colors: { ...current.colors, primary: value } }));
    if (field === 'storeAvatar' && value) setConfig((current) => ({ ...current, layout: { ...current.layout, navShowLogo: true, navBrandMode: 'store' } }));
    if (field === 'storeName' || field === 'storeTagline') setConfig((current) => ({ ...current, sections: current.sections.map((item) => item.type === 'hero' ? { ...item, [field === 'storeName' ? 'heading' : 'description']: value } : item) }));
    if (field === 'storeDescription') setConfig((current) => ({ ...current, sections: current.sections.map((item) => item.type === 'about' ? { ...item, description: value } : item) }));
  };
  const updateConfig = (field: 'template' | 'productGrid', value: string | number) => setConfig((current) => {
    if (field !== 'template') return { ...current, layout: { ...current.layout, productGrid: Number(value) } };
    const template = String(value);
    const headingFont = template === 'editorial' ? 'Playfair Display' : template === 'market' ? 'Manrope' : 'DM Sans';
    const bodyFont = template === 'market' ? 'Inter' : 'DM Sans';
    const updateFonts = (sections: StoreSection[]) => sections.map((item) => ({ ...item, headingFont, bodyFont }));
    return { ...current, template, typography: { ...current.typography, headingFont, bodyFont, headingStyle: template === 'editorial' ? 'editorial' : 'clean' }, sections: updateFonts(current.sections), pageSections: current.pageSections ? Object.fromEntries(Object.entries(current.pageSections).map(([page, sections]) => [page, updateFonts(sections || [])])) as StoreConfig['pageSections'] : undefined };
  });
  const applyStorefrontTemplate = (templateId: string) => {
    const preset = storefrontTemplates.find((item) => item.id === templateId);
    if (!preset) return;
    const { id, name, style, headingFont, bodyFont, colors, layout, sections } = preset;
    const templateLayouts: Partial<Record<StorefrontPageKey, string>> = id === 'accra-edit'
      ? { home: 'home-editorial', products: 'product-editorial', categories: 'category-featured', about: 'about-founder', reviews: 'reviews-featured' }
      : id === 'gold-coast-collective'
        ? { home: 'home-editorial', products: 'product-editorial', categories: 'category-gallery', about: 'about-story', reviews: 'reviews-featured' }
        : id === 'market-day' || id === 'coastline-tech'
          ? { home: 'home-collection', products: 'product-compact', categories: 'category-featured', about: 'about-timeline', reviews: 'reviews-community' }
          : id === 'kente-and-craft'
            ? { home: 'home-editorial', products: 'product-editorial', categories: 'category-editorial', about: 'about-story', reviews: 'reviews-featured' }
            : { home: 'home-featured', products: 'product-grid', categories: 'category-gallery', about: 'about-story', reviews: 'reviews-community' };
    const pageLayouts: Partial<Record<StorefrontPageKey, string>> = { ...DEFAULT_STOREFRONT_PAGE_LAYOUTS, ...templateLayouts };
    const pageSections = Object.fromEntries((['products', 'categories', 'about', 'contact', 'reviews'] as StorePageKey[]).map((page) => [page, storefrontPageLayoutDefinition(page, pageLayouts[page]).blocks.map((block, index) => ({ ...block, id: `${page}-${id}-${block.type}-${index}`, visible: true, headingFont, bodyFont }))])) as StoreConfig['pageSections'];
    if (id === 'accra-edit' && pageSections) {
      pageSections.products = [
        { id: 'products-accra-edit-intro', type: 'collection-intro', eyebrow: 'THE COLLECTION', heading: 'MOST WANTED', description: 'The pieces you’ll wear on repeat. Clean design, effortless styling, and lasting quality.', visible: true, headingFont, bodyFont },
        { id: 'products-accra-edit-filters', type: 'filters', heading: 'Find your look', visible: true, headingFont, bodyFont },
        { id: 'products-accra-edit-catalog', type: 'catalog', heading: 'Shop the edit', productColumns: 3, maxProducts: 100, visible: true, headingFont, bodyFont },
      ];
      pageSections.categories = [
        { id: 'categories-accra-edit-hero', type: 'hero', eyebrow: 'NEW SEASON', heading: 'NEW SEASON.', description: 'Fresh pieces for everyday movement. Discover Ghanaian style, made to be worn now and for years to come.', buttonText: 'Shop now', image: fashionCampaignImages.streetwear, imageFit: 'cover', imagePosition: 'center 35%', overlayOpacity: 38, visible: true, headingFont, bodyFont },
        { id: 'categories-accra-edit-categories', type: 'categories', heading: 'Find your fit', visible: true, headingFont, bodyFont },
        { id: 'categories-accra-edit-products', type: 'catalog', heading: 'The new season edit', productColumns: 3, maxProducts: 9, visible: true, headingFont, bodyFont },
      ];
      pageSections.about = [
        { id: 'about-accra-edit-story', type: 'about', eyebrow: 'OUR APPROACH', heading: 'LESS, BETTER.', description: 'Every piece is chosen for simplicity and purpose. Thoughtful tailoring, quality materials, and timeless proportions create clothing that never feels excessive.', image: fashionCampaignImages.streetwear, imagePosition: 'center 32%', visible: true, headingFont, bodyFont },
        { id: 'about-accra-edit-editorial', type: 'image', eyebrow: 'MADE FOR EVERYDAY', heading: 'A wardrobe that feels like you.', description: 'Easy pieces, considered details, and quiet confidence for every day.', image: fashionCampaignImages.editorial, imageFit: 'cover', imagePosition: 'center 28%', visible: true, headingFont, bodyFont },
        { id: 'about-accra-edit-favourites', type: 'featured-products', heading: 'Designed to wear on repeat', maxProducts: 3, visible: true, headingFont, bodyFont },
      ];
    }
    if (id === 'kente-and-craft' && pageSections) {
      pageSections.products = [
        { id: 'products-kente-intro', type: 'collection-intro', eyebrow: 'GRAND PORCELAIN · THE COLLECTION', heading: 'Objects for the everyday ritual.', description: 'Tableware and home accents made to turn ordinary moments into meaningful ones.', visible: true, headingFont, bodyFont },
        { id: 'products-kente-filters', type: 'filters', heading: 'Browse the collection', visible: true, headingFont, bodyFont },
        { id: 'products-kente-catalog', type: 'catalog', heading: 'New collections', productColumns: 3, maxProducts: 100, visible: true, headingFont, bodyFont },
      ];
      pageSections.about = [
        { id: 'about-kente-story', type: 'about', eyebrow: 'OUR POINT OF VIEW', heading: 'Beautiful things make room for beautiful moments.', description: 'We believe that beautiful tableware transforms ordinary moments into meaningful ones. Our collections focus on timeless design, quality materials, and distinctive forms. Each piece adds style and warmth to your home.', image: 'https://images.unsplash.com/photo-1631125915973-e0d155a14e4e?auto=format&fit=crop&w=1400&q=85', imageFit: 'cover', visible: true, headingFont, bodyFont },
        { id: 'about-kente-editorial', type: 'image', eyebrow: 'MADE TO BE KEPT', heading: 'A little character at every table.', description: 'Thoughtful pieces for daily use, slow mornings, and special gatherings.', image: 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1400&q=85', imageFit: 'cover', visible: true, headingFont, bodyFont },
        { id: 'about-kente-favourites', type: 'featured-products', heading: 'You may like', maxProducts: 4, productColumns: 2, visible: true, headingFont, bodyFont },
      ];
    }
    if (id === 'coastline-tech' && pageSections) {
      pageSections.products = [
        { id: 'products-coastline-intro', type: 'collection-intro', eyebrow: 'UPTECH · THE COLLECTION', heading: 'Technology that fits your life.', description: 'Explore dependable devices and everyday accessories, selected to make work and play feel effortless.', visible: true, headingFont, bodyFont },
        { id: 'products-coastline-filters', type: 'filters', heading: 'Find your next upgrade', visible: true, headingFont, bodyFont },
        { id: 'products-coastline-catalog', type: 'catalog', heading: 'Explore Collection', productColumns: 3, maxProducts: 100, visible: true, headingFont, bodyFont },
      ];
      pageSections.categories = [
        { id: 'categories-coastline-intro', type: 'collection-intro', eyebrow: 'BROWSE UPTECH', heading: 'Shop By Category', description: 'Find the right gear for your setup, your work, and your downtime.', visible: true, headingFont, bodyFont },
        { id: 'categories-coastline-list', type: 'categories', heading: 'Explore departments', visible: true, headingFont, bodyFont },
        { id: 'categories-coastline-catalog', type: 'catalog', heading: 'Popular right now', productColumns: 3, maxProducts: 9, visible: true, headingFont, bodyFont },
      ];
    }
    if (id === 'gold-coast-collective' && pageSections) {
      const coastImage = templateHeroImages[id];
      pageSections.products = [
        { id: 'products-gold-coast-intro', type: 'collection-intro', eyebrow: 'A LITTLE INSPIRATION', heading: 'Find your next favourite', description: 'Thoughtful gifts, everyday essentials, and pieces that bring a little sense of somewhere special.', image: coastImage, imageFit: 'cover', visible: true, headingFont, bodyFont },
        { id: 'products-gold-coast-filters', type: 'filters', heading: 'Explore the collection', visible: true, headingFont, bodyFont },
        { id: 'products-gold-coast-catalog', type: 'catalog', heading: 'Made to be discovered', productColumns: 3, maxProducts: 100, visible: true, headingFont, bodyFont },
      ];
      pageSections.categories = [
        { id: 'categories-gold-coast-intro', type: 'collection-intro', eyebrow: 'CURATED FOR YOU', heading: 'A good thing for every occasion', description: 'Explore considered finds for gifting, gathering, and making the everyday feel special.', image: coastImage, imageFit: 'cover', visible: true, headingFont, bodyFont },
        { id: 'categories-gold-coast-categories', type: 'categories', heading: 'Find what feels like you', visible: true, headingFont, bodyFont },
        { id: 'categories-gold-coast-catalog', type: 'catalog', heading: 'Explore the edit', productColumns: 3, maxProducts: 9, visible: true, headingFont, bodyFont },
      ];
      pageSections.about = [
        { id: 'about-gold-coast-story', type: 'about', eyebrow: 'OUR STORY · CAPE COAST', heading: 'The beauty of finding something special.', description: 'Gold Coast Collective brings together thoughtful pieces, local makers, and memorable finds. We believe the best things carry a story and make everyday moments feel a little more meaningful.', image: coastImage, imageFit: 'cover', imagePosition: 'center', visible: true, headingFont, bodyFont },
        { id: 'about-gold-coast-editorial', type: 'image', eyebrow: 'GATHERED WITH CARE', heading: 'A little piece of somewhere special.', description: 'Discover gifts and everyday objects chosen to be enjoyed, shared, and kept close.', image: coastImage, imageFit: 'cover', visible: true, headingFont, bodyFont },
        { id: 'about-gold-coast-favourites', type: 'featured-products', heading: 'Find your next favourite', maxProducts: 3, productColumns: 3, visible: true, headingFont, bodyFont },
      ];
    }
    setConfig((current) => ({ ...current, template: style, templateId: id, colors: { ...defaultConfig.colors, ...colors }, typography: { ...defaultConfig.typography, headingFont, bodyFont, headingStyle: style === 'editorial' ? 'editorial' : 'clean' }, layout: { ...defaultConfig.layout, ...layout, footerMessage: 'Good things, close to home.' }, pageLayouts, pageSections, canvasPages: id === 'accra-edit' ? [{ id: 'home-canvas', page: 'home', x: 60, y: 55 }, { id: 'fashion-products-canvas', page: 'products', x: 950, y: 55 }, { id: 'fashion-about-canvas', page: 'about', x: 60, y: 850 }, { id: 'fashion-categories-canvas', page: 'categories', x: 950, y: 850 }] : current.canvasPages, pageConnections: [{ from: 'home', to: 'products' }, { from: 'home', to: 'about' }, ...(id === 'highlife-sound' ? [{ from: 'home' as const, to: 'contact' as const }] : []), ...(id === 'accra-edit' ? [{ from: 'home' as const, to: 'categories' as const }] : [])], sections: sections.map((item) => ({ ...item, ...(item.type === 'hero' ? { ...(id === 'kente-and-craft' ? { heading: 'GRAND PORCELAIN', eyebrow: 'TABLEWARE · HOME ACCENTS', description: 'A thoughtfully selected collection of tableware and home accents, designed to make every meal feel special.', buttonText: 'Explore the collection' } : {}), description: id === 'kente-and-craft' ? 'A thoughtfully selected collection of tableware and home accents, designed to make every meal feel special.' : item.description || preset.description, ...(templateHeroImages[id] ? { image: templateHeroImages[id], imageFit: 'cover', imagePosition: id === 'highlife-sound' ? 'right center' : id === 'kente-and-craft' ? 'right center' : 'center', overlayOpacity: id === 'highlife-sound' || id === 'kente-and-craft' ? 0 : 45 } : {}) } : {}), headingFont, bodyFont })) }));
    setBuilderPage('home');
    setSelectedBuilderBlock('hero-1');
    setBuilderPanel('layers');
    setNotice(`${name} applied. Personalize the copy, products, and imagery on your canvas.`);
  };
  const startStorefrontFromScratch = () => {
    const { layout, colors, typography } = defaultConfig;
    setConfig((current) => ({
      ...current,
      template: 'minimal',
      templateId: undefined,
      colors: { ...colors },
      typography: { ...typography },
      layout: { ...layout, footerMessage: 'Good things, close to home.', productCardPositions: {}, productCardStyles: {} },
      sections: [],
      pageSections: {},
      pageLayouts: { ...DEFAULT_STOREFRONT_PAGE_LAYOUTS },
      canvasPages: [{ id: 'home-canvas', page: 'home', x: 60, y: 55 }],
      pageConnections: [],
    }));
    setBuilderPage('home');
    setSelectedBuilderBlock('page');
    setSelectedProductCard(null);
    setExpandedCanvasPageId('home-canvas');
    setBuilderPanel('layouts');
    setNotice('Blank storefront ready. Add sections from the library to build your shop.');
  };
  const activePageSections = builderPage === 'home' ? config.sections : config.pageSections?.[builderPage] || [];
  const pageDefinitions: { key: 'home' | StorePageKey; title: string; description: string; icon: MarketIconName }[] = [
    { key: 'home', title: 'Home', description: 'Your storefront landing page', icon: 'compass' },
    { key: 'products', title: 'Shop', description: 'Browse the full product collection', icon: 'package' },
    { key: 'categories', title: 'Categories', description: 'Explore products by category', icon: 'package' },
    { key: 'about', title: 'About', description: 'Your store story and introduction', icon: 'shop' },
    { key: 'contact', title: 'Contact', description: 'Ways for shoppers to reach you', icon: 'mail' },
    { key: 'reviews', title: 'Reviews', description: 'Customer feedback and trust', icon: 'heart' },
  ];
  const pageSectionLibrary: Record<StorefrontPageKey, { type: string; title: string; description: string }[]> = {
    home: [{ type: 'hero', title: 'Home hero', description: 'Welcome shoppers and guide their first visit' }, { type: 'featured-products', title: 'Featured products', description: 'Highlight selected products' }, { type: 'categories', title: 'Category preview', description: 'Link shoppers into collections' }, { type: 'announcement', title: 'Store announcement', description: 'Promote a current update' }, { type: 'about', title: 'Store introduction', description: 'Share a short version of your story' }, { type: 'newsletter', title: 'Email updates', description: 'Invite shoppers to stay in touch' }],
    products: [{ type: 'collection-intro', title: 'Collection introduction', description: 'Title and context for the shop' }, { type: 'filters', title: 'Shop filters', description: 'Search, category, price, stock, and sort controls' }, { type: 'catalog', title: 'Product catalog', description: 'The complete shoppable product grid' }, { type: 'announcement', title: 'Shop announcement', description: 'Shipping, sale, or new-arrival message' }, { type: 'featured-products', title: 'Featured collection', description: 'A curated row of products' }],
    categories: [{ type: 'collection-intro', title: 'Category introduction', description: 'Explain how your collections are organized' }, { type: 'categories', title: 'Category directory', description: 'Clickable categories with product counts' }, { type: 'category-products', title: 'Popular by category', description: 'Products shoppers can browse by collection' }, { type: 'image', title: 'Collection feature', description: 'Show a collection image and story' }, { type: 'announcement', title: 'Category note', description: 'Share a collection update' }],
    about: [{ type: 'story-intro', title: 'Story introduction', description: 'Set the scene for your store story' }, { type: 'about', title: 'Story and image', description: 'Tell shoppers who you are' }, { type: 'values', title: 'Our values', description: 'Show the principles behind the store' }, { type: 'timeline', title: 'Our journey', description: 'Share milestones and background' }, { type: 'image', title: 'Behind the scenes', description: 'Add a photo with a caption' }, { type: 'featured-products', title: 'Founder favourites', description: 'Connect your story to products' }],
    contact: [{ type: 'contact-intro', title: 'Contact introduction', description: 'Tell shoppers how and when to reach you' }, { type: 'contact-form', title: 'Message form', description: 'Collect a question and open the shopper’s email app' }, { type: 'store-details', title: 'Store contact details', description: 'Show email, phone, and location' }, { type: 'faq', title: 'Common questions', description: 'Answer delivery, returns, and payment questions' }, { type: 'hours', title: 'Opening hours', description: 'Set expectations for response times' }],
    reviews: [{ type: 'review-summary', title: 'Rating summary', description: 'Show your store rating and review count' }, { type: 'review-quotes', title: 'Customer highlights', description: 'Feature customer feedback' }, { type: 'review-feed', title: 'Review feed', description: 'A place for recent buyer reviews' }, { type: 'review-invite', title: 'Review invitation', description: 'Invite buyers to share their experience' }, { type: 'featured-products', title: 'Top rated products', description: 'Connect positive feedback to products' }],
  };
  const defaultSectionsForPage = (page: StorePageKey): StoreSection[] => storefrontPageLayoutDefinition(page).blocks.map((item, index) => ({ id: `${page}-${item.type}-${index}`, ...item, visible: true }));
  const canvasPages = config.canvasPages?.length ? config.canvasPages : [{ id: 'home-canvas', page: 'home' as const, x: 60, y: 55 }];
  const connectedStorePages = new Set((config.pageConnections || []).map((connection) => connection.to));
  const defaultCanvasPosition = (): Pick<StoreCanvasPage, 'x' | 'y'> => {
    const index = canvasPages.length;
    return { x: 60 + (index % 4) * 450, y: 55 + Math.floor(index / 4) * 610 };
  };
  const selectBuilderPage = (page: 'home' | StorePageKey) => {
    const sections = page === 'home' ? config.sections : config.pageSections?.[page] || defaultSectionsForPage(page);
    const position = canvasPages.find((item) => item.page === page) || { id: `${page}-canvas-${Date.now()}`, page, ...defaultCanvasPosition() };
    setConfig((current) => ({
      ...current,
      ...(page !== 'home' && !current.pageSections?.[page] ? { pageSections: { ...current.pageSections, [page]: sections } } : {}),
      canvasPages: (() => { const existing = current.canvasPages?.length ? current.canvasPages : [{ id: 'home-canvas', page: 'home' as const, x: 60, y: 55 }]; return existing.some((item) => item.page === page) ? existing : [...existing, position]; })(),
    }));
    setSelectedBuilderBlock(sections[0]?.id || 'page');
    setBuilderPage(page);
    setBuilderPanel('layers');
  };
  const deleteBuilderPage = (page: StorePageKey, canvasPageId: string) => {
    const pageTitle = pageDefinitions.find((item) => item.key === page)?.title || page;
    setConfig((current) => {
      const pageSections = { ...current.pageSections };
      const pageLayouts = { ...current.pageLayouts };
      delete pageSections[page];
      delete pageLayouts[page];
      return {
        ...current,
        pageSections,
        pageLayouts,
        canvasPages: (current.canvasPages || []).filter((item) => item.id !== canvasPageId && item.page !== page),
        pageConnections: (current.pageConnections || []).filter((connection) => connection.to !== page),
      };
    });
    if (expandedCanvasPageId === canvasPageId) setExpandedCanvasPageId(null);
    if (builderPage === page) { setBuilderPage('home'); setSelectedBuilderBlock('hero-1'); setBuilderPanel('layers'); }
    setNotice(`${pageTitle} page deleted. You can add it again from the Pages panel.`);
  };
  const updateActivePageSections = (updater: (sections: StoreSection[]) => StoreSection[]) => setConfig((current) => builderPage === 'home'
    ? { ...current, sections: updater(current.sections) }
    : { ...current, pageSections: { ...current.pageSections, [builderPage]: updater(current.pageSections?.[builderPage] || []) } });
  const handleCanvasStageDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const stage = canvasStageRef.current;
    if (!stage) return;
    const zoom = builderZoom / 100;
    const canvasPoint = {
      x: Math.max(0, Math.min(2200, (event.clientX - stage.getBoundingClientRect().left + stage.scrollLeft - 18) / zoom - 190)),
      y: Math.max(0, Math.min(2200, (event.clientY - stage.getBoundingClientRect().top + stage.scrollTop - 18) / zoom - 22)),
    };
    const movingCanvasPageId = event.dataTransfer.getData('application/x-unimartx-canvas-page');
    const draggedPageKey = event.dataTransfer.getData('application/x-unimartx-store-page');
    if (movingCanvasPageId) {
      setConfig((current) => { const existing = current.canvasPages?.length ? current.canvasPages : [{ id: 'home-canvas', page: 'home' as const, x: 60, y: 55 }]; return { ...current, canvasPages: existing.map((item) => item.id === movingCanvasPageId ? { ...item, ...canvasPoint } : item) }; });
      return;
    }
    if (!pageDefinitions.some((item) => item.key === draggedPageKey)) return;
    const page = draggedPageKey as 'home' | StorePageKey;
    const sourceSections = page === 'home' ? config.sections : config.pageSections?.[page] || defaultSectionsForPage(page);
    const existing = canvasPages.find((item) => item.page === page);
    const position: StoreCanvasPage = existing ? { ...existing, ...canvasPoint } : { id: `${page}-canvas-${Date.now()}`, page, ...canvasPoint };
    setConfig((current) => ({
      ...current,
      ...(page !== 'home' && !current.pageSections?.[page] ? { pageSections: { ...current.pageSections, [page]: sourceSections } } : {}),
      canvasPages: (() => { const existingPages = current.canvasPages?.length ? current.canvasPages : [{ id: 'home-canvas', page: 'home' as const, x: 60, y: 55 }]; return existingPages.some((item) => item.page === page) ? existingPages.map((item) => item.page === page ? position : item) : [...existingPages, position]; })(),
    }));
    setBuilderPage(page);
    setSelectedBuilderBlock(sourceSections[0]?.id || 'page');
    setBuilderPanel('layers');
    setNotice(`${pageDefinitions.find((item) => item.key === page)?.title || 'Page'} preview added to the canvas. Drag its title bar to place it anywhere.`);
  };
  const connectStorePage = (targetPage: StorePageKey) => {
    setConfig((current) => {
      const connections = current.pageConnections || [];
      if (connections.some((connection) => connection.from === 'home' && connection.to === targetPage)) return current;
      return { ...current, pageConnections: [...connections, { from: 'home', to: targetPage }] };
    });
    setNotice(`${pageDefinitions.find((item) => item.key === targetPage)?.title || 'Page'} is now connected to Home and will appear in your storefront navigation.`);
  };
  const startPageConnection = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    pageConnectionPointer.current = event.pointerId;
    setIsConnectingPage(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setNotice('Drag to a page’s + port and release to connect it to Home.');
  };
  const finishPageConnection = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pageConnectionPointer.current !== event.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-page-connection-target]');
    const targetPage = target?.dataset.pageConnectionTarget as StorePageKey | undefined;
    if (targetPage && pageDefinitions.some((item) => item.key === targetPage)) connectStorePage(targetPage);
    else setNotice('No page connected. Drop the Home port directly onto another page’s + port.');
    pageConnectionPointer.current = null;
    setIsConnectingPage(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const removePageConnection = (targetPage: StorePageKey) => {
    setConfig((current) => ({ ...current, pageConnections: (current.pageConnections || []).filter((connection) => connection.to !== targetPage) }));
    setNotice(`${pageDefinitions.find((item) => item.key === targetPage)?.title || 'Page'} has been disconnected from Home.`);
  };
  const activeBuilderSection = activePageSections.find((item) => item.id === selectedBuilderBlock);
  const heroConfig = activePageSections.find((item) => item.type === 'hero');
  const updateBuilderSection = (field: string, value: unknown) => updateActivePageSections((sections) => sections.map((item) => item.id === selectedBuilderBlock ? { ...item, [field]: value } : item));
  const updateSelectedSection = (field: string, value: unknown) => updateBuilderSection(field, value);
  const selectedCardProduct = selectedProductCard ? products.find((product) => product.id === selectedProductCard.productId) : undefined;
  const updateProductCard = (field: string, value: unknown) => {
    if (!selectedProductCard) return;
    setConfig((current) => ({ ...current, layout: { ...current.layout, productCardStyles: { ...(current.layout.productCardStyles as Record<string, Record<string, unknown>> || {}), [selectedProductCard.productId]: { ...((current.layout.productCardStyles as Record<string, Record<string, unknown>> || {})[selectedProductCard.productId] || {}), [field]: value } } } }));
  };
  const placeProductCard = (event: ReactDragEvent<HTMLDivElement>) => {
    const productId = event.dataTransfer.getData('application/x-unimartx-product-card');
    if (!productId) return;
    event.preventDefault(); event.stopPropagation();
    const bounds = (event.currentTarget.querySelector('.seller-store-canvas') || event.currentTarget).getBoundingClientRect();
    const x = Math.max(0, Math.min(75, Math.round(((event.clientX - bounds.left) / bounds.width) * 20) * 5));
    const y = Math.max(0, Math.min(90, Math.round(((event.clientY - bounds.top) / bounds.height) * 20) * 5));
    setConfig((current) => ({ ...current, layout: { ...current.layout, productCardPositions: { ...(current.layout.productCardPositions as Record<string, { x: number; y: number }> || {}), [productId]: { x, y } } } }));
    setSelectedProductCard({ sectionId: selectedBuilderBlock, productId });
  };
  const selectedSectionStyle = (item: StoreConfig['sections'][number]): CSSProperties => ({
    backgroundColor: typeof item.backgroundColor === 'string' ? item.backgroundColor : undefined,
    backgroundImage: typeof item.backgroundImage === 'string' && item.backgroundImage ? `linear-gradient(rgba(0,0,0,${Math.max(0, Math.min(80, Number(item.backgroundImageOverlay ?? 18))) / 100}),rgba(0,0,0,${Math.max(0, Math.min(80, Number(item.backgroundImageOverlay ?? 18))) / 100})),url("${item.backgroundImage}")` : undefined,
    backgroundPosition: `${Number(item.backgroundImagePositionX ?? 50)}% ${Number(item.backgroundImagePositionY ?? 50)}%`,
    backgroundSize: String(item.backgroundImageFit || 'cover') as CSSProperties['backgroundSize'],
    color: typeof item.textColor === 'string' ? item.textColor : undefined,
    textAlign: item.alignment === 'center' || item.alignment === 'right' ? item.alignment : 'left',
    minHeight: item.sectionHeightMode === 'viewport' ? '100vh' : item.sectionHeightMode === 'custom' ? Number(item.sectionHeight) > 0 ? `${Number(item.sectionHeight)}px` : undefined : item.sectionHeightMode ? undefined : Number(item.sectionHeight) > 0 ? `${Number(item.sectionHeight)}px` : undefined,
    padding: Number(item.sectionPadding) >= 0 ? `${Number(item.sectionPadding)}px` : undefined,
    borderRadius: item.type === 'hero' ? `${Math.max(0, Number(item.edgeRadius ?? 0))}px` : undefined,
    border: Number(item.edgeWidth) > 0 ? `${Number(item.edgeWidth)}px solid ${String(item.edgeColor || '#202720')}` : undefined,
    overflow: Number(item.edgeRadius) > 0 ? 'hidden' : undefined,
    '--section-background': String(item.backgroundColor || 'transparent'),
    '--section-text': String(item.textColor || 'inherit'),
    '--section-accent': String(item.accentColor || config.colors.accent || '#d6a74f'),
    '--section-heading-font': item.headingFont && item.headingFont !== 'inherit' ? storefrontFontStack(item.headingFont) : 'var(--seller-heading-font,inherit)',
    '--section-body-font': item.bodyFont && item.bodyFont !== 'inherit' ? storefrontFontStack(item.bodyFont) : 'var(--seller-body-font,inherit)',
    '--section-heading-size': Number(item.headingSize) > 0 ? `${Number(item.headingSize)}px` : undefined,
    '--section-alignment': String(item.alignment || 'left'),
    '--section-overlay': String(item.overlayOpacity ?? 45),
  } as CSSProperties);
  const addBuilderSection = (type: string, heading: string) => { const id = `${type}-${Date.now()}`; updateActivePageSections((sections) => [...sections, { id, type, heading, description: '', visible: true }]); setSelectedBuilderBlock(id); setBuilderPanel('layers'); setNotice(`${heading} section added to the ${pageDefinitions.find((page) => page.key === builderPage)?.title || 'storefront'} page.`); };
  const applyStorefrontPageLayout = (layoutId: string) => {
    const layout = storefrontPageLayoutDefinition(builderPage, layoutId);
    const blocks = layout.blocks.map((item, index) => ({ id: `${builderPage}-${item.type}-${Date.now()}-${index}`, ...item, visible: true }));
    if (builderPage === 'home') setConfig((current) => ({ ...current, sections: blocks, pageLayouts: { ...current.pageLayouts, home: layout.id } }));
    else setConfig((current) => ({ ...current, pageSections: { ...current.pageSections, [builderPage]: blocks }, pageLayouts: { ...current.pageLayouts, [builderPage]: layout.id } }));
    setSelectedBuilderBlock(blocks[0]?.id || 'page');
    setNotice(`${layout.name} structure applied to ${pageDefinitions.find((page) => page.key === builderPage)?.title || 'this page'}. You can edit, reorder, or remove its sections.`);
  };
  const removeBuilderSection = (id: string) => { updateActivePageSections((sections) => sections.filter((item) => item.id !== id)); if (selectedBuilderBlock === id) setSelectedBuilderBlock('page'); };
  const moveBuilderSection = (id: string, direction: -1 | 1) => updateActivePageSections((sections) => { const reordered = [...sections]; const index = reordered.findIndex((item) => item.id === id); const next = index + direction; if (index < 0 || next < 0 || next >= reordered.length) return sections; [reordered[index], reordered[next]] = [reordered[next], reordered[index]]; return reordered; });
  const updateBuilderColor = (key: string, value: string) => setConfig((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
  const buildImageInspiredStyle = (imageColors: string[]) => {
    const usable = imageColors.map((color) => ({ color, ...imageColorHsl(color) })).filter((color) => color.s > 22 && color.l > 15 && color.l < 86);
    const source = usable[0] || (imageColors[0] ? { color: imageColors[0], ...imageColorHsl(imageColors[0]) } : { color: '#55764e', h: 110, s: 22, l: 39 });
    const primary = imageStyleColor(source.h, Math.max(48, Math.min(82, source.s)), Math.max(31, Math.min(48, source.l)));
    const other = usable.filter((item) => item.color !== source.color).sort((first, second) => {
      const distance = (hue: number) => { const difference = Math.abs(hue - source.h); return Math.min(difference, 360 - difference); };
      return distance(second.h) * Math.min(second.s, 85) - distance(first.h) * Math.min(first.s, 85);
    })[0];
    const accentHue = other && Math.abs(other.h - source.h) > 30 ? other.h : (source.h + 148) % 360;
    const accent = imageStyleColor(accentHue, Math.max(52, Math.min(78, other?.s || source.s)), 46);
    const warmEditorial = source.h >= 12 && source.h <= 68 && source.s < 72;
    const vivid = source.s >= 68;
    const template = warmEditorial ? 'editorial' : vivid ? 'market' : 'minimal';
    const headingFont = warmEditorial ? 'Playfair Display' : vivid ? 'Manrope' : 'DM Sans';
    const bodyFont = vivid ? 'Inter' : 'DM Sans';
    const background = imageStyleColor(source.h, 12, 98);
    const footerBackground = imageStyleColor(source.h, 15, 94);
    setProfile((current) => ({ ...current, storeColor: primary }));
    setConfig((current) => ({
      ...current,
      template,
      colors: { ...current.colors, primary, accent, background, text: '#202720', muted: '#68736c' },
      typography: { ...current.typography, headingFont, bodyFont, headingStyle: warmEditorial ? 'editorial' : 'clean' },
      layout: { ...current.layout, sectionSpacing: warmEditorial ? 'spacious' : 'comfortable', navBackground: background, navTextColor: '#202720', navAccentColor: primary, footerBackground, footerTextColor: '#39443c', footerAccentColor: primary },
      sections: current.sections.map((item) => ({ ...item, backgroundColor: background, textColor: item.type === 'hero' ? '#ffffff' : '#202720', headingFont, bodyFont, accentColor: accent })),
    }));
    setNotice(`A ${warmEditorial ? 'warm editorial' : vivid ? 'vibrant market' : 'clean minimal'} storefront style was created from your hero image. Adjust any part in Design.`);
    setError('');
  };

  async function saveStore(event?: FormEvent) {
    event?.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await Promise.all([...brandImageUploads.current]);
      const currentProfile = profileRef.current;
      const fields = ['storeName', 'storeDescription', 'storeTagline', 'category', 'city', 'country', 'pickupAddress', 'storeColor', 'storeBanner', 'storeAvatar'];
      const payload = Object.fromEntries(fields.map((key) => [key, currentProfile[key]]));
      const saved = await request<Profile>('/seller/profile', { method: 'PATCH', body: JSON.stringify(payload) });
      profileRef.current = { ...profileRef.current, ...saved };
      setProfile((current) => ({ ...current, ...saved }));
      await request('/seller/store-config', { method: 'PATCH', body: JSON.stringify({ draft: config }) });
      try { if (currentProfile.slug) localStorage.setItem(`unimartx-builder-draft:${currentProfile.slug}`, JSON.stringify(config)); } catch { /* The server copy remains saved if browser storage is full. */ }
      window.dispatchEvent(new CustomEvent('unimartx:store-draft-saved', { detail: { slug: currentProfile.slug } }));
      setNotice('Your storefront draft is saved. Preview it any time before publishing.');
      if (savedNoticeTimer.current !== null) window.clearTimeout(savedNoticeTimer.current);
      savedNoticeTimer.current = window.setTimeout(() => setNotice((current) => current === 'Your storefront draft is saved. Preview it any time before publishing.' ? '' : current), 1200);
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your storefront.'); return false; }
    finally { setSaving(false); }
  }

  async function saveSellerSettings(event?: FormEvent) {
    event?.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await Promise.all([...brandImageUploads.current]);
      const currentProfile = profileRef.current;
      const fields = settingsView === 'personal'
        ? ['firstName', 'lastName', 'phone']
        : settingsView === 'delivery'
          ? ['city', 'country', 'pickupAddress', 'deliveryFee']
          : ['storeName', 'storeTagline', 'storeDescription', 'storeColor', 'storeBanner', 'storeAvatar'];
      const settingsFields = [...new Set([...fields, 'storeAvatar', 'storeBanner'])];
      const payload = Object.fromEntries(settingsFields.map((key) => [key, currentProfile[key]]));
      const saved = await request<Profile>('/seller/profile', { method: 'PATCH', body: JSON.stringify(payload) });
      profileRef.current = { ...profileRef.current, ...saved };
      setProfile((current) => ({ ...current, ...saved }));
      setNotice(settingsView === 'personal' ? 'Personal profile saved.' : settingsView === 'delivery' ? 'Delivery settings saved.' : 'Store settings saved.');
      if (savedNoticeTimer.current !== null) window.clearTimeout(savedNoticeTimer.current);
      savedNoticeTimer.current = window.setTimeout(() => setNotice(''), 2200);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save these settings.'); }
    finally { setSaving(false); }
  }

  async function publishStore() {
    setSaving(true); setError(''); setNotice('');
    try {
      await Promise.all([...brandImageUploads.current]);
      const currentProfile = profileRef.current;
      const fields = ['storeName', 'storeDescription', 'storeTagline', 'category', 'city', 'country', 'pickupAddress', 'storeColor', 'storeBanner', 'storeAvatar'];
      const payload = Object.fromEntries(fields.map((key) => [key, currentProfile[key]]));
      const saved = await request<Profile>('/seller/profile', { method: 'PATCH', body: JSON.stringify(payload) });
      profileRef.current = { ...profileRef.current, ...saved };
      setProfile((current) => ({ ...current, ...saved }));
      await request('/seller/store-config', { method: 'PATCH', body: JSON.stringify({ draft: config }) });
      const published = await request<{ published?: StoreConfig | null; publishedAt?: string }>('/seller/store-config/publish', { method: 'POST' });
      if (!published.published) throw new Error('The server did not return a published storefront design. Please try publishing again.');
      setPublishedAt(published.publishedAt || new Date().toISOString());
      try { localStorage.setItem('unimartx-store-published', new Date().toISOString()); } catch { /* Publishing is already confirmed by the server. */ }
      window.dispatchEvent(new CustomEvent('unimartx:store-published', { detail: { slug: currentProfile.slug } }));
      setNotice('Your storefront is published and ready for buyers.');
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not publish your storefront.'); }
    finally { setSaving(false); }
  }

  function undoBuilderChange() {
    if (storeHistory.current.length < 2) return;
    const current = storeHistory.current.pop(); if (current) redoHistory.current.push(current);
    const previous = storeHistory.current[storeHistory.current.length - 1]; if (!previous) return;
    setCanUndo(storeHistory.current.length > 1); setCanRedo(redoHistory.current.length > 0);
    profileRef.current = previous.profile;
    historyMode.current = true; setProfile(previous.profile); setConfig(previous.config);
  }
  function redoBuilderChange() {
    const next = redoHistory.current.pop(); if (!next) return;
    storeHistory.current.push(next); setCanUndo(storeHistory.current.length > 1); setCanRedo(redoHistory.current.length > 0);
    profileRef.current = next.profile;
    historyMode.current = true; setProfile(next.profile); setConfig(next.config);
  }

  function startCanvasPan(event: ReactPointerEvent<HTMLDivElement>) {
    if ((activeBuilderTool !== 'hand' && !event.shiftKey) || event.button !== 0 || pageConnectionPointer.current !== null) return;
    const stage = canvasStageRef.current;
    if (!stage) return;
    event.preventDefault();
    suppressCanvasClick.current = false;
    canvasPan.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: stage.scrollLeft, scrollTop: stage.scrollTop };
    setIsCanvasPanning(true);
    stage.setPointerCapture(event.pointerId);
  }
  function moveCanvasPan(event: ReactPointerEvent<HTMLDivElement>) {
    const start = canvasPan.current;
    const stage = canvasStageRef.current;
    if (!start || !stage || start.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - start.x) > 3 || Math.abs(event.clientY - start.y) > 3) suppressCanvasClick.current = true;
    stage.scrollLeft = start.scrollLeft - (event.clientX - start.x);
    stage.scrollTop = start.scrollTop - (event.clientY - start.y);
  }
  function endCanvasPan(event: ReactPointerEvent<HTMLDivElement>) {
    const stage = canvasStageRef.current;
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    canvasPan.current = null;
    setIsCanvasPanning(false);
  }

  function updateCanvasZoom(nextValue: number, clientX?: number, clientY?: number) {
    const nextZoom = Math.min(150, Math.max(40, nextValue));
    const stage = canvasStageRef.current;
    if (stage && nextZoom !== builderZoom) {
      const bounds = stage.getBoundingClientRect();
      const anchorX = (clientX ?? bounds.left + bounds.width / 2) - bounds.left;
      const anchorY = (clientY ?? bounds.top + bounds.height / 2) - bounds.top;
      const contentX = stage.scrollLeft + anchorX;
      const contentY = stage.scrollTop + anchorY;
      const ratio = nextZoom / builderZoom;
      requestAnimationFrame(() => {
        stage.scrollLeft = contentX * ratio - anchorX;
        stage.scrollTop = contentY * ratio - anchorY;
      });
    }
    setBuilderZoom(nextZoom);
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.shiftKey) return;
    event.preventDefault();
    const step = Math.max(5, Math.min(15, Math.round(Math.abs(event.deltaY) * 0.04 / 5) * 5));
    updateCanvasZoom(builderZoom + (event.deltaY < 0 ? step : -step), event.clientX, event.clientY);
  }

  function centerCanvasOnHome() {
    const stage = canvasStageRef.current;
    const home = canvasPages.find((page) => page.page === 'home');
    if (!stage || !home) return;
    const scale = builderZoom / 100;
    stage.scrollTo({ left: Math.max(0, home.x * scale - 18), top: Math.max(0, home.y * scale - 18), behavior: 'smooth' });
  }

  function addTextBlock() {
    addBuilderSection('text', 'Text block');
    setBuilderMenuOpen(false);
  }

  function openDraftPreview() {
    if (!profile.slug) { setError('Save your store details before opening a storefront preview.'); return; }
    const previewWindow = window.open('about:blank', '_blank');
    void saveStore().then((saved) => { if (previewWindow) previewWindow.location.href = saved ? `${storeUrl}${builderPage === 'home' ? '' : `/${builderPage}`}?preview=draft` : storeUrl; });
  }

  async function uploadBrandImage(field: 'storeAvatar' | 'storeBanner', file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) { setError('Choose an image smaller than 20 MB.'); return; }
    const task = (async () => {
      const previewUrl = URL.createObjectURL(file);
      setBrandImagePreviews((current) => ({ ...current, [field]: previewUrl }));
      try {
        const image = await createImageBitmap(file);
        const limit = field === 'storeAvatar' ? 640 : 1800;
        const scale = Math.min(1, limit / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) { image.close(); throw new Error('This image could not be prepared.'); }
        context.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
        updateProfile(field, canvas.toDataURL('image/jpeg', 0.82)); setError('');
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this image.'); }
      finally {
        setBrandImagePreviews((current) => {
          if (current[field] !== previewUrl) return current;
          const next = { ...current }; delete next[field]; return next;
        });
        URL.revokeObjectURL(previewUrl);
      }
    })();
    brandImageUploads.current.add(task);
    try { await task; } finally { brandImageUploads.current.delete(task); }
  }

  async function uploadBuilderSectionImage(file?: File, field = 'image') {
    if (!file || !file.type.startsWith('image/')) return;
    try { const image = await createImageBitmap(file); const scale = Math.min(1, 1600 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); const context = canvas.getContext('2d'); if (!context) { image.close(); throw new Error('This image could not be prepared.'); } context.drawImage(image,0,0,canvas.width,canvas.height); image.close(); updateBuilderSection(field,canvas.toDataURL('image/jpeg',0.82)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this image.'); }
  }

  async function toggleProduct(product: Product) {
    setError(''); try { await request(`/seller/products/${product.id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive: !product.isActive }) }); setProducts((items) => items.map((item) => item.id === product.id ? { ...item, isActive: !item.isActive } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update product.'); }
  }
  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete “${product.name}”? This can’t be undone.`)) return;
    try { await request(`/seller/products/${product.id}`, { method: 'DELETE' }); setProducts((items) => items.filter((item) => item.id !== product.id)); setNotice('Product deleted.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete product.'); }
  }
  function handleProductImages(input: HTMLInputElement) {
    const selected = Array.from(input.files || []);
    input.value = '';
    if (productImages.length + selected.length > 5) {
      setProductError('Choose up to five product photos in total.');
      return;
    }
    if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
      setProductError('Each product photo must be 5 MB or smaller.');
      return;
    }
    setProductError('');
    setProductImages((current) => [...current, ...selected]);
    setProductImagePreviews((current) => [...current, ...selected.map((file) => URL.createObjectURL(file))]);
  }
  function clearProductImages() {
    productImagePreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    productImagePreviewsRef.current = [];
    setProductImages([]); setProductImagePreviews([]);
  }
  function moveProductImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= productImages.length) return;
    setProductImages((current) => { const reordered = [...current]; [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]]; return reordered; });
    setProductImagePreviews((current) => { const reordered = [...current]; [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]]; return reordered; });
  }
  async function addProductCategory() {
    const name = newProductCategory.trim();
    if (name.length < 2) { setProductError('Enter a category name with at least 2 characters.'); return; }
    setCategoryBusy(true); setProductError('');
    try {
      const category = await request<{ id: string; name: string; slug: string }>('/categories/suggest', { method: 'POST', body: JSON.stringify({ name }) });
      setCategories((current) => current.some((item) => item.id === category.id || item.slug === category.slug) ? current : [...current, category]);
      setSelectedProductCategory(category.slug);
      setNewProductCategory(''); setAddingProductCategory(false);
      setNotice(`${category.name} is ready to use for this product.`);
    } catch (reason) { setProductError(reason instanceof Error ? reason.message : 'Could not add that category.'); }
    finally { setCategoryBusy(false); }
  }
  async function advanceOrder(order: Order) {
    const next = order.status === 'pending' ? 'processing' : order.status === 'processing' ? 'shipped' : order.status === 'shipped' ? 'delivered' : '';
    if (!next) return;
    try { await request(`/seller/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); setOrders((items) => items.map((item) => item.id === order.id ? { ...item, status: next } : item)); setOrderDetail((current) => current?.id === order.id ? { ...current, status: next } : current); setNotice(`Order ${order.orderNumber} marked ${next}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this order.'); }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setProductError('');
    if (!isEditingProduct && !productImages.length) { setProductError('Add at least one product photo.'); return; }
    setProductBusy(true);
    const data = new FormData(event.currentTarget);
    data.delete('images'); productImages.forEach((file) => data.append('images', file));
    if (data.get('comparePrice') === '') data.delete('comparePrice');
    data.set('tags', JSON.stringify(editingProduct?.tags || [])); data.delete('costPrice'); if (editingProduct?.costPrice != null) data.set('costPrice', String(editingProduct.costPrice)); data.set('details', JSON.stringify(editingProduct?.details || {}));
    try { await request(isEditingProduct ? `/seller/products/${editingProductId}` : '/seller/products', { method: isEditingProduct ? 'PUT' : 'POST', body: data }); clearProductImages(); setNotice(isEditingProduct ? 'Product updated.' : data.get('isActive') === 'true' ? 'Your product is now listed.' : 'Your product draft is saved.'); navigate('/seller/products'); await load(); }
    catch (reason) { setProductError(reason instanceof Error ? reason.message : 'Could not list this product.'); }
    finally { setProductBusy(false); }
  }




  const renderBuilderBlock = (item: StoreSection, ownerPage: 'home' | StorePageKey = builderPage) => {
    if (item.visible === false) return null;
    const selected = selectedBuilderBlock === item.id && builderPage === ownerPage;
    const selectBlock = () => { setBuilderPage(ownerPage); setBuilderPanel('layers'); setSelectedBuilderBlock(item.id); setSelectedProductCard(null); };
    if (item.type === 'hero') {
      const instrumentHero = config.templateId === 'highlife-sound' && ownerPage === 'home';
      const porcelainHero = config.templateId === 'kente-and-craft' && ownerPage === 'home';
      const foodHero = config.templateId === 'market-day' && ownerPage === 'home';
      const lifestyleHero = config.templateId === 'gold-coast-collective' && ownerPage === 'home';
      const electronicsHero = config.templateId === 'coastline-tech' && ownerPage === 'home';
      const heroProduct = products.find((product) => product.id === String(item.featuredProductId || '')) || products[0];
      const heroFlowCards = ownerPage === 'home' ? Object.entries(config.layout.productCardPositions as Record<string, { x: number; y: number }> || {}).filter(([, position]) => position.y <= 28) : [];
      return <div key={item.id} className={`seller-store-canvas-hero ${selected ? 'is-selected' : ''}${heroFlowCards.length ? ' has-product-flow' : ''}${electronicsHero ? ' is-electronics-hero' : ''}${porcelainHero ? ' is-grand-porcelain' : ''}${foodHero ? ' is-flavo-food' : ''}${lifestyleHero ? ' is-gold-coast-lifestyle' : ''}`} onClick={selectBlock} style={{ ...selectedSectionStyle(item), backgroundImage: item.backgroundImage ? selectedSectionStyle(item).backgroundImage : porcelainHero || foodHero || lifestyleHero ? undefined : item.image ? instrumentHero ? `linear-gradient(90deg,#d9dac2 0 34%,rgb(217 218 194 / 88%) 44%,transparent 68%),url("${String(item.image)}")` : `${config.templateId === 'accra-edit' && ownerPage === 'home' ? 'linear-gradient(90deg,transparent 0 48%,#fffaf3 48% 100%),' : electronicsHero ? 'linear-gradient(90deg,rgb(8 15 19 / 10%),rgb(8 15 19 / 25%)),' : ''}linear-gradient(90deg,rgb(16 26 23 / ${Number(item.overlayOpacity ?? 45) / 100}),rgb(16 26 23 / ${Number(item.overlayOpacity ?? 45) / 500})),${item.backgroundColor ? `linear-gradient(0deg,color-mix(in srgb,${String(item.backgroundColor)} 38%,transparent),color-mix(in srgb,${String(item.backgroundColor)} 38%,transparent)),` : ''}url("${String(item.image)}")` : undefined, backgroundPosition: item.backgroundImage ? `${Number(item.backgroundImagePositionX ?? 50)}% ${Number(item.backgroundImagePositionY ?? 50)}%` : instrumentHero ? 'right center' : String(item.imagePosition || 'center'), backgroundSize: item.backgroundImage ? String(item.backgroundImageFit || 'cover') : String(item.imageFit || 'cover') }}>
        {foodHero && <div className="food-template-hero-art"><img src={String(item.image || templateHeroImages['market-day'])} alt="Spices and seasonings"/><span>{String(item.mediaCaption || item.eyebrow || 'FLAVO · BLENDS FOR EVERY TABLE')}</span></div>}
        {lifestyleHero && <div className="gold-coast-hero-image"><img src={String(item.image || templateHeroImages['gold-coast-collective'])} alt="A scenic destination at golden hour"/><span>{String(item.locationLabel || `${profile.city || 'CAPE COAST'} · GHANA`)}</span>{heroProduct && <div className="gold-coast-feature-card"><span><StoreProductImage sources={[heroProduct.image, ...(heroProduct.images || [])]} alt={heroProduct.name}/></span><div><small>{String(item.featureEyebrow || 'CURATED FOR YOU')}</small><b>{heroProduct.name}</b><p>{heroProduct.category || 'A thoughtful find for your everyday'}</p><i>{String(item.featureLinkText || 'Discover more')} ↗</i></div></div>}</div>}
        <div><small>{String(item.eyebrow || `${profile.city || 'GHANA'} · INDEPENDENT SHOP`)}</small>{heroFlowCards.map(([productId, position]) => { const product = products.find((entry) => entry.id === productId); if (!product) return null; const cardStyle = (config.layout.productCardStyles as Record<string, Record<string, unknown>> | undefined)?.[productId] || {}; return <article key={`hero-flow-${productId}`} draggable className={`seller-canvas-floating-product is-hero-flow ${position.x < 50 ? 'floats-left' : 'floats-right'}`} style={{ '--hero-card-offset': `${Math.max(0, (position.y - 4) * 4)}px`, '--product-card-bg': String(cardStyle.background || '#ffffff'), '--product-card-ink': String(cardStyle.text || '#263126'), '--product-card-accent': String(cardStyle.accent || config.colors.primary || '#55764e'), '--product-card-radius': `${Number(cardStyle.radius ?? 9)}px`, '--product-card-layout': String(cardStyle.layout || 'vertical') } as CSSProperties} onDragStart={(event) => { event.dataTransfer.setData('application/x-unimartx-product-card', product.id); event.dataTransfer.effectAllowed = 'move'; }} onClick={(event) => { event.stopPropagation(); setSelectedProductCard({ sectionId: item.id, productId }); setBuilderPanel('layers'); }}>{<span><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span>}<div><small>{product.category || 'FEATURED'}</small><b>{product.name}</b><strong>{money(product.price)}</strong></div></article>; })}<h1>{String(item.heading || profile.storeName || 'Good things, close to home.')}</h1><p>{String(item.description || profile.storeTagline || 'Thoughtfully chosen pieces for everyday life.')}</p>{(!porcelainHero || foodHero || lifestyleHero) && <button>{String(item.buttonText || 'Explore the shop')} <MarketIcon name="arrow" size={15}/></button>}</div>
        {porcelainHero && <div className="grand-porcelain-hero-gallery">{sectionProducts(products, item).slice(0, Number(item.heroProductCount) || 5).map((product, index) => <div className={`grand-porcelain-hero-product is-item-${index + 1}`} key={product.id}><span><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><small>{product.category || 'TABLEWARE'}</small><b>{product.name}</b></div>)}{!products.length && <div className="grand-porcelain-hero-note">{String(item.emptyStateText || 'Objects for slow mornings, shared meals, and all the moments in between.')}</div>}</div>}
      </div>;
    }
    if (item.type === 'about') return <div key={item.id} className="seller-store-canvas-feature" style={selectedSectionStyle(item)}><div className={`seller-store-canvas-about ${selected ? 'is-selected' : ''}`} onClick={selectBlock}><small>{String(item.eyebrow || 'THE STORY')}</small><h2>{String(item.heading || 'A little story about our shop.')}</h2><p>{String(item.description || item.body || profile.storeDescription || 'We bring together thoughtful pieces, made with care and chosen to make everyday moments feel special.')}</p><button>{String(item.linkText || 'Our story')} <MarketIcon name="arrow" size={13}/></button></div><div className="seller-store-canvas-image" style={item.image ? { backgroundImage: `url("${String(item.image)}")`, backgroundPosition: String(item.imagePosition || 'center'), backgroundSize: String(item.imageFit || 'cover') as CSSProperties['backgroundSize'] } : {}}><span>{String(item.imageCaption || 'MADE WITH CARE')}</span></div></div>;
    if (item.type === 'featured-products' || item.type === 'products' || item.type === 'catalog') { const visibleProducts = sectionProducts(products, item); const instrumentShop = config.templateId === 'highlife-sound' && ownerPage === 'home'; const electronicsShop = config.templateId === 'coastline-tech'; const floatingIds = Object.keys(config.layout.productCardPositions as Record<string, unknown> || {}); const cardStyles = config.layout.productCardStyles as Record<string, Record<string, unknown>> || {}; return <div key={item.id} className={`seller-store-canvas-products ${selected ? 'is-selected' : ''} ${instrumentShop ? 'is-instrument-shop' : ''} ${electronicsShop ? 'is-electronics-products' : ''}`} style={selectedSectionStyle(item)} onClick={selectBlock}>{instrumentShop && item.showShopSidebar !== false && <aside className="seller-instrument-shop-sidebar"><h2>{String(item.shopSidebarHeading || 'SHOP')}</h2>{instrumentShopCategories(item).map((category, index) => <span key={`${category}-${index}`}>{category}</span>)}</aside>}<div><span><small>{String(item.eyebrow || (instrumentShop ? 'TONE FORGE / SELECTED GEAR' : item.type === 'catalog' ? 'THE LATEST AND GREATEST' : 'THE COLLECTION'))}</small><h2>{String(item.heading || 'Good finds, picked for you.')}</h2></span><button>{String(item.buttonText || 'Shop all')} <MarketIcon name="arrow" size={13}/></button></div><div className="seller-canvas-product-grid" style={{ '--seller-preview-columns': Number(item.productColumns || config.layout.productGrid || 3) } as CSSProperties}>{visibleProducts.slice(0, Number(item.maxProducts) || 3).filter((product) => !floatingIds.includes(product.id)).map((product) => { const style = cardStyles[product.id] || {}; const isSelected = selectedProductCard?.productId === product.id; return <article key={product.id} draggable data-product-card-layout={String(style.layout || 'vertical')} className={isSelected ? 'is-product-selected' : ''} style={{ '--product-card-bg': String(style.background || '#ffffff'), '--product-card-ink': String(style.text || '#263126'), '--product-card-accent': String(style.accent || config.colors.primary || '#55764e'), '--product-card-radius': `${Number(style.radius ?? 9)}px` } as CSSProperties} onDragStart={(event) => { event.dataTransfer.setData('application/x-unimartx-product-card', product.id); event.dataTransfer.effectAllowed = 'move'; }} onClick={(event) => { event.stopPropagation(); selectBlock(); setSelectedProductCard({ sectionId: item.id, productId: product.id }); }}><span className="seller-canvas-product-media"><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><b>{product.name}</b>{(item.showPrices ?? config.layout.showPrices) !== false && <small>{money(product.price)}</small>}</article>; })}{visibleProducts.length === 0 && <div className="seller-canvas-empty-products"><MarketIcon name="package" size={22}/><span>{item.productSelectionMode === 'manual' ? 'Choose products for this section' : 'Your products will appear here'}</span></div>}{!floatingIds.length && <small className="seller-product-drag-hint">Drag a product card onto any part of the page to place it there.</small>}</div></div>; }
    if (item.type === 'filters') return <section key={item.id} style={selectedSectionStyle(item)} className={`seller-store-canvas-added seller-store-page-filters ${selected ? 'is-selected' : ''}`} onClick={selectBlock}><small>SHOP CONTROLS</small><div className="seller-canvas-category-chips"><span>All products</span><span>Category</span><span>Price range</span><span>In stock</span><span>Sort by</span></div></section>;
    if (['collection-intro', 'story-intro', 'contact-intro', 'values', 'timeline', 'contact-form', 'store-details', 'faq', 'hours', 'review-summary', 'review-quotes', 'review-feed', 'review-invite', 'category-products'].includes(item.type)) return <section key={item.id} style={selectedSectionStyle(item)} className={`seller-store-canvas-added seller-store-block-${item.type} ${selected ? 'is-selected' : ''}`} onClick={selectBlock}><small>{String(item.eyebrow || item.type.replaceAll('-', ' ').toUpperCase())}</small><h2>{String(item.heading || 'A little more to discover')}</h2><p>{String(item.description || item.body || 'Make this part of the page yours.')}</p>{item.type === 'contact-form' && <div className="seller-canvas-form-preview"><span>Name</span><span>Email address</span><span>Your message</span><b>Send message ↗</b></div>}{item.type === 'review-summary' && <strong>★★★★★ &nbsp; {dashboard?.stats.rating?.toFixed(1) || '—'} seller rating</strong>}{item.type === 'faq' && <div className="seller-canvas-faq-preview"><span>Shipping and delivery　＋</span><span>Returns and exchanges　＋</span></div>}{item.type === 'values' && <div className="seller-canvas-value-preview"><span>Thoughtfully chosen</span><span>Made with care</span><span>Close to home</span></div>}{item.type === 'timeline' && <div className="seller-canvas-timeline-preview"><i/><i/><i/></div>}</section>;
    if (item.type === 'categories' && config.templateId === 'coastline-tech') { const tileNames = sectionCategories(item, products); return <section key={item.id} style={selectedSectionStyle(item)} className={`seller-store-canvas-added is-electronics-categories ${selected ? 'is-selected' : ''}`} onClick={selectBlock}><small>{String(item.eyebrow || 'FIND YOUR NEXT FAVOURITE')}</small><h2>{String(item.heading || 'Shop by category')}</h2>{Boolean(item.description) && <p>{String(item.description)}</p>}<div className="electronics-category-grid">{tileNames.map((name, index) => { const product = products.find((entry) => entry.category === name); const fallbackName = ['Audio', 'Screens', 'Camera'][index % 3]; return <article key={`${name}-${index}`}><span>{product ? <StoreProductImage sources={[product.image, ...(product.images || []), electronicsCategoryArtwork[fallbackName]]} alt={String(name)}/> : <img src={electronicsCategoryArtwork[String(name)] || electronicsCategoryArtwork[fallbackName]} alt=""/>}</span><b>{String(name).toUpperCase()}</b></article>; })}</div></section>; }
    if (item.type === 'categories') { const names = sectionCategories(item, products); return <section key={item.id} style={selectedSectionStyle(item)} className={`seller-store-canvas-added ${selected ? 'is-selected' : ''}`} onClick={selectBlock}><small>{String(item.eyebrow || 'BROWSE THE SHOP')}</small><h2>{String(item.heading || 'Shop by category')}</h2><p>{String(item.description || 'Find something lovely in every collection.')}</p><div className="seller-canvas-category-chips">{names.map((category, index) => <span key={`${category}-${index}`}>{category}</span>)}{!names.length && <span>Your product categories will appear here</span>}</div></section>; }
    if (item.type === 'announcement') return <section key={item.id} style={selectedSectionStyle(item)} className={`seller-store-canvas-added seller-canvas-announcement ${selected ? 'is-selected' : ''}`} onClick={selectBlock}><small>✳ &nbsp; STORE ANNOUNCEMENT</small><h2>{String(item.heading || 'A note from our store')}</h2><p>{String(item.description || item.body || 'Take a look at what is new this week.')}</p>{Boolean(item.linkText) && <span>{String(item.linkText)} ↗</span>}</section>;
    return <section key={item.id} style={selectedSectionStyle(item)} className={`seller-store-canvas-added ${selected ? 'is-selected' : ''}`} onClick={selectBlock}><small>{String(item.eyebrow || String(item.type).replaceAll('-', ' ').toUpperCase())}</small><h2>{String(item.heading || 'A little more to discover')}</h2><p>{String(item.description || item.body || 'A new part of your storefront, ready for you to make it yours.')}</p>{item.type === 'image' && typeof item.image === 'string' && <img src={item.image} alt={String(item.heading || '')} style={{ objectFit: String(item.imageFit || 'cover') as CSSProperties['objectFit'], objectPosition: String(item.imagePosition || 'center') }}/ >}{Boolean(item.linkText) && <span>{String(item.linkText)} ↗</span>}</section>;
  };

  const canvasConnectionPaths = (config.pageConnections || []).flatMap((connection) => {
    const home = canvasPages.find((entry) => entry.page === 'home');
    const target = canvasPages.find((entry) => entry.page === connection.to);
    if (!home || !target) return [];
    const homeExpanded = expandedCanvasPageId === home.id;
    const targetExpanded = expandedCanvasPageId === target.id;
    const startX = home.x + (homeExpanded ? 820 : 390);
    const startY = home.y + (homeExpanded ? 55 : 280);
    const endX = target.x;
    const endY = target.y + (targetExpanded ? 55 : 280);
    const curve = Math.max(60, Math.abs(endX - startX) * .45);
    return [{ key: connection.to, d: `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`, startX, startY, endX, endY }];
  });
  const renderCanvasPage = (canvasPage: StoreCanvasPage) => {
    const page = canvasPage.page;
    const pageSections = page === 'home' ? config.sections : config.pageSections?.[page] || [];
    const title = pageDefinitions.find((entry) => entry.key === page)?.title || 'Home';
    const pageStyle = {
      left: canvasPage.x, top: canvasPage.y, '--seller-store-color': config.colors.primary || profile.storeColor || '#55764e',
      '--seller-store-accent': config.colors.accent || '#d6a74f', '--seller-store-background': config.colors.background || '#fff',
      '--seller-store-ink': config.colors.text || '#20291f', '--seller-heading-font': storefrontFontStack(config.typography.headingFont, '"DM Sans",sans-serif'),
      '--seller-body-font': storefrontFontStack(config.typography.bodyFont, '"DM Sans",sans-serif'),
      '--seller-content-width': config.layout.storeWidth === 'full' ? '100%' : '1200px',
      '--builder-section-gap': config.layout.sectionSpacing === 'compact' ? '14px' : config.layout.sectionSpacing === 'spacious' ? '42px' : '26px',
    } as CSSProperties;
    const isExpanded = expandedCanvasPageId === canvasPage.id;
    const connected = page !== 'home' && connectedStorePages.has(page);
    return <article key={canvasPage.id} className={`seller-builder-page-artboard ${builderPage === page ? 'is-active' : ''} ${isExpanded ? 'is-expanded' : ''}`} style={pageStyle}>
      <header className="seller-builder-artboard-header" draggable onDragStart={(event) => { if (event.shiftKey) { event.preventDefault(); return; } event.stopPropagation(); event.dataTransfer.setData('application/x-unimartx-canvas-page', canvasPage.id); event.dataTransfer.effectAllowed = 'move'; }} onPointerDown={(event) => { if (!event.shiftKey) event.stopPropagation(); }}>
        <button type="button" className="seller-builder-artboard-title" onClick={() => selectBuilderPage(page)}><MarketIcon name={pageDefinitions.find((entry) => entry.key === page)?.icon || 'shop'} size={13}/><b>{title}</b></button>
        <div className="seller-builder-artboard-actions"><span>{isExpanded ? 'Editing page' : 'Drag to place'}</span>{page !== 'home' && <button type="button" draggable={false} className="seller-builder-artboard-delete" onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); deleteBuilderPage(page, canvasPage.id); }} aria-label={`Delete ${title} page`} title={`Delete ${title} page`}>×</button>}<button type="button" className="seller-builder-artboard-expand" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectBuilderPage(page); setExpandedCanvasPageId(isExpanded ? null : canvasPage.id); }} aria-label={isExpanded ? `Collapse ${title} preview` : `Expand and edit ${title}`} title={isExpanded ? 'Return to canvas' : 'Expand and edit'}>{isExpanded ? '↙ Return to canvas' : '↗ Expand & edit'}</button></div>
      </header>
      <div className="seller-builder-mini-viewport" title={isExpanded ? 'Drag product cards anywhere on the page · click empty space to collapse' : `Click to expand and edit ${title}`} onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-unimartx-product-card')) event.preventDefault(); }} onDrop={placeProductCard} onClick={() => { if (!isExpanded) { selectBuilderPage(page); setExpandedCanvasPageId(canvasPage.id); } }}>
        <div className={`seller-store-canvas seller-builder-mini-store is-${config.template} is-store-template-${config.templateId || 'default'} seller-page-layout-${page} seller-page-style-${storefrontPageLayout(page, config.pageLayouts)}`} style={{ backgroundColor: config.colors.background || '#fff', color: config.colors.text || '#20291f', fontFamily: 'var(--seller-body-font)' }}>
          <div className={`seller-store-canvas-nav is-layout-${String(config.layout.navLayout || 'standard')} is-decoration-${String(config.layout.navDecoration || 'plain')} ${selectedBuilderBlock === 'navigation' && builderPage === page ? 'is-selected' : ''}`} onClick={(event) => { event.stopPropagation(); setBuilderPage(page); setSelectedBuilderBlock('navigation'); setBuilderPanel('layers'); }} style={{ position: config.layout.navSticky === true ? 'sticky' : 'relative', backgroundColor: String(config.layout.navBackground || '#ffffff'), color: String(config.layout.navTextColor || '#303832'), '--builder-nav-accent': String(config.layout.navAccentColor || '#55764e'), '--seller-nav-height': storefrontNavHeight(config.template, config.layout.navHeight), '--seller-nav-logo-size': `${Number(config.layout.navLogoSize) || 32}px`, '--seller-nav-link-gap': `${Number(config.layout.navLinkGap) || 24}px` } as CSSProperties}>
            <div className="seller-store-nav-brand">{config.layout.navShowLogo !== false && <><a href="#store-home" aria-label={`${profile.storeName || 'Store'} home`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); selectBuilderPage('home'); }}><b>{config.layout.navBrandMode === 'platform' ? 'u' : brandImage('storeAvatar') ? <img src={brandImage('storeAvatar')} alt=""/> : (profile.storeName[0] || 'S')}</b></a>{config.layout.navBrandMode !== 'platform' && <strong>{profile.storeName || 'Your store'}</strong>}</>}</div>
            {config.layout.navShowLinks !== false && <nav className="seller-store-nav-links" aria-label="Store navigation">{pageDefinitions.filter((entry) => entry.key === 'home' || connectedStorePages.has(entry.key as StorePageKey)).map((entry) => <a key={entry.key} href="#" onClick={(event) => { event.preventDefault(); event.stopPropagation(); selectBuilderPage(entry.key); }}>{entry.key === 'home' ? String(config.layout.navHomeLabel || 'Home') : entry.key === 'products' ? String(config.layout.navShopLabel || 'Shop') : entry.key === 'about' ? String(config.layout.navAboutLabel || 'About') : entry.title}</a>)}</nav>}
            <div className="seller-store-nav-tools">{config.layout.navShowSearch !== false && <label className="seller-storefront-search"><MarketIcon name="search" size={15}/><input aria-label="Search this store" placeholder="Search this store" disabled/></label>}{config.layout.navShowLocation !== false && <span className="seller-storefront-location"><MarketIcon name="location" size={14}/>{profile.city || profile.country || 'Ghana'}</span>}{config.layout.navShowActions !== false && <a className="seller-storefront-cart" href="#store-products" aria-label="Shopping bag" onClick={(event) => { event.preventDefault(); event.stopPropagation(); selectBuilderPage(pageDefinitions.find((entry) => entry.key === 'products') ? 'products' : page); }}><MarketIcon name="bag" size={15}/></a>}</div>
          </div>
          <div className="seller-store-content">{pageSections.map((section) => renderBuilderBlock(section, page))}</div>
          {(config.layout.productCardPositions as Record<string, { x: number; y: number }> | undefined) && Object.entries(config.layout.productCardPositions as Record<string, { x: number; y: number }>).map(([productId, position]) => { const product = products.find((entry) => entry.id === productId); if (!product || page !== 'home' || position.y <= 28) return null; const cardStyle = (config.layout.productCardStyles as Record<string, Record<string, unknown>> | undefined)?.[productId] || {}; return <article key={`floating-${product.id}`} draggable className={`seller-canvas-floating-product ${selectedProductCard?.productId === product.id ? 'is-selected' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%`, '--product-card-bg': String(cardStyle.background || '#ffffff'), '--product-card-ink': String(cardStyle.text || '#263126'), '--product-card-accent': String(cardStyle.accent || config.colors.primary || '#55764e'), '--product-card-radius': `${Number(cardStyle.radius ?? 9)}px`, '--product-card-layout': String(cardStyle.layout || 'vertical') } as CSSProperties} onDragStart={(event) => { event.dataTransfer.setData('application/x-unimartx-product-card', product.id); event.dataTransfer.effectAllowed = 'move'; }} onClick={(event) => { event.stopPropagation(); selectBuilderPage(page); setSelectedProductCard({ sectionId: 'floating', productId: product.id }); setBuilderPanel('layers'); }}><span><StoreProductImage sources={[product.image, ...(product.images || [])]} alt={product.name}/></span><div><small>{product.category || 'FEATURED'}</small><b>{product.name}</b><strong>{money(product.price)}</strong></div></article>; })}
          {config.layout.footerVisible !== false && <footer className={`seller-store-canvas-footer ${selectedBuilderBlock === 'footer' && builderPage === page ? 'is-selected' : ''}`} onClick={(event) => { event.stopPropagation(); setBuilderPage(page); setSelectedBuilderBlock('footer'); setBuilderPanel('layers'); }} style={{ backgroundColor: String(config.layout.footerBackground || '#f5f6f2'), color: String(config.layout.footerTextColor || '#596258'), '--builder-footer-accent': String(config.layout.footerAccentColor || '#55764e') } as CSSProperties}>{config.layout.footerShowBrand !== false && <b>{profile.storeName || 'Your store'}</b>}<span>{String(config.layout.footerMessage || `Made with care in ${profile.country || 'Ghana'}`)}</span>{config.layout.footerLinkText && <a>{String(config.layout.footerLinkText)} ↗</a>}</footer>}
        </div>
      </div>
      {page === 'home' ? <button type="button" className={`seller-page-connection-port is-source ${isExpanded ? 'is-expanded' : ''}`} aria-label="Drag to connect a page to Home" title="Drag this port onto another page’s + port to add a navigation link" onPointerDown={startPageConnection} onPointerUp={finishPageConnection} onPointerCancel={(event) => { if (pageConnectionPointer.current === event.pointerId) { pageConnectionPointer.current = null; setIsConnectingPage(false); } }}>↗</button> : <button type="button" data-page-connection-target={page} className={`seller-page-connection-port is-target ${connected ? 'is-connected' : ''} ${isExpanded ? 'is-expanded' : ''} ${isConnectingPage ? 'is-ready' : ''}`} aria-label={connected ? `${title} is connected; click to disconnect` : `Connect ${title} to Home`} title={connected ? 'Connected to Home — click to disconnect' : 'Drop the Home connection port here'} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'link'; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (event.dataTransfer.getData('application/x-unimartx-page-connection') === 'home') connectStorePage(page); }} onClick={() => connected ? removePageConnection(page) : setNotice('Drag Home’s connection port to this page’s + port to add its navigation link.')}>{connected ? '✓' : '+'}</button>}
    </article>;
  };
  function renderBuilderInspector() {
    const selected = activeBuilderSection;
    const isCatalog = Boolean(selected && ['featured-products', 'products', 'catalog'].includes(selected.type));
    const imageSection = Boolean(selected && ['hero', 'about', 'image'].includes(selected.type));
    const linkSection = Boolean(selected && ['text', 'newsletter', 'announcement', 'image', 'about'].includes(selected.type));
    const sectionField = (field: string, value: unknown) => updateSelectedSection(field, value);
    const selectedShopCategories = selected && Array.isArray(selected.shopCategories) ? selected.shopCategories.map(String) : selected?.type === 'categories' ? sectionCategories(selected, products) : instrumentShopCategoryDefaults;
    if (inspectorTab === 'design') return <>
      {selectedCardProduct && <section className="seller-inspector-section"><header><b>{selectedCardProduct.name} card</b><span className="seller-inspector-kind">PRODUCT</span></header><p className="seller-inspector-note">Drag this card anywhere on the expanded preview. It snaps to the page grid.</p><BuilderColorPicker label="Card background" value={String(((config.layout.productCardStyles as Record<string, Record<string, unknown>> | undefined)?.[selectedCardProduct.id]?.background) || '#ffffff')} onChange={(value) => updateProductCard('background', value)}/><BuilderColorPicker label="Text colour" value={String(((config.layout.productCardStyles as Record<string, Record<string, unknown>> | undefined)?.[selectedCardProduct.id]?.text) || '#263126')} onChange={(value) => updateProductCard('text', value)}/><BuilderColorPicker label="Accent colour" value={String(((config.layout.productCardStyles as Record<string, Record<string, unknown>> | undefined)?.[selectedCardProduct.id]?.accent) || config.colors.primary || '#55764e')} onChange={(value) => updateProductCard('accent', value)}/><label className="seller-inspector-field">Card layout<select value={String(((config.layout.productCardStyles as Record<string, Record<string, unknown>> | undefined)?.[selectedCardProduct.id]?.layout) || 'vertical')} onChange={(event) => updateProductCard('layout', event.target.value)}><option value="vertical">Image above details</option><option value="horizontal">Image beside details</option></select></label><BuilderRangeControl label="Corner roundness" value={Number(((config.layout.productCardStyles as Record<string, Record<string, unknown>> | undefined)?.[selectedCardProduct.id]?.radius) ?? 9)} min={0} max={32} suffix=" px" onChange={(value) => updateProductCard('radius', value)}/><button type="button" className="seller-inspector-remove-card" onClick={() => { const positions = { ...(config.layout.productCardPositions as Record<string, unknown> || {}) }; delete positions[selectedCardProduct.id]; setConfig((current) => ({ ...current, layout: { ...current.layout, productCardPositions: positions } })); setSelectedProductCard(null); }}>Return card to product grid</button></section>}
      {!selectedCardProduct && selected && <>
        <section className="seller-inspector-section"><header><b>{String(selected.heading || selected.type).replaceAll('-', ' ')} design</b><span className="seller-inspector-kind">{selected.type}</span></header>
          <label className="seller-inspector-field">Heading<input value={String(selected.heading || '')} onChange={(event) => sectionField('heading', event.target.value)} placeholder="Section heading"/></label>
          <label className="seller-inspector-field">Supporting text<textarea rows={3} value={String(selected.description || selected.body || '')} onChange={(event) => sectionField('description', event.target.value)} placeholder="Write a short description"/></label>
          <label className="seller-inspector-field">Eyebrow / small label<input value={String(selected.eyebrow || '')} onChange={(event) => sectionField('eyebrow', event.target.value)} placeholder="Optional short label"/></label>
          {['about', 'image'].includes(selected.type) && <label className="seller-inspector-field">Image caption<input value={String(selected.imageCaption || '')} onChange={(event) => sectionField('imageCaption', event.target.value)} placeholder="Optional image caption"/></label>}
          {imageSection && <><BuilderImagePicker label={selected.type === 'hero' ? 'Hero image' : selected.type === 'about' ? 'Story image' : 'Section image'} value={typeof selected.image === 'string' ? selected.image : ''} onUpload={(file) => { void uploadBuilderSectionImage(file); }} onRemove={() => sectionField('image', '')} onColorPick={(color) => sectionField('accentColor', color)} onCreateStyle={selected.type === 'hero' ? buildImageInspiredStyle : undefined}/><label className="seller-inspector-field">Image position<select value={String(selected.imagePosition || 'center')} onChange={(event) => sectionField('imagePosition', event.target.value)}><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></label><label className="seller-inspector-field">Image fit<select value={String(selected.imageFit || 'cover')} onChange={(event) => sectionField('imageFit', event.target.value)}><option value="cover">Fill section</option><option value="contain">Fit entire image</option></select></label></>}
        </section>
        <section className="seller-inspector-section"><header><b>Appearance</b></header>
          <BuilderColorPicker label="Section background" value={String(selected.backgroundColor || '#ffffff')} onChange={(value) => sectionField('backgroundColor', value)}/>
          <BuilderColorPicker label="Text colour" value={String(selected.textColor || '#263126')} onChange={(value) => sectionField('textColor', value)}/>
          <BuilderColorPicker label="Accent colour" value={String(selected.accentColor || config.colors.accent || '#d6a74f')} onChange={(value) => sectionField('accentColor', value)}/>
          {builderPage === 'about' && <><BuilderImagePicker label="Section background image" value={typeof selected.backgroundImage === 'string' ? selected.backgroundImage : ''} onUpload={(file) => { void uploadBuilderSectionImage(file, 'backgroundImage'); }} onRemove={() => sectionField('backgroundImage', '')}/>{Boolean(selected.backgroundImage) && <><label className="seller-inspector-field">Background image fit<select value={String(selected.backgroundImageFit || 'cover')} onChange={(event) => sectionField('backgroundImageFit', event.target.value)}><option value="cover">Fill section</option><option value="contain">Fit entire image</option></select></label><BuilderRangeControl label="Image horizontal position" value={Number(selected.backgroundImagePositionX ?? 50)} min={0} max={100} suffix="%" onChange={(value) => sectionField('backgroundImagePositionX', value)}/><BuilderRangeControl label="Image vertical position" value={Number(selected.backgroundImagePositionY ?? 50)} min={0} max={100} suffix="%" onChange={(value) => sectionField('backgroundImagePositionY', value)}/><BuilderRangeControl label="Image darkening" value={Number(selected.backgroundImageOverlay ?? 18)} min={0} max={80} suffix="%" onChange={(value) => sectionField('backgroundImageOverlay', value)}/></>}
            <label className="seller-inspector-field">Section height<select value={String(selected.sectionHeightMode || (Number(selected.sectionHeight) > 0 ? 'custom' : 'content'))} onChange={(event) => sectionField('sectionHeightMode', event.target.value)}><option value="content">Fit content</option><option value="viewport">Fill viewport height</option><option value="custom">Set a custom height</option></select></label>{(selected.sectionHeightMode || (Number(selected.sectionHeight) > 0 ? 'custom' : 'content')) === 'custom' && <BuilderRangeControl label="Custom section height" value={Number(selected.sectionHeight || 560)} min={240} max={1400} suffix=" px" onChange={(value) => sectionField('sectionHeight', value)}/>}</>}
          <label className="seller-inspector-field">Content alignment<select value={String(selected.alignment || 'left')} onChange={(event) => sectionField('alignment', event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <BuilderRangeControl label="Section minimum height" value={Number(selected.sectionHeight || 0)} min={0} max={1200} suffix=" px" onChange={(value) => sectionField('sectionHeight', value || undefined)}/>
          <BuilderRangeControl label="Section padding" value={Number(selected.sectionPadding ?? 0)} min={0} max={160} suffix=" px" onChange={(value) => sectionField('sectionPadding', value || undefined)}/>
          {selected.type === 'hero' && <BuilderRangeControl label="Image overlay" value={Number(selected.overlayOpacity ?? 45)} min={0} max={80} suffix="%" onChange={(value) => sectionField('overlayOpacity', value)}/>}
          {selected.type === 'hero' && <><header className="seller-inspector-subheading"><b>Hero edges</b></header><BuilderRangeControl label="Corner roundness" value={Number(selected.edgeRadius ?? 0)} min={0} max={120} suffix=" px" onChange={(value) => sectionField('edgeRadius', value)}/><BuilderRangeControl label="Border thickness" value={Number(selected.edgeWidth ?? 0)} min={0} max={16} suffix=" px" onChange={(value) => sectionField('edgeWidth', value)}/>{Number(selected.edgeWidth) > 0 && <BuilderColorPicker label="Border colour" value={String(selected.edgeColor || '#202720')} onChange={(value) => sectionField('edgeColor', value)}/>}</>}
          {isCatalog && <label className="seller-inspector-field">Product cards per row<select value={String(selected.productColumns || config.layout.productGrid || 3)} onChange={(event) => sectionField('productColumns', Number(event.target.value))}><option value="2">2 columns</option><option value="3">3 columns</option><option value="4">4 columns</option></select></label>}
          <label className="seller-inspector-toggle"><input type="checkbox" checked={selected.visible !== false} onChange={(event) => sectionField('visible', event.target.checked)}/> Show this section</label>
        </section>
        <section className="seller-inspector-section"><header><b>Typography</b></header>
          <p className="seller-inspector-note">Choose a clear font pairing for this section. Store default keeps your site-wide type choices.</p>
          <label className="seller-inspector-field">Heading typeface<select value={String(selected.headingFont || 'inherit')} onChange={(event) => sectionField('headingFont', event.target.value)}><option value="inherit">Store default</option>{STOREFRONT_FONT_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.fonts.map((font) => <option key={font} value={font}>{font}</option>)}</optgroup>)}</select></label>
          <label className="seller-inspector-field">Body typeface<select value={String(selected.bodyFont || 'inherit')} onChange={(event) => sectionField('bodyFont', event.target.value)}><option value="inherit">Store default</option>{STOREFRONT_FONT_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.fonts.map((font) => <option key={font} value={font}>{font}</option>)}</optgroup>)}</select></label>
          <BuilderRangeControl label="Heading size" value={Number(selected.headingSize || 30)} min={18} max={180} suffix=" px" onChange={(value) => sectionField('headingSize', value)}/>
        </section>
      </>}
      {selectedBuilderBlock === 'navigation' && <section className="seller-inspector-section"><header><b>Navigation appearance</b></header>
        <label className="seller-inspector-field">Brand display<select value={String(config.layout.navBrandMode || 'store')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navBrandMode: event.target.value } }))}><option value="store">Store logo and name</option><option value="platform">UniMartX mark</option></select></label>
        <label className="seller-inspector-field">Navigation layout<select value={String(config.layout.navLayout || 'standard')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navLayout: event.target.value } }))}><option value="standard">Brand left · links right</option><option value="center-brand">Brand centered</option><option value="center-links">Links centered</option><option value="stacked">Stacked rows</option></select></label>
        <label className="seller-inspector-field">Navigation height<select value={String(config.layout.navHeight || 'theme')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navHeight: event.target.value } }))}><option value="theme">Use template default</option><option value="compact">Compact</option><option value="standard">Standard</option><option value="spacious">Spacious</option></select></label>
        <label className="seller-inspector-field">Navigation treatment<select value={String(config.layout.navDecoration || 'plain')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navDecoration: event.target.value } }))}><option value="plain">Clean</option><option value="bordered">Bottom border</option><option value="floating">Floating card</option></select></label>
        <BuilderRangeControl label="Logo size" value={Number(config.layout.navLogoSize || 32)} min={24} max={52} suffix=" px" onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, navLogoSize: value } }))}/>
        <BuilderRangeControl label="Link spacing" value={Number(config.layout.navLinkGap || 24)} min={10} max={48} suffix=" px" onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, navLinkGap: value } }))}/>
        <BuilderColorPicker label="Navigation background" value={String(config.layout.navBackground || '#ffffff')} onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, navBackground: value } }))}/>
        <BuilderColorPicker label="Navigation text" value={String(config.layout.navTextColor || '#303832')} onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, navTextColor: value } }))}/>
        <BuilderColorPicker label="Link accent" value={String(config.layout.navAccentColor || '#55764e')} onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, navAccentColor: value } }))}/>
      </section>}
      {selectedBuilderBlock === 'footer' && <section className="seller-inspector-section"><header><b>Footer appearance</b></header>
        <BuilderColorPicker label="Footer background" value={String(config.layout.footerBackground || '#f5f6f2')} onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerBackground: value } }))}/>
        <BuilderColorPicker label="Footer text" value={String(config.layout.footerTextColor || '#596258')} onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerTextColor: value } }))}/>
        <BuilderColorPicker label="Link accent" value={String(config.layout.footerAccentColor || '#55764e')} onChange={(value) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerAccentColor: value } }))}/>
      </section>}
      {((!selected && selectedBuilderBlock !== 'navigation' && selectedBuilderBlock !== 'footer') || selectedBuilderBlock === 'page') && <>
        <section className="seller-inspector-section"><header><b>{selectedBuilderBlock === 'footer' ? 'Footer design' : selectedBuilderBlock === 'navigation' ? 'Navigation design' : 'Page design'}</b></header>
          <div className="seller-inspector-label">Store style</div><div className="seller-template-options">{[['minimal','Minimal'],['editorial','Editorial'],['market','Market']].map(([value,title]) => <button type="button" key={value} className={config.template === value ? 'is-active' : ''} onClick={() => updateConfig('template', value)}><i className={`is-${value}`}/>{title}</button>)}</div>
          <label className="seller-inspector-field">Content width<select value={String(config.layout.storeWidth || 'comfortable')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, storeWidth: event.target.value } }))}><option value="comfortable">Comfortable · 1200 px</option><option value="1440">1440 px · Fixed</option><option value="1200">1200 px · Fixed</option><option value="full">Full width</option></select></label>
          <label className="seller-inspector-field">Section spacing<select value={String(config.layout.sectionSpacing || 'comfortable')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, sectionSpacing: event.target.value } }))}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
          <header className="seller-inspector-subheading"><b>Store typography</b></header>
          <label className="seller-inspector-field">Heading typeface<select value={config.typography.headingFont || 'DM Sans'} onChange={(event) => setConfig((current) => ({ ...current, typography: { ...current.typography, headingFont: event.target.value } }))}>{STOREFRONT_FONT_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.fonts.map((font) => <option key={font} value={font}>{font}</option>)}</optgroup>)}</select></label>
          <label className="seller-inspector-field">Body typeface<select value={config.typography.bodyFont || 'DM Sans'} onChange={(event) => setConfig((current) => ({ ...current, typography: { ...current.typography, bodyFont: event.target.value } }))}>{STOREFRONT_FONT_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.fonts.map((font) => <option key={font} value={font}>{font}</option>)}</optgroup>)}</select></label>
          <label className="seller-inspector-field">Store name<input value={profile.storeName} onChange={(event) => updateProfile('storeName', event.target.value)} placeholder="Your store name"/></label>
        </section>
        <section className="seller-inspector-section"><header><b>Store palette</b></header>
          <BuilderColorPicker label="Brand colour" value={profile.storeColor || '#55764e'} onChange={(value) => updateProfile('storeColor', value)}/>
          <BuilderColorPicker label="Accent colour" value={config.colors.accent || '#d6a74f'} onChange={(value) => updateBuilderColor('accent', value)}/>
          <BuilderColorPicker label="Page background" value={config.colors.background || '#ffffff'} onChange={(value) => updateBuilderColor('background', value)}/>
          <BuilderColorPicker label="Text colour" value={config.colors.text || '#20291f'} onChange={(value) => updateBuilderColor('text', value)}/>
          <BuilderImagePicker label="Store logo" value={brandImage('storeAvatar')} onUpload={(file) => { void uploadBrandImage('storeAvatar', file); }} onRemove={() => updateProfile('storeAvatar', '')}/>
          <BuilderImagePicker label="Store cover image" value={brandImage('storeBanner')} onUpload={(file) => { void uploadBrandImage('storeBanner', file); }} onRemove={() => updateProfile('storeBanner', '')} onColorPick={(color) => updateProfile('storeColor', color)} onCreateStyle={buildImageInspiredStyle}/>
        </section>
        {selectedBuilderBlock === 'footer' && <section className="seller-inspector-section"><header><b>Footer content</b></header><label className="seller-inspector-field">Footer message<input value={String(config.layout.footerMessage || 'Good things, close to home.')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerMessage: event.target.value } }))}/></label></section>}
        <section className="seller-inspector-section"><header><b>Content spacing</b></header><p className="seller-inspector-note">Set side padding to 0 for edge-to-edge sections.</p><div className="seller-spacing-diagram"><label className="seller-spacing-top"><input aria-label="Top padding" min="0" max="240" type="number" value={String(config.layout.paddingTop ?? 24)} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, paddingTop: Math.max(0, Number(event.target.value)) } }))}/></label><label className="seller-spacing-left"><input aria-label="Left padding" min="0" max="240" type="number" value={String(config.layout.paddingLeft ?? 24)} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, paddingLeft: Math.max(0, Number(event.target.value)) } }))}/></label><span>CONTENT</span><label className="seller-spacing-right"><input aria-label="Right padding" min="0" max="240" type="number" value={String(config.layout.paddingRight ?? 24)} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, paddingRight: Math.max(0, Number(event.target.value)) } }))}/></label><label className="seller-spacing-bottom"><input aria-label="Bottom padding" min="0" max="240" type="number" value={String(config.layout.paddingBottom ?? 24)} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, paddingBottom: Math.max(0, Number(event.target.value)) } }))}/></label></div></section>
      </>}
      <section className="seller-inspector-section"><header><b>Canvas</b></header><label className="seller-inspector-toggle"><input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)}/> Show layout guides</label></section>
    </>;

    return <div className="seller-interact-panel">
      {selectedBuilderBlock === 'navigation' && <section className="seller-inspector-section"><header><b>Navigation behavior</b></header>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.navShowLogo !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navShowLogo: event.target.checked } }))}/> Show store branding</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.navShowLinks !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navShowLinks: event.target.checked } }))}/> Show navigation links</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.navShowSearch !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navShowSearch: event.target.checked } }))}/> Show search</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.navShowLocation !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navShowLocation: event.target.checked } }))}/> Show delivery location</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.navShowActions !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navShowActions: event.target.checked } }))}/> Show account and shopping actions</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.navSticky === true} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navSticky: event.target.checked } }))}/> Keep navigation visible while scrolling</label>
        <label className="seller-inspector-field">Home link label<input value={String(config.layout.navHomeLabel || 'Home')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navHomeLabel: event.target.value } }))}/></label>
        <label className="seller-inspector-field">Shop link label<input value={String(config.layout.navShopLabel || 'Shop')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navShopLabel: event.target.value } }))}/></label>
        <label className="seller-inspector-field">About link label<input value={String(config.layout.navAboutLabel || 'About')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, navAboutLabel: event.target.value } }))}/></label>
      </section>}
      {selectedBuilderBlock === 'footer' && <section className="seller-inspector-section"><header><b>Footer content &amp; links</b></header>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.footerVisible !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerVisible: event.target.checked } }))}/> Show footer</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.footerShowBrand !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerShowBrand: event.target.checked } }))}/> Show store name</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.footerShowSellerLink !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerShowSellerLink: event.target.checked } }))}/> Show seller link</label>
        <label className="seller-inspector-field">Footer message<input value={String(config.layout.footerMessage || 'Good things, close to home.')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerMessage: event.target.value } }))}/></label>
        <label className="seller-inspector-field">Link label<input value={String(config.layout.footerLinkText || 'Contact us')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerLinkText: event.target.value } }))}/></label>
        <label className="seller-inspector-field">Link destination<input value={String(config.layout.footerLinkUrl || '/marketing/contact')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, footerLinkUrl: event.target.value } }))} placeholder="/page or https://…"/></label>
      </section>}
      {selected ? <>
        <section className="seller-inspector-section"><header><b>{String(selected.heading || selected.type)} behavior</b></header>
          {selected.type === 'hero' && <><label className="seller-inspector-field">Button label<input value={String(selected.buttonText || 'Explore the collection')} onChange={(event) => sectionField('buttonText', event.target.value)}/></label><label className="seller-inspector-field">Button action<select value={String(selected.buttonAction || 'products')} onChange={(event) => sectionField('buttonAction', event.target.value)}><option value="products">Scroll to products</option><option value="categories">Browse categories</option><option value="custom">Open a link</option></select></label>{selected.buttonAction === 'custom' && <label className="seller-inspector-field">Button URL<input value={String(selected.buttonLink || '')} onChange={(event) => sectionField('buttonLink', event.target.value)} placeholder="https://…"/></label>}{config.templateId === 'gold-coast-collective' && <><label className="seller-inspector-field">Hero feature location label<input value={String(selected.locationLabel || '')} onChange={(event) => sectionField('locationLabel', event.target.value)} placeholder={`${profile.city || 'CAPE COAST'} · GHANA`}/></label><label className="seller-inspector-field">Feature card label<input value={String(selected.featureEyebrow || '')} onChange={(event) => sectionField('featureEyebrow', event.target.value)} placeholder="CURATED FOR YOU"/></label><label className="seller-inspector-field">Feature card action label<input value={String(selected.featureLinkText || '')} onChange={(event) => sectionField('featureLinkText', event.target.value)} placeholder="Discover more"/></label><label className="seller-inspector-field">Featured product<select value={String(selected.featuredProductId || '')} onChange={(event) => sectionField('featuredProductId', event.target.value)}><option value="">First active product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label></>}{config.templateId === 'market-day' && <label className="seller-inspector-field">Image caption<input value={String(selected.mediaCaption || '')} onChange={(event) => sectionField('mediaCaption', event.target.value)} placeholder="FLAVO · BLENDS FOR EVERY TABLE"/></label>}{config.templateId === 'kente-and-craft' && <><label className="seller-inspector-field">Empty gallery message<textarea rows={2} value={String(selected.emptyStateText || '')} onChange={(event) => sectionField('emptyStateText', event.target.value)} placeholder="Shown until products are added"/></label><BuilderRangeControl label="Hero product count" value={Number(selected.heroProductCount || 5)} min={1} max={8} suffix="" onChange={(value) => sectionField('heroProductCount', value)}/><label className="seller-inspector-toggle"><input type="checkbox" checked={selected.productSelectionMode === 'manual'} onChange={(event) => sectionField('productSelectionMode', event.target.checked ? 'manual' : 'automatic')}/> Choose hero gallery products manually</label>{selected.productSelectionMode === 'manual' && <div className="seller-template-product-picker"><span>Hero gallery products</span>{products.map((product) => { const ids = Array.isArray(selected.selectedProductIds) ? selected.selectedProductIds.map(String) : []; return <label key={product.id}><input type="checkbox" checked={ids.includes(product.id)} onChange={(event) => sectionField('selectedProductIds', event.target.checked ? [...ids, product.id] : ids.filter((id) => id !== product.id))}/><span>{product.image && <img src={product.image} alt=""/>}<b>{product.name}</b></span></label>; })}</div>}</>}</>}
          {isCatalog && <><label className="seller-inspector-field">Products in this section<input type="number" min="1" max="100" value={String(selected.maxProducts || 8)} onChange={(event) => sectionField('maxProducts', Number(event.target.value))}/></label><label className="seller-inspector-field">Shop all link label<input value={String(selected.buttonText || '')} onChange={(event) => sectionField('buttonText', event.target.value)} placeholder="Shop all"/></label><label className="seller-inspector-toggle"><input type="checkbox" checked={(selected.showPrices ?? config.layout.showPrices) !== false} onChange={(event) => sectionField('showPrices', event.target.checked)}/> Show prices in this section</label><label className="seller-inspector-toggle"><input type="checkbox" checked={(selected.productClick ?? config.layout.productClick) !== false} onChange={(event) => sectionField('productClick', event.target.checked)}/> Open product details when clicked</label><label className="seller-inspector-toggle"><input type="checkbox" checked={selected.productSelectionMode === 'manual'} onChange={(event) => sectionField('productSelectionMode', event.target.checked ? 'manual' : 'automatic')}/> Choose products manually</label>{selected.productSelectionMode === 'manual' && <div className="seller-template-product-picker"><span>Products shown in this section</span>{products.length ? products.map((product) => { const ids = Array.isArray(selected.selectedProductIds) ? selected.selectedProductIds.map(String) : []; return <label key={product.id}><input type="checkbox" checked={ids.includes(product.id)} onChange={(event) => sectionField('selectedProductIds', event.target.checked ? [...ids, product.id] : ids.filter((id) => id !== product.id))}/><span>{product.image && <img src={product.image} alt=""/>}<b>{product.name}</b></span></label>; }) : <small>Add products to your store to select them here.</small>}</div>}</>}
          {isCatalog && config.templateId === 'highlife-sound' && <><label className="seller-inspector-toggle"><input type="checkbox" checked={selected.showShopSidebar !== false} onChange={(event) => sectionField('showShopSidebar', event.target.checked)}/> Show shop category list</label>{selected.showShopSidebar !== false && <><label className="seller-inspector-field">Category list heading<input value={String(selected.shopSidebarHeading || 'SHOP')} onChange={(event) => sectionField('shopSidebarHeading', event.target.value)}/></label><div className="seller-instrument-category-editor"><span>Shop categories</span>{selectedShopCategories.map((category, index) => <div key={`shop-category-${index}`}><input aria-label={`Shop category ${index + 1}`} value={category} onChange={(event) => sectionField('shopCategories', selectedShopCategories.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}/><button type="button" aria-label={`Remove ${category || `category ${index + 1}`}`} title="Remove category" onClick={() => sectionField('shopCategories', selectedShopCategories.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}<button type="button" onClick={() => sectionField('shopCategories', [...selectedShopCategories, 'New category'])}>+ Add category</button></div><p className="seller-inspector-note">The product cards use your store’s uploaded product images.</p></>}</>}
          {selected.type === 'categories' && <><label className="seller-inspector-toggle"><input type="checkbox" checked={selected.scrollToProducts !== false} onChange={(event) => sectionField('scrollToProducts', event.target.checked)}/> Scroll to products after choosing a category</label><div className="seller-instrument-category-editor"><span>Categories shown in this section</span>{selectedShopCategories.map((category, index) => <div key={`section-category-${index}`}><input aria-label={`Category ${index + 1}`} value={category} onChange={(event) => sectionField('shopCategories', selectedShopCategories.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}/><button type="button" aria-label={`Remove ${category || `category ${index + 1}`}`} onClick={() => sectionField('shopCategories', selectedShopCategories.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}<button type="button" onClick={() => sectionField('shopCategories', [...selectedShopCategories, 'New category'])}>+ Add category</button></div><p className="seller-inspector-note">Category tiles use the matching product images. Edit product photos in your product listings.</p></>}
          {linkSection && <><label className="seller-inspector-field">Link label<input value={String(selected.linkText || (selected.type === 'newsletter' ? 'Contact the store' : selected.type === 'about' ? 'Read our story' : 'Learn more'))} onChange={(event) => sectionField('linkText', event.target.value)}/></label><label className="seller-inspector-field">Link URL<input value={String(selected.linkUrl || '')} onChange={(event) => sectionField('linkUrl', event.target.value)} placeholder="https://… or #section"/></label></>}
          {!['hero', 'categories'].includes(selected.type) && !isCatalog && !linkSection && <p className="seller-inspector-note">This section displays its content without an extra action.</p>}
        </section>
      </> : !selectedCardProduct && selectedBuilderBlock !== 'navigation' && selectedBuilderBlock !== 'footer' && <section className="seller-inspector-section"><header><b>Store behavior</b></header>
        <label className="seller-inspector-field">Content alignment<select value={String(config.layout.contentAlignment || 'center')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, contentAlignment: event.target.value } }))}><option value="center">Centered</option><option value="left">Align left</option><option value="right">Align right</option></select></label>
        <label className="seller-inspector-field">Default hero action<select value={String(config.layout.primaryAction || 'shop')} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, primaryAction: event.target.value } }))}><option value="shop">Browse products</option><option value="categories">Browse categories</option></select></label>
        <label className="seller-inspector-field">City<input value={profile.city} onChange={(event) => updateProfile('city', event.target.value)} placeholder="Accra"/></label><label className="seller-inspector-field">Country<input value={profile.country} onChange={(event) => updateProfile('country', event.target.value)} placeholder="Ghana"/></label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.showPrices !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, showPrices: event.target.checked } }))}/> Show prices by default</label>
        <label className="seller-inspector-toggle"><input type="checkbox" checked={config.layout.productClick !== false} onChange={(event) => setConfig((current) => ({ ...current, layout: { ...current.layout, productClick: event.target.checked } }))}/> Open product details by default</label>
      </section>}
      <p className="seller-inspector-note">Changes update the canvas immediately. Save draft to keep them, then publish when you are ready.</p>
    </div>;
  }

  const productCreatePage = <section className="seller-product-create-page">
    {productError && <div className="seller-feedback is-error" role="alert">{productError}<button type="button" onClick={() => setProductError('')} aria-label="Dismiss">×</button></div>}
    <div className="seller-product-create-top"><button type="button" onClick={() => { clearProductImages(); navigate('/seller/products'); }}><MarketIcon name="arrow" size={15}/> Back to product list</button><div><span>{isEditingProduct ? 'EDIT LISTING' : 'NEW LISTING'}</span><h1>{isEditingProduct ? 'Edit product' : 'Add new product'}</h1><p>{isEditingProduct ? 'Update the product details shown to shoppers.' : 'Share a new find with your customers. Add the details and photos shoppers need.'}</p></div></div>
    <form className="seller-product-create-form" onSubmit={(event) => void createProduct(event)}>
      <div className="seller-product-create-columns"><div className="seller-product-create-left">
        <section className="seller-product-create-card"><header><h2>Description</h2><p>Introduce your product and what makes it worth discovering.</p></header><label className="seller-product-field">Product name<input name="name" required maxLength={100} defaultValue={editingProduct?.name || ''} placeholder="e.g. Handwoven market tote"/></label><label className="seller-product-field">Business description<textarea name="description" required maxLength={1000} rows={6} defaultValue={editingProduct?.description || ''} placeholder="Describe the materials, features, sizing, or story behind this product."/><small>Up to 1,000 characters</small></label></section>
        <section className="seller-product-create-card"><header><h2>Category</h2><p>Choose an existing category or define one for your shop.</p></header><label className="seller-product-field">Product category<select name="category" required value={selectedProductCategory} onChange={(event) => setSelectedProductCategory(event.target.value)}><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>{addingProductCategory ? <div className="seller-product-category-create"><label className="seller-product-field">New category name<input value={newProductCategory} onChange={(event) => setNewProductCategory(event.target.value)} maxLength={60} placeholder="e.g. Handmade accessories"/></label><div><button type="button" className="seller-button seller-button-light" onClick={() => { setAddingProductCategory(false); setNewProductCategory(''); }}>Cancel</button><button type="button" className="seller-button" disabled={categoryBusy} onClick={() => void addProductCategory()}>{categoryBusy ? 'Adding…' : 'Add category'}</button></div></div> : <button type="button" className="seller-product-category-add" onClick={() => setAddingProductCategory(true)}><MarketIcon name="plus" size={14}/> Define a new category</button>}<label className="seller-product-field">Subcategory <span className="seller-field-optional">Optional</span><input name="subcategory" maxLength={80} defaultValue={editingProduct?.subcategory ?? undefined} placeholder="Add a more specific category"/></label></section>
        <section className="seller-product-create-card"><header><h2>Inventory</h2><p>Keep your available quantity up to date.</p></header><div className="seller-product-field-pair"><label className="seller-product-field">Quantity<input name="stock" type="number" min="0" step="1" defaultValue={editingProduct?.stock ?? 1} required/></label><label className="seller-product-field">Condition<select name="condition" defaultValue={editingProduct?.condition || 'new'}><option value="new">New</option><option value="like-new">Like new</option><option value="good">Good</option><option value="fair">Fair</option></select></label></div><label className="seller-product-field">Availability<select name="isActive" defaultValue={String(editingProduct?.isActive ?? true)}><option value="true">Active · visible in your shop</option><option value="false">Draft · hidden from shoppers</option></select></label></section>
        <section className="seller-product-create-card"><header><h2>Selling &amp; fulfilment</h2><p>Set how customers can receive their order.</p></header><label className="seller-product-field">Selling type<select name="fulfillment" value={productFulfillment} onChange={(event) => setProductFulfillment(event.target.value as typeof productFulfillment)}><option value="both">Pickup and delivery</option><option value="pickup">In-store pickup only</option><option value="delivery">Delivery only</option></select></label><label className="seller-product-field">Pickup or dispatch location <span className="seller-field-optional">Optional</span><input name="location" maxLength={160} defaultValue={editingProduct?.details?._location as string | undefined} placeholder="e.g. Osu, Accra"/></label></section>
      </div><div className="seller-product-create-right">
        <section className="seller-product-create-card"><header><h2>Product images <span className="seller-product-help" title="Use clear, well-lit photos. The first image is the cover.">?</span></h2><p>{isEditingProduct ? "Upload replacement photos to replace the current gallery." : "Add up to five images."} Move a photo left or right to change its order; the first image is the cover.</p></header><label className="seller-product-drop seller-product-create-drop"><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => handleProductImages(event.currentTarget)}/><span className="seller-product-drop-icon"><MarketIcon name="plus" size={20}/></span><b>{productImages.length ? 'Click to add more photos' : 'Click to upload or drag photos here'}</b><small>JPG, PNG or WebP · 5 MB max per image · {productImages.length}/5 selected</small><i>{productImages.length ? 'Add photos' : 'Choose photos'}</i></label>{isEditingProduct && !productImages.length && editingProduct && <div className="seller-product-image-previews">{[editingProduct.image, ...(editingProduct.images || [])].filter((image): image is string => Boolean(image)).map((image, index) => <span key={image} className={index === 0 ? "is-cover" : ""}><img src={image} alt={`Current product photo ${index + 1}`}/>{index === 0 && <i>Cover</i>}</span>)}</div>}{productImagePreviews.length > 0 && <div className="seller-product-image-previews">{productImagePreviews.map((preview, index) => <span key={preview} className={index === 0 ? 'is-cover' : ''}><img src={preview} alt={`Product photo ${index + 1}`}/>{index === 0 && <i>Cover</i>}<div><button type="button" aria-label={`Move photo ${index + 1} left`} title="Move left" disabled={index === 0} onClick={() => moveProductImage(index, -1)}>←</button><button type="button" aria-label={`Move photo ${index + 1} right`} title="Move right" disabled={index === productImagePreviews.length - 1} onClick={() => moveProductImage(index, 1)}>→</button></div></span>)}</div>}</section>
        {productFulfillment !== 'pickup' && <section className="seller-product-create-card"><header><h2>Shipping &amp; delivery</h2><p>Set a delivery charge if this product has one.</p></header><label className="seller-product-field">Delivery fee (GH₵)<input name="deliveryFee" type="number" min="0" step="0.01" defaultValue={editingProduct?.deliveryFee ?? ''} placeholder="0.00"/></label></section>}
        <section className="seller-product-create-card"><header><h2>Pricing</h2><p>Set your selling price and an optional reference price.</p></header><div className="seller-product-field-pair"><label className="seller-product-field">Price (GH₵)<input name="price" type="number" step="0.01" min="0.01" defaultValue={editingProduct?.price} required placeholder="0.00"/></label><label className="seller-product-field">Compare at price (GH₵)<input name="comparePrice" type="number" step="0.01" min="0" defaultValue={editingProduct?.comparePrice ?? undefined} placeholder="Optional"/></label></div></section>
        <div className="seller-product-create-actions"><button type="button" className="seller-product-discard" onClick={() => { clearProductImages(); navigate('/seller/products'); }}>Discard</button><button type="submit" className="seller-product-submit" disabled={productBusy}>{productBusy ? (isEditingProduct ? 'Saving…' : 'Adding product…') : isEditingProduct ? 'Save changes' : 'Add product'}<MarketIcon name="arrow" size={15}/></button></div>
      </div></div>
    </form>
  </section>;

  if (!user) return <Navigate to="/auth/login" replace state={{ from: '/seller' }}/>;
  if (user.role !== 'seller') return <main className="seller-access"><span>SELL WITH UNIMARTX</span><h1>This workspace is for sellers.</h1><p>Sign in with your seller account, or create a store to get started.</p><Link to="/auth/seller/register">Create a seller account <MarketIcon name="arrow" size={16}/></Link></main>;

  return <div className="seller-workspace">
    <aside className="seller-sidebar"><Link className="seller-brand market-logo" to="/shop" aria-label="UniMartX home" title="UniMartX"><span className="market-logo-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 17h28l-2.5 25h-23L10 17Z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/></svg></span><span>unimart<span>x</span></span></Link><div className="seller-store-switch"><span className="seller-store-mark" style={{ background: profile.storeColor }}>{profile.storeName.slice(0, 1) || 'S'}</span><div><b>{profile.storeName || 'Your new store'}</b><small>Seller workspace</small></div><MarketIcon name="arrow" size={14}/></div><nav aria-label="Seller workspace">{nav.map((item) => <Link aria-label={item.label} title={item.label} className={`seller-nav-link ${section === item.id ? 'is-active' : ''}`} key={item.id} to={`/seller/${item.id}`}><MarketIcon name={item.icon} size={18}/><span>{item.label}</span>{item.id === 'orders' && (dashboard?.stats.pending || 0) > 0 && <i>{dashboard?.stats.pending}</i>}</Link>)}</nav><div className="seller-sidebar-bottom"><Link to={storeUrl} target="_blank" aria-label="View my storefront" title="View my storefront"><MarketIcon name="compass" size={17}/><span>View my storefront</span><span>↗</span></Link><div className="seller-user" title={`${user.firstName} ${user.lastName}`}><span>{user.avatar ? <img src={user.avatar} alt=""/> : `${user.firstName[0] || ''}${user.lastName[0] || ''}`}</span><div><b>{user.firstName} {user.lastName}</b><small>{user.email}</small></div><button type="button" aria-label="Sign out" title="Sign out" onClick={() => { localStorage.removeItem('unimartxToken'); localStorage.removeItem('unimartxUser'); window.dispatchEvent(new CustomEvent('unimartx:auth-change')); navigate('/shop'); }}>↗</button></div></div></aside>
    <main className={`seller-main ${section === 'builder' ? 'is-builder-workspace' : ''}`}><header className="seller-topbar"><div><span className="seller-topbar-overline">SELLER WORKSPACE</span><b>{isCreatingProduct ? 'Add product' : isEditingProduct ? 'Edit product' : nav.find((item) => item.id === section)?.label || 'Home'}</b></div><div className="seller-top-actions"><span className={`seller-publish-state ${publishedAt ? 'is-live' : ''}`}><i/>{publishedAt ? 'Published storefront' : 'Draft workspace'}</span>{!isCreatingProduct && !isEditingProduct && <button className="seller-top-add" onClick={() => navigate('/seller/products/new')}><MarketIcon name="plus" size={14}/>Add new</button>}<div className="seller-notifications" ref={notificationsMenuRef}><button type="button" className="seller-notification-trigger" aria-label={`Notifications${notificationUnread ? `, ${notificationUnread} unread` : ''}`} aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); if (!notificationsOpen) void loadSellerNotifications(true); }}><MarketIcon name="bell" size={18}/>{notificationUnread > 0 && <i>{notificationUnread > 99 ? '99+' : notificationUnread}</i>}</button>{notificationsOpen && <section className="seller-notification-popover" role="dialog" aria-label="Seller notifications"><header><div><b>Notifications</b><small>{notificationUnread ? `${notificationUnread} unread` : 'You’re all caught up'}</small></div><button type="button" onClick={() => void markAllSellerNotificationsRead()} disabled={!notificationUnread}>Mark all read</button></header>{notificationsError && <p className="seller-notification-error" role="alert">{notificationsError}</p>}{notificationsLoading && !sellerNotifications.length ? <div className="seller-notification-state">Loading notifications…</div> : sellerNotifications.length ? <div className="seller-notification-list">{sellerNotifications.map((item) => <button type="button" className={`seller-notification-item ${item.read ? '' : 'is-unread'} ${item.priority === 'high' ? 'is-important' : ''}`} key={item.id} onClick={() => void openSellerNotification(item)}><span className="seller-notification-icon"><MarketIcon name={item.type.includes('stock') ? 'package' : item.type.includes('order') ? 'bag' : 'bell'} size={16}/></span><span className="seller-notification-copy"><b>{item.title}</b><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time></span>{!item.read && <i className="seller-notification-unread-dot"/>}</button>)}</div> : <div className="seller-notification-state"><MarketIcon name="bell" size={23}/><b>No notifications yet</b><span>New orders and stock alerts will appear here.</span></div>}<footer><button type="button" onClick={() => { setNotificationsOpen(false); navigate('/seller/orders'); }}>View orders <MarketIcon name="arrow" size={13}/></button></footer></section>}</div><Link to={storeUrl} target="_blank" className="seller-preview-button" aria-label="View storefront" title="View storefront"><MarketIcon name="compass" size={16}/></Link><span className="seller-top-avatar">{user.avatar ? <img src={user.avatar} alt=""/> : `${user.firstName[0] || ''}${user.lastName[0] || ''}`}</span></div></header>
      <div className="seller-content">{error && <div className="seller-feedback is-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}{notice && <div className="seller-feedback" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
        {loading ? <div className="seller-loading"><i/>Preparing your workspace…</div> : <>
          {section === 'builder' && <section className="seller-builder seller-visual-builder">
            <div className="seller-builder-toolbar">
              <div className="seller-builder-document"><button type="button" aria-label="Back to seller home" onClick={() => navigate('/seller/overview')}><MarketIcon name="arrow" size={16}/></button><span><small>DRAFT /</small><b>{profile.storeName || 'Untitled store'}</b></span><div className="seller-builder-overflow"><button type="button" aria-label="More builder actions" title="More actions" aria-haspopup="menu" aria-expanded={builderMenuOpen} onClick={() => setBuilderMenuOpen((open) => !open)}><span>•••</span></button>{builderMenuOpen && <div className="seller-builder-overflow-menu" role="menu"><button role="menuitem" onClick={addTextBlock}>Add text block</button><button role="menuitem" onClick={() => { setShowGuides((visible) => !visible); setBuilderMenuOpen(false); }}>{showGuides ? 'Hide layout guides' : 'Show layout guides'}</button><button role="menuitem" onClick={() => { setBuilderMenuOpen(false); openDraftPreview(); }}>Preview draft</button><button role="menuitem" disabled={saving} onClick={() => { setBuilderMenuOpen(false); void saveStore(); }}>Save draft</button><button role="menuitem" disabled={saving || !profile.storeName} onClick={() => { setBuilderMenuOpen(false); void publishStore(); }}>Publish storefront</button></div>}</div></div>
              <div className="seller-builder-tools"><button type="button" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={undoBuilderChange}><span>↶</span></button><button type="button" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={redoBuilderChange}><span>↷</span></button><i/><button type="button" className={activeBuilderTool === 'select' ? 'is-selected' : ''} aria-label="Select tool" title="Select sections" aria-pressed={activeBuilderTool === 'select'} onClick={() => setActiveBuilderTool('select')}><span>↖</span></button><button type="button" className={activeBuilderTool === 'hand' ? 'is-selected' : ''} aria-label="Move canvas" title="Drag to pan canvas" aria-pressed={activeBuilderTool === 'hand'} onClick={() => setActiveBuilderTool('hand')}><span>✋</span></button><button type="button" aria-label="Add text" title="Add text block" onClick={addTextBlock}><span>T</span></button><button type="button" aria-label="Add image section" title="Add image section" onClick={() => addBuilderSection('image', 'Image section')}><MarketIcon name="sparkle" size={16}/></button></div>
              <div className="seller-builder-toolbar-actions"><div className="seller-builder-zoom" role="group" aria-label="Canvas zoom"><button type="button" aria-label="Zoom out" title="Zoom out" disabled={builderZoom <= 40} onClick={() => updateCanvasZoom(builderZoom - 10)}>−</button><select aria-label="Canvas zoom" value={builderZoom} onChange={(event) => updateCanvasZoom(Number(event.target.value))}>{[40,50,60,70,80,90,100,110,120,130,140,150].map((zoom) => <option key={zoom} value={zoom}>{zoom}%</option>)}</select><button type="button" aria-label="Zoom in" title="Zoom in" disabled={builderZoom >= 150} onClick={() => updateCanvasZoom(builderZoom + 10)}>+</button></div><button className="seller-builder-center" type="button" onClick={centerCanvasOnHome} title="Move view to the Home page">Home</button><button className="seller-builder-share" type="button" onClick={openDraftPreview}>Preview</button><button className="seller-builder-save" type="button" disabled={saving} onClick={() => void saveStore()}>{saving ? 'Saving…' : 'Save draft'}</button><button className="seller-button seller-button-publish" disabled={saving || !profile.storeName} onClick={() => void publishStore()}>{saving ? 'Publishing…' : 'Publish'} <MarketIcon name="arrow" size={14}/></button></div>
            </div>
            <div className={`seller-builder-workarea ${builderPanel === 'templates' ? 'is-template-gallery' : ''}`}>
              <aside className="seller-builder-library">
                <div className="seller-builder-panel-tabs"><button aria-label="Templates" title="Templates" className={builderPanel === 'templates' ? 'is-active' : ''} onClick={() => setBuilderPanel('templates')}><MarketIcon name="shop" size={17}/><span>Templates</span></button><button aria-label="Layouts" title="Layouts" className={builderPanel === 'layouts' ? 'is-active' : ''} onClick={() => setBuilderPanel('layouts')}><MarketIcon name="sliders" size={17}/><span>Layouts</span></button><button aria-label="Pages" title="Pages" className={builderPanel === 'pages' ? 'is-active' : ''} onClick={() => setBuilderPanel('pages')}><MarketIcon name="package" size={17}/><span>Pages</span></button><button aria-label="Layers" title="Layers" className={builderPanel === 'layers' ? 'is-active' : ''} onClick={() => setBuilderPanel('layers')}><MarketIcon name="sparkle" size={17}/><span>Layers</span></button></div>
                {builderPanel === 'templates' ? <><div className="seller-builder-panel-heading"><b>Start with a storefront</b><small>Ghana-inspired designs, ready for your products and story.</small></div><div className="seller-template-gallery"><button type="button" className="seller-start-from-scratch" onClick={startStorefrontFromScratch}><span aria-hidden="true">＋</span><b>Start from scratch</b><small>Begin with a blank storefront, then add only the sections you need.</small><i>Build a blank store <MarketIcon name="arrow" size={13}/></i></button>{storefrontTemplates.map((template) => <article className={`seller-template-card ${config.templateId === template.id ? 'is-current' : ''}`} key={template.id} onClick={() => applyStorefrontTemplate(template.id)}><div className="seller-template-preview"><StorefrontTemplatePreview template={template} products={products} profile={profile}/></div><div className="seller-template-card-copy"><span>{template.category}</span><b>{template.name}</b><small>{template.description}</small><button type="button" aria-pressed={config.templateId === template.id} onClick={(event) => { event.stopPropagation(); applyStorefrontTemplate(template.id); }}>{config.templateId === template.id ? 'Currently using' : 'Use template'} <MarketIcon name="arrow" size={13}/></button></div></article>)}</div></> : builderPanel === 'layouts' ? <><div className="seller-builder-panel-heading"><b>{pageDefinitions.find((page) => page.key === builderPage)?.title || 'Home'} layouts</b><small>Choose a page structure, then customize its sections</small></div><div className="seller-page-layout-options">{STOREFRONT_PAGE_LAYOUTS[builderPage].map((layout) => <button type="button" key={layout.id} className={storefrontPageLayout(builderPage, config.pageLayouts) === layout.id ? 'is-active' : ''} aria-pressed={storefrontPageLayout(builderPage, config.pageLayouts) === layout.id} onClick={() => applyStorefrontPageLayout(layout.id)}><span className={`seller-page-layout-swatch is-${layout.id}`} aria-hidden="true"><i/><i/><i/></span><b>{layout.name}</b><small>{layout.summary}</small></button>)}</div><div className="seller-builder-panel-heading seller-page-sections-heading"><b>{pageDefinitions.find((page) => page.key === builderPage)?.title || 'Home'} sections</b><small>Only blocks designed for this page</small></div><div className="seller-layout-library">{pageSectionLibrary[builderPage].map(({ type, title, description })=><button key={type} className="seller-layout-tile" onClick={() => addBuilderSection(type,title)}><span className={`seller-layout-thumb is-${type}`}><i/><i/><i/></span><span><b>{title}</b><small>{description}</small></span><MarketIcon name="plus" size={14}/></button>)}</div></> : builderPanel === 'pages' ? <><div className="seller-builder-panel-heading"><b>Store pages</b><small>Drag a page onto the canvas to add a separate preview. Drag its header to place it anywhere. Connect Home ↗ to a page + to add a navigation link.</small></div><div className="seller-builder-pages">{pageDefinitions.map((page) => <button key={page.key} type="button" draggable className={`seller-builder-page-tile ${builderPage === page.key ? 'is-active' : ''}`} onClick={() => selectBuilderPage(page.key)} onDragStart={(event) => { event.dataTransfer.setData('application/x-unimartx-store-page', page.key); event.dataTransfer.effectAllowed = 'copy'; }}><span><MarketIcon name={page.icon} size={15}/></span><b>{page.title}</b><small>{page.description}</small><i>{page.key === 'home' ? builderPage === 'home' ? 'Current preview' : 'Drag to add · click to edit' : 'Drag to add · click to edit'}</i></button>)}</div></> : <><div className="seller-builder-panel-heading"><b>{pageDefinitions.find((page) => page.key === builderPage)?.title || 'Page'} layers</b><small>Choose a section to edit</small></div><div className="seller-layer-tree"><button className={selectedBuilderBlock === 'page' ? 'is-selected' : ''} onClick={() => setSelectedBuilderBlock('page')}><span>▤</span> Storefront page</button><div className="seller-layer-indent"><button className={selectedBuilderBlock === 'navigation' ? 'is-selected' : ''} onClick={() => setSelectedBuilderBlock('navigation')}><span>▥</span> Navigation</button>{activePageSections.map((item,index) => <div key={item.id} className={`seller-layer-row ${selectedBuilderBlock === item.id ? 'is-selected' : ''}`}><button className="seller-layer-select" onClick={() => setSelectedBuilderBlock(item.id)}><span>{item.type === 'featured-products' ? '▦' : '▤'}</span>{String(item.heading || (item.type === 'featured-products' ? 'Featured products' : item.type))}</button><div className="seller-layer-actions"><button aria-label="Move section up" disabled={index===0} onClick={()=>moveBuilderSection(item.id,-1)}>↑</button><button aria-label="Move section down" disabled={index===activePageSections.length-1} onClick={()=>moveBuilderSection(item.id,1)}>↓</button><button aria-label={`Remove ${String(item.heading || item.type)}`} onClick={()=>removeBuilderSection(item.id)}>×</button></div></div>)}<button className={selectedBuilderBlock === 'footer' ? 'is-selected' : ''} onClick={() => setSelectedBuilderBlock('footer')}><span>▤</span> Footer</button></div></div></>}
                {builderPanel === 'layouts' && <button className="seller-library-add" onClick={() => { const first = pageSectionLibrary[builderPage][0]; addBuilderSection(first.type, first.title); }}><MarketIcon name="plus" size={15}/> Add {pageSectionLibrary[builderPage][0].title}</button>}
              </aside>
              <div ref={builderCanvasRef} className={`seller-builder-canvas ${showGuides ? 'has-guides' : ''}`}>
                <div className="seller-canvas-ai"><MarketIcon name="sparkle" size={17}/><span><b>Shape your storefront</b><small>Update the text, imagery and products to make it yours.</small></span><button onClick={() => setSelectedBuilderBlock(heroConfig?.id || 'page')}>Edit hero <MarketIcon name="arrow" size={13}/></button></div>
                <div ref={canvasStageRef} className={`seller-canvas-stage ${activeBuilderTool === 'hand' ? 'is-hand-tool' : ''} ${isCanvasPanning ? 'is-panning' : ''} ${isConnectingPage ? 'is-connecting' : ''}`} onWheel={handleCanvasWheel} onDragOver={(event) => event.preventDefault()} onDrop={handleCanvasStageDrop} onPointerDown={startCanvasPan} onPointerMove={moveCanvasPan} onPointerUp={endCanvasPan} onPointerCancel={endCanvasPan} onClickCapture={(event) => { if (activeBuilderTool === 'hand' || event.shiftKey || suppressCanvasClick.current) { event.preventDefault(); event.stopPropagation(); suppressCanvasClick.current = false; } }}><div className="seller-canvas-world" style={{ '--builder-zoom': builderZoom / 100 } as CSSProperties}><svg className="seller-canvas-connection-lines" viewBox="0 0 3400 3000" aria-hidden="true">{canvasConnectionPaths.map((connection) => <g key={connection.key}><path d={connection.d}/><circle cx={connection.startX} cy={connection.startY} r="4"/><circle cx={connection.endX} cy={connection.endY} r="4"/></g>)}</svg>{canvasPages.map(renderCanvasPage)}</div></div>
                <div className="seller-canvas-guide" aria-label="Canvas controls guide"><span><b>Zoom</b><small>Shift + scroll · toolbar ±</small></span><i/><span><b>Move canvas</b><small>Shift + drag · or ✋ tool</small></span><i/><span><b>Find Home</b><small>Use Home in the toolbar</small></span></div>
              </div>
              <aside className="seller-builder-inspector"><div className="seller-builder-panel-tabs"><button className={inspectorTab === 'design' ? 'is-active' : ''} onClick={() => setInspectorTab('design')}>Design</button><button className={inspectorTab === 'interact' ? 'is-active' : ''} onClick={() => setInspectorTab('interact')}>Interact</button></div>
                {renderBuilderInspector()}
              </aside>
            </div>
          </section>}

          {section === 'overview' && <section className="seller-overview seller-dashboard-home">
            <div className="seller-dashboard-greeting"><div><span>SELLER OVERVIEW · {new Date().toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</span><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile.firstName || user.firstName}.</h1><p>Here’s what’s happening with your store today.</p></div><div className="seller-dashboard-actions"><Link className="seller-dashboard-secondary-action" to="/seller/orders">Manage orders</Link><Link className="seller-button seller-button-publish" to="/seller/products/new"><MarketIcon name="plus" size={15}/>Add product</Link></div></div>
            <div className="seller-stat-grid">{[['Sales revenue', money(dashboard?.stats.revenue || 0), 'Across your orders', 'creditCard'], ['Orders received', String(dashboard?.stats.orders || 0), `${dashboard?.stats.pending || 0} waiting for you`, 'bag'], ['Products listed', String(dashboard?.stats.products || products.length), `${dashboard?.stats.lowStock || 0} running low`, 'package'], ['Store followers', String(dashboard?.stats.followers || 0), 'People following your shop', 'heart']].map(([title, value, note, icon]) => <article className="seller-stat-card" key={title}><span className="seller-stat-icon"><MarketIcon name={icon as MarketIconName} size={18}/></span><small>{title}</small><b>{value}</b><span>{note}</span></article>)}</div>
            <div className="seller-dashboard-promos"><article className="seller-promo-card seller-promo-setup"><div><span className="seller-promo-overline">YOUR STOREFRONT</span><h2>{publishedAt ? 'Your shop is out in the world.' : `${setupPercent}% ready for its debut.`}</h2><p>{publishedAt ? 'Keep shaping your shop and give customers a reason to come back.' : 'Add the finishing touches and introduce your shop to the marketplace.'}</p><div className="seller-setup-progress"><i><span style={{ width: `${publishedAt ? 100 : setupPercent}%` }}/></i><small>{publishedAt ? 'Published' : `${completedSetupSteps} of 5 details added`}</small></div><Link to="/seller/builder">{publishedAt ? 'Edit storefront' : 'Continue building'} <MarketIcon name="arrow" size={14}/></Link></div><div className="seller-promo-art seller-promo-art-store" aria-hidden="true"><span className="seller-art-sun"/><div className="seller-art-shop"><i/><b>{profile.storeName ? profile.storeName.slice(0, 1) : 'u'}</b><span/><span/><span/></div><i className="seller-art-star">✳</i></div></article>
              <article className="seller-promo-card seller-promo-orders"><div><span className="seller-promo-overline">ORDER CARE</span><h2>{dashboard?.stats.pending ? `${dashboard.stats.pending} ${dashboard.stats.pending === 1 ? 'order' : 'orders'} need your attention.` : 'Keep every order moving.'}</h2><p>Confirm new orders and share progress with customers as you prepare their finds.</p><div className="seller-order-progress"><span><b>{dashboard?.stats.pending || 0}</b><small>To confirm</small></span><i/><span><b>{dashboard?.stats.processingOrShipped || 0}</b><small>In progress</small></span><i/><span><b>{dashboard?.stats.delivered || 0}</b><small>Delivered</small></span></div><Link to="/seller/orders">Open orders <MarketIcon name="arrow" size={14}/></Link></div><div className="seller-promo-art seller-promo-art-orders" aria-hidden="true"><div className="seller-art-bag"><MarketIcon name="bag" size={37}/></div><i/><i/><i/><span>✓</span></div></article></div>
            <section className="seller-dashboard-top-products"><header><div><span>WHAT’S MOVING</span><h2>Top products</h2></div><Link to="/seller/products">View products <MarketIcon name="arrow" size={14}/></Link></header>{dashboard?.topProducts.length ? <div className="seller-dashboard-product-grid">{dashboard.topProducts.slice(0, 4).map((product, index) => <article className="seller-dashboard-product-card" key={product.name}><span className="seller-dashboard-product-image">{product.image ? <img src={product.image} alt=""/> : <MarketIcon name="package" size={23}/>}<i>{String(index + 1).padStart(2, '0')}</i></span><div><b>{product.name}</b><small>{product.sales} {product.sales === 1 ? 'sale' : 'sales'}</small><strong>{money(product.revenue)}</strong></div></article>)}</div> : <div className="seller-dashboard-product-empty">Your best sellers will show here after your first orders. <Link to="/seller/products/new">Add a product</Link></div>}</section>
            <div className="seller-dashboard-insights"><section className="seller-panel seller-revenue-panel"><header><div><span>LAST 7 DAYS</span><h2>Sales activity</h2></div><Link to="/seller/insights">Full report <MarketIcon name="arrow" size={14}/></Link></header><div className="seller-dashboard-chart"><div className="seller-chart-y-labels"><span>{money(Math.max(0, ...(dashboard?.chartData || [0])))}</span><span>GH₵0</span></div><div className="seller-dashboard-chart-grid">{(dashboard?.chartData || Array(7).fill(0)).map((value, index) => { const max = Math.max(1, ...(dashboard?.chartData || [1])); return <div key={index}><span style={{ height: `${Math.max(4, Number(value) / max * 100)}%` }} title={money(Number(value))}/><small>{dashboard?.chartLabels?.[index] || ['M','T','W','T','F','S','S'][index]}</small></div>; })}</div></div></section>
              <section className="seller-panel seller-order-pulse"><header><div><span>AT A GLANCE</span><h2>Order pulse</h2></div><span className="seller-pulse-live"><i/>Live</span></header>{[['Pending', orders.filter((item) => item.status === 'pending').length, '#e8a237'], ['Processing', orders.filter((item) => item.status === 'processing').length, '#6589d7'], ['Shipped', orders.filter((item) => item.status === 'shipped').length, '#6d9d7a'], ['Delivered', orders.filter((item) => item.status === 'delivered').length, '#9ab178']].map(([label, value, tint]) => { const count = Number(value); const total = Math.max(1, orders.length); return <div className="seller-pulse-row" key={label as string}><span>{label}</span><i><b style={{ width: `${count / total * 100}%`, background: tint as string }}/></i><strong>{count}</strong></div>; })}<div className="seller-pulse-total"><b>{orders.length}</b><span>orders across your shop</span></div></section></div>
            <section className="seller-panel seller-dashboard-orders"><header><div><span>YOUR STORE ORDERS</span><h2>Recent orders</h2></div><Link to="/seller/orders">See all orders <MarketIcon name="arrow" size={14}/></Link></header><div className="seller-orders-toolbar"><div className="seller-order-filters">{[['all','All orders'],['pending','Pending'],['processing','Processing'],['shipped','Shipped']].map(([value,label])=><button key={value} className={orderFilter===value?'is-active':''} onClick={()=>setOrderFilter(value)}>{label}{value==='pending'&&dashboard?.stats.pending? <i>{dashboard.stats.pending}</i>:null}</button>)}</div><label className="seller-table-search"><MarketIcon name="search" size={15}/><input aria-label="Search orders" value={orderSearch} onChange={(event)=>setOrderSearch(event.target.value)} placeholder="Search orders"/></label></div><div className="seller-table-wrap"><table className="seller-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>PRODUCT</th><th>ORDERED</th><th>TOTAL</th><th>STATUS</th><th/></tr></thead><tbody>{dashboardOrders.map((order)=><tr key={order.id}><td><Link className="seller-order-number" to={'/seller/orders/' + order.id}>{order.orderNumber}</Link></td><td>{order.buyer.firstName} {order.buyer.lastName}</td><td>{order.items[0]?.product.name || 'Order item'}{order.items[0]?.quantity>1?` × ${order.items[0].quantity}`:''}</td><td>{new Date(order.createdAt).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}</td><td><b>{money(order.totalAmount)}</b></td><td><span className={`seller-status is-${order.status}`}>{order.status}</span></td><td>{['pending','processing','shipped'].includes(order.status)?<button className="seller-table-action" onClick={()=>void advanceOrder(order)}>{order.status==='pending'?'Confirm':order.status==='processing'?'Pack':'Complete'} <MarketIcon name="arrow" size={12}/></button>:<span className="seller-table-done">Done</span>}</td></tr>)}</tbody></table>{!dashboardOrders.length&&<div className="seller-table-empty"><MarketIcon name="bag" size={23}/><b>{orders.length?'No orders match these filters.':'Your first order is on its way.'}</b><span>{orders.length?'Choose another status or search term.':'Published products will appear in the marketplace.'}</span></div>}</div></section>
          </section>}

          {section === 'products' && (isCreatingProduct || isEditingProduct) ? productCreatePage : section === 'products' && <section className="seller-products-page">
            <div className="seller-products-heading"><div><span>YOUR CATALOGUE</span><h1>Products</h1><p>Bring your products together, keep stock current, and choose what shoppers can see.</p></div><button className="seller-button seller-button-publish" onClick={() => navigate('/seller/products/new')}><MarketIcon name="plus" size={16}/>Add product</button></div>
            <div className="seller-product-stats"><article><span>All products</span><b>{products.length}</b><MarketIcon name="package" size={17}/></article><article><span>Active listings</span><b>{products.filter((product) => product.isActive).length}</b><MarketIcon name="check" size={17}/></article><article><span>Drafts</span><b>{products.filter((product) => !product.isActive).length}</b><MarketIcon name="sparkle" size={17}/></article><article><span>Running low</span><b>{products.filter((product) => product.stock <= 5).length}</b><MarketIcon name="bag" size={17}/></article></div>
            <div className="seller-products-toolbar"><div className="seller-product-filters" role="tablist" aria-label="Filter products">{([['all','All'],['active','Active'],['draft','Drafts'],['low-stock','Low stock']] as const).map(([key,label]) => <button type="button" role="tab" aria-selected={productFilter === key} className={productFilter === key ? 'is-active' : ''} key={key} onClick={() => setProductFilter(key)}>{label}<i>{key === 'all' ? products.length : key === 'active' ? products.filter((item) => item.isActive).length : key === 'draft' ? products.filter((item) => !item.isActive).length : products.filter((item) => item.stock <= 5).length}</i></button>)}</div><div className="seller-table-toolbar"><label><MarketIcon name="search" size={16}/><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search products or categories"/></label><span>{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}</span></div></div>
            <div className="seller-table-wrap seller-products-table-wrap"><table className="seller-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Last updated</th><th>Actions</th></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><span className="seller-product-cell"><i>{product.image ? <img src={product.image} alt=""/> : <MarketIcon name="package" size={18}/>}</i><b>{product.name}</b></span></td><td>{categories.find((category) => category.slug === product.category)?.name || product.category || 'Uncategorised'}</td><td>{money(product.price)}</td><td><span className={product.stock <= 5 ? 'seller-stock-low' : ''}>{product.stock}{product.stock <= 5 ? ' · Low' : ''}</span></td><td><span className={`seller-status ${product.isActive ? 'is-active' : 'is-draft'}`}>{product.isActive ? 'Active' : 'Draft'}</span></td><td>{new Date(product.updatedAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</td><td><button className="seller-table-action" onClick={() => navigate("/seller/products/" + product.id + "/edit")}>Edit</button><button className="seller-table-action" onClick={() => void toggleProduct(product)}>{product.isActive ? 'Pause listing' : 'Activate'}</button><button className="seller-table-action is-delete" onClick={() => void deleteProduct(product)} aria-label={`Delete ${product.name}`}>Delete</button></td></tr>)}</tbody></table>{!filteredProducts.length && <div className="seller-table-empty"><MarketIcon name="package" size={25}/><b>{productSearch || productFilter !== 'all' ? 'No products found.' : 'Your first product is waiting to be listed.'}</b><span>{productSearch || productFilter !== 'all' ? 'Try another search or choose a different filter.' : 'Add your first listing so shoppers have something to discover.'}</span>{!products.length && <button className="seller-button seller-button-light" onClick={() => navigate('/seller/products/new')}><MarketIcon name="plus" size={14}/> Add your first product</button>}</div>}</div>
          </section>}

          {section === 'orders' && <section className="seller-orders-page">
{selectedOrderId ? <>
  <div className="seller-order-detail-top"><button type="button" onClick={() => navigate('/seller/orders')}>← Back to orders</button>{orderDetail && <div><span>ORDER DETAILS</span><h1>{orderDetail.orderNumber}</h1><p>Placed {new Date(orderDetail.createdAt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>}</div>
  {orderDetailLoading && <div className="seller-order-detail-state">Loading order details…</div>}
  {orderDetailError && <div className="seller-order-detail-error" role="alert"><b>Could not load this order</b><span>{orderDetailError}</span><button type="button" onClick={() => navigate('/seller/orders')}>Return to orders</button></div>}
  {orderDetail && <><div className="seller-order-detail-status"><div><span className={'seller-status is-' + orderDetail.status}>{orderDetail.status}</span><p>{orderDetail.fulfillmentType === 'delivery' ? 'Delivery order' : orderDetail.fulfillmentType === 'pickup' ? 'Pickup order' : 'Pickup and delivery'}</p></div><div className="seller-order-detail-actions">{['pending','processing','shipped'].includes(orderDetail.status) && <button className="seller-button" onClick={() => void advanceOrder(orderDetail)}>{orderDetail.status === 'pending' ? 'Confirm order' : orderDetail.status === 'processing' ? 'Mark as shipped' : 'Mark as delivered'} <MarketIcon name="arrow" size={14}/></button>}{['pending','processing','shipped'].includes(orderDetail.status) && <button className="seller-order-cancel" onClick={() => { const next = { ...orderDetail, status: 'cancelled' }; void request('/seller/orders/' + orderDetail.id + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }).then(() => { setOrderDetail(next); setOrders((items) => items.map((item) => item.id === orderDetail.id ? { ...item, status: 'cancelled' } : item)); setNotice('Order ' + orderDetail.orderNumber + ' cancelled.'); }).catch((reason) => setOrderDetailError(reason instanceof Error ? reason.message : 'Could not cancel this order.')); }}>Cancel order</button>}</div></div>
    <div className="seller-order-detail-layout"><div className="seller-order-detail-main"><section className="seller-order-panel"><header><div><span>FULFILMENT</span><h2>Items in this order</h2></div><small>{orderDetail.items.length} {orderDetail.items.length === 1 ? 'item' : 'items'}</small></header>{orderDetail.items.map((item) => <article className="seller-order-line" key={item.id}><span className="seller-order-line-image">{item.product.image ? <img src={item.product.image} alt=""/> : <MarketIcon name="package" size={19}/>}</span><div><b>{item.product.name}</b><small>Qty {item.quantity} · {money(Number(item.price))} each</small></div><strong>{money(Number(item.price) * item.quantity)}</strong></article>)}<div className="seller-order-total-row"><span>Items total</span><b>{money(orderDetail.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0))}</b></div>{Number(orderDetail.sellerDeliveryFee || 0) > 0 && <div className="seller-order-total-row"><span>Delivery</span><b>{money(Number(orderDetail.sellerDeliveryFee))}</b></div>}<div className="seller-order-total-row is-grand"><span>Order total</span><b>{money(Number(orderDetail.totalAmount))}</b></div></section>
      {orderDetail.notes && <section className="seller-order-panel"><header><div><span>BUYER MESSAGE</span><h2>Order notes</h2></div></header><p className="seller-order-notes">{orderDetail.notes}</p></section>}
      {orderDetail.address && <section className="seller-order-panel"><header><div><span>DELIVERY</span><h2>{orderDetail.fulfillmentType === 'pickup' ? 'Pickup details' : 'Delivery address'}</h2></div></header><address>{orderDetail.address.street}<br/>{[orderDetail.address.city, orderDetail.address.state, orderDetail.address.zipCode].filter(Boolean).join(', ')}<br/>{orderDetail.address.country}{orderDetail.address.notes && <small>{orderDetail.address.notes}</small>}</address></section>}</div>
    <aside className="seller-order-detail-side"><section className="seller-order-panel"><header><div><span>CUSTOMER</span><h2>Buyer details</h2></div></header><b>{orderDetail.buyer.firstName} {orderDetail.buyer.lastName}</b>{orderDetail.buyer.email && <a href={'mailto:' + orderDetail.buyer.email}>{orderDetail.buyer.email}</a>}{orderDetail.buyer.phone && <a href={'tel:' + orderDetail.buyer.phone}>{orderDetail.buyer.phone}</a>}</section><section className="seller-order-panel"><header><div><span>ORDER PROGRESS</span><h2>Order journey</h2></div></header><ol className="seller-order-timeline">{['pending','processing','shipped','delivered'].map((status) => { const steps = ['pending','processing','shipped','delivered']; const reached = steps.indexOf(orderDetail.status) >= steps.indexOf(status); return <li className={reached ? 'is-reached' : ''} key={status}><i/><span><b>{status.charAt(0).toUpperCase() + status.slice(1)}</b><small>{status === 'pending' ? 'Order received' : status === 'processing' ? 'Preparing the order' : status === 'shipped' ? 'On the way' : 'Completed'}</small></span></li>; })}{orderDetail.status === 'cancelled' && <li className="is-cancelled"><i/><span><b>Cancelled</b><small>This order was cancelled</small></span></li>}</ol></section></aside></div>
  </>}
</> : <>
  <div className="seller-orders-heading"><div><span>SELLER WORKSPACE / ORDERS</span><h1>Orders</h1><p>Stay on top of new purchases and keep every buyer updated.</p></div><span className="seller-order-pending-count">{orders.filter((item) => item.status === 'pending').length} awaiting confirmation</span></div>
  <div className="seller-orders-summary"><span><b>{orders.length}</b><small>All orders</small></span><span><b>{orders.filter((item) => item.status === 'pending').length}</b><small>Needs attention</small></span><span><b>{orders.filter((item) => item.status === 'processing' || item.status === 'shipped').length}</b><small>In progress</small></span><span><b>{orders.filter((item) => item.status === 'delivered').length}</b><small>Completed</small></span></div>
  <div className="seller-orders-list-toolbar"><div className="seller-orders-status-tabs">{[['all','All'],['pending','New'],['processing','Processing'],['shipped','Shipped'],['delivered','Delivered'],['cancelled','Cancelled']].map(([value,label]) => <button key={value} className={ordersPageFilter === value ? 'is-active' : ''} onClick={() => setOrdersPageFilter(value)}>{label}<i>{value === 'all' ? orders.length : orders.filter((order) => order.status === value).length}</i></button>)}</div><label><MarketIcon name="search" size={16}/><input aria-label="Search orders" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order or customer"/></label></div>
  <div className="seller-table-wrap seller-orders-table-wrap"><table className="seller-table"><thead><tr><th>ORDER</th><th>BUYER</th><th>ITEM</th><th>FULFILMENT</th><th>DATE</th><th>TOTAL</th><th>STATUS</th><th/></tr></thead><tbody>{ordersPageOrders.map((order) => <tr key={order.id}><td><Link className="seller-order-number" to={'/seller/orders/' + order.id}>{order.orderNumber}</Link></td><td>{order.buyer.firstName} {order.buyer.lastName}</td><td>{order.items[0]?.product.name || 'Order item'}{order.items[0]?.quantity > 1 ? ' × ' + order.items[0].quantity : ''}</td><td>{order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'pickup' ? 'Pickup' : 'Pickup + delivery'}</td><td>{new Date(order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><b>{money(order.totalAmount)}</b></td><td><span className={'seller-status is-' + order.status}>{order.status}</span></td><td><Link className="seller-order-view-link" to={'/seller/orders/' + order.id}>View details <MarketIcon name="arrow" size={13}/></Link></td></tr>)}</tbody></table>{!ordersPageOrders.length && <div className="seller-table-empty"><MarketIcon name="bag" size={25}/><b>{orders.length ? 'No orders match this view.' : 'Your first order is on its way.'}</b><span>{orders.length ? 'Try another status or search term.' : 'Orders from your storefront will appear here.'}</span></div>}</div>
</>}
</section>}

          {section === 'insights' && <section className="seller-insights-page">
            <div className="seller-page-intro seller-insights-intro"><div><span>YOUR STORE PERFORMANCE</span><h1>Insights</h1><p>Track sales, orders, and the products customers choose.</p></div><div className="seller-insights-period" aria-label="Choose analytics period">{([['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['1y', '1 year']] as const).map(([period, label]) => <button type="button" key={period} className={analyticsPeriod === period ? 'is-active' : ''} aria-pressed={analyticsPeriod === period} onClick={() => setAnalyticsPeriod(period)}>{label}</button>)}</div></div>
            {analyticsError && <div className="seller-insights-error" role="alert"><span>{analyticsError}</span><button type="button" onClick={() => setAnalyticsRetry((retry) => retry + 1)}>Retry</button></div>}
            <div className="seller-stat-grid seller-insights-stats">{([
              ['Revenue', money(analytics?.stats.revenue || 0), analytics?.stats.revenueChange ?? 0, 'creditCard'],
              ['Orders', String(analytics?.stats.orders || 0), analytics?.stats.ordersChange ?? 0, 'bag'],
              ['Customers', String(analytics?.stats.customers || 0), analytics?.stats.customersChange ?? 0, 'heart'],
              ['Products sold', String(analytics?.stats.productsSold || 0), analytics?.stats.productsChange ?? 0, 'package'],
            ] as [string, string, number, MarketIconName][]).map(([title, value, change, icon]) => <article className="seller-stat-card" key={title}><span className="seller-stat-icon"><MarketIcon name={icon} size={18}/></span><small>{title}</small><b>{value}</b><span className={change > 0 ? 'is-positive' : change < 0 ? 'is-negative' : ''}>{change > 0 ? '+' : ''}{change}% vs previous period</span></article>)}</div>
            <div className="seller-insights-columns"><section className="seller-panel seller-insights-chart-panel"><header><div><span>{analyticsPeriod === '7d' ? 'LAST 7 DAYS' : analyticsPeriod === '30d' ? 'LAST 30 DAYS' : analyticsPeriod === '90d' ? 'LAST 90 DAYS' : 'LAST YEAR'}</span><h2>Revenue over time</h2></div>{analyticsLoading && <small className="seller-insights-loading">Updating…</small>}</header>
              <div className="seller-insights-chart-wrap"><div className="seller-insights-y-labels"><span>{money(Math.max(0, ...(analytics?.chartData || [0])))}</span><span>GH₵0</span></div><div className="seller-insights-chart">{(() => { const data = analytics?.chartData || []; const labels = analytics?.chartLabels || []; const bucketCount = Math.min(12, data.length || 1); const buckets = Array.from({ length: bucketCount }, (_, index) => { const from = Math.floor(index * data.length / bucketCount); const to = Math.floor((index + 1) * data.length / bucketCount); const value = data.slice(from, Math.max(from + 1, to)).reduce((sum, amount) => sum + Number(amount || 0), 0); return { value, label: labels[Math.min(data.length - 1, Math.max(from, to - 1))] || '' }; }); const max = Math.max(1, ...buckets.map((bucket) => bucket.value)); return buckets.map((bucket, index) => <div key={index}><span style={{ height: `${Math.max(3, bucket.value / max * 100)}%` }} title={`${bucket.label}: ${money(bucket.value)}`}/><small>{bucket.label}</small></div>); })()}</div></div>
              {!analyticsLoading && analytics && analytics.stats.orders === 0 && <div className="seller-insights-chart-empty">Revenue activity will appear here when you receive orders.</div>}
            </section><section className="seller-panel seller-insights-products"><header><div><span>TOP PERFORMERS</span><h2>Best selling products</h2></div></header>{analytics?.topProducts.map((product, index) => <div className="seller-top-product" key={product.name}><i>{String(index + 1).padStart(2, '0')}</i><span>{product.image ? <img src={product.image} alt=""/> : <MarketIcon name="package" size={16}/>}</span><b>{product.name}</b><small>{product.units} sold</small><strong>{money(product.revenue)}</strong></div>)}{!analyticsLoading && !analytics?.topProducts.length && <div className="seller-insights-empty">Your top products will appear here after your first sale.</div>}</section></div>
          </section>}

          {section === 'help' && <section className="seller-help-page">
            <header className="seller-help-hero"><div className="seller-help-hero-copy"><span className="seller-help-eyebrow">AKWAABA, SELLER</span><h1>Your shop sidekick</h1><p>Quick answers, practical guides, and a little encouragement for every step of your selling journey.</p><label className="seller-help-search"><MarketIcon name="search" size={18}/><input aria-label="Search seller help" value={helpQuery} onChange={(event) => setHelpQuery(event.target.value)} placeholder="What can we help you with?"/>{helpQuery && <button type="button" aria-label="Clear search" onClick={() => setHelpQuery('')}>×</button>}</label></div><div className="seller-help-hero-photo"><img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=85" alt="A small team working together around a table"/><span>Growing together, one step at a time</span></div></header>
            <nav className="seller-help-topics" aria-label="Help topics">{sellerHelpTopics.map((topic) => <button type="button" key={topic} className={helpTopic === topic ? 'is-active' : ''} aria-pressed={helpTopic === topic} onClick={() => setHelpTopic(topic)}>{topic}</button>)}</nav>
            <div className="seller-help-main-grid">
              <section className="seller-help-articles"><header className="seller-help-section-heading"><div><span>THE QUICK ANSWERS</span><h2>Frequently asked</h2><p>Clear, useful answers for the things sellers ask most.</p></div><small>{filteredHelpArticles.length} {filteredHelpArticles.length === 1 ? 'guide' : 'guides'}</small></header>
                {filteredHelpArticles.length ? <div className="seller-help-accordion">{filteredHelpArticles.map((article, index) => <details key={article.id} open={index === 0 && Boolean(helpQuery)}><summary><span><i>{String(index + 1).padStart(2, '0')}</i>{article.question}</span><b>+</b></summary><div className="seller-help-answer"><p>{article.answer}</p><Link to={article.link}>{article.linkLabel}<MarketIcon name="arrow" size={14}/></Link></div></details>)}</div> : <div className="seller-help-empty"><MarketIcon name="search" size={22}/><b>No guides found yet</b><span>Try another phrase or browse all topics.</span><button type="button" onClick={() => { setHelpQuery(''); setHelpTopic('All topics'); }}>Show all guides</button></div>}
              </section>
              <aside className="seller-help-journey"><div className="seller-help-journey-heading"><span className="seller-help-icon"><MarketIcon name="sparkle" size={17}/></span><div><small>YOUR SELLER JOURNEY</small><h2>One good step at a time</h2></div></div><p>Build confidence as you get your shop ready to welcome customers.</p>
                {(() => { const steps = [{ title: 'Make it yours', note: 'Add your shop details and photos', done: Boolean(profile.storeName && profile.storeDescription), to: '/seller/settings/store' }, { title: 'List your first product', note: 'Give shoppers something to discover', done: products.length > 0, to: '/seller/products/new' }, { title: 'Get ready to sell', note: 'Preview and publish your storefront', done: Boolean(publishedAt), to: '/seller/builder' }, { title: 'Welcome your first order', note: 'Orders will appear here when they arrive', done: orders.length > 0, to: '/seller/orders' }]; const doneCount = steps.filter((step) => step.done).length; return <><div className="seller-help-progress"><span><b>{doneCount} of {steps.length} steps</b><small>{Math.round(doneCount / steps.length * 100)}% complete</small></span><i><b style={{ width: `${doneCount / steps.length * 100}%` }}/></i></div><ol>{steps.map((step, index) => <li key={step.title} className={step.done ? 'is-done' : ''}><i>{step.done ? <MarketIcon name="check" size={13}/> : index + 1}</i><span><b>{step.title}</b><small>{step.note}</small></span><Link to={step.to} aria-label={step.done ? `Review: ${step.title}` : `Start: ${step.title}`}><MarketIcon name="arrow" size={14}/></Link></li>)}</ol></>; })()}
              </aside>
            </div>
            <section className="seller-help-learning"><header className="seller-help-section-heading"><div><span>LEARN BY DOING</span><h2>Little lessons, real progress</h2><p>Short, practical guides for building a shop customers love.</p></div><span className="seller-help-coming">VIDEO TUTORIALS COMING SOON</span></header><div className="seller-help-guide-grid">
              {[{ icon: 'shop' as const, label: 'START HERE', title: 'Set up your shop', description: 'Give your storefront a name, a story, and a look that feels like you.', to: '/seller/settings/store', link: 'Set up store', color: 'green' }, { icon: 'package' as const, label: 'PRODUCTS', title: 'Create a listing that sells', description: 'Add clear photos, helpful details, and the right delivery options.', to: '/seller/products/new', link: 'Add a product', color: 'gold' }, { icon: 'bag' as const, label: 'ORDERS', title: 'From new order to happy buyer', description: 'Learn where to find order details and keep each buyer in the loop.', to: '/seller/orders', link: 'Explore orders', color: 'coral' }].map((guide) => <article className={`seller-help-guide is-${guide.color}`} key={guide.title}><span className="seller-help-guide-art"><MarketIcon name={guide.icon} size={28}/><i>✦</i></span><small>{guide.label} · 3 MIN READ</small><h3>{guide.title}</h3><p>{guide.description}</p><Link to={guide.to}>{guide.link}<MarketIcon name="arrow" size={14}/></Link></article>)}
            </div></section>
            <footer className="seller-help-contact"><span className="seller-help-contact-icon"><MarketIcon name="heart" size={20}/></span><div><b>Still need a hand?</b><p>Tell us what you’re working through. We’re happy to help.</p></div><Link to="/marketing/contact">Contact the team<MarketIcon name="arrow" size={14}/></Link></footer>
          </section>}

          {section === 'settings' && <section className="seller-settings-page">
            <div className="seller-settings-storehead"><div className="seller-settings-cover" style={{ backgroundImage: brandImage('storeBanner') ? `linear-gradient(90deg,#17231c9c,#17231c14),url("${brandImage('storeBanner')}")` : undefined }}/><div className="seller-settings-storeidentity"><span>{brandImage('storeAvatar') ? <img src={brandImage('storeAvatar')} alt="Store logo"/> : <MarketIcon name="shop" size={30}/>}</span><div><h1>{profile.storeName || 'Your store'}</h1><p>{[profile.city, profile.country].filter(Boolean).join(', ') || 'Set your store location'}</p></div><Link to={storeUrl} target="_blank" rel="noreferrer">View store <MarketIcon name="arrow" size={14}/></Link></div></div>
            <div className="seller-settings-title"><div><span>SELLER SETTINGS</span><h2>{settingsView === 'personal' ? 'Personal profile' : settingsView === 'delivery' ? 'Delivery settings' : 'Store settings'}</h2></div><button className="seller-button seller-button-publish" form="seller-settings-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <MarketIcon name="check" size={15}/></button></div>
            <div className={`seller-settings-layout is-${settingsView}`}><nav className="seller-settings-tabs" aria-label="Seller settings sections"><Link className={settingsView === 'personal' ? 'is-active' : ''} to="/seller/settings/personal">Personal profile</Link><Link className={settingsView === 'store' ? 'is-active' : ''} to="/seller/settings/store">Store settings</Link><Link className={settingsView === 'delivery' ? 'is-active' : ''} to="/seller/settings/delivery">Delivery</Link></nav>
            <form id="seller-settings-form" className="seller-settings-form" onSubmit={(event) => void saveSellerSettings(event)}>
              {settingsView === 'personal' && <section className="seller-settings-section seller-settings-personal" id="settings-personal"><div className="seller-settings-section-heading"><h3>Personal details</h3><p>Private account information for managing your seller profile.</p></div><div className="seller-settings-fields"><div className="seller-settings-field-row"><label><span>First name</span><input value={profile.firstName} onChange={(event) => updateProfile('firstName', event.target.value)}/></label><label><span>Last name</span><input value={profile.lastName} onChange={(event) => updateProfile('lastName', event.target.value)}/></label></div><label><span>Phone number<small>Used to contact you about your seller account.</small></span><input type="tel" value={String(profile.phone || '')} onChange={(event) => updateProfile('phone', event.target.value)}/></label><label><span>Email address<small>Your account email address.</small></span><input value={profile.email} readOnly/></label></div></section>}
              <><section className="seller-settings-section seller-settings-photos" id="settings-brand"><div className="seller-settings-section-heading"><h3>Store photo</h3><p>Add a recognizable logo and a cover image for your storefront.</p></div><div className="seller-settings-photo-controls"><label className="seller-settings-logo-upload"><input type="file" accept="image/*" aria-label="Upload store logo" onChange={(event) => { void uploadBrandImage('storeAvatar', event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/>{brandImage('storeAvatar') ? <img src={brandImage('storeAvatar')} alt="Store logo preview"/> : <MarketIcon name="shop" size={25}/>}<small>Store logo</small></label><label className="seller-settings-cover-upload"><input type="file" accept="image/*" aria-label="Upload store cover image" onChange={(event) => { void uploadBrandImage('storeBanner', event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/>{brandImage('storeBanner') && <img src={brandImage('storeBanner')} alt=""/>}<span><MarketIcon name="plus" size={15}/> {brandImage('storeBanner') ? 'Change cover' : 'Add cover image'}</span></label></div></section>
              <section className="seller-settings-section" id="settings-profile"><div className="seller-settings-section-heading"><h3>Store information</h3><p>This information appears on your storefront and buyer communications.</p></div><div className="seller-settings-fields"><label><span>Store name <i>*</i><small>Your business or storefront name.</small></span><input value={profile.storeName} onChange={(event) => updateProfile('storeName', event.target.value)} required/></label><label><span>Store tagline<small>A short introduction shown with your store.</small></span><input value={profile.storeTagline} onChange={(event) => updateProfile('storeTagline', event.target.value)} placeholder="A short line about your store"/></label><label><span>Store description<small>Tell customers what makes your store special.</small></span><textarea rows={3} value={profile.storeDescription} onChange={(event) => updateProfile('storeDescription', event.target.value)} placeholder="Describe your store"/></label><label><span>Email address<small>Used for seller account notifications.</small></span><input value={profile.email} readOnly/></label></div></section>
              <section className="seller-settings-section" id="settings-delivery"><div className="seller-settings-section-heading"><h3>Address information</h3><p>Let nearby customers know where your store is based.</p></div><div className="seller-settings-fields"><label><span>Pickup address<small>Shown to customers when arranging collection.</small></span><textarea rows={2} value={profile.pickupAddress} onChange={(event) => updateProfile('pickupAddress', event.target.value)} placeholder="Street address or pickup instructions"/></label><div className="seller-settings-field-row"><label><span>City or town</span><input value={profile.city} onChange={(event) => updateProfile('city', event.target.value)}/></label><label><span>Country</span><input value={profile.country} onChange={(event) => updateProfile('country', event.target.value)}/></label></div><label><span>Delivery fee (GH₵)<small>Default fee applied to delivery orders.</small></span><input type="number" min="0" step="0.01" value={profile.deliveryFee ?? ''} onChange={(event) => updateProfile('deliveryFee', event.target.value ? Number(event.target.value) : null)} placeholder="0.00"/></label></div></section>
              <section className="seller-settings-section seller-settings-visibility"><div className="seller-settings-section-heading"><h3>Store visibility</h3><p>Manage how customers can discover your storefront.</p></div><div className="seller-visibility-card"><span className="seller-visibility-icon"><MarketIcon name="compass" size={19}/></span><span><b>{publishedAt ? 'Your storefront is published' : 'Your storefront is not published yet'}</b><small>{publishedAt ? `Published ${new Date(publishedAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}. Buyers can visit your public store page.` : 'Save your details, then publish your store from the builder.'}</small></span><i className={publishedAt ? 'is-live' : ''}/></div><Link className="seller-settings-builder-link" to="/seller/builder">Go to Store builder <MarketIcon name="arrow" size={15}/></Link></section></>
              <div className="seller-settings-bottom-save"><span>Your account and store details are saved securely.</span><button className="seller-button seller-button-publish" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <MarketIcon name="check" size={15}/></button></div>
            </form>
            </div>
          </section>}
        </>}
      </div>
    </main>
  </div>;
}
