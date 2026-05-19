import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMenuItems, placeOrder, fetchKitchenOrders, updateOrderStatus } from '../services/api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api service – fetchMenuItems', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls the correct URL with no category param when category is "all"', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchMenuItems('all');
    expect(mockFetch.mock.calls[0][0].toString()).not.toContain('category');
  });

  it('calls the correct URL with no category param when called with default', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchMenuItems();
    expect(mockFetch.mock.calls[0][0].toString()).not.toContain('category');
  });

  it('appends a category query param when category is not "all"', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchMenuItems('main-course');
    expect(mockFetch.mock.calls[0][0].toString()).toContain('category=main-course');
  });

  it('returns parsed JSON on a successful response', async () => {
    const data = [{ id: 1, name: 'Risotto' }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => data });
    expect(await fetchMenuItems('main-course')).toEqual(data);
  });

  it('throws an error when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(fetchMenuItems('main-course')).rejects.toThrow('Failed to fetch menu items');
  });
});

describe('api service – placeOrder', () => {
  const items = [{ id: 1, quantity: 2 }, { id: 3, quantity: 1 }];

  beforeEach(() => mockFetch.mockReset());

  it('sends a POST request with the correct payload', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ order: { id: 1 } }) });
    await placeOrder({ tableNumber: '7', items });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/orders');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.table_number).toBe(7);
    expect(body.items).toEqual([
      { menu_item_id: 1, quantity: 2 },
      { menu_item_id: 3, quantity: 1 },
    ]);
  });

  it('returns the parsed response on success', async () => {
    const data = { order: { id: 42 } };
    mockFetch.mockResolvedValue({ ok: true, json: async () => data });
    expect(await placeOrder({ tableNumber: '7', items })).toEqual(data);
  });

  it('throws the server error message when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Table not found' }),
    });
    await expect(placeOrder({ tableNumber: '7', items })).rejects.toThrow('Table not found');
  });

  it('throws a fallback error when response body cannot be parsed', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('parse error'); },
    });
    await expect(placeOrder({ tableNumber: '7', items })).rejects.toThrow('Failed to place order');
  });

  it('includes the token in the Authorization header if provided', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ order: { id: 1 } }) });
    await placeOrder({ tableNumber: '7', items, token: 'secure123' });

    const [url, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer secure123');
  });
});

describe('api service – fetchKitchenOrders', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches all active orders if no status is provided', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchKitchenOrders();
    const [url] = mockFetch.mock.calls[0];
    expect(url.toString()).not.toContain('status=');
  });

  it('fetches orders with a specific status', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchKitchenOrders('preparing');
    const [url] = mockFetch.mock.calls[0];
    expect(url.toString()).toContain('status=preparing');
  });

  it('throws an error on failure', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(fetchKitchenOrders()).rejects.toThrow('Failed to fetch kitchen orders');
  });
});

describe('api service – updateOrderStatus', () => {
  beforeEach(() => mockFetch.mockReset());

  it('sends a PATCH request with the new status', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ order: { id: 1 } }) });
    await updateOrderStatus(1, 'ready');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/orders/1/status');
    expect(options.method).toBe('PATCH');
    const body = JSON.parse(options.body);
    expect(body.status).toBe('ready');
  });

  it('throws the server error message when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Order not found' }),
    });
    await expect(updateOrderStatus(999, 'ready')).rejects.toThrow('Order not found');
  });
});

