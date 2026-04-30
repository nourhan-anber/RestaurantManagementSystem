import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the api module so Body doesn't make real HTTP calls
vi.mock('../services/api', () => ({
  fetchMenuItems: vi.fn().mockResolvedValue([
    { id: 1, name: 'Truffle Mushroom Risotto', description: 'Creamy risotto.', price: '$24.00' },
  ]),
}));

// Helper to wrap App in a fresh QueryClientProvider each time
const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

describe('App component', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders Home component when no table parameter is present', () => {
    renderApp();
    expect(screen.getByText('Welcome to Bella Vista')).toBeInTheDocument();
    expect(screen.queryByText('Opening Hours')).not.toBeInTheDocument();
  });

  it('renders Menu layout when table parameter is present', async () => {
    window.history.pushState({}, '', '/?table=7');
    renderApp();

    expect(screen.getByText('Table 7')).toBeInTheDocument();
    expect(screen.getByText('Opening Hours')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Truffle Mushroom Risotto')).toBeInTheDocument();
    });
  });

  it('toggles cart state when cart button is clicked', async () => {
    window.history.pushState({}, '', '/?table=7');
    renderApp();

    // Cart should not be visible initially
    expect(screen.queryByText('Your Order')).not.toBeInTheDocument();

    // Click cart icon in Header
    const cartButton = screen.getByRole('button', { name: /view cart/i });
    fireEvent.click(cartButton);

    // Cart should be visible
    expect(screen.getByText('Your Order')).toBeInTheDocument();

    // Click Browse Menu to close the cart
    fireEvent.click(screen.getByText('Browse Menu'));

    // Cart should be hidden again
    expect(screen.queryByText('Your Order')).not.toBeInTheDocument();
  });
});
