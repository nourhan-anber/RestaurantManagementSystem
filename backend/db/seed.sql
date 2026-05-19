-- ============================================================
-- Seed Data — Menu Items & Tables
-- ============================================================

-- Restaurants
INSERT INTO restaurants (name, username, password_hash) VALUES
  ('Bella Vista', 'admin', '$2b$10$zanjZijhnKeBoNo2DwzXlu51sFmriQzHyhSf8JkDfrAt3KEKutfeW');

-- Restaurant Tables
INSERT INTO tables (restaurant_id, number, capacity) VALUES
  (1, 1,  4), (1, 2,  4), (1, 3,  2), (1, 4,  6),
  (1, 5,  4), (1, 6,  4), (1, 7,  8), (1, 8,  2),
  (1, 9,  4), (1, 10, 4), (1, 11, 6), (1, 12, 4);

-- Main Course
INSERT INTO menu_items (restaurant_id, category, name, description, price) VALUES
  (1, 'main-course', 'Truffle Mushroom Risotto',  'Creamy Arborio rice with wild mushrooms, white truffle oil, and aged Parmesan.',                      24.00),
  (1, 'main-course', 'Pan-Seared Sea Bass',       'Fresh sea bass fillet served with asparagus, roasted cherry tomatoes, and lemon butter sauce.',       32.00),
  (1, 'main-course', 'Wagyu Beef Burger',         'Premium Wagyu beef patty, caramelized onions, gruyere cheese, and truffle mayo on a brioche bun.',    28.00),
  (1, 'main-course', 'Classic Margherita Pizza',  'San Marzano tomato sauce, fresh mozzarella, basil leaves, and extra virgin olive oil.',               18.00);

-- Appetizers
INSERT INTO menu_items (restaurant_id, category, name, description, price) VALUES
  (1, 'appetizers', 'Truffle Fries',   'Crispy french fries tossed with truffle oil and freshly grated Parmesan.',            9.00),
  (1, 'appetizers', 'Burrata Caprese', 'Creamy burrata with heirloom tomatoes, fresh basil, and aged balsamic glaze.',       14.00),
  (1, 'appetizers', 'Crispy Calamari', 'Lightly breaded calamari rings served with marinara and lemon aioli.',               13.00);

-- Desserts
INSERT INTO menu_items (restaurant_id, category, name, description, price) VALUES
  (1, 'desserts', 'Chocolate Lava Cake', 'Warm chocolate cake with a gooey molten center, served with vanilla bean ice cream.', 12.00),
  (1, 'desserts', 'Tiramisu',            'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.',      11.00),
  (1, 'desserts', 'Crème Brûlée',        'Silky vanilla custard topped with a perfectly caramelized sugar crust.',             10.00);

-- Drinks
INSERT INTO menu_items (restaurant_id, category, name, description, price) VALUES
  (1, 'drinks', 'Signature Lemonade', 'Freshly squeezed lemons with a hint of mint and agave nectar.',          5.00),
  (1, 'drinks', 'Sparkling Water',    'Premium Italian sparkling mineral water, 750ml.',                         4.00),
  (1, 'drinks', 'Espresso Martini',   'Vodka, fresh espresso, coffee liqueur, and a touch of vanilla syrup.',  14.00);

