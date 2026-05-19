import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Cart from '../components/client-side/Cart';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock api service ──────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  placeOrder: vi.fn(),
}));
import { placeOrder } from '../services/api';

// ── Mock Zustand cart store ───────────────────────────────────────────────────
const mockAdd       = vi.fn();
const mockDecrement = vi.fn();
const mockRemove    = vi.fn();
const mockClear     = vi.fn();

let mockState = {
  items: [],
  addItem:       mockAdd,
  decrementItem: mockDecrement,
  removeItem:    mockRemove,
  clearCart:     mockClear,
  totalPrice:    () => 0,
};

vi.mock('../store/cartStore', () => ({
  default: (selector) => selector(mockState),
}));

// ── Helper ────────────────────────────────────────────────────────────────────
const renderCart = (open = true, tableNumber = '7') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Cart isOpen={open} onClose={vi.fn()} tableNumber={tableNumber} />
    </QueryClientProvider>
  );
};

describe('Cart component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      items: [],
      addItem:       mockAdd,
      decrementItem: mockDecrement,
      removeItem:    mockRemove,
      clearCart:     mockClear,
      totalPrice:    () => 0,
    };
  });

  // ── visibility ───────────────────────────────────────────────────────────
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <Cart isOpen={false} onClose={() => {}} tableNumber="7" />
      </QueryClientProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the cart panel when isOpen is true', () => {
    renderCart();
    expect(screen.getByText('Your Order')).toBeInTheDocument();
  });

  // ── empty state ───────────────────────────────────────────────────────────
  it('shows empty cart message when no items', () => {
    renderCart();
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Browse Menu')).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const handleClose = vi.fn();
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Cart isOpen={true} onClose={handleClose} tableNumber="7" />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(handleClose).toHaveBeenCalled();
  });

  it('Browse Menu button calls onClose', () => {
    const handleClose = vi.fn();
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Cart isOpen={true} onClose={handleClose} tableNumber="7" />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByText('Browse Menu'));
    expect(handleClose).toHaveBeenCalled();
  });

  // ── with items ────────────────────────────────────────────────────────────
  it('renders cart items and total', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    mockState.totalPrice = () => 48;
    renderCart();
    expect(screen.getByText('Risotto')).toBeInTheDocument();
    expect(screen.getAllByText('$48.00').length).toBeGreaterThanOrEqual(1);
  });

  it('calls decrementItem on − click', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    renderCart();
    fireEvent.click(screen.getByText('−'));
    expect(mockDecrement).toHaveBeenCalledWith(1);
  });

  it('calls addItem on + click', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    renderCart();
    fireEvent.click(screen.getByText('+'));
    expect(mockAdd).toHaveBeenCalledWith({ id: 1, name: 'Risotto', price: 24 });
  });

  it('calls removeItem on × click', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    renderCart();
    fireEvent.click(screen.getByLabelText('Remove item'));
    expect(mockRemove).toHaveBeenCalledWith(1);
  });

  // ── Place Order — success ─────────────────────────────────────────────────
  it('shows success screen and clears cart on successful order', async () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 1 }];
    placeOrder.mockResolvedValue({ order: { id: 99 } });
    renderCart();

    fireEvent.click(screen.getByText('Place Order'));

    await waitFor(() => {
      expect(screen.getByText('Order placed!')).toBeInTheDocument();
      expect(mockClear).toHaveBeenCalled();
    });
  });

  it('shows "Back to Menu" button after order success', async () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 1 }];
    placeOrder.mockResolvedValue({ order: { id: 99 } });
    renderCart();
    fireEvent.click(screen.getByText('Place Order'));
    await waitFor(() => expect(screen.getByText('Back to Menu')).toBeInTheDocument());
  });

  // ── Place Order — error ───────────────────────────────────────────────────
  it('shows error message on failed order', async () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 1 }];
    placeOrder.mockRejectedValue(new Error('Table not found'));
    renderCart();

    fireEvent.click(screen.getByText('Place Order'));

    await waitFor(() => {
      expect(screen.getByText('Table not found')).toBeInTheDocument();
    });
  });
});
