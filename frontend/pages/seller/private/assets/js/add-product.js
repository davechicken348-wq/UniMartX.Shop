/* ═══════════════════════════════════════════
   ADD PRODUCT JS  —  backend-connected
   Two-screen, low-friction listing experience.
   ═══════════════════════════════════════════ */
(function () {

var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
var TOKEN_KEY = 'authToken';

/* ── Constants ───────────────────────────── */

const SUBCATEGORIES = {
  'textbooks':       ['Textbooks', 'Study Guides', 'Past Papers', 'Stationery', 'Other'],
  'notes-tutoring':  ['Tutoring', 'Typed Notes', 'Handwritten Notes', 'Summaries', 'Other'],
  'tech-gadgets':    ['Laptops & Computers', 'Phones', 'Accessories', 'Audio', 'Cameras', 'Gaming', 'Calculators', 'Other'],
  'dorm-essentials': ['Furniture', 'Bedding', 'Kitchen', 'Decor', 'Cleaning', 'Lighting', 'Other'],
  'fashion':         ["Men's Clothing", "Women's Clothing", 'Shoes', 'Bags', 'Formal & Grad', 'Other'],
  'food-snacks':     ['Snacks', 'Beverages', 'Homemade Meals', 'Baking', 'Other'],
  'beauty':          ['Skincare', 'Hair Care', 'Makeup', 'Fragrances', 'Other'],
  'sports-fitness':  ['Gym Equipment', 'Sportswear', 'Outdoor Gear', 'Bikes', 'Other'],
  'art-crafts':      ['Paintings', 'Crafts', 'Photography', 'Digital Art', 'Other'],
  'services':        ['Delivery', 'Repairs', 'Printing', 'Laundry', 'Photography', 'Other'],
  'other':           ['Other'],
};

/* Subcategory template library.
   Each template is a list of buyer-facing questions. Only the fields that
   genuinely help a buyer are shown — no generic database dump.
   `required: true`  → must be answered to publish
   `recommended: true` → shown, but optional (surfaced with a soft hint)
   `condition` is always appended automatically by renderDetailsFields so every
   product carries a condition without repeating it in each template. */
const DETAILS_FIELDS = {
  /* ── Electronics · Phones ── */
  'electronics-phones': [
    { name: 'brand',   label: 'Brand',                    type: 'text', required: true },
    { name: 'model',   label: 'Model',                    type: 'text' },
    { name: 'storage', label: 'Storage capacity',          type: 'text', required: true, placeholder: 'e.g. 128GB' },
    { name: 'ram',     label: 'RAM',                      type: 'text', recommended: true, placeholder: 'e.g. 6GB' },
    { name: 'color',   label: 'Colour',                   type: 'color', recommended: true },
    { name: 'unlocked', label: 'Is it unlocked?',         type: 'select', options: ['Yes', 'No', 'Not sure'], recommended: true },
    { name: 'network', label: 'Network',                  type: 'select', options: ['4G', '5G', 'WiFi Only'], recommended: true },
  ],
  /* ── Electronics · Accessories (cables, chargers, cases…) ── */
  'electronics-accessories': [
    { name: 'accessory_type', label: 'What is it?', type: 'select', required: true, options: ['Cable', 'Charger', 'Adapter', 'Case', 'Screen Guard', 'Earphone', 'Other'] },
    { name: 'brand',   label: 'Brand',        type: 'text', recommended: true },
    { name: 'model',   label: 'Fits / model', type: 'text', recommended: true, placeholder: 'e.g. iPhone 14, USB-C' },
    { name: 'length',  label: 'Length',       type: 'text', recommended: true, placeholder: 'e.g. 1.5m' },
    { name: 'color',   label: 'Colour',       type: 'color', recommended: true },
  ],
  /* ── Electronics · Phones & Accessories (legacy combined) ── */
  'electronics-phones-accessories': [
    { name: 'brand',   label: 'Brand',                    type: 'text', required: true },
    { name: 'model',   label: 'Model',                    type: 'text' },
    { name: 'storage', label: 'Storage capacity',          type: 'text', required: true, placeholder: 'e.g. 128GB' },
    { name: 'ram',     label: 'RAM',                      type: 'text', recommended: true, placeholder: 'e.g. 6GB' },
    { name: 'color',   label: 'Colour',                   type: 'color', recommended: true },
    { name: 'unlocked', label: 'Is it unlocked?',         type: 'select', options: ['Yes', 'No', 'Not sure'], recommended: true },
    { name: 'network', label: 'Network',                  type: 'select', options: ['4G', '5G', 'WiFi Only'], recommended: true },
  ],
  /* ── Electronics · Laptops ── */
  'electronics-laptops-computers': [
    { name: 'brand',     label: 'Brand',           type: 'text', required: true },
    { name: 'model',     label: 'Model',           type: 'text' },
    { name: 'processor', label: 'Processor',        type: 'text', recommended: true, placeholder: 'e.g. Intel i5' },
    { name: 'ram',       label: 'RAM',             type: 'text', recommended: true, placeholder: 'e.g. 8GB' },
    { name: 'storage',   label: 'Storage',         type: 'text', recommended: true, placeholder: 'e.g. 512GB SSD' },
    { name: 'screen_size', label: 'Screen size',    type: 'text', recommended: true, placeholder: 'e.g. 14"' },
    { name: 'os',        label: 'Operating system', type: 'select', options: ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Other'], recommended: true },
    { name: 'color',     label: 'Colour',          type: 'color', recommended: true },
  ],
  /* ── Electronics · Audio ── */
  'electronics-audio': [
    { name: 'brand',   label: 'Brand',            type: 'text', required: true },
    { name: 'type',    label: 'Type',             type: 'select', required: true, options: ['Earbuds', 'Headphones', 'Speaker', 'Other'] },
    { name: 'color',   label: 'Colour',           type: 'color', recommended: true },
    { name: 'wireless', label: 'Wireless?',        type: 'checkbox', recommended: true },
  ],
  /* ── Electronics · Cameras ── */
  'electronics-cameras': [
    { name: 'brand',      label: 'Brand',       type: 'text', required: true },
    { name: 'type',       label: 'Camera type',  type: 'select', options: ['DSLR', 'Mirrorless', 'Point & Shoot', 'Action', 'Other'], recommended: true },
    { name: 'megapixels', label: 'Megapixels',   type: 'text', recommended: true },
    { name: 'color',      label: 'Colour',       type: 'color', recommended: true },
  ],
  /* ── Electronics · Gaming ── */
  'electronics-gaming': [
    { name: 'game_item_name', label: 'Game / item', type: 'text', required: true, placeholder: 'e.g. FIFA 24' },
    { name: 'platform', label: 'Platform',        type: 'select', required: true, options: ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'Other'] },
    { name: 'genre',    label: 'Genre',           type: 'text', recommended: true },
  ],
  'electronics-other': [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', recommended: true },
  ],

  /* ── Books ── */
  'books-textbooks': [
    { name: 'title',          label: 'Book title',        type: 'text', required: true },
    { name: 'author',         label: 'Author',            type: 'text', required: true },
    { name: 'publisher',      label: 'Publisher',         type: 'text', recommended: true },
    { name: 'edition',        label: 'Edition',           type: 'text', recommended: true, placeholder: 'e.g. 3rd' },
    { name: 'language',       label: 'Language',          type: 'text', recommended: true },
    { name: 'subject_course', label: 'Subject / course',  type: 'text', recommended: true },
  ],
  'books-novels': [
    { name: 'title',    label: 'Book title', type: 'text', required: true },
    { name: 'author',   label: 'Author',     type: 'text', required: true },
    { name: 'publisher', label: 'Publisher',  type: 'text', recommended: true },
    { name: 'language',  label: 'Language',   type: 'text', recommended: true },
    { name: 'genre',    label: 'Genre',      type: 'select', options: ['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Biography', 'Other'], recommended: true },
  ],
  'books-stationery': [
    { name: 'item_type', label: 'Item type', type: 'select', required: true, options: ['Notebook', 'Pen', 'Pencil', 'Marker', 'File', 'Other'] },
    { name: 'brand',     label: 'Brand',     type: 'text', recommended: true },
  ],
  'books-study guides': [
    { name: 'title',    label: 'Guide title', type: 'text', required: true },
    { name: 'subject',  label: 'Subject',    type: 'text', required: true },
    { name: 'level',    label: 'Level',       type: 'select', options: ['JHS', 'SHS', 'University', 'Professional'], recommended: true },
  ],
  'books-other': [
    { name: 'title',  label: 'Title',  type: 'text', required: true },
    { name: 'author', label: 'Author', type: 'text', recommended: true },
  ],

  /* ── Fashion · Clothing ── */
  'fashion-mens-clothing': [
    { name: 'brand',    label: 'Brand',          type: 'text', recommended: true },
    { name: 'size',     label: 'Size',           type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other'] },
    { name: 'color',    label: 'Colour',         type: 'color', recommended: true },
    { name: 'material', label: 'Material',       type: 'text', recommended: true, placeholder: 'e.g. Cotton' },
    { name: 'gender',   label: 'Gender',         type: 'select', options: ['Male', 'Female', 'Unisex'], recommended: true },
  ],
  'fashion-womens-clothing': [
    { name: 'brand',    label: 'Brand',          type: 'text', recommended: true },
    { name: 'size',     label: 'Size',           type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other'] },
    { name: 'color',    label: 'Colour',         type: 'color', recommended: true },
    { name: 'material', label: 'Material',       type: 'text', recommended: true, placeholder: 'e.g. Cotton' },
    { name: 'gender',   label: 'Gender',         type: 'select', options: ['Male', 'Female', 'Unisex'], recommended: true },
  ],
  /* ── Fashion · Shoes ── */
  'fashion-shoes': [
    { name: 'brand',    label: 'Brand',    type: 'text', recommended: true },
    { name: 'size',     label: 'Shoe size', type: 'text', required: true, placeholder: 'e.g. 42 / UK 8' },
    { name: 'color',    label: 'Colour',   type: 'color', recommended: true },
    { name: 'material', label: 'Material', type: 'text', recommended: true, placeholder: 'e.g. Leather' },
  ],
  'fashion-bags': [
    { name: 'type',    label: 'Bag type', type: 'select', options: ['Backpack', 'Handbag', 'Tote', 'Clutch', 'Other'], recommended: true },
    { name: 'brand',   label: 'Brand',    type: 'text', recommended: true },
    { name: 'color',   label: 'Colour',   type: 'color', recommended: true },
    { name: 'material', label: 'Material', type: 'text', recommended: true },
  ],
  'fashion-accessories': [
    { name: 'type',  label: 'Type',  type: 'select', required: true, options: ['Watch', 'Belt', 'Hat', 'Sunglasses', 'Jewellery', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'color', label: 'Colour', type: 'color', recommended: true },
  ],
  'fashion-other': [
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'color', label: 'Colour', type: 'color', recommended: true },
  ],

  /* ── Food ── */
  'food-snacks': [
    { name: 'brand',   label: 'Brand',            type: 'text', recommended: true },
    { name: 'type',    label: 'Type',             type: 'select', options: ['Chips', 'Biscuits', 'Nuts', 'Candy', 'Snack Box', 'Other'], recommended: true },
    { name: 'pack_size', label: 'Pack size',       type: 'text', recommended: true, placeholder: 'e.g. 200g' },
    { name: 'expiry',  label: 'Best before',      type: 'date' },
    { name: 'allergens', label: 'Allergens',      type: 'text', recommended: true },
  ],
  'food-other': [
    { name: 'item_type', label: 'What kind of food?', type: 'select', required: true, options: ['Snacks / chips', 'Biscuits / pastries', 'Nuts / seeds', 'Candy / sweets', 'Beverages / drinks', 'Prepackaged meals', 'Frozen treats', 'Other'] },
    { name: 'pack_size', label: 'Pack size',        type: 'text', recommended: true },
    { name: 'brand',     label: 'Brand',            type: 'text', recommended: true },
    { name: 'expiry',    label: 'Best before',      type: 'date' },
    { name: 'allergens', label: 'Allergens',        type: 'text', recommended: true },
  ],

  /* ── Beauty ── */
  'beauty-skincare': [
    { name: 'brand',           label: 'Brand',          type: 'text', recommended: true },
    { name: 'skin_type',       label: 'Skin type',      type: 'select', options: ['Oily', 'Dry', 'Combination', 'Normal', 'All'], recommended: true },
    { name: 'key_ingredients', label: 'Key ingredients', type: 'text', recommended: true },
  ],
  'beauty-hair-care': [
    { name: 'product_type', label: 'Product type', type: 'select', required: true, options: ['Shampoo', 'Conditioner', 'Oil', 'Cream', 'Other'] },
    { name: 'brand',        label: 'Brand',       type: 'text', recommended: true },
    { name: 'hair_type',    label: 'Hair type',   type: 'select', options: ['Natural', 'Relaxed', "Loc'd", 'All'], recommended: true },
  ],
  'beauty-makeup': [
    { name: 'product_type', label: 'Product type', type: 'select', required: true, options: ['Foundation', 'Lipstick', 'Eyeshadow', 'Mascara', 'Blush', 'Other'] },
    { name: 'brand',        label: 'Brand',       type: 'text', recommended: true },
    { name: 'shade_color',  label: 'Shade',        type: 'text', recommended: true },
  ],
  'beauty-fragrances': [
    { name: 'brand',       label: 'Brand',       type: 'text', required: true },
    { name: 'type',        label: 'Type',        type: 'select', options: ['Perfume', 'EDT', 'EDP', 'Body Mist', 'Other'], recommended: true },
    { name: 'size_volume', label: 'Size / volume', type: 'text', recommended: true },
  ],
  'beauty-other': [
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'type',  label: 'Type',  type: 'text', recommended: true },
  ],

  /* ── Sports ── */
  'sports-gym-equipment': [
    { name: 'equipment_type', label: 'Equipment type', type: 'select', required: true, options: ['Dumbbells', 'Resistance Bands', 'Yoga Mat', 'Bench', 'Other'] },
    { name: 'brand',       label: 'Brand',        type: 'text', recommended: true },
    { name: 'weight_size', label: 'Weight / size', type: 'text', recommended: true },
  ],
  'sports-sportswear': [
    { name: 'sport_type', label: 'Sport',   type: 'text', recommended: true },
    { name: 'size',       label: 'Size',     type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other'] },
    { name: 'gender',     label: 'Gender',   type: 'select', options: ['Male', 'Female', 'Unisex'], recommended: true },
    { name: 'material',   label: 'Material', type: 'text', recommended: true },
  ],
  'sports-outdoor-gear': [
    { name: 'gear_type', label: 'Gear type', type: 'select', required: true, options: ['Tent', 'Backpack', 'Torch', 'Rope', 'Other'] },
    { name: 'brand',     label: 'Brand',     type: 'text', recommended: true },
  ],
  'sports-other': [
    { name: 'type',  label: 'Type',  type: 'text', required: true },
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
  ],

  /* ── Home & Living · Furniture ── */
  'home-furniture': [
    { name: 'furniture_type', label: 'Furniture type', type: 'select', required: true, options: ['Chair', 'Desk', 'Bed', 'Shelf', 'Wardrobe', 'Other'] },
    { name: 'material',   label: 'Material',   type: 'text', recommended: true, placeholder: 'e.g. Wood' },
    { name: 'dimensions', label: 'Dimensions',  type: 'text', recommended: true, placeholder: 'e.g. 120×60×75cm' },
    { name: 'color',       label: 'Colour',     type: 'color', recommended: true },
  ],
  'home-bedding': [
    { name: 'bedding_type', label: 'Bedding type', type: 'select', required: true, options: ['Pillow', 'Duvet', 'Bedsheet', 'Mattress', 'Other'] },
    { name: 'size_label',  label: 'Size',         type: 'select', options: ['Single', 'Double', 'Queen', 'King'], recommended: true },
    { name: 'color',       label: 'Colour',       type: 'color', recommended: true },
  ],
  'home-kitchen': [
    { name: 'item_type', label: 'Item type', type: 'select', required: true, options: ['Cookware', 'Cutlery', 'Appliance', 'Storage', 'Other'] },
    { name: 'brand',     label: 'Brand',     type: 'text', recommended: true },
    { name: 'material',   label: 'Material',   type: 'text', recommended: true },
  ],
  'home-decor': [
    { name: 'decor_type', label: 'Decor type', type: 'select', required: true, options: ['Wall Art', 'Plant', 'Lamp', 'Rug', 'Other'] },
    { name: 'material',   label: 'Material',   type: 'text', recommended: true },
    { name: 'color',      label: 'Colour',     type: 'color', recommended: true },
  ],
  'home-cleaning': [
    { name: 'product_type', label: 'Product type', type: 'select', required: true, options: ['Detergent', 'Disinfectant', 'Mop', 'Brush', 'Other'] },
    { name: 'brand',       label: 'Brand',        type: 'text', recommended: true },
    { name: 'volume_size', label: 'Volume / size', type: 'text', recommended: true },
  ],
  'home-other': [
    { name: 'type',  label: 'Type',  type: 'text', required: true },
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
  ],

  /* ── Art & Crafts ── */
  'art-paintings': [
    { name: 'medium',   label: 'Medium',   type: 'select', required: true, options: ['Oil', 'Acrylic', 'Watercolor', 'Digital', 'Other'] },
    { name: 'dimensions', label: 'Dimensions', type: 'text', recommended: true, placeholder: 'e.g. 50×70cm' },
    { name: 'framed',   label: 'Framed?',  type: 'checkbox', recommended: true },
    { name: 'color',    label: 'Colour',   type: 'color', recommended: true },
  ],
  'art-crafts': [
    { name: 'craft_type',   label: 'Craft type',   type: 'select', required: true, options: ['Beadwork', 'Weaving', 'Pottery', 'Candles', 'Other'] },
    { name: 'material',      label: 'Material',     type: 'text', recommended: true },
    { name: 'custom_orders', label: 'Takes custom orders?', type: 'checkbox', recommended: true },
    { name: 'color',         label: 'Colour',       type: 'color', recommended: true },
  ],
  'art-photography': [
    { name: 'print_type', label: 'Print type', type: 'select', options: ['Canvas', 'Photo Paper', 'Digital File'], recommended: true },
    { name: 'dimensions', label: 'Dimensions', type: 'text', recommended: true },
    { name: 'framed',    label: 'Framed?',    type: 'checkbox' },
    { name: 'color',     label: 'Colour',      type: 'color', recommended: true },
  ],
  'art-digital-art': [
    { name: 'file_format', label: 'File format', type: 'select', required: true, options: ['PNG', 'JPG', 'SVG', 'PDF', 'Other'] },
    { name: 'resolution',  label: 'Resolution',  type: 'text', recommended: true, placeholder: 'e.g. 4K' },
    { name: 'license',     label: 'License',     type: 'select', options: ['Personal', 'Commercial'], recommended: true },
  ],
  'art-other': [
    { name: 'type',    label: 'Type',    type: 'text', required: true },
    { name: 'color',   label: 'Colour',  type: 'color', recommended: true },
  ],

  /* ── Other ── */
  'other-other': [
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'type',  label: 'Type',  type: 'text', recommended: true },
  ],
};

/* Normalise a label the same way the backend slugifies it, so template
   lookup survives slug drift (e.g. category slug "tech-gadgets" vs "electronics"). */
function normKey(s) {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* Build a lookup keyed by normalised subcategory name (unique enough)
   plus a category+sub fallback, so any subcategory resolves its template. */
const SUBNAME_ALIASES = {
  'phones':                  'electronics-phones',
  'phones-accessories':     'electronics-phones-accessories',
  'laptops-computers':     'electronics-laptops-computers',
  'audio':                  'electronics-audio',
  'cameras':                'electronics-cameras',
  'gaming':                 'electronics-gaming',
  'textbooks-course-materials': 'books-textbooks',
  'novels':                 'books-novels',
  'stationery':             'books-stationery',
  'study-guides':           'books-study-guides',
  'men-s-clothing':         'fashion-mens-clothing',
  'women-s-clothing':       'fashion-womens-clothing',
  'shoes':                 'fashion-shoes',
  'bags':                   'fashion-bags',
  'accessories-fashion':    'fashion-accessories',
  'snacks':                'food-snacks',
  'skincare':               'beauty-skincare',
  'hair-care':             'beauty-hair-care',
  'makeup':                'beauty-makeup',
  'fragrances':            'beauty-fragrances',
  'gym-equipment':          'sports-gym-equipment',
  'sportswear':            'sports-sportswear',
  'outdoor-gear':          'sports-outdoor-gear',
  'furniture':             'home-furniture',
  'bedding':              'home-bedding',
  'kitchen':              'home-kitchen',
  'decor':                'home-decor',
  'cleaning':             'home-cleaning',
  'paintings':             'art-paintings',
  'crafts':                'art-crafts',
  'photography':           'art-photography',
  'digital-art':           'art-digital-art',
  'other':                 'other-other',
};
/* Fallback template when a subcategory is left blank (optional subcategory). */
const GENERIC_TEMPLATE = [
  { name: 'type', label: 'What kind of item is it?', type: 'text', recommended: true, placeholder: 'e.g. Cable, Notebook, Lamp' },
  { name: 'brand', label: 'Brand', type: 'text', recommended: true },
];
function lookupTemplate(catSlug, subName) {
  if (subName) {
    const byName = SUBNAME_ALIASES[normKey(subName)];
    if (byName && DETAILS_FIELDS[byName]) return DETAILS_FIELDS[byName];
    const legacy = DETAILS_FIELDS[`${catSlug}-${normKey(subName)}`];
    if (legacy) return legacy;
  }
  // No subcategory chosen — keep it light with a generic prompt.
  return GENERIC_TEMPLATE;
}

/* ── State ───────────────────────────────── */
let currentScreen = 1;
const tags = [];
const imageFiles = Array(5).fill(null);

// Edit mode
const EDIT_ID = new URLSearchParams(window.location.search).get('edit') || null;

/* ── DOM refs ────────────────────────────── */
const screen1      = document.getElementById('screen-1');
const screen2      = document.getElementById('screen-2');
const screenDone   = document.getElementById('screen-done');
const btnBack      = document.getElementById('btn-back');
const btnNext      = document.getElementById('btn-next');
const btnSubmit    = document.getElementById('btn-submit');
const btnSaveDraft = document.getElementById('btn-save-draft');
const btnSaveDraft2= document.getElementById('btn-save-draft-2');
const progressFill = document.getElementById('ap-progress-fill');
const progressLabel= document.getElementById('ap-progress-label');
const stepEncourage= document.getElementById('step-encourage');
const readinessEl  = document.getElementById('ap-readiness');

/* ── Auth ────────────────────────────────── */
function authHeaders() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (token && token !== 'undefined' && token !== 'null') {
    return { Authorization: `Bearer ${token}` };
  }
  const raw = localStorage.getItem('authData');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed.token && typeof parsed.token === 'string') {
      return { Authorization: `Bearer ${parsed.token}` };
    }
    if (parsed.value) {
      const inner = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
      if (inner.token && typeof inner.token === 'string') {
        return { Authorization: `Bearer ${inner.token}` };
      }
    }
  } catch {}
  return {};
}

/* ═══════════════════════════════════════════
   SCREEN NAVIGATION
   ═══════════════════════════════════════════ */

const ENCOURAGE = {
  1: { icon: 'sparkles', text: "Great start! Just the essentials — a name, category, price, and a photo." },
  2: { icon: 'heart',    text: "Almost done. A few friendly details help buyers feel confident." },
};
function showEncouragement(screenNum) {
  if (!stepEncourage) return;
  const cfg = ENCOURAGE[screenNum];
  if (!cfg) { stepEncourage.classList.remove('show'); return; }
  stepEncourage.innerHTML =
    `<i data-lucide="${cfg.icon}"></i><span>${cfg.text}</span>`;
  stepEncourage.classList.add('show');
  if (window.lucide) lucide.createIcons();
}

function showScreen(n) {
  currentScreen = n;
  [screen1, screen2, screenDone].forEach(s => s.classList.remove('active'));

  if (n === 1) {
    screen1.classList.add('active');
    progressFill.style.width = '50%';
    progressLabel.textContent = 'Step 1 of 2';
    stepEncourage.classList.remove('show');
    ENCOURAGE[1] && showEncouragement(1);
  } else if (n === 2) {
    screen2.classList.add('active');
    progressFill.style.width = '100%';
    progressLabel.textContent = 'Step 2 of 2';
    showEncouragement(2);
    if (readinessEl) { readinessEl.classList.remove('show'); setTimeout(() => readinessEl.classList.add('show'), 250); }
  } else if (n === 'done') {
    screenDone.classList.add('active');
    progressFill.style.width = '100%';
    progressLabel.textContent = 'Done';
    stepEncourage.classList.remove('show');
  }
  // Scroll the stage into comfortable view
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Category model (loaded from API) ────── */
let CATEGORIES = [];
const CATEGORY_MODEL = {};

function rebuildCategoryModel() {
  for (const k of Object.keys(CATEGORY_MODEL)) delete CATEGORY_MODEL[k];
  CATEGORIES.forEach(c => {
    CATEGORY_MODEL[c.slug] = {
      id: c.id,
      label: c.name,
      icon: c.icon || 'tag',
      signals: c.signals || [],
      subs: (c.subcategories || []).map(s => s.name),
      _subs: (c.subcategories || []).map(s => ({ id: s.id, slug: s.slug, name: s.name })),
    };
  });
}

async function loadCategories() {
  let loaded = false;
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success && Array.isArray(json.data) && json.data.length) {
      CATEGORIES = json.data;
      rebuildCategoryModel();
      loaded = true;
      if (catSearchInput && !catSearchInput.value) renderRecentCategories();
      else if (catSearchInput && catSearchInput.value.trim()) renderSuggestions(catSearchInput.value.trim());
    }
  } catch (e) {
    console.warn('Category API unavailable, using fallback list.', e);
  }
  if (!loaded) {
    CATEGORIES = Object.keys(SUBCATEGORIES).map(slug => ({
      id: '', slug, name: slug, icon: 'tag', signals: [],
      subcategories: SUBCATEGORIES[slug].map(name => ({ id: '', slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name })),
    }));
    rebuildCategoryModel();
    if (catSearchInput && !catSearchInput.value) renderRecentCategories();
    else if (catSearchInput && catSearchInput.value.trim()) renderSuggestions(catSearchInput.value.trim());
  }
}

function categoryKeyFromValue(val) {
  for (const k in CATEGORY_MODEL) if (k === val) return k;
  return '';
}

/* ── Category → Subcategory ─────────────── */
function onCategoryChanged(cat) {
  const subEl = document.getElementById('subcategory');
  subEl.innerHTML = '<option value="">Skip for now</option>';
  detailsGrid.innerHTML = '';
  detailsSectionWrap.style.display = 'none';
  detailsSectionWrap.classList.remove('revealed');
  const standaloneCond = document.getElementById('condition-field-standalone');
  if (standaloneCond) standaloneCond.style.display = 'block';
  const meta = CATEGORY_MODEL[cat] || {};
  const subs = meta.subs || [];
  const subField = document.getElementById('subcategory-field');
  const subIdInput = document.getElementById('subcategory-id');
  if (subIdInput) subIdInput.value = '';
  if (subs.length) {
    subs.forEach((s, i) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      const subId = (meta._subs && meta._subs[i] && meta._subs[i].id) || '';
      if (subId) o.dataset.id = subId;
      subEl.appendChild(o);
    });
    if (subField) subField.style.display = 'block';
  } else {
    if (subField) subField.style.display = 'none';
  }
}

/* ── Subcategory → Detail fields ─────────── */
function onSubcategoryChanged(sub) {
  const catSlug = document.getElementById('category')?.value || '';
  const subIdInput = document.getElementById('subcategory-id');
  const subEl = document.getElementById('subcategory');
  const chosenOpt = subEl?.selectedOptions?.[0];
  if (subIdInput) subIdInput.value = (chosenOpt && chosenOpt.dataset.id) || '';
  const subSlug = sub ? sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
  const key = subSlug ? `${catSlug}-${subSlug}` : '';
  detailsGrid.innerHTML = '';
  detailsSectionWrap.style.display = 'none';
  detailsSectionWrap.classList.remove('revealed');
  const fields = lookupTemplate(catSlug, sub);
  const standaloneCond = document.getElementById('condition-field-standalone');
  if (fields && fields.length) {
    const friendlySub = sub ? sub.replace(/\b\w/g, c => c.toUpperCase()) : '';
    const headEl = document.getElementById('details-section-title');
    if (headEl) headEl.textContent = friendlySub ? `A few specifics for this ${friendlySub}` : 'A few specifics for your product';
    renderDetailsFields(fields);
    // The dynamic specs include a Condition question — hide the standalone one.
    if (standaloneCond) standaloneCond.style.display = 'none';
    // Smoothly reveal so it feels intelligent, not sudden
    detailsSectionWrap.style.display = 'block';
    requestAnimationFrame(() => requestAnimationFrame(() => detailsSectionWrap.classList.add('revealed')));
  } else {
    // No template: keep the simple standalone Condition question.
    if (standaloneCond) standaloneCond.style.display = 'block';
    detailsSectionWrap.style.display = 'none';
  }
}

// Wire the subcategory <select> to reveal the dynamic specs.
document.getElementById('subcategory')?.addEventListener('change', function () {
  onSubcategoryChanged(this.value);
});

/* ── Category Search UI ───────────────────── */
const catSearchInput = document.getElementById('category-search');
const catHidden      = document.getElementById('category');
const catSuggestions = document.getElementById('cat-suggestions');
const catRecent      = document.getElementById('cat-recent');
const detailsGrid    = document.getElementById('details-grid');
const detailsSectionWrap = document.getElementById('details-section-wrap');
const RECENT_KEY     = 'umx_recent_categories';

function getRecentCategories() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
  catch { return []; }
}
function pushRecentCategory(key) {
  let recent = getRecentCategories().filter(k => k !== key);
  recent.unshift(key);
  recent = recent.slice(0, 4);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch {}
  renderRecentCategories();
}

function searchCategories(query) {
  const q = query.trim().toLowerCase();
  const norm = (s) => s.replace(/\b(\w+)s\b/g, '$1');
  const results = [];
  for (const [key, meta] of Object.entries(CATEGORY_MODEL)) {
    const hay = (meta.label + ' ' + meta.subs.join(' ') + ' ' + key).toLowerCase();
    const normHay = norm(hay);
    const normQ = norm(q);
    const score = normHay.includes(normQ) ? (hay.includes(q) ? 2 : 1) : 0;
    if (!q || score) results.push({ key, meta, score });
  }
  results.sort((a, b) => b.score - a.score);
  return q ? results.slice(0, 6) : results.slice(0, 6);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderSuggestions(query) {
  if (!catSuggestions) return;
  const trimmed = (query || '').trim();
  if (!trimmed) {
    catSuggestions.innerHTML = '';
    return;
  }
  const results = searchCategories(query);
  if (!results.length) {
    const q = trimmed;
    catSuggestions.innerHTML =
      `<div class="cat-empty">No match for "<strong>${escapeHtml(q)}</strong>".</div>
       <button type="button" class="cat-add-btn" id="cat-add-btn" data-name="${escapeHtml(q)}">
         <i data-lucide="plus-circle"></i> Add "<strong>${escapeHtml(q)}</strong>" as a new category
       </button>`;
    if (window.lucide) lucide.createIcons();
    const addBtn = document.getElementById('cat-add-btn');
    addBtn?.addEventListener('click', () => suggestNewCategory(q));
    return;
  }
  catSuggestions.innerHTML = results.map((r, i) => {
    const selected = catHidden.value === r.key;
    const subCrumb = r.meta.subs.slice(0, 3).map(escapeHtml).join('<span class="crumb-sep">/</span>');
    return `
      <div class="cat-option ${selected ? 'selected' : ''}" data-key="${r.key}" data-i="${i}" role="option">
        <div class="cat-option-icon"><i data-lucide="${r.meta.icon}"></i></div>
        <div class="cat-option-text">
          <span class="cat-option-main">${escapeHtml(r.meta.label)}</span>
          <span class="cat-option-sub">${subCrumb}</span>
        </div>
        <span class="cat-option-check"><i data-lucide="check"></i></span>
      </div>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
  catSuggestions.querySelectorAll('.cat-option').forEach(opt => {
    opt.addEventListener('click', () => selectCategory(opt.dataset.key));
  });
}

function renderRecentCategories() {
  if (!catRecent) return;
  const recent = getRecentCategories();
  if (!recent.length) { catRecent.innerHTML = ''; return; }
  catRecent.innerHTML =
    `<div class="cat-recent-label">Recently used</div>
     <div class="cat-recent-list">` +
    recent.map(k => {
      const meta = CATEGORY_MODEL[k];
      if (!meta) return '';
      return `<button type="button" class="cat-chip" data-key="${k}"><i data-lucide="clock"></i> ${escapeHtml(meta.label)}</button>`;
    }).join('') + `</div>`;
  catRecent.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => selectCategory(chip.dataset.key, true));
  });
  if (window.lucide) lucide.createIcons();
}

function selectCategory(key, fromRecent) {
  const meta = CATEGORY_MODEL[key];
  if (!meta) return;
  catHidden.value = key;
  const catIdInput = document.getElementById('category-id');
  if (catIdInput) catIdInput.value = meta.id || '';
  catSearchInput.value = meta.label;
  catSuggestions.innerHTML = '';
  catSearchInput.classList.add('selected');
  onCategoryChanged(key);
  pushRecentCategory(key);
  catSearchInput.blur();
}

async function suggestNewCategory(name) {
  if (!name || !name.trim()) return;
  const clean = name.trim();
  const addBtn = document.getElementById('cat-add-btn');
  if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Adding…'; }
  try {
    const res = await fetch(`${API_BASE}/api/categories/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: clean }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Could not add category');
    const c = json.data;
    CATEGORIES.push({
      id: c.id, slug: c.slug, name: c.name, icon: c.icon || 'tag',
      signals: c.signals || [], subcategories: c.subcategories || [],
    });
    rebuildCategoryModel();
    selectCategory(c.slug);
    showToast(json.message || `Added "${c.name}" as a new category.`, 'success');
  } catch (err) {
    if (addBtn) { addBtn.disabled = false; }
    showToast(err.message || 'Could not add category', 'error');
    renderSuggestions(name);
  }
}

catSearchInput?.addEventListener('input', e => {
  catHidden.value = '';
  renderSuggestions(e.target.value);
});
catSearchInput?.addEventListener('focus', e => {
  if (!catHidden.value) renderSuggestions(e.target.value);
});
document.addEventListener('click', e => {
  if (catSearchInput && !catSearchInput.closest('.cat-search-wrap').contains(e.target)) {
    catSuggestions.innerHTML = '';
  }
});

const COLOR_PALETTE = [
  '#000000','#ffffff','#f5f5f5','#808080','#c0c0c0',
  '#ef4444','#f97316','#eab308','#22c55e','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1',
  '#a16207','#854d0e','#166534','#1e40af','#6b21a8',
  '#fde68a','#bbf7d0','#bfdbfe','#ddd6fe','#fecaca',
  '#0f172a','#1e293b','#334155','#64748b','#94a3b8',
];

function renderDetailsFields(fields) {
  detailsGrid.innerHTML = '';
  // Build the field list, then append a friendly Condition question so every
  // product carries a condition without it being repeated per template.
  const list = fields.slice();
  list.push({ name: '_condition_q', label: 'Condition', type: 'condition', required: true });

  list.forEach((f, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'field ap-doc-field';
    wrap.style.setProperty('--i', idx);

    if (f.type === 'condition') {
      // Reuse the existing condition radio group markup but inline
      const label = document.createElement('label');
      label.innerHTML = 'Condition <span class="req">*</span>';
      const group = document.createElement('div');
      group.className = 'condition-group';
      const opts = [
        ['new', 'sparkles', 'New'],
        ['like-new', 'star', 'Like New'],
        ['good', 'thumbs-up', 'Good'],
        ['fair', 'minus-circle', 'Fair'],
      ];
      opts.forEach(o => {
        const lab = document.createElement('label');
        lab.className = 'condition-option';
        lab.innerHTML =
          `<input type="radio" name="condition" value="${o[0]}"${o[0] === 'new' ? ' required' : ''}>
           <div class="condition-card"><i data-lucide="${o[1]}"></i><span>${o[2]}</span></div>`;
        group.appendChild(lab);
      });
      wrap.appendChild(label);
      wrap.appendChild(group);
      wrap.insertAdjacentHTML('beforeend', '<span class="ap-hint">Is it new or used?</span>');
      if (window.lucide) lucide.createIcons();
      detailsGrid.appendChild(wrap);
      return;
    }

    const label = document.createElement('label');
    label.htmlFor = `details-${f.name}`;
    label.innerHTML = f.label + (f.required ? ' <span class="req">*</span>' : (f.recommended ? ' <span class="ap-optional">(recommended)</span>' : ''));
    wrap.appendChild(label);
    if (f.type === 'select') {
      const sel = document.createElement('select');
      sel.id = `details-${f.name}`; sel.name = f.name;
      if (f.required) sel.required = true;
      const blank = document.createElement('option');
      blank.value = ''; blank.textContent = `Select ${f.label}`;
      sel.appendChild(blank);
      f.options.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; sel.appendChild(opt); });
      wrap.appendChild(sel);
    } else if (f.type === 'checkbox') {
      const inp = document.createElement('input');
      inp.type = 'checkbox'; inp.id = `details-${f.name}`; inp.name = f.name;
      wrap.appendChild(inp);
    } else if (f.type === 'color') {
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.id = `details-${f.name}`; hidden.name = f.name;
      const paletteWrap = document.createElement('div');
      paletteWrap.className = 'color-palette-wrap';
      const swatchRow = document.createElement('div');
      swatchRow.className = 'color-palette-swatches';
      const counter = document.createElement('div');
      counter.className = 'color-palette-counter';
      counter.innerHTML = '<strong>0</strong> selected';
      let selected = [];
      COLOR_PALETTE.forEach(hex => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-swatch-item';
        btn.style.backgroundColor = hex;
        btn.title = hex;
        btn.addEventListener('click', () => {
          selected = hidden.value ? hidden.value.split(',').map(c => c.trim()).filter(Boolean) : [];
          if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            selected = selected.filter(c => c !== hex);
          } else {
              btn.classList.add('selected');
            selected.push(hex);
          }
          hidden.value = selected.join(',');
          counter.innerHTML = `<strong>${selected.length}</strong> selected`;
        });
        swatchRow.appendChild(btn);
      });
      paletteWrap.appendChild(swatchRow);
      paletteWrap.appendChild(counter);
      wrap.appendChild(hidden);
      wrap.appendChild(paletteWrap);
    } else {
      const inp = document.createElement('input');
      inp.type = f.type === 'date' ? 'date' : 'text';
      inp.id = `details-${f.name}`; inp.name = f.name;
      inp.placeholder = f.placeholder || f.label;
      if (f.required) inp.required = true;
      wrap.appendChild(inp);
    }
    if (f.recommended) {
      wrap.insertAdjacentHTML('beforeend', '<span class="ap-hint">Optional — only if you know it.</span>');
    }
    detailsGrid.appendChild(wrap);
  });
}

/* ── Advanced settings toggle ─────────────── */
const advancedToggle = document.getElementById('advanced-toggle');
const advancedBox    = document.querySelector('.ap-advanced');
advancedToggle?.addEventListener('click', () => {
  const open = advancedBox.classList.toggle('open');
  advancedToggle.setAttribute('aria-expanded', String(open));
});

/* ── Tags ────────────────────────────────── */
function renderTags() {
  const list = document.getElementById('tags-list');
  if (!list) return;
  list.innerHTML = '';
  tags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${tag}<button type="button" aria-label="Remove tag" data-i="${i}">&times;</button>`;
    chip.querySelector('button').addEventListener('click', () => { tags.splice(i, 1); renderTags(); });
    list.appendChild(chip);
  });
}
document.getElementById('tags-input')?.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const val = e.target.value.trim().replace(/,$/, '');
  if (val && tags.length < 10 && !tags.includes(val)) { tags.push(val); renderTags(); }
  e.target.value = '';
});

/* ── Image upload ────────────────────────── */
function evaluateImageQuality(file, dataUrl, badge) {
  if (!badge) return;
  const sizeKB = file.size / 1024;
  const img = new Image();
  img.onload = () => {
    const { width, height } = img;
    let level = 'good', label = 'Great quality';
    if (width < 500 || height < 500 || sizeKB < 30) { level = 'low'; label = 'Low quality'; }
    else if (width < 1000 || height < 1000 || sizeKB < 150) { level = 'ok'; label = 'Okay quality'; }
    badge.className = `img-quality ${level}`;
    badge.textContent = label;
    badge.classList.remove('hidden');
  };
  img.src = dataUrl;
}

function setCover(idx) {
  if (idx === 0 || !imageFiles[idx]) return;
  const moved = imageFiles[idx];
  for (let i = idx; i > 0; i--) imageFiles[i] = imageFiles[i - 1];
  imageFiles[0] = moved;
  refreshImageSlots();
}

function refreshImageSlots() {
  document.querySelectorAll('.img-upload-slot').forEach(slot => {
    const idx     = +slot.querySelector('.img-file-input').dataset.index;
    const file    = imageFiles[idx];
    const preview = slot.querySelector('.img-slot-preview');
    const ph      = slot.querySelector('.img-slot-placeholder');
    const rmBtn   = slot.querySelector('.img-remove-btn');
    const badge   = slot.querySelector('.img-quality');
    const input   = slot.querySelector('.img-file-input');
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        if (ph) ph.style.display = 'none';
        if (rmBtn) rmBtn.classList.remove('hidden');
        slot.classList.add('has-image');
        evaluateImageQuality(file, e.target.result, badge);
      };
      reader.readAsDataURL(file);
    } else {
      preview.src = ''; preview.classList.add('hidden');
      if (ph) ph.style.display = '';
      if (rmBtn) rmBtn.classList.add('hidden');
      if (badge) { badge.className = 'img-quality hidden'; badge.textContent = ''; }
      input.value = '';
      slot.classList.remove('has-image');
    }
    const coverBadge = slot.querySelector('.img-slot-badge');
    if (coverBadge) coverBadge.style.display = idx === 0 ? '' : 'none';
  });
}

document.querySelectorAll('.img-file-input').forEach(input => {
  input.addEventListener('change', function () {
    const files = Array.from(this.files || []).filter(f => /^image\//.test(f.type));
    if (!files.length) { this.value = ''; return; }
    let idx = +this.dataset.index;
    let placed = 0;
    for (let i = idx; i < imageFiles.length && placed < files.length; i++) {
      if (!imageFiles[i]) imageFiles[i] = files[placed++];
    }
    let j = 0;
    while (placed < files.length) { imageFiles[j++] = files[placed++]; }
    this.value = '';
    refreshImageSlots();
  });
});
document.querySelectorAll('.img-remove-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const slot    = btn.closest('.img-upload-slot');
    const input   = slot.querySelector('.img-file-input');
    const idx     = +input.dataset.index;
    imageFiles[idx] = null;
    refreshImageSlots();
  });
});

const imagesGrid = document.getElementById('images-grid');
imagesGrid?.addEventListener('dragover', e => { e.preventDefault(); imagesGrid.classList.add('drag-over'); });
imagesGrid?.addEventListener('dragleave', () => imagesGrid.classList.remove('drag-over'));
imagesGrid?.addEventListener('drop', e => {
  e.preventDefault();
  imagesGrid.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files || []).filter(f => /^image\//.test(f.type));
  if (!files.length) return;
  let placed = 0;
  for (let i = 0; i < imageFiles.length && placed < files.length; i++) {
    if (!imageFiles[i]) { imageFiles[i] = files[placed++]; }
  }
  let j = 0;
  while (placed < files.length) imageFiles[j++] = files[placed++];
  refreshImageSlots();
});

document.querySelectorAll('.img-slot-badge').forEach(badge => {
  badge.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const slot = badge.closest('.img-upload-slot');
    const idx  = +slot.querySelector('.img-file-input').dataset.index;
    setCover(idx);
  });
});

/* ── Qty stepper ─────────────────────────── */
document.getElementById('qty-minus')?.addEventListener('click', () => {
  const el = document.getElementById('quantity');
  if (el && +el.value > 1) el.value = +el.value - 1;
});
document.getElementById('qty-plus')?.addEventListener('click', () => {
  const el = document.getElementById('quantity');
  if (el && +el.value < 999) el.value = +el.value + 1;
});

/* ── Char counters ───────────────────────── */
document.getElementById('product-name')?.addEventListener('input', function () {
  document.getElementById('name-count').textContent = this.value.length;
});
document.getElementById('description')?.addEventListener('input', function () {
  document.getElementById('desc-count').textContent = this.value.length;
});

/* ── Validation ──────────────────────────── */
function validateScreen1() {
  if (!document.getElementById('product-name')?.value.trim()) { showToast('Give your product a name first.'); return false; }
  if (!document.getElementById('category')?.value)            { showToast('Pick a category so buyers can find it.'); return false; }
  if (!document.getElementById('price')?.value)               { showToast('Add a price for your product.'); return false; }
  if (!imageFiles[0])                                         { showToast('Add at least one clear photo.'); return false; }
  return true;
}
function validateScreen2() {
  if (!document.querySelector('input[name="condition"]:checked')) { showToast('Let buyers know the condition.'); return false; }
  if (!document.getElementById('description')?.value.trim())  { showToast('Add a short description.'); return false; }
  if (!document.getElementById('quantity')?.value)           { showToast('Add how many you have available.'); return false; }
  return true;
}

const SCREEN1_CELEBRATE = "✅ Great! Your product now has a name, price, and photos.";

btnNext?.addEventListener('click', () => {
  if (!validateScreen1()) return;
  showScreen(2);
  showToast(SCREEN1_CELEBRATE, 'success');
});
btnBack?.addEventListener('click', () => { showScreen(1); });

/* ── Submit product ──────────────────────── */
async function submitProduct(publish = true) {
  if (!validateScreen1() || !validateScreen2()) return;

  const formData = new FormData();
  formData.append('name',        document.getElementById('product-name').value.trim());
  formData.append('description', document.getElementById('description').value.trim());
  formData.append('category',    document.getElementById('category').value);
  formData.append('categoryId',  document.getElementById('category-id')?.value || '');
  formData.append('subcategory', document.getElementById('subcategory')?.value || '');
  formData.append('subcategoryId', document.getElementById('subcategory-id')?.value || '');
  formData.append('condition',   document.querySelector('input[name="condition"]:checked')?.value || '');
  formData.append('price',       document.getElementById('price').value);
  formData.append('comparePrice',document.getElementById('compare-price')?.value || '');
  formData.append('costPrice',   document.getElementById('cost-price')?.value || '');
  formData.append('stock',       document.getElementById('quantity')?.value || '1');
  formData.append('isActive',    publish ? 'true' : 'false');
  if (tags.length) formData.append('tags', JSON.stringify(tags));

  // Dynamic detail fields
  const details = {};
  detailsGrid.querySelectorAll('input,select,textarea').forEach(el => {
    if (!el.name) return;
    details[el.name] = el.type === 'checkbox' ? String(el.checked) : el.value;
  });
  // Advanced fields rolled into details
  const adv = {
    sku: document.getElementById('sku')?.value.trim(),
    shippingDetails: document.getElementById('shipping-details')?.value.trim(),
    dimWidth: document.getElementById('dim-width')?.value.trim(),
    dimHeight: document.getElementById('dim-height')?.value.trim(),
    dimDepth: document.getElementById('dim-depth')?.value.trim(),
    seoTitle: document.getElementById('seo-title')?.value.trim(),
    seoDesc: document.getElementById('seo-desc')?.value.trim(),
    internalNotes: document.getElementById('internal-notes')?.value.trim(),
  };
  Object.entries(adv).forEach(([k, v]) => { if (v) details[k] = v; });
  if (Object.keys(details).length) formData.append('details', JSON.stringify(details));

  imageFiles.forEach(f => { if (f) formData.append('images', f); });

  const method  = EDIT_ID ? 'PUT' : 'POST';
  const url     = EDIT_ID
    ? `${API_BASE}/api/seller/products/${EDIT_ID}`
    : `${API_BASE}/api/seller/products`;

  btnNext.disabled = true;
  btnSubmit.disabled = true;
  try {
    const res  = await fetch(url, { method, headers: authHeaders(), body: formData });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save listing');
    showScreen('done');
    if (json.data && json.data.slug) lastProductSlug = json.data.slug;
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnNext.disabled = false;
    btnSubmit.disabled = false;
  }
}

btnSaveDraft?.addEventListener('click', async () => {
  if (!validateScreen1()) return;
  await submitProduct(false);
});
btnSaveDraft2?.addEventListener('click', async () => {
  if (!validateScreen1() || !validateScreen2()) return;
  await submitProduct(false);
});
document.getElementById('add-product-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  await submitProduct(true);
});

/* ── Share / Add another (success screen) ── */
let lastProductSlug = null;
document.getElementById('btn-share')?.addEventListener('click', () => {
  const url = lastProductSlug
    ? `${window.location.origin}/pages/public/shop/product-details.html?slug=${lastProductSlug}`
    : window.location.origin;
  if (navigator.share) {
    navigator.share({ title: 'Check out my product on UnimartX', url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('Product link copied to clipboard.', 'success')).catch(() => {});
  }
});

document.getElementById('btn-add-another')?.addEventListener('click', () => {
  document.getElementById('add-product-form')?.reset();
  tags.length      = 0;
  renderTags();
  imageFiles.fill(null);
  document.querySelectorAll('.img-slot-preview').forEach(img => { img.src = ''; img.classList.add('hidden'); });
  document.querySelectorAll('.img-slot-placeholder').forEach(ph => ph.style.display = '');
  document.querySelectorAll('.img-remove-btn').forEach(btn => btn.classList.add('hidden'));
  document.querySelectorAll('.img-upload-slot').forEach(s => s.classList.remove('has-image'));
  document.getElementById('name-count').textContent  = '0';
  document.getElementById('desc-count').textContent  = '0';
  detailsGrid.innerHTML        = '';
  detailsSectionWrap.style.display = 'none';
  catSearchInput.value = '';
  catHidden.value = '';
  showScreen(1);
});

/* ── Toast ───────────────────────────────── */
function showToast(msg, type = 'error') {
  const existing = document.querySelector('.ap-toast');
  if (existing) existing.remove();
  const t  = document.createElement('div');
  t.className = 'ap-toast';
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '1.5rem', left: '50%',
    transform: 'translateX(-50%)',
    background: type === 'success' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
    border:    `1px solid ${type === 'success' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
    color:     type === 'success' ? '#f59e0b' : '#ef4444',
    padding:   '0.65rem 1.25rem', borderRadius: '10px',
    fontFamily: 'Quicksand, sans-serif', fontWeight: '700', fontSize: '0.85rem',
    zIndex:    '9999', backdropFilter: 'blur(8px)',
    animation: 'fadeInUp 0.25s ease both',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ── Personalisation ─────────────────────── */
const name     = localStorage.getItem('seller_fullname') || 'Store Owner';
const store    = localStorage.getItem('seller_store')    || 'My Store';
const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
['sidebar-name','topnav-username'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.textContent = name;
});
['sidebar-avatar','topnav-avatar'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.textContent = initials;
});
const storeEl = document.getElementById('sidebar-store');
if (storeEl) storeEl.textContent = store;

/* ═══════════════════════════════════════════
   EDIT MODE — pre-fill form from existing product
   ═══════════════════════════════════════════ */
async function loadEditData() {
  if (!EDIT_ID) return;

  const titleEl = document.querySelector('.topnav-title h1');
  if (titleEl) titleEl.textContent = 'Edit Listing';
  const subEl = document.querySelector('.topnav-title p');
  if (subEl) subEl.textContent = 'Update your listing details';

  try {
    const res  = await fetch(`${API_BASE}/api/seller/products/${EDIT_ID}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load listing');
    const p = json.data;

    const nameEl = document.getElementById('product-name');
    if (nameEl) {
      nameEl.value = p.name || '';
      document.getElementById('name-count').textContent = nameEl.value.length;
    }
    const descEl = document.getElementById('description');
    if (descEl) {
      descEl.value = p.description || '';
      document.getElementById('desc-count').textContent = descEl.value.length;
    }

    if (p.category) {
      selectCategory(p.category, true);
    }

    const subCatEl = document.getElementById('subcategory');
    if (subCatEl && p.subcategory) {
      const slugged = p.subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      subCatEl.value = slugged;
      onSubcategoryChanged(slugged);
    }

    const INTERNAL_DETAIL_KEYS = new Set(['_fulfillment', '_location', 'condition']);
    if (p.details) {
      let details = p.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { details = {}; }
      }
      Object.entries(details).forEach(([key, val]) => {
        if (INTERNAL_DETAIL_KEYS.has(key)) return;
        if (!val && val !== false) return;
        const el = document.getElementById(`details-${key}`);
        if (!el) return;
        if (el.type === 'checkbox') {
          el.checked = val === 'true' || val === true;
        } else {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (el.type === 'hidden' && val) {
          const wrapper = el.closest('.field');
          if (wrapper) {
            const colors = String(val).split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            wrapper.querySelectorAll('.color-swatch-item').forEach(swatch => {
              swatch.classList.toggle('selected', colors.includes(swatch.title.toLowerCase()));
            });
            const counter = wrapper.querySelector('.color-palette-counter');
            if (counter) counter.innerHTML = `<strong>${colors.length}</strong> selected`;
          }
        }
      });
    }
    if (p.condition) {
      const condRadio = document.querySelector(`input[name="condition"][value="${p.condition}"]`);
      if (condRadio) condRadio.checked = true;
    }

    if (Array.isArray(p.tags) && p.tags.length) {
      tags.length = 0;
      p.tags.forEach(t => tags.push(t));
      renderTags();
    }

    const priceEl = document.getElementById('price');
    if (priceEl) priceEl.value = p.price || '';
    const compareEl = document.getElementById('compare-price');
    if (compareEl) compareEl.value = p.comparePrice || '';
    const costEl = document.getElementById('cost-price');
    if (costEl) costEl.value = p.costPrice || '';
    const qtyEl = document.getElementById('quantity');
    if (qtyEl) qtyEl.value = p.stock ?? p.quantity ?? 1;

    if (p.brand) { const b = document.getElementById('details-brand'); if (b) { b.value = p.brand; b.dispatchEvent(new Event('input', { bubbles: true })); } }
    if (details) {
      const d = typeof details === 'object' ? details : {};
      const map = { sku:'sku', shippingDetails:'shipping_details', shipping_details:'shipping-details', dimWidth:'dim_width', dimWidth:'dim-width', dimHeight:'dim_height', dimHeight:'dim-height', dimDepth:'dim_depth', dimDepth:'dim-depth', seoTitle:'seo_title', seoTitle:'seo-title', seoDesc:'seo_desc', seoDesc:'seo-desc', internalNotes:'internal_notes', internalNotes:'internal-notes' };
      Object.entries(map).forEach(([srcKey, elId]) => {
        const v = d[srcKey];
        if (v) { const el = document.getElementById(elId); if (el) el.value = v; }
      });
    }

    document.getElementById('submit-label').textContent = 'Save Changes';

  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Init ────────────────────────────────── */
showScreen(1);
loadEditData();
loadCategories();
})();
