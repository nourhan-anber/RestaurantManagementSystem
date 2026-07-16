import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label', () => {
  it('renders text and associates via htmlFor', () => {
    render(<Label htmlFor="email">Email</Label>);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email');
  });

  it('merges custom classNames', () => {
    render(<Label className="custom-z">Name</Label>);
    expect(screen.getByText('Name')).toHaveClass('custom-z');
  });
});
