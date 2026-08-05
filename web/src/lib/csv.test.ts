import { describe, expect, it } from 'vitest';
import { isoDate, money, toCsv } from './csv';

describe('toCsv', () => {
  it('joins headers and rows with CRLF and a trailing newline', () => {
    expect(toCsv(['a', 'b'], [[1, 2], [3, 4]])).toBe('a,b\r\n1,2\r\n3,4\r\n');
  });

  it('quotes/escapes cells with commas, quotes, or newlines; blanks nulls', () => {
    const out = toCsv(['name', 'note'], [
      ['Smith, Bob', 'said "hi"'],
      ['line\nbreak', null],
    ]);
    expect(out).toBe('name,note\r\n"Smith, Bob","said ""hi"""\r\n"line\nbreak",\r\n');
  });
});

describe('money / isoDate', () => {
  it('formats money to two decimals without a symbol', () => {
    expect(money(24)).toBe('24.00');
    expect(money(3.1)).toBe('3.10');
    expect(money(Number.NaN)).toBe('0.00');
  });

  it('formats a date as ISO', () => {
    expect(isoDate(new Date('2026-07-17T15:00:00.000Z'))).toBe('2026-07-17T15:00:00.000Z');
  });
});
