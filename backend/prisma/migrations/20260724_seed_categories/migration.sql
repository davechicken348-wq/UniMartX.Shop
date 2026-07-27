-- Seed categories + subcategories into the database.
-- Safe to run multiple times: ON CONFLICT DO NOTHING on all inserts.
-- Creates the tables if they do not already exist.
-- Does not touch any other table.

-- 1. Create tables (idempotent)
CREATE TABLE IF NOT EXISTS "categories" (
  "id"          TEXT      NOT NULL PRIMARY KEY,
  "slug"        TEXT      NOT NULL UNIQUE,
  "name"        TEXT      NOT NULL,
  "icon"        TEXT,
  "description" TEXT,
  "signals"     TEXT[]   DEFAULT '{}',
  "sortOrder"   INTEGER  DEFAULT 0,
  "isActive"    BOOLEAN  DEFAULT true,
  "sellerCreated" BOOLEAN DEFAULT false,
  "status"      TEXT      DEFAULT 'active',
  "createdBy"   TEXT,
  "createdAt"   TIMESTAMP DEFAULT now(),
  "updatedAt"   TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subcategories" (
  "id"         TEXT      NOT NULL PRIMARY KEY,
  "categoryId" TEXT      NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "slug"       TEXT      NOT NULL,
  "name"       TEXT      NOT NULL,
  "sortOrder"  INTEGER  DEFAULT 0,
  "isActive"   BOOLEAN  DEFAULT true,
  "createdAt"  TIMESTAMP DEFAULT now(),
  "updatedAt"  TIMESTAMP DEFAULT now(),
  UNIQUE("categoryId", "slug")
);

CREATE INDEX IF NOT EXISTS "idx_categories_slug" ON "categories"("slug");
CREATE INDEX IF NOT EXISTS "idx_subcategories_cat" ON "subcategories"("categoryId");

-- 2. Seed categories
INSERT INTO "categories" (id, slug, name, icon, description, "sortOrder", "isActive", "sellerCreated", status)
VALUES
  ('cat_tech',   'tech-gadgets',    'Tech & Gadgets',            'cpu',       'Laptops, phones, chargers and electronics',  0, true,  false, 'active'),
  ('cat_book',   'textbooks',       'Textbooks & Course Materials','book',     'Books, notes and materials for your courses', 1, true,  false, 'active'),
  ('cat_notes',  'notes-tutoring',  'Notes, Past Papers & Tutoring','grad-cap','Sell your notes or offer tutoring help',     2, true,  false, 'active'),
  ('cat_dorm',   'dorm-essentials', 'Dorm & Room Essentials',     'home',     'Everything to set up your room',             3, true,  false, 'active'),
  ('cat_fash',   'fashion',         'Fashion & Event Wear',       'shirt',    'Clothes, shoes and outfits for every occasion', 4, true, false, 'active'),
  ('cat_food',   'food-snacks',     'Food, Snacks & Meal Swaps',  'utensils', 'Snacks, homemade food and meal swaps',       5, true,  false, 'active'),
  ('cat_beauty', 'beauty',          'Beauty & Personal Care',     'sparkles', 'Skincare, hair and personal care',           6, true,  false, 'active'),
  ('cat_sport',  'sports-fitness',  'Sports & Fitness',           'dumbbell', 'Gear and equipment for staying active',      7, true,  false, 'active'),
  ('cat_art',    'art-crafts',      'Art & Crafts',               'palette',  'Handmade and creative items',                8, true,  false, 'active'),
  ('cat_svc',    'services',        'Services & Gigs',            'briefcase','Help other students — skills and tasks',     9, true,  false, 'active'),
  ('cat_other',  'other',           'Other',                      'tag',      'Anything else you would like to sell',      10, true,  false, 'active')
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed subcategories
INSERT INTO "subcategories" (id, "categoryId", slug, name, "sortOrder", "isActive")
VALUES
  -- tech-gadgets
  ('sc_tech_1', 'cat_tech', 'laptops-computers', 'Laptops & Computers',   0, true),
  ('sc_tech_2', 'cat_tech', 'phones',            'Phones & Accessories',  1, true),
  ('sc_tech_3', 'cat_tech', 'audio',             'Audio',                 2, true),
  ('sc_tech_4', 'cat_tech', 'cameras',           'Cameras',               3, true),
  ('sc_tech_5', 'cat_tech', 'gaming',            'Gaming',                4, true),
  ('sc_tech_6', 'cat_tech', 'other-tech',        'Other',                 5, true),
  -- textbooks
  ('sc_book_1', 'cat_book', 'textbooks',         'Textbooks',             0, true),
  ('sc_book_2', 'cat_book', 'study-guides',      'Study Guides',          1, true),
  ('sc_book_3', 'cat_book', 'past-papers',       'Past Papers',           2, true),
  ('sc_book_4', 'cat_book', 'stationery',        'Stationery',            3, true),
  ('sc_book_5', 'cat_book', 'other-book',        'Other',                 4, true),
  -- notes-tutoring
  ('sc_notes_1', 'cat_notes', 'tutoring',        'Tutoring',              0, true),
  ('sc_notes_2', 'cat_notes', 'typed-notes',     'Typed Notes',           1, true),
  ('sc_notes_3', 'cat_notes', 'handwritten-notes','Handwritten Notes',     2, true),
  ('sc_notes_4', 'cat_notes', 'summaries',       'Summaries',             3, true),
  ('sc_notes_5', 'cat_notes', 'other-notes',     'Other',                 4, true),
  -- dorm-essentials
  ('sc_dorm_1', 'cat_dorm', 'furniture',         'Furniture',             0, true),
  ('sc_dorm_2', 'cat_dorm', 'bedding',           'Bedding',               1, true),
  ('sc_dorm_3', 'cat_dorm', 'kitchen',           'Kitchen',               2, true),
  ('sc_dorm_4', 'cat_dorm', 'decor',             'Decor',                 3, true),
  ('sc_dorm_5', 'cat_dorm', 'cleaning',          'Cleaning',              4, true),
  ('sc_dorm_6', 'cat_dorm', 'lighting',          'Lighting',              5, true),
  ('sc_dorm_7', 'cat_dorm', 'other-dorm',        'Other',                 6, true),
  -- fashion
  ('sc_fash_1', 'cat_fash', 'mens-clothing',     'Men''s Clothing',       0, true),
  ('sc_fash_2', 'cat_fash', 'womens-clothing',   'Women''s Clothing',     1, true),
  ('sc_fash_3', 'cat_fash', 'shoes',             'Shoes',                 2, true),
  ('sc_fash_4', 'cat_fash', 'bags',              'Bags',                  3, true),
  ('sc_fash_5', 'cat_fash', 'formal-grad',       'Formal & Grad',          4, true),
  ('sc_fash_6', 'cat_fash', 'other-fashion',     'Other',                  5, true),
  -- food-snacks
  ('sc_food_1', 'cat_food', 'snacks',            'Snacks',                0, true),
  ('sc_food_2', 'cat_food', 'beverages',         'Beverages',             1, true),
  ('sc_food_3', 'cat_food', 'homemade-meals',    'Homemade Meals',        2, true),
  ('sc_food_4', 'cat_food', 'baking',            'Baking',                3, true),
  ('sc_food_5', 'cat_food', 'other-food',        'Other',                 4, true),
  -- beauty
  ('sc_beauty_1', 'cat_beauty', 'skincare',      'Skincare',              0, true),
  ('sc_beauty_2', 'cat_beauty', 'hair-care',     'Hair Care',             1, true),
  ('sc_beauty_3', 'cat_beauty', 'makeup',        'Makeup',                2, true),
  ('sc_beauty_4', 'cat_beauty', 'fragrances',    'Fragrances',            3, true),
  ('sc_beauty_5', 'cat_beauty', 'other-beauty',  'Other',                 4, true),
  -- sports-fitness
  ('sc_sport_1', 'cat_sport', 'gym-equipment',   'Gym Equipment',         0, true),
  ('sc_sport_2', 'cat_sport', 'sportswear',      'Sportswear',            1, true),
  ('sc_sport_3', 'cat_sport', 'outdoor-gear',    'Outdoor Gear',          2, true),
  ('sc_sport_4', 'cat_sport', 'bikes',           'Bikes',                 3, true),
  ('sc_sport_5', 'cat_sport', 'other-sport',     'Other',                 4, true),
  -- art-crafts
  ('sc_art_1', 'cat_art', 'paintings',           'Paintings',             0, true),
  ('sc_art_2', 'cat_art', 'crafts',              'Crafts',                1, true),
  ('sc_art_3', 'cat_art', 'photography',         'Photography',           2, true),
  ('sc_art_4', 'cat_art', 'digital-art',         'Digital Art',           3, true),
  ('sc_art_5', 'cat_art', 'other-art',           'Other',                 4, true),
  -- services
  ('sc_svc_1', 'cat_svc', 'delivery',            'Delivery',              0, true),
  ('sc_svc_2', 'cat_svc', 'repairs',             'Repairs',               1, true),
  ('sc_svc_3', 'cat_svc', 'printing',            'Printing',              2, true),
  ('sc_svc_4', 'cat_svc', 'laundry',             'Laundry',               3, true),
  ('sc_svc_5', 'cat_svc', 'svc-photography',     'Photography',           4, true),
  ('sc_svc_6', 'cat_svc', 'other-svc',           'Other',                 5, true),
  -- other
  ('sc_other_1', 'cat_other', 'other-misc',      'Other',                 0, true)
ON CONFLICT ("categoryId", slug) DO NOTHING;
