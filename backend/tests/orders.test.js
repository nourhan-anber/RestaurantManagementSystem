import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { pool } from '../db/pool.js';
import { generateTableToken } from '../utils/security.js';

// Mock the db pool
vi.mock('../db/pool.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

describe('Orders Routes', () => {
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('GET /api/orders/kitchen', () => {
    it('should return kitchen orders', async () => {
      const mockOrders = [
        { id: 1, status: 'pending', items: [] }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockOrders });

      const res = await request(app).get('/api/orders/kitchen');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockOrders);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app).get('/api/orders/kitchen?status=invalid');
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status', async () => {
      const updatedOrder = { id: 1, status: 'preparing' };
      pool.query.mockResolvedValueOnce({ rows: [updatedOrder] });

      const res = await request(app)
        .patch('/api/orders/1/status')
        .send({ status: 'preparing' });

      expect(res.status).toBe(200);
      expect(res.body.order).toEqual(updatedOrder);
    });

    it('should return 400 for missing or invalid status', async () => {
      const res = await request(app).patch('/api/orders/1/status').send({});
      expect(res.status).toBe(400);
    });

    it('should return 404 if order not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/api/orders/999/status')
        .send({ status: 'preparing' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/orders', () => {
    const validPayload = {
      table_number: 7,
      items: [{ menu_item_id: 1, quantity: 1 }],
      notes: 'Test',
    };

    it('should return 401 if token is missing', async () => {
      const res = await request(app).post('/api/orders').send(validPayload);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing authorization token');
    });

    it('should return 403 if token is invalid for the table', async () => {
      const invalidToken = generateTableToken(8); // token for wrong table
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(validPayload);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Invalid or missing token for this table');
    });

    it('should place order if token is valid', async () => {
      const validToken = generateTableToken(7);
      mockClient.query.mockImplementation((queryStr) => {
        if (queryStr.includes('FROM tables')) {
          return Promise.resolve({ rows: [{ id: 10, status: 'open' }] });
        }
        if (queryStr.includes('FROM menu_items')) {
          return Promise.resolve({ rows: [{ id: 1, price: 10.00 }] });
        }
        if (queryStr.includes('INSERT INTO orders')) {
          return Promise.resolve({ rows: [{ id: 100 }] });
        }
        return Promise.resolve({ rows: [] }); // For BEGIN, COMMIT, INSERT INTO order_items
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);
      console.log('RESPONSE:', res.body);
      expect(res.status).toBe(201);
      expect(res.body.order.id).toBe(100);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
