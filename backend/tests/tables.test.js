import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mocked client object — reused across tests
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import { pool } from '../db/pool.js';
import app from '../app.js';

const makeRows = (rows) => ({ rows, rowCount: rows.length });

// Make pool.connect always return our shared mockClient
beforeEach(() => {
  vi.clearAllMocks();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  pool.connect.mockResolvedValue(mockClient);
});

// ── GET /api/tables ──────────────────────────────────────────────────────────
describe('GET /api/tables', () => {
  it('returns all active tables', async () => {
    pool.query.mockResolvedValue(makeRows([
      { id: 1, number: 1, capacity: 4, status: 'open', is_active: true },
    ]));

    const res = await request(app).get('/api/tables');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('open');
  });

  it('returns 500 when the database query fails', async () => {
    pool.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/tables');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ── GET /api/tables/:number ──────────────────────────────────────────────────
describe('GET /api/tables/:number', () => {
  it('returns a single table by number', async () => {
    pool.query.mockResolvedValue(makeRows([
      { id: 1, number: 12, capacity: 4, status: 'open', is_active: true },
    ]));

    const res = await request(app).get('/api/tables/12');

    expect(res.status).toBe(200);
    expect(res.body.number).toBe(12);
  });

  it('returns 404 when table is not found', async () => {
    pool.query.mockResolvedValue(makeRows([]));
    const res = await request(app).get('/api/tables/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Table not found');
  });

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/tables/1');
    expect(res.status).toBe(500);
  });
});

// ── PATCH /api/tables/:number/close-bill ─────────────────────────────────────
describe('PATCH /api/tables/:number/close-bill', () => {
  it('closes the bill and returns settled order ids', async () => {
    mockClient.query
      .mockResolvedValueOnce(makeRows([{ id: 5 }]))          // SELECT table id
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce(makeRows([{ id: 101 }, { id: 102 }])) // UPDATE orders
      .mockResolvedValueOnce({});                             // COMMIT

    const res = await request(app).patch('/api/tables/7/close-bill');

    expect(res.status).toBe(200);
    expect(res.body.settled_order_ids).toEqual([101, 102]);
    expect(res.body.message).toContain('table 7');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('returns 404 when table does not exist', async () => {
    mockClient.query.mockResolvedValueOnce(makeRows([])); // SELECT returns no table

    const res = await request(app).patch('/api/tables/999/close-bill');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Table not found');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back and returns 500 on database error', async () => {
    mockClient.query
      .mockResolvedValueOnce(makeRows([{ id: 5 }])) // SELECT table id
      .mockResolvedValueOnce({})                     // BEGIN
      .mockRejectedValueOnce(new Error('DB failure'))// UPDATE throws
      .mockResolvedValueOnce({});                    // ROLLBACK

    const res = await request(app).patch('/api/tables/7/close-bill');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(mockClient.release).toHaveBeenCalled();
  });
});

// ── POST /api/tables ─────────────────────────────────────────────────────────
describe('POST /api/tables', () => {
  it('creates a new table', async () => {
    pool.query.mockResolvedValueOnce(makeRows([{ id: 10, number: 10, capacity: 4, is_active: true }]));
    const res = await request(app).post('/api/tables').send({ number: 10, capacity: 4 });
    expect(res.status).toBe(201);
    expect(res.body.number).toBe(10);
  });

  it('returns 400 if missing number or capacity', async () => {
    const res = await request(app).post('/api/tables').send({ number: 10 });
    expect(res.status).toBe(400);
  });

  it('returns 409 if table number exists', async () => {
    pool.query.mockRejectedValueOnce({ code: '23505' });
    const res = await request(app).post('/api/tables').send({ number: 10, capacity: 4 });
    expect(res.status).toBe(409);
  });
});

// ── PUT /api/tables/:id ──────────────────────────────────────────────────────
describe('PUT /api/tables/:id', () => {
  it('updates an existing table', async () => {
    pool.query.mockResolvedValueOnce(makeRows([{ id: 10, number: 10, capacity: 6, is_active: true }]));
    const res = await request(app).put('/api/tables/10').send({ number: 10, capacity: 6 });
    expect(res.status).toBe(200);
    expect(res.body.capacity).toBe(6);
  });

  it('returns 404 if table not found', async () => {
    pool.query.mockResolvedValueOnce(makeRows([]));
    const res = await request(app).put('/api/tables/999').send({ number: 10, capacity: 6 });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/tables/:id ───────────────────────────────────────────────────
describe('DELETE /api/tables/:id', () => {
  it('deactivates an existing table', async () => {
    pool.query.mockResolvedValueOnce(makeRows([{ id: 10, is_active: false }]));
    const res = await request(app).delete('/api/tables/10');
    expect(res.status).toBe(200);
    expect(res.body.table.is_active).toBe(false);
  });

  it('returns 404 if table not found', async () => {
    pool.query.mockResolvedValueOnce(makeRows([]));
    const res = await request(app).delete('/api/tables/999');
    expect(res.status).toBe(404);
  });
});

// ── GET /api/health ──────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
