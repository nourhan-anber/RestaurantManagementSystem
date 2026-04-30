-- ============================================================
-- Seed Data — Menu Items & Tables
-- ============================================================

-- Restaurant Tables
INSERT INTO tables (number, capacity) VALUES
  (1,  4), (2,  4), (3,  2), (4,  6),
  (5,  4), (6,  4), (7,  8), (8,  2),
  (9,  4), (10, 4), (11, 6), (12, 4);

-- Main Course
INSERT INTO menu_items (category, name, description, price) VALUES
  ('main-course', 'Truffle Mushroom Risotto',  'Creamy Arborio rice with wild mushrooms, white truffle oil, and aged Parmesan.',                      24.00),
  ('main-course', 'Pan-Seared Sea Bass',       'Fresh sea bass fillet served with asparagus, roasted cherry tomatoes, and lemon butter sauce.',       32.00),
  ('main-course', 'Wagyu Beef Burger',         'Premium Wagyu beef patty, caramelized onions, gruyere cheese, and truffle mayo on a brioche bun.',    28.00),
  ('main-course', 'Classic Margherita Pizza',  'San Marzano tomato sauce, fresh mozzarella, basil leaves, and extra virgin olive oil.',               18.00);

-- Appetizers
INSERT INTO menu_items (category, name, description, price) VALUES
  ('appetizers', 'Truffle Fries',   'Crispy french fries tossed with truffle oil and freshly grated Parmesan.',            9.00),
  ('appetizers', 'Burrata Caprese', 'Creamy burrata with heirloom tomatoes, fresh basil, and aged balsamic glaze.',       14.00),
  ('appetizers', 'Crispy Calamari', 'Lightly breaded calamari rings served with marinara and lemon aioli.',               13.00);

-- Desserts
INSERT INTO menu_items (category, name, description, price) VALUES
  ('desserts', 'Chocolate Lava Cake', 'Warm chocolate cake with a gooey molten center, served with vanilla bean ice cream.', 12.00),
  ('desserts', 'Tiramisu',            'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.',      11.00),
  ('desserts', 'Crème Brûlée',        'Silky vanilla custard topped with a perfectly caramelized sugar crust.',             10.00);

-- Drinks
INSERT INTO menu_items (category, name, description, price) VALUES
  ('drinks', 'Signature Lemonade', 'Freshly squeezed lemons with a hint of mint and agave nectar.',          5.00),
  ('drinks', 'Sparkling Water',    'Premium Italian sparkling mineral water, 750ml.',                         4.00),
  ('drinks', 'Espresso Martini',   'Vodka, fresh espresso, coffee liqueur, and a touch of vanilla syrup.',  14.00);

