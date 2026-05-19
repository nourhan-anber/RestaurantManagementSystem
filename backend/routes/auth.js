import express from 'express';
import { generateTableToken } from '../utils/security.js';
import { pool } from '../db/pool.js';

const router = express.Router();

/**
 * GET /api/auth/table-token/:number
 * Returns the secure token for a table. This endpoint is meant for 
 * restaurant staff/admin systems to generate the QR codes.
 * In a real-world scenario, this endpoint itself should be protected
 * by admin authentication (like JWT).
 */
router.get('/table-token/:number', async (req, res) => {
  try {
    const { number } = req.params;

    // Verify the table actually exists
    const tableResult = await pool.query(
      'SELECT id FROM tables WHERE number = $1 AND is_active = TRUE',
      [number]
    );

    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const token = generateTableToken(number);
    res.json({ table_number: number, token });
  } catch (error) {
    console.error('Error generating table token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
