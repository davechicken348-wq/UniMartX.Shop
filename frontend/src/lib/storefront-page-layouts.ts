export type StorefrontPageKey = 'home' | 'products' | 'categories' | 'about' | 'contact' | 'reviews';
export type StorefrontBlock = { type: string; heading: string; description?: string; [key: string]: unknown };
export type StorefrontPageLayout = { id: string; name: string; summary: string; blocks: StorefrontBlock[] };

const block = (type: string, heading: string, description = '', extra: Record<string, unknown> = {}): StorefrontBlock => ({ type, heading, ...(description ? { description } : {}), ...extra });

export const STOREFRONT_PAGE_LAYOUTS: Record<StorefrontPageKey, StorefrontPageLayout[]> = {
  home: [
    { id: 'home-featured', name: 'Storefront home', summary: 'Hero, collections, featured products, and story.', blocks: [block('hero', 'Welcome to our store'), block('categories', 'Browse categories'), block('featured-products', 'Featured products', '', { maxProducts: 6 }), block('about', 'A little about our store'), block('newsletter', 'Stay in touch')] },
    { id: 'home-editorial', name: 'Story first', summary: 'Lead with your story, then introduce the collection.', blocks: [block('hero', 'A thoughtful collection'), block('about', 'Our story'), block('featured-products', 'Shop the collection', '', { maxProducts: 4 }), block('announcement', 'A note from our store')] },
    { id: 'home-collection', name: 'Product first', summary: 'Put your products and category browsing up front.', blocks: [block('hero', 'Find your next favourite'), block('featured-products', 'Shop bestsellers', '', { maxProducts: 8 }), block('categories', 'Explore all categories'), block('newsletter', 'Get store updates')] },
  ],
  products: [
    { id: 'product-grid', name: 'Complete shop', summary: 'Shop heading, search, category and price filters, sorting, and product grid.', blocks: [block('collection-intro', 'Shop all products', 'Browse the full collection.'), block('filters', 'Filter products'), block('catalog', 'All products', '', { maxProducts: 100, productColumns: 4 })] },
    { id: 'product-editorial', name: 'Curated collection', summary: 'A collection introduction, shop filters, and spacious product gallery.', blocks: [block('collection-intro', 'The collection', 'Pieces selected for everyday life.'), block('filters', 'Find your fit'), block('catalog', 'Shop the collection', '', { maxProducts: 100, productColumns: 2 })] },
    { id: 'product-compact', name: 'Quick browse', summary: 'Compact catalog with all shopping filters and sort controls.', blocks: [block('announcement', 'Shop update', 'Discover new additions to the store.'), block('filters', 'Narrow your search'), block('catalog', 'All products', '', { maxProducts: 100, productColumns: 4 })] },
  ],
  categories: [
    { id: 'category-gallery', name: 'Category gallery', summary: 'Visual category cards followed by popular products.', blocks: [block('collection-intro', 'Shop by category', 'Explore the collections in our store.'), block('categories', 'All collections'), block('category-products', 'Popular in our collections')] },
    { id: 'category-editorial', name: 'Collection index', summary: 'An editorial list of categories with a curated product feature.', blocks: [block('categories', 'The collection index'), block('image', 'A closer look', 'A little inspiration from the shop.'), block('category-products', 'Selected for you')] },
    { id: 'category-featured', name: 'Featured categories', summary: 'Highlight your collections and guide shoppers into the catalog.', blocks: [block('hero', 'Explore our collections'), block('categories', 'Find your category'), block('catalog', 'Shop all products', '', { maxProducts: 8 })] },
  ],
  about: [
    { id: 'about-story', name: 'Our story', summary: 'A full story page with imagery, values, and a shop link.', blocks: [block('story-intro', 'Our story', 'A little about the people and ideas behind this store.'), block('about', 'Made with care'), block('values', 'What matters to us'), block('image', 'A glimpse behind the scenes')] },
    { id: 'about-founder', name: 'Meet the maker', summary: 'Introduce the founder, their approach, and their favourite finds.', blocks: [block('about', 'Meet the founder'), block('image', 'The work behind the pieces'), block('featured-products', 'A few favourites', '', { maxProducts: 3 })] },
    { id: 'about-timeline', name: 'Our journey', summary: 'A store introduction with milestones and a closing invitation.', blocks: [block('story-intro', 'A store with a story'), block('timeline', 'How we got here'), block('values', 'Our promise'), block('newsletter', 'Follow our journey')] },
  ],
  contact: [
    { id: 'contact-help', name: 'Customer care', summary: 'Contact form, store details, opening hours, and common questions.', blocks: [block('contact-intro', 'How can we help?'), block('contact-form', 'Send us a message'), block('store-details', 'Store details'), block('faq', 'Common questions')] },
    { id: 'contact-simple', name: 'Direct contact', summary: 'A clean contact card with email, phone, and store location.', blocks: [block('contact-intro', 'Get in touch'), block('store-details', 'Reach our store')] },
    { id: 'contact-faq', name: 'Help and answers', summary: 'Answer common questions first, then provide contact options.', blocks: [block('contact-intro', 'We are happy to help'), block('faq', 'Frequently asked questions'), block('contact-form', 'Still need help?')] },
  ],
  reviews: [
    { id: 'reviews-community', name: 'Community reviews', summary: 'Rating summary, customer quotes, and a review invitation.', blocks: [block('review-summary', 'Customer reviews'), block('review-quotes', 'Words from our customers'), block('review-invite', 'Have you shopped with us?')] },
    { id: 'reviews-featured', name: 'Featured stories', summary: 'Lead with a customer quote, then show your store rating.', blocks: [block('review-quotes', 'Loved by our customers'), block('review-summary', 'Our store rating'), block('review-invite', 'Share your experience')] },
    { id: 'reviews-list', name: 'Review feed', summary: 'A simple review list with an invitation to leave feedback.', blocks: [block('review-summary', 'Shopper feedback'), block('review-feed', 'Recent reviews'), block('review-invite', 'Leave a review')] },
  ],
};

export const DEFAULT_STOREFRONT_PAGE_LAYOUTS: Record<StorefrontPageKey, string> = {
  home: 'home-featured', products: 'product-grid', categories: 'category-gallery',
  about: 'about-story', contact: 'contact-help', reviews: 'reviews-community',
};

export function storefrontPageLayout(page: StorefrontPageKey, layouts?: Partial<Record<StorefrontPageKey, string>>) {
  const chosen = layouts?.[page];
  return STOREFRONT_PAGE_LAYOUTS[page].some((layout) => layout.id === chosen)
    ? chosen as string
    : DEFAULT_STOREFRONT_PAGE_LAYOUTS[page];
}

export function storefrontPageLayoutDefinition(page: StorefrontPageKey, id?: string) {
  return STOREFRONT_PAGE_LAYOUTS[page].find((layout) => layout.id === id) || STOREFRONT_PAGE_LAYOUTS[page][0];
}
