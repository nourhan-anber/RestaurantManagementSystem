import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { pool } from '../db/pool.js';

// Mock the db pool
vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/auth/table-token/:number', () => {
    it('should generate a token if the table exists', async () => {
      // Mock table exists
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app).get('/api/auth/table-token/7');

      expect(res.status).toBe(200);
      expect(res.body.table_number).toBe('7');
      expect(typeof res.body.token).toBe('string');
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id FROM tables WHERE number = $1 AND is_active = TRUE',
        ['7']
      );
    });

    it('should return 404 if the table does not exist', async () => {
      // Mock table not found
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/auth/table-token/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Table not found');
    });

    it('should return 500 on database error', async () => {
      // Mock db error
      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      const res = await request(app).get('/api/auth/table-token/7');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });
});
