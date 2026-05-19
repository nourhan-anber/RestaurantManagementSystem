import express from 'express';
import { pool } from '../db/pool.js';
import { verifyTableToken } from '../utils/security.js';

const router = express.Router();

/**
 * GET /api/orders/kitchen
 * Returns all active orders (pending + in-progress) across every table,
 * joined with their items. Designed for the kitchen display screen.
 * Optional ?status=pending|in-progress|ready to filter.
 */
router.get('/kitchen', async (req, res) => {
  try {
    const { status } = req.query;

    const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
    const activeStatuses = status
      ? [status]
      : ['pending', 'preparing'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      `SELECT
         o.id,
         o.status,
         o.notes,
         o.total,
         o.created_at,
         t.number AS table_number,
         json_agg(
           json_build_object(
             'id',           oi.id,
             'menu_item_id', oi.menu_item_id,
             'name',         mi.name,
             'quantity',     oi.quantity,
             'unit_price',   oi.unit_price,
             'notes',        oi.notes
           ) ORDER BY oi.id
         ) AS items
       FROM orders o
       JOIN tables t      ON t.id = o.table_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN menu_items mi  ON mi.id = oi.menu_item_id
       WHERE o.status = ANY($1)
       GROUP BY o.id, t.number
       ORDER BY o.created_at ASC`,
      [activeStatuses]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update the status of a single order.
 * Body: { "status": "preparing" | "ready" | "delivered" | "cancelled" }
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `status is required and must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = await pool.query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING id, status, table_id, created_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * POST /api/orders
 * Place a new order for a table.
 *
 * Body:
 * {
 *   "table_number": 7,
 *   "notes": "No onions please",          // optional
 *   "items": [
 *     { "menu_item_id": 1, "quantity": 2, "notes": "Extra spicy" },
 *     { "menu_item_id": 3, "quantity": 1 }
 *   ]
 * }
 */
router.post('/', async (req, res) => {
  const { table_number } = req.body;
  
  // ── Verify Table Token (Security) ────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = authHeader.split(' ')[1];
  
  if (!table_number || !verifyTableToken(table_number, token)) {
    return res.status(403).json({ error: 'Invalid or missing token for this table' });
  }

  const client = await pool.connect();
  try {
    const { items, notes } = req.body;

    // ── Validate request body ──────────────────────────────────────────────
    if (!table_number) {
      return res.status(400).json({ error: 'table_number is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }
    for (const item of items) {
      if (!item.menu_item_id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          error: 'Each item must have a valid menu_item_id and quantity >= 1',
        });
      }
    }

    // ── Resolve table ──────────────────────────────────────────────────────
    const tableResult = await client.query(
      'SELECT id, status FROM tables WHERE number = $1 AND is_active = TRUE',
      [table_number]
    );
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    const tableId = tableResult.rows[0].id;

    // ── Fetch menu item prices (validate they exist and are available) ──────
    const menuItemIds = items.map((i) => i.menu_item_id);
    const menuResult = await client.query(
      'SELECT id, price FROM menu_items WHERE id = ANY($1) AND is_available = TRUE',
      [menuItemIds]
    );

    if (menuResult.rows.length !== menuItemIds.length) {
      return res.status(400).json({
        error: 'One or more menu items are invalid or unavailable',
      });
    }

    const priceMap = Object.fromEntries(
      menuResult.rows.map((r) => [r.id, parseFloat(r.price)])
    );

    // ── Calculate total ────────────────────────────────────────────────────
    const total = items.reduce(
      (sum, item) => sum + priceMap[item.menu_item_id] * item.quantity,
      0
    );

    await client.query('BEGIN');

    // ── Insert order ───────────────────────────────────────────────────────
    const orderResult = await client.query(
      `INSERT INTO orders (table_id, notes, total)
       VALUES ($1, $2, $3)
       RETURNING id, table_id, status, notes, total, created_at`,
      [tableId, notes ?? null, total]
    );
    const order = orderResult.rows[0];

    // ── Insert order items ─────────────────────────────────────────────────
    const orderItemPromises = items.map((item) =>
      client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, menu_item_id, quantity, unit_price`,
        [
          order.id,
          item.menu_item_id,
          item.quantity,
          priceMap[item.menu_item_id],
          item.notes ?? null,
        ]
      )
    );
    const itemResults = await Promise.all(orderItemPromises);
    const orderItems = itemResults.map((r) => r.rows[0]);

    await client.query('COMMIT');
    // DB trigger trg_order_inserted will automatically set table status = 'occupied'

    res.status(201).json({
      order: {
        ...order,
        table_number,
        items: orderItems,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/orders?table_number=7
 * Fetch active orders for a given table (optional filter by status).
 */
router.get('/', async (req, res) => {
  try {
    const { table_number, status } = req.query;

    if (!table_number) {
      return res.status(400).json({ error: 'table_number query parameter is required' });
    }

    const tableResult = await pool.query(
      'SELECT id FROM tables WHERE number = $1',
      [table_number]
    );
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    const tableId = tableResult.rows[0].id;

    let sql = `
      SELECT
        o.id, o.status, o.notes, o.total, o.created_at,
        json_agg(
          json_build_object(
            'id',           oi.id,
            'menu_item_id', oi.menu_item_id,
            'quantity',     oi.quantity,
            'unit_price',   oi.unit_price,
            'notes',        oi.notes
          )
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.table_id = $1
    `;
    const params = [tableId];

    if (status) {
      sql += ` AND o.status = $2`;
      params.push(status);
    }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
