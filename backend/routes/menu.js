import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

// GET /api/menu?category=main-course
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    // Normalize URL-friendly slug (e.g. "main-course" stays as is)
    const normalizedCategory = category
      ? category.replace(/-/g, ' ').toLowerCase()
      : null;

    let result;

    if (!category || category.toLowerCase() === 'all') {
      result = await pool.query(
        'SELECT * FROM menu_items WHERE is_available = TRUE ORDER BY category, id'
      );
    } else {
      // Match against the stored slug (e.g. 'main-course')
      result = await pool.query(
        'SELECT * FROM menu_items WHERE category = $1 AND is_available = TRUE ORDER BY id',
        [category.toLowerCase()]
      );
    }

    // Format price as string for consistency with the frontend (e.g. "$24.00")
    const items = result.rows.map((item) => ({
      ...item,
      price: `$${parseFloat(item.price).toFixed(2)}`,
    }));

    res.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/menu — create a new menu item
router.post('/', async (req, res) => {
  try {
    const { category, name, description, price, image_url, is_available } = req.body;
    
    if (!category || !name || price === undefined) {
      return res.status(400).json({ error: 'Category, name, and price are required' });
    }

    const result = await pool.query(
      `INSERT INTO menu_items (category, name, description, price, image_url, is_available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [category.toLowerCase().replace(/\s+/g, '-'), name, description, price, image_url, is_available ?? true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/menu/:id — update an existing menu item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, description, price, image_url, is_available } = req.body;

    if (!category || !name || price === undefined) {
      return res.status(400).json({ error: 'Category, name, and price are required' });
    }

    const result = await pool.query(
      `UPDATE menu_items 
       SET category = $1, name = $2, description = $3, price = $4, image_url = $5, is_available = $6
       WHERE id = $7
       RETURNING *`,
      [category.toLowerCase().replace(/\s+/g, '-'), name, description, price, image_url, is_available ?? true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/menu/:id — soft delete (set is_available to false) or hard delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // We try to hard delete first. If there are order_items attached, 
    // it will fail due to RESTRICT constraint. In that case, we can fallback to soft-delete 
    // or just let it fail and tell the user to make it unavailable.
    // For safety in this app, we'll do a soft-delete by setting is_available = false.
    const result = await pool.query(
      `UPDATE menu_items SET is_available = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deactivated', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
