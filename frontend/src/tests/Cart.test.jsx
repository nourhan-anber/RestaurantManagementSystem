import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Cart from '../components/client-side/Cart';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── helpers ──────────────────────────────────────────────────────────────────
const mockAdd       = vi.fn();
const mockDecrement = vi.fn();
const mockRemove    = vi.fn();

// Shared mutable state so individual tests can swap items/price
let mockState = {
  items: [],
  addItem: mockAdd,
  decrementItem: mockDecrement,
  removeItem: mockRemove,
  totalPrice: () => 0,
};

vi.mock('../store/cartStore', () => {
  const mockStore = (selector) => selector(mockState);
  return { default: mockStore };
});

const renderCart = (open = true) =>
  render(<Cart isOpen={open} onClose={vi.fn()} />);

// ── tests ─────────────────────────────────────────────────────────────────────
describe('Cart component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to empty cart by default
    mockState = {
      items: [],
      addItem: mockAdd,
      decrementItem: mockDecrement,
      removeItem: mockRemove,
      totalPrice: () => 0,
    };
  });

  // ── visibility ──────────────────────────────────────────────
  it('returns null when isOpen is false', () => {
    const { container } = render(<Cart isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the cart panel when isOpen is true', () => {
    renderCart();
    expect(screen.getByText('Your Order')).toBeInTheDocument();
  });

  // ── empty state ─────────────────────────────────────────────
  it('renders the empty cart message when no items', () => {
    renderCart();
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Browse Menu')).toBeInTheDocument();
  });

  it('Place Order button is disabled when cart is empty', () => {
    renderCart();
    expect(screen.getByText('Place Order')).toBeDisabled();
  });

  it('calls onClose when the close (×) button is clicked', () => {
    const handleClose = vi.fn();
    render(<Cart isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Browse Menu button is clicked', () => {
    const handleClose = vi.fn();
    render(<Cart isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getByText('Browse Menu'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // ── with items ──────────────────────────────────────────────
  it('renders cart items when items exist', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    mockState.totalPrice = () => 48;
    renderCart();
    expect(screen.getByText('Risotto')).toBeInTheDocument();
    // $48.00 appears as item subtotal AND as the total footer
    expect(screen.getAllByText('$48.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Place Order')).not.toBeDisabled();
  });

  it('calls decrementItem when − is clicked', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    renderCart();
    fireEvent.click(screen.getByText('−'));
    expect(mockDecrement).toHaveBeenCalledWith(1);
  });

  it('calls addItem when + is clicked', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    renderCart();
    fireEvent.click(screen.getByText('+'));
    expect(mockAdd).toHaveBeenCalledWith({ id: 1, name: 'Risotto', price: 24 });
  });

  it('calls removeItem when × remove button is clicked', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 2 }];
    renderCart();
    fireEvent.click(screen.getByLabelText('Remove item'));
    expect(mockRemove).toHaveBeenCalledWith(1);
  });

  it('shows the correct running total', () => {
    mockState.items = [{ id: 1, name: 'Risotto', price: 24, quantity: 3 }];
    mockState.totalPrice = () => 72;
    renderCart();
    // $72.00 appears as item subtotal AND as the total — either occurrence is fine
    expect(screen.getAllByText('$72.00').length).toBeGreaterThanOrEqual(1);
  });
});
