import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../components/client-side/Header';
import { describe, it, expect, vi } from 'vitest';

let mockTotalItems = 0;

vi.mock('../store/cartStore', () => {
  const mockStore = (selector) => selector({ totalItems: () => mockTotalItems });
  return { default: mockStore };
});

describe('Header component', () => {
  it('renders the restaurant name', () => {
    render(<Header />);
    expect(screen.getByText('Bella Vista')).toBeInTheDocument();
  });

  it('renders the correct table number', () => {
    render(<Header tableNumber="5" />);
    expect(screen.getByText('Table 5')).toBeInTheDocument();
  });

  it('calls onCartClick when the cart button is clicked', () => {
    const handleCartClick = vi.fn();
    render(<Header onCartClick={handleCartClick} />);
    fireEvent.click(screen.getByRole('button', { name: /view cart/i }));
    expect(handleCartClick).toHaveBeenCalledTimes(1);
  });

  it('does not show badge when cart is empty', () => {
    mockTotalItems = 0;
    render(<Header />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows badge with count when cart has items', () => {
    mockTotalItems = 3;
    render(<Header />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
