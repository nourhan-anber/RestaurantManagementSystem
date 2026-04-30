import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '../components/client-side/Home';
import { describe, it, expect } from 'vitest';

describe('Home component', () => {
  it('renders the welcome message', () => {
    render(<Home />);
    expect(screen.getByText('Welcome to Bella Vista')).toBeInTheDocument();
  });

  it('renders instructions to scan the QR code', () => {
    render(<Home />);
    expect(screen.getByText(/Please scan the QR code located on your table/i)).toBeInTheDocument();
  });
});
