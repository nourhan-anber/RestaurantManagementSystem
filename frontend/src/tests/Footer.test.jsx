import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../components/client-side/Footer';
import { describe, it, expect } from 'vitest';

describe('Footer component', () => {
  it('renders quick links', () => {
    render(<Footer />);
    expect(screen.getByText('Quick Links')).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Reservations')).toBeInTheDocument();
  });

  it('renders contact information', () => {
    render(<Footer />);
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('123 Culinary Ave, Food City')).toBeInTheDocument();
    expect(screen.getByText('hello@bellavista.com')).toBeInTheDocument();
  });

  it('renders opening hours', () => {
    render(<Footer />);
    expect(screen.getByText('Opening Hours')).toBeInTheDocument();
    expect(screen.getByText('Mon - Fri')).toBeInTheDocument();
  });
});
