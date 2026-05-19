import { describe, it, expect } from 'vitest';
import { generateTableToken, verifyTableToken } from '../utils/security.js';

describe('Security Utils', () => {
  describe('generateTableToken', () => {
    it('should generate a token for a given table number', () => {
      const token = generateTableToken(7);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should throw an error if no table number is provided', () => {
      expect(() => generateTableToken()).toThrow('Table number is required to generate token');
      expect(() => generateTableToken(null)).toThrow('Table number is required to generate token');
    });

    it('should generate deterministic tokens for the same table number', () => {
      const token1 = generateTableToken(5);
      const token2 = generateTableToken(5);
      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different table numbers', () => {
      const token1 = generateTableToken(5);
      const token2 = generateTableToken(6);
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyTableToken', () => {
    it('should return true for a valid token and table number', () => {
      const token = generateTableToken(8);
      expect(verifyTableToken(8, token)).toBe(true);
    });

    it('should return false for an invalid token', () => {
      expect(verifyTableToken(8, 'invalid-token')).toBe(false);
    });

    it('should return false for a mismatched table number', () => {
      const tokenForTable8 = generateTableToken(8);
      expect(verifyTableToken(9, tokenForTable8)).toBe(false);
    });

    it('should return false if token or table number is missing', () => {
      expect(verifyTableToken(null, 'token')).toBe(false);
      expect(verifyTableToken(5, null)).toBe(false);
    });

    it('should return false if token is not valid hex', () => {
      expect(verifyTableToken(5, 'zzz')).toBe(false);
    });
  });
});
