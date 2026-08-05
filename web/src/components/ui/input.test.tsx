import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  it('defaults to type="text" and forwards props', () => {
    render(<Input placeholder="Email" defaultValue="hi" />);
    const input = screen.getByPlaceholderText('Email') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'text');
    expect(input.value).toBe('hi');
  });

  it('accepts an explicit type and merges classNames', () => {
    render(<Input type="password" className="custom-y" aria-label="pw" />);
    const input = screen.getByLabelText('pw');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveClass('custom-y');
  });

  it('accepts typed input', async () => {
    render(<Input aria-label="name" />);
    await userEvent.type(screen.getByLabelText('name'), 'Ada');
    expect((screen.getByLabelText('name') as HTMLInputElement).value).toBe('Ada');
  });
});
