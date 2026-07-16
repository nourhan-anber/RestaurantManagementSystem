import { describe, expect, it } from 'vitest';
import { createRestaurantSchema } from './restaurant';

const valid = {
  name: 'Bella Vista',
  ownerName: 'Sam Owner',
  ownerEmail: 'Sam@Bella.TEST',
  ownerPassword: 'supersecret',
};

describe('createRestaurantSchema', () => {
  it('accepts valid input and normalizes the email', () => {
    const parsed = createRestaurantSchema.parse(valid);
    expect(parsed.ownerEmail).toBe('sam@bella.test');
    expect(parsed.name).toBe('Bella Vista');
  });

  it('rejects a short restaurant name', () => {
    expect(createRestaurantSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });

  it('rejects an invalid owner email', () => {
    expect(createRestaurantSchema.safeParse({ ...valid, ownerEmail: 'nope' }).success).toBe(false);
  });

  it('rejects a short password', () => {
    expect(createRestaurantSchema.safeParse({ ...valid, ownerPassword: 'short' }).success).toBe(false);
  });
});
