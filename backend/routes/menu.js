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

export default router;
