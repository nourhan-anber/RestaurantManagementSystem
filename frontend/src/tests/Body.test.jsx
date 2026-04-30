import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Body from '../components/client-side/Body';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must be declared with var (hoistable) so vi.mock factory can reference them
var mockAddItem = vi.fn();
var mockDecrementItem = vi.fn();
var mockCartItems = [];

vi.mock('../services/api', () => ({
  fetchMenuItems: vi.fn(),
}));

vi.mock('../store/cartStore', () => {
  const mockStore = (selector) =>
    selector({ items: mockCartItems, addItem: mockAddItem, decrementItem: mockDecrementItem });
  mockStore.getState = () => ({ decrementItem: mockDecrementItem, addItem: mockAddItem });
  return { default: mockStore };
});

import { fetchMenuItems } from '../services/api';

const mockItems = [
  { id: 1, name: 'Truffle Mushroom Risotto', description: 'Creamy risotto.', price: '$24.00', category: 'main-course' },
  { id: 2, name: 'Wagyu Beef Burger', description: 'Premium burger.', price: '$28.00', category: 'main-course' },
];

const renderBody = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Body />
    </QueryClientProvider>
  );
};

describe('Body component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCartItems = [];
  });

  // ── tabs ──────────────────────────────────────────────────
  it('renders category tabs', async () => {
    fetchMenuItems.mockResolvedValue(mockItems);
    renderBody();
    expect(screen.getByText('Main Course')).toBeInTheDocument();
    expect(screen.getByText('Appetizers')).toBeInTheDocument();
    expect(screen.getByText('Desserts')).toBeInTheDocument();
    expect(screen.getByText('Drinks')).toBeInTheDocument();
  });

  // ── success state ─────────────────────────────────────────
  it('renders menu items from the API', async () => {
    fetchMenuItems.mockResolvedValue(mockItems);
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('Truffle Mushroom Risotto')).toBeInTheDocument();
      expect(screen.getByText('Wagyu Beef Burger')).toBeInTheDocument();
    });
  });

  it('renders "+ Add" buttons for each item not in cart', async () => {
    fetchMenuItems.mockResolvedValue(mockItems);
    renderBody();
    await waitFor(() => {
      expect(screen.getAllByText('+ Add')).toHaveLength(2);
    });
  });

  // ── quantity controls (item already in cart) ──────────────
  it('renders quantity controls when an item is in the cart', async () => {
    mockCartItems = [{ id: 1, quantity: 2 }]; // item 1 already in cart
    fetchMenuItems.mockResolvedValue(mockItems);
    renderBody();
    await waitFor(() => {
      // Should show quantity "2" for item 1, and "+ Add" for item 2 only
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getAllByText('+ Add')).toHaveLength(1);
    });
  });

  it('calls decrementItem when − is clicked on an in-cart item', async () => {
    mockCartItems = [{ id: 1, quantity: 2 }];
    fetchMenuItems.mockResolvedValue(mockItems);
    renderBody();
    await waitFor(() => screen.getByText('2'));
    fireEvent.click(screen.getByText('−'));
    expect(mockDecrementItem).toHaveBeenCalledWith(1);
  });

  it('calls addItem when + is clicked on an in-cart item', async () => {
    mockCartItems = [{ id: 1, quantity: 2 }];
    fetchMenuItems.mockResolvedValue(mockItems);
    renderBody();
    await waitFor(() => screen.getByText('2'));
    fireEvent.click(screen.getByText('+'));
    expect(mockAddItem).toHaveBeenCalledWith({ id: 1, name: 'Truffle Mushroom Risotto', price: 24 });
  });

  // ── error state ───────────────────────────────────────────
  it('shows error message when the API call fails', async () => {
    fetchMenuItems.mockRejectedValue(new Error('Network Error'));
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('Could not load menu items. Please try again later.')).toBeInTheDocument();
    });
  });

  // ── empty state ───────────────────────────────────────────
  it('shows empty state when no items are returned', async () => {
    fetchMenuItems.mockResolvedValue([]);
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('No items in this category.')).toBeInTheDocument();
    });
  });

  // ── category switching ────────────────────────────────────
  it('switches category and refetches on tab click', async () => {
    fetchMenuItems.mockResolvedValue(mockItems);
    renderBody();
    await waitFor(() => screen.getByText('Truffle Mushroom Risotto'));

    fetchMenuItems.mockResolvedValue([]);
    fireEvent.click(screen.getByText('Appetizers'));

    await waitFor(() => {
      expect(fetchMenuItems).toHaveBeenCalledWith('appetizers');
      expect(screen.getByText('No items in this category.')).toBeInTheDocument();
    });
  });
});
