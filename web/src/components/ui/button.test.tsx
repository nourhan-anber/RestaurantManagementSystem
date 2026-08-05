import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders its children and defaults to type="button"', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Nope
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Nope' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(['primary', 'secondary', 'ghost'] as const)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>V</Button>);
    expect(screen.getByRole('button', { name: 'V' })).toBeInTheDocument();
  });

  it('applies size and merges custom classNames', () => {
    render(
      <Button size="lg" className="custom-x">
        Big
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Big' });
    expect(btn).toHaveClass('custom-x');
    expect(btn.className).toContain('h-12');
  });

  it('respects an explicit type', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });
});
