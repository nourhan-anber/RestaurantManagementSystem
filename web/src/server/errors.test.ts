import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError, UnauthorizedError } from './errors';

describe('domain errors', () => {
  it.each([
    [UnauthorizedError, 'UnauthorizedError', 'Unauthorized'],
    [ForbiddenError, 'ForbiddenError', 'Forbidden'],
    [NotFoundError, 'NotFoundError', 'Not found'],
  ] as const)('%s carries a name and default message', (Ctor, name, message) => {
    const err = new Ctor();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe(name);
    expect(err.message).toBe(message);
  });

  it('accepts a custom message', () => {
    expect(new ForbiddenError('nope').message).toBe('nope');
  });
});
