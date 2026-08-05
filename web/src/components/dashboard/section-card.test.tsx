import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionCard } from './section-card';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SectionCard', () => {
  it('renders label and description', () => {
    render(<SectionCard label="Menu" description="Dishes and prices." />);
    expect(screen.getByRole('heading', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByText('Dishes and prices.')).toBeInTheDocument();
  });

  it('links when an href is given and it is not coming soon', () => {
    render(<SectionCard label="Menu" description="d" href="/r/x/menu" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/r/x/menu');
  });

  it('shows a "soon" badge and does not link when coming soon', () => {
    render(<SectionCard label="Reports" description="d" href="/r/x/reports" comingSoon />);
    expect(screen.getByText('soon')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not link when no href is provided', () => {
    render(<SectionCard label="Menu" description="d" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
