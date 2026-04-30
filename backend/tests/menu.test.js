import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// vi.mock is hoisted — define fns inside factory, expose via module-level vars after
vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

// Import pool AFTER mock so we get the mocked version
import { pool } from '../db/pool.js';
import app from '../app.js';

const makeRows = (rows) => ({ rows, rowCount: rows.length });

describe('GET /api/menu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all items when no category is provided', async () => {
    pool.query.mockResolvedValue(makeRows([
      { id: 1, category: 'main-course', name: 'Risotto', price: '24.00' },
    ]));

    const res = await request(app).get('/api/menu');

    expect(res.status).toBe(200);
    expect(res.body[0].price).toBe('$24.00');
    expect(pool.query.mock.calls[0][0]).toContain('ORDER BY category');
  });

  it('returns all items when category=all', async () => {
    pool.query.mockResolvedValue(makeRows([]));
    const res = await request(app).get('/api/menu?category=all');
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain('ORDER BY category');
  });

  it('filters by category when a specific category is provided', async () => {
    pool.query.mockResolvedValue(makeRows([
      { id: 2, category: 'appetizers', name: 'Fries', price: '9.00' },
    ]));

    const res = await request(app).get('/api/menu?category=appetizers');

    expect(res.status).toBe(200);
    expect(res.body[0].price).toBe('$9.00');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE category = $1');
    expect(params).toEqual(['appetizers']);
  });

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValue(new Error('DB failure'));
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
