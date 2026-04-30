-- ============================================================
-- Restaurant Management System - Database Schema
-- ============================================================

-- Drop tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS table_status CASCADE;

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE menu_items (
  id           SERIAL PRIMARY KEY,
  category     VARCHAR(100) NOT NULL,          -- e.g. 'main-course', 'appetizers'
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  price        NUMERIC(10, 2) NOT NULL,
  image_url    TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category ON menu_items(category);

-- ============================================================
-- TABLES (physical restaurant tables)
-- ============================================================
CREATE TYPE table_status AS ENUM ('open', 'occupied', 'closed');

CREATE TABLE tables (
  id         SERIAL PRIMARY KEY,
  number     INT NOT NULL UNIQUE,
  capacity   INT NOT NULL DEFAULT 4,
  status     table_status NOT NULL DEFAULT 'open',  -- open | occupied | closed
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');

CREATE TABLE orders (
  id         SERIAL PRIMARY KEY,
  table_id   INT NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  status     order_status NOT NULL DEFAULT 'pending',
  notes      TEXT,
  total      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10, 2) NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-MANAGE TABLE STATUS BASED ON ORDERS
-- ============================================================

-- When a new order is inserted, mark the table as 'occupied'
CREATE OR REPLACE FUNCTION set_table_occupied()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tables SET status = 'occupied' WHERE id = NEW.table_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_inserted
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_table_occupied();

-- When an order is marked 'delivered' or 'cancelled', reopen the table
-- if no other active orders remain for that table
CREATE OR REPLACE FUNCTION sync_table_status()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
BEGIN
  -- Only act when status changes to a terminal state
  IF NEW.status IN ('delivered', 'cancelled') THEN
    SELECT COUNT(*) INTO active_count
    FROM orders
    WHERE table_id = NEW.table_id
      AND status NOT IN ('delivered', 'cancelled')
      AND id <> NEW.id;

    IF active_count = 0 THEN
      UPDATE tables SET status = 'open' WHERE id = NEW.table_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_changed
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_table_status();

