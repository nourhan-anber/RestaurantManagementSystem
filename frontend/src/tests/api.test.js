import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMenuItems } from '../services/api';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api service – fetchMenuItems', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('calls the correct URL with no category param when category is "all"', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchMenuItems('all');
    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).not.toContain('category');
  });

  it('calls the correct URL with no category param when called with default', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchMenuItems();
    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).not.toContain('category');
  });

  it('appends a category query param when category is not "all"', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchMenuItems('main-course');
    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).toContain('category=main-course');
  });

  it('returns parsed JSON on a successful response', async () => {
    const data = [{ id: 1, name: 'Risotto' }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => data });
    const result = await fetchMenuItems('main-course');
    expect(result).toEqual(data);
  });

  it('throws an error when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(fetchMenuItems('main-course')).rejects.toThrow('Failed to fetch menu items');
  });
});
