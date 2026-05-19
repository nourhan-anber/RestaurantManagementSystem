import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

// GET /api/tables — list all tables with their current status
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, number, capacity, status, is_active FROM tables WHERE is_active = TRUE ORDER BY number'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tables/:number — get a single table by table number
router.get('/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const result = await pool.query(
      'SELECT id, number, capacity, status, is_active FROM tables WHERE number = $1',
      [number]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/tables/:number/close-bill
// Cashier closes the bill: marks all active orders for this table as 'delivered'
// The DB trigger will then automatically reopen the table.
router.patch('/:number/close-bill', async (req, res) => {
  const client = await pool.connect();
  try {
    const { number } = req.params;

    // Resolve table id
    const tableResult = await client.query(
      'SELECT id FROM tables WHERE number = $1',
      [number]
    );
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    const tableId = tableResult.rows[0].id;

    await client.query('BEGIN');

    // Mark all active orders for this table as 'delivered'
    const updated = await client.query(
      `UPDATE orders
       SET status = 'delivered'
       WHERE table_id = $1
         AND status NOT IN ('delivered', 'cancelled')
       RETURNING id`,
      [tableId]
    );

    await client.query('COMMIT');

    // The trg_order_status_changed trigger will auto-set table status = 'open'
    res.json({
      message: `Bill closed for table ${number}. ${updated.rowCount} order(s) settled.`,
      settled_order_ids: updated.rows.map((r) => r.id),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error closing bill:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/tables — create a new table
router.post('/', async (req, res) => {
  try {
    const { number, capacity, is_active } = req.body;
    
    if (!number || capacity === undefined) {
      return res.status(400).json({ error: 'Number and capacity are required' });
    }

    const result = await pool.query(
      `INSERT INTO tables (number, capacity, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [number, capacity, is_active ?? true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating table:', error);
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Table number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tables/:id — update an existing table
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { number, capacity, is_active } = req.body;

    if (!number || capacity === undefined) {
      return res.status(400).json({ error: 'Number and capacity are required' });
    }

    const result = await pool.query(
      `UPDATE tables 
       SET number = $1, capacity = $2, is_active = $3
       WHERE id = $4
       RETURNING *`,
      [number, capacity, is_active ?? true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating table:', error);
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Table number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tables/:id — soft delete (set is_active to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE tables SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json({ message: 'Table deactivated', table: result.rows[0] });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
