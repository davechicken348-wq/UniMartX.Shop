/* ═══════════════════════════════════════════
   ADD PRODUCT JS  —  backend-connected
═══════════════════════════════════════════ */

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';
const TOKEN_KEY = 'authToken';

/* ── Helpers ─────────────────────────────── */

// Panel IDs: 1.5 → details, 4 → publish, else panel-{n}
function panelForStep(stepNum) {
  if (stepNum === 1.5) return 'panel-details';
  if (stepNum === 4)   return 'panel-5';
  return `panel-${stepNum}`;
}

function isPublishStep(stepNum) {
  return stepNum === 4;
}

/* ── Constants ───────────────────────────── */

const SUBCATEGORIES = {
  electronics:    ['Phones & Accessories', 'Laptops & Computers', 'Audio', 'Cameras', 'Gaming', 'Other'],
  books:          ['Textbooks', 'Novels', 'Stationery', 'Study Guides', 'Other'],
  fashion:        ["Men's Clothing", "Women's Clothing", 'Shoes', 'Bags', 'Accessories', 'Other'],
  food:           ['Snacks', 'Other'],
  beauty:         ['Skincare', 'Hair Care', 'Makeup', 'Fragrances', 'Other'],
  sports:         ['Gym Equipment', 'Sportswear', 'Outdoor Gear', 'Other'],
  home:           ['Furniture', 'Bedding', 'Kitchen', 'Decor', 'Cleaning', 'Other'],
  art:            ['Paintings', 'Crafts', 'Photography', 'Digital Art', 'Other'],
  other:          ['Other'],
};

const DETAILS_FIELDS = {
  // ── Electronics ──
  'electronics-phones-accessories': [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', required: true },
    { name: 'storage', label: 'Storage', type: 'text', recommended: true },
    { name: 'ram', label: 'RAM', type: 'text' },
    { name: 'unlocked', label: 'Is it unlocked?', type: 'select', options: ['Yes', 'No', 'Not Applicable'], recommended: true },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'network', label: 'Network Type', type: 'select', options: ['4G', '5G', 'WiFi Only'] },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'electronics-laptops-computers': [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', required: true },
    { name: 'processor', label: 'Processor', type: 'text', recommended: true },
    { name: 'ram', label: 'RAM', type: 'text' },
    { name: 'storage', label: 'Storage', type: 'text', recommended: true },
    { name: 'os', label: 'OS', type: 'select', options: ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Other'] },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'electronics-audio': [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'type', label: 'Type', type: 'select', required: true, options: ['Earbuds', 'Headphones', 'Speaker', 'Other'] },
    { name: 'wireless', label: 'Wireless', type: 'checkbox', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'electronics-cameras': [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text' },
    { name: 'type', label: 'Type', type: 'select', options: ['DSLR', 'Mirrorless', 'Point & Shoot', 'Action', 'Other'], recommended: true },
    { name: 'megapixels', label: 'Megapixels', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'electronics-gaming': [
    { name: 'platform', label: 'Platform', type: 'select', required: true, options: ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'Other'] },
    { name: 'genre', label: 'Genre', type: 'text', recommended: true },
    { name: 'game_item_name', label: 'Game/Item Name', type: 'text', required: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'electronics-other': [],

  // ── Books ──
  'books-textbooks': [
    { name: 'subject_course', label: 'Subject/Course', type: 'text', required: true },
    { name: 'author', label: 'Author', type: 'text', recommended: true },
    { name: 'edition', label: 'Edition', type: 'text', recommended: true },
    { name: 'isbn', label: 'ISBN', type: 'text' },
    { name: 'university_level', label: 'University/Level', type: 'text' },
  ],
  'books-novels': [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'author', label: 'Author', type: 'text', required: true },
    { name: 'genre', label: 'Genre', type: 'select', options: ['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Biography', 'Other'], recommended: true },
  ],
  'books-stationery': [
    { name: 'item_type', label: 'Item Type', type: 'select', required: true, options: ['Notebook', 'Pen', 'Pencil', 'Marker', 'File', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text' },
  ],
  'books-study guides': [
    { name: 'subject', label: 'Subject', type: 'text', required: true },
    { name: 'level', label: 'Level', type: 'select', options: ['JHS', 'SHS', 'University', 'Professional'], recommended: true },
  ],
  'books-other': [],

  // ── Fashion ──
  'fashion-mens-clothing': [
    { name: 'size', label: 'Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'material', label: 'Material', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'fashion-womens-clothing': [
    { name: 'size', label: 'Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'material', label: 'Material', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'fashion-shoes': [
    { name: 'size', label: 'Size', type: 'text', required: true },
    { name: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Unisex'] },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'material', label: 'Material', type: 'text' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'fashion-bags': [
    { name: 'type', label: 'Type', type: 'select', options: ['Backpack', 'Handbag', 'Tote', 'Clutch', 'Other'], recommended: true },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'material', label: 'Material', type: 'text' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'fashion-accessories': [
    { name: 'type', label: 'Type', type: 'select', required: true, options: ['Watch', 'Belt', 'Hat', 'Sunglasses', 'Jewellery', 'Other'] },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'fashion-other': [],

  // ── Food (products) — resold / pre-packaged items ──
  'food-snacks': [
    { name: 'type', label: 'Type', type: 'select', options: ['Chips', 'Biscuits', 'Nuts', 'Candy', 'Snack Box', 'Other'], recommended: true },
    { name: 'quantity_pack_size', label: 'Quantity / Pack Size', type: 'text' },
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'expiry', label: 'Expiry Date', type: 'date' },
    { name: 'allergens', label: 'Allergens', type: 'text', recommended: true },
  ],
  'food-other': [
    { name: 'item_type', label: 'What kind of food is it?',      type: 'select', required: true,  options: ['Snacks / chips', 'Biscuits / pastries', 'Nuts / seeds', 'Candy / sweets', ' Beverages / drinks', 'Prepackaged meals', 'Frozen treats', 'Other'] },
    { name: 'quantity',  label: 'Quantity / Pack Size',            type: 'text',   recommended: true },
    { name: 'brand',     label: 'Brand',                           type: 'text' },
    { name: 'expiry',    label: 'Expiry Date',                     type: 'date' },
    { name: 'allergens', label: 'Allergens',                       type: 'text',   recommended: true },
  ],

  // ── Beauty ──
  'beauty-skincare': [
    { name: 'skin_type', label: 'Skin Type', type: 'select', options: ['Oily', 'Dry', 'Combination', 'Normal', 'All'], recommended: true },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'key_ingredients', label: 'Key Ingredients', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'beauty-hair-care': [
    { name: 'hair_type', label: 'Hair Type', type: 'select', options: ['Natural', 'Relaxed', "Loc'd", 'All'], recommended: true },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'product_type', label: 'Product Type', type: 'select', required: true, options: ['Shampoo', 'Conditioner', 'Oil', 'Cream', 'Other'] },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'beauty-makeup': [
    { name: 'product_type', label: 'Product Type', type: 'select', required: true, options: ['Foundation', 'Lipstick', 'Eyeshadow', 'Mascara', 'Blush', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'shade_color', label: 'Shade / Color', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'beauty-fragrances': [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'size_volume', label: 'Size / Volume', type: 'text', recommended: true },
    { name: 'type', label: 'Type', type: 'select', options: ['Perfume', 'EDT', 'EDP', 'Body Mist', 'Other'], recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'beauty-other': [],

  // ── Sports ──
  'sports-gym-equipment': [
    { name: 'equipment_type', label: 'Equipment Type', type: 'select', required: true, options: ['Dumbbells', 'Resistance Bands', 'Yoga Mat', 'Bench', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'weight_size', label: 'Weight / Size', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'sports-sportswear': [
    { name: 'sport_type', label: 'Sport Type', type: 'text', recommended: true },
    { name: 'size', label: 'Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other'] },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unisex'], recommended: true },
    { name: 'material', label: 'Material', type: 'text' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'sports-outdoor-gear': [
    { name: 'gear_type', label: 'Gear Type', type: 'select', required: true, options: ['Tent', 'Backpack', 'Torch', 'Rope', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'sports-other': [],

  // ── Home ──
  'home-furniture': [
    { name: 'furniture_type', label: 'Furniture Type', type: 'select', required: true, options: ['Chair', 'Desk', 'Bed', 'Shelf', 'Wardrobe', 'Other'] },
    { name: 'material', label: 'Material', type: 'text', recommended: true },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'dimensions', label: 'Dimensions', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'home-bedding': [
    { name: 'bedding_type', label: 'Bedding Type', type: 'select', required: true, options: ['Pillow', 'Duvet', 'Bedsheet', 'Mattress', 'Other'] },
    { name: 'size_label', label: 'Size', type: 'select', options: ['Single', 'Double', 'Queen', 'King'], recommended: true },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'home-kitchen': [
    { name: 'item_type', label: 'Item Type', type: 'select', required: true, options: ['Cookware', 'Cutlery', 'Appliance', 'Storage', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'material', label: 'Material', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'home-decor': [
    { name: 'decor_type', label: 'Decor Type', type: 'select', required: true, options: ['Wall Art', 'Plant', 'Lamp', 'Rug', 'Other'] },
    { name: 'color', label: 'Color', type: 'color', recommended: true },
    { name: 'material', label: 'Material', type: 'text' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'home-cleaning': [
    { name: 'product_type', label: 'Product Type', type: 'select', required: true, options: ['Detergent', 'Disinfectant', 'Mop', 'Brush', 'Other'] },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'volume_size', label: 'Volume / Size', type: 'text', recommended: true },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'home-other': [],

  // ── Art ──
  'art-paintings': [
    { name: 'medium', label: 'Medium', type: 'select', required: true, options: ['Oil', 'Acrylic', 'Watercolor', 'Digital', 'Other'] },
    { name: 'dimensions', label: 'Dimensions', type: 'text', recommended: true },
    { name: 'framed', label: 'Framed', type: 'checkbox', recommended: true },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'art-crafts': [
    { name: 'craft_type', label: 'Craft Type', type: 'select', required: true, options: ['Beadwork', 'Weaving', 'Pottery', 'Candles', 'Other'] },
    { name: 'material', label: 'Material', type: 'text' },
    { name: 'custom_orders', label: 'Custom Orders', type: 'checkbox', recommended: true },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'art-photography': [
    { name: 'print_type', label: 'Print Type', type: 'select', options: ['Canvas', 'Photo Paper', 'Digital File'], recommended: true },
    { name: 'dimensions', label: 'Dimensions', type: 'text', recommended: true },
    { name: 'framed', label: 'Framed', type: 'checkbox' },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'art-digital-art': [
    { name: 'file_format', label: 'File Format', type: 'select', required: true, options: ['PNG', 'JPG', 'SVG', 'PDF', 'Other'] },
    { name: 'resolution', label: 'Resolution', type: 'text', recommended: true },
    { name: 'license', label: 'License', type: 'select', options: ['Personal', 'Commercial'], recommended: true },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'whats_included', label: "What's included / in the box", type: 'text', recommended: true },
  ],
  'art-other': [],

};

/* ── State ───────────────────────────────── */
let currentStep        = 1;
const TOTAL_STEPS      = 5;
const DETAILS_STEP_KEY = 'details';
let hasDetailsStep     = false;
let detailsFieldsKey   = '';
let detailsFieldsActive = false;
const tags             = [];
const imageFiles       = Array(5).fill(null);

// Edit mode
const EDIT_ID = new URLSearchParams(window.location.search).get('edit') || null;

/* ── DOM refs ────────────────────────────── */
const steps            = document.querySelectorAll('.step');
const stepLines        = document.querySelectorAll('.step-line');
const detailsPanel     = document.getElementById('panel-details');
const detailsGrid      = document.getElementById('details-grid');
const detailsIndicator = document.getElementById('details-indicator');
const detailsLine      = document.getElementById('details-line');
const editDetailsLink  = document.getElementById('edit-details-link');
const btnBack          = document.getElementById('btn-back');
const btnNext          = document.getElementById('btn-next');
const btnSubmit        = document.getElementById('btn-submit');
const btnSaveDraft     = document.getElementById('btn-save-draft');
const visToggle        = document.getElementById('visibility-toggle');

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
   STEP NAVIGATION
═══════════════════════════════════════════ */

// product (+details)  [1, 1.5, 2, 3, 4]
// product (no details)[1,    2, 2, 3, 4]
// service  (+details) [1, 1.5, 2, 5, 5]
// service  (no det.)  [1,    2, 5, 5, 5]
// The number at each index = the stepNum whose arrival fills that bar-line.
function stepBaseSequence() {
  return hasDetailsStep ? [1, 1.5, 2, 3, 4] : [1, 2, 2, 3, 4];
}

function goToStep(n, skipAnimation = false) {
  let stepNum;
  if (n === DETAILS_STEP_KEY) stepNum = 1.5;
  else if (typeof n === 'number') stepNum = n;
  else stepNum = 1;

  const base = stepBaseSequence();

  // ── Step dots ────────────────────────────
  steps.forEach((s, i) => {
    const num = i + 1;
    if (stepNum === 1.5) {
      s.classList.toggle('active', false);
      s.classList.toggle('done', num === 1);
    } else {
      s.classList.toggle('active', num === stepNum);
      s.classList.toggle('done', num < stepNum);
    }
  });

  // ── Step-lines (connectors) ─────────────
  stepLines.forEach((line, i) => {
    line.classList.toggle('done', base[i] < stepNum);
  });

  // ── Details indicator state ────────────
  detailsIndicator?.classList.toggle('current', stepNum === 1.5);
  // ── Active panel ─────────────────────────
  document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(panelForStep(stepNum))?.classList.add('active');
  currentStep = stepNum;
  const qty           = document.getElementById('quantity')?.value          || '—';
  const cond2         = document.querySelector('input[name="condition"]:checked')?.value || '—';
  const reviewQtyEl   = document.getElementById('review-qty');
  const reviewCondEl  = document.getElementById('review-condition');
  const reviewFulfEl  = document.getElementById('review-fulfillment');
  const reviewLocEl   = document.getElementById('review-location-badge');
  if (reviewQtyEl)   reviewQtyEl.textContent    = qty + ' in stock';
  if (reviewCondEl)  reviewCondEl.textContent   = cond2.charAt(0).toUpperCase() + cond2.slice(1).replace('-', ' ');
  if (reviewFulfEl)  reviewFulfEl.textContent   = 'Standard';
  if (reviewLocEl)   reviewLocEl.textContent    = '';
  document.querySelector('.edit-link[data-goto="3"]')?.style.setProperty('display', '');

  if (imageFiles[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const img        = document.getElementById('review-img');
      const placeholder = document.getElementById('review-img-placeholder');
      img.src              = e.target.result;
      img.classList.remove('hidden');
      if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(imageFiles[0]);
  }
  updateSubmitLabel();
}

/* ── Category → Subcategory ─────────────── */
document.getElementById('category')?.addEventListener('change', function () {
  const cat = this.value;
  const subEl = document.getElementById('subcategory');
  const subWrap = document.getElementById('subcategory-wrap');
  subEl.innerHTML = '<option value="">Select subcategory</option>';
  detailsGrid.innerHTML = '';
  hasDetailsStep = false;
  detailsFieldsKey = '';
  detailsIndicator?.classList.remove('active');
  detailsLine?.classList.remove('active');
  if (editDetailsLink) editDetailsLink.style.display = 'none';
  const subs = SUBCATEGORIES[cat] || [];
  if (subs.length) {
    subs.forEach(s => {
      const o = document.createElement('option');
      o.value = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      o.textContent = s;
      subEl.appendChild(o);
    });
    if (subWrap) subWrap.style.display = '';
  } else {
    if (subWrap) subWrap.style.display = 'none';
  }
});

/* ── Subcategory → Detail fields ─────────── */
document.getElementById('subcategory')?.addEventListener('change', function () {
  const cat = document.getElementById('category')?.value || '';
  const sub = this.value; // already a slug
  const key = sub ? `${cat}-${sub}` : '';
  detailsGrid.innerHTML = '';
  hasDetailsStep = false;
  detailsFieldsKey = '';
  detailsIndicator?.classList.remove('active');
  detailsLine?.classList.remove('active');
  if (editDetailsLink) editDetailsLink.style.display = 'none';
  const fields = DETAILS_FIELDS[key];
  if (fields && fields.length) {
    detailsFieldsKey = key;
    hasDetailsStep = true;
    detailsIndicator?.classList.add('active');
    detailsLine?.classList.add('active');
    if (editDetailsLink) editDetailsLink.style.display = '';
    renderDetailsFields(fields);
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
  fields.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'field' + (f.type === 'checkbox' ? ' field-checkbox' : '');
    const label = document.createElement('label');
    label.htmlFor = `details-${f.name}`;
    label.innerHTML = f.label + (f.required ? ' <span class="req">*</span>' : (f.recommended ? ' <span class="rec">(recommended)</span>' : ''));
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
      inp.placeholder = f.label;
      if (f.required) inp.required = true;
      wrap.appendChild(inp);
    }
    detailsGrid.appendChild(wrap);
  });
}

/* ── Visibility toggle ───────────────────── */
visToggle?.addEventListener('change', updateSubmitLabel);
function updateSubmitLabel() {
  document.getElementById('submit-label').textContent =
    visToggle.checked ? 'Publish Listing' : 'Save as Draft';
}

/* ═══════════════════════════════════════════
   STEP NAVIGATION — Next / Back
═══════════════════════════════════════════ */
function nextStepFor(s) {
  if (s === 1)   return hasDetailsStep ? 'details' : 2;
  if (s === 1.5) return 2;
  if (s === 2)   return 3;
  if (s === 3)   return 4;
  return s;
}
function prevStepFor(s) {
  if (s === 4)   return 3;
  if (s === 3)   return 2;
  if (s === 2)   return hasDetailsStep ? 'details' : 1;
  if (s === 1.5) return 1;
  return 1;
}

function validateStep(s) {
  if (s === 1) {
    if (!document.getElementById('product-name')?.value.trim()) { showToast('Enter a product name.'); return false; }
    if (!document.getElementById('category')?.value)            { showToast('Select a category.'); return false; }
    if (!document.querySelector('input[name="condition"]:checked')) { showToast('Select a condition.'); return false; }
    if (!document.getElementById('description')?.value.trim())  { showToast('Add a description.'); return false; }
  }
  if (s === 1.5) {
    const required = detailsGrid.querySelectorAll('[required]');
    for (const el of required) {
      if (!el.value.trim()) { showToast(`Fill in: ${el.closest('.field')?.querySelector('label')?.textContent?.replace('*','').trim() || el.name}`); return false; }
    }
  }
  if (s === 2) {
    if (!document.getElementById('price')?.value) { showToast('Enter a selling price.'); return false; }
  }
  if (s === 3) {
    if (!imageFiles[0]) { showToast('Add at least one product photo.'); return false; }
  }
  return true;
}

btnNext?.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  const next = nextStepFor(currentStep);
  goToStep(next);
  updateNavButtons();
});

btnBack?.addEventListener('click', () => {
  const prev = prevStepFor(currentStep);
  goToStep(prev);
  updateNavButtons();
});

document.querySelectorAll('.edit-link[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.goto;
    goToStep(isNaN(target) ? target : Number(target));
    updateNavButtons();
  });
});

function updateNavButtons() {
  const isFirst   = currentStep === 1;
  const isReview  = isPublishStep(currentStep);
  btnBack.style.display    = isFirst ? 'none' : '';
  btnNext.classList.toggle('hidden', isReview);
  btnSubmit.classList.toggle('hidden', !isReview);
}

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
document.querySelectorAll('.img-file-input').forEach(input => {
  input.addEventListener('change', function () {
    const idx  = +this.dataset.index;
    const file = this.files[0];
    if (!file) return;
    imageFiles[idx] = file;
    const slot    = this.closest('.img-upload-slot');
    const preview = slot.querySelector('.img-slot-preview');
    const ph      = slot.querySelector('.img-slot-placeholder');
    const rmBtn   = slot.querySelector('.img-remove-btn');
    const reader  = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      if (ph) ph.style.display = 'none';
      if (rmBtn) rmBtn.classList.remove('hidden');
      slot.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  });
});
document.querySelectorAll('.img-remove-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const slot    = btn.closest('.img-upload-slot');
    const input   = slot.querySelector('.img-file-input');
    const preview = slot.querySelector('.img-slot-preview');
    const ph      = slot.querySelector('.img-slot-placeholder');
    const idx     = +input.dataset.index;
    imageFiles[idx] = null;
    input.value     = '';
    preview.src     = ''; preview.classList.add('hidden');
    if (ph) ph.style.display = '';
    btn.classList.add('hidden');
    slot.classList.remove('has-image');
  });
});

/* ── Pricing calculator ──────────────────── */
function runCalcs() {
  const price   = parseFloat(document.getElementById('price')?.value)   || 0;
  const compare = parseFloat(document.getElementById('compare-price')?.value) || 0;
  const cost    = parseFloat(document.getElementById('cost-price')?.value)    || 0;
  const fee     = 0; // 0% platform fee
  const payout  = price - fee;
  const fmt = v => `GH₵ ${v.toFixed(2)}`;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('cr-selling', fmt(price));
  set('cr-fee',     `− GH₵ ${fee.toFixed(2)}`);
  set('cr-payout',  fmt(payout));
  set('cr-payout2', fmt(payout));
  if (cost > 0) {
    const profit = payout - cost;
    set('cr-cost',   `− GH₵ ${cost.toFixed(2)}`);
    set('cr-profit', fmt(profit));
    const hint = document.getElementById('profit-hint');
    if (hint) hint.style.display = 'none';
  }
  const discountBox = document.getElementById('discount-box');
  if (compare > price && price > 0) {
    const discAmt = compare - price;
    const discPct = Math.round((discAmt / compare) * 100);
    set('cr-original',     fmt(compare));
    set('cr-discount-amt', `− GH₵ ${discAmt.toFixed(2)}`);
    set('cr-sale',         fmt(price));
    const badge = document.getElementById('discount-badge');
    if (badge) badge.textContent = `${discPct}% OFF`;
    discountBox?.classList.remove('hidden');
  } else {
    discountBox?.classList.add('hidden');
  }
  // Update review panel price
  const reviewPrice = document.getElementById('review-price');
  if (reviewPrice) reviewPrice.textContent = price > 0 ? fmt(price) : 'GH₵ —';
  const reviewName = document.getElementById('review-name');
  if (reviewName) reviewName.textContent = document.getElementById('product-name')?.value || '—';
  const reviewCat = document.getElementById('review-category');
  if (reviewCat) reviewCat.textContent = document.getElementById('category')?.value || '—';
}
['price','compare-price','cost-price'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', runCalcs);
});

/* ── Submit product ──────────────────────── */
async function submitProduct(publish = true) {
  if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
  if (hasDetailsStep && !validateStep(1.5)) return;

  const formData = new FormData();
  formData.append('name',        document.getElementById('product-name').value.trim());
  formData.append('description', document.getElementById('description').value.trim());
  formData.append('category',    document.getElementById('category').value);
  formData.append('subcategory', document.getElementById('subcategory')?.value || '');
  formData.append('condition',   document.querySelector('input[name="condition"]:checked')?.value || '');
  formData.append('price',       document.getElementById('price').value);
  formData.append('comparePrice',document.getElementById('compare-price')?.value || '');
  formData.append('costPrice',   document.getElementById('cost-price')?.value || '');
  formData.append('stock',       document.getElementById('quantity')?.value || '1');
  formData.append('isActive',    publish ? 'true' : 'false');
  if (tags.length) formData.append('tags', JSON.stringify(tags));

  // Details fields
  const details = {};
  if (hasDetailsStep) {
    detailsGrid.querySelectorAll('input,select,textarea').forEach(el => {
      if (!el.name) return;
      details[el.name] = el.type === 'checkbox' ? String(el.checked) : el.value;
    });
  }
  if (Object.keys(details).length) formData.append('details', JSON.stringify(details));

  // Images
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
    document.getElementById('success-modal')?.classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnNext.disabled = false;
    btnSubmit.disabled = false;
  }
}

/* ── Save draft ──────────────────────────── */
/* ── Save draft ──────────────────────────── */
btnSaveDraft?.addEventListener('click', async () => { await submitProduct(false); });
document.getElementById('add-product-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  await submitProduct(visToggle?.checked ?? true);
});

/* ── Modal: add another ──────────────────── */
document.getElementById('modal-add-another')?.addEventListener('click', () => {
  document.getElementById('success-modal').classList.add('hidden');
  document.getElementById('add-product-form')?.reset();
  tags.length      = 0;
  imageFiles.fill(null);
  renderTags();
  document.querySelectorAll('.img-slot-preview').forEach(img => { img.src = ''; img.classList.add('hidden'); });
  document.querySelectorAll('.img-slot-placeholder').forEach(ph => ph.style.display = '');
  document.querySelectorAll('.img-remove-btn').forEach(btn => btn.classList.add('hidden'));
  document.querySelectorAll('.img-upload-slot').forEach(s => s.classList.remove('has-image'));
  document.getElementById('name-count').textContent  = '0';
  document.getElementById('desc-count').textContent  = '0';
  detailsGrid.innerHTML        = '';
  detailsFieldsActive          = false;
  detailsFieldsKey             = '';
  hasDetailsStep               = false;
  detailsIndicator?.classList.remove('active');
  detailsLine?.classList.remove('active');
  editDetailsLink.style.display = 'none';
  goToStep(1);
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

  // Update page chrome
  const titleEl = document.querySelector('.topnav-title h1');
  if (titleEl) titleEl.textContent = 'Edit Listing';
  const subEl = document.querySelector('.topnav-title p');
  if (subEl) subEl.textContent = 'Update your listing details';

  try {
    const res  = await fetch(`${API_BASE}/api/seller/products/${EDIT_ID}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load listing');
    const p = json.data;

    // ── 1. Basic text fields ──────────────────
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

    // ── 2. Category — fires change to populate subcategory options
    //       and show/hide service-specific fields ──────────────────
    const catEl = document.getElementById('category');
    if (catEl && p.category) {
      catEl.value = p.category;
      catEl.dispatchEvent(new Event('change'));
    }

    // ── 3. Subcategory — fires change to render detail fields ─────
    //       Must happen AFTER category change has populated options.
    const subCatEl = document.getElementById('subcategory');
    if (subCatEl && p.subcategory) {
      const slugged = p.subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      subCatEl.value = slugged;
      subCatEl.dispatchEvent(new Event('change'));
    }

    // ── 4. Detail fields — fill AFTER renderDetailsFields has run ─
    //       renderDetailsFields is synchronous so fields exist now.
    //       _fulfillment and _location are internal keys stored in details.
    const INTERNAL_DETAIL_KEYS = new Set(['_fulfillment', '_location', 'condition']);
    if (p.details) {
      let details = p.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { details = {}; }
      }
      Object.entries(details).forEach(([key, val]) => {
        if (INTERNAL_DETAIL_KEYS.has(key)) return; // handled separately below
        if (!val && val !== false) return;
        const el = document.getElementById(`details-${key}`);
        if (!el) return;
        if (el.type === 'checkbox') {
          el.checked = val === 'true' || val === true;
        } else {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // For color palette hidden inputs, restore selected swatches
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

      // Read fulfillment + location back out of details
      if (details._fulfillment) {
        const radio = document.querySelector(`input[name="fulfillment"][value="${details._fulfillment}"]`);
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
      }
      if (details._location) {
        const locEl = document.getElementById('location');
        if (locEl) locEl.value = details._location;
      }
    }
    if (p.condition) {
      const condRadio = document.querySelector(`input[name="condition"][value="${p.condition}"]`);
      if (condRadio) condRadio.checked = true;
    }

    // ── 6. Tags (products only) ───────────────
    if (Array.isArray(p.tags) && p.tags.length) {
      tags.length = 0;
      p.tags.forEach(t => tags.push(t));
      renderTags();
    }

    // ── 7. Pricing ────────────────────────────
    const priceEl = document.getElementById('price');
    if (priceEl) priceEl.value = p.price || '';
    const compareEl = document.getElementById('compare-price');
    if (compareEl) compareEl.value = p.comparePrice || '';
    const costEl = document.getElementById('cost-price');
    if (costEl) costEl.value = p.costPrice || '';
    const qtyEl = document.getElementById('quantity');
    if (qtyEl) qtyEl.value = p.stock ?? p.quantity ?? 1;
    runCalcs();

    // ── 8. Delivery fee (products only) ──────────
    const feeEl = document.getElementById('delivery-fee');
    if (feeEl && p.deliveryFee) feeEl.value = p.deliveryFee;

    // ── 9. Visibility & submit label ──────────
    if (visToggle) visToggle.checked = p.isActive !== false;
    document.getElementById('submit-label').textContent = 'Save Changes';
    updateSubmitLabel();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Init ────────────────────────────────── */
goToStep(1);
updateNavButtons();
loadEditData();
