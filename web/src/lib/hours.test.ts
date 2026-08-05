import { describe, expect, it } from 'vitest';
import { hhmmToMinutes, isOpenNow, localDayAndMinute, minutesToHhmm, type DayHours } from './hours';

describe('hhmm <-> minutes', () => {
  it('parses HH:MM to minutes', () => {
    expect(hhmmToMinutes('13:30')).toBe(810);
    expect(hhmmToMinutes('00:00')).toBe(0);
    expect(hhmmToMinutes('bad')).toBe(0);
  });
  it('formats minutes to HH:MM', () => {
    expect(minutesToHhmm(810)).toBe('13:30');
    expect(minutesToHhmm(0)).toBe('00:00');
  });
});

// 2026-07-16 is a Thursday (weekday 4).
const THU_2PM_UTC = new Date('2026-07-16T14:00:00Z'); // Thu 14:00 UTC → minute 840
const THU_10AM_UTC = new Date('2026-07-16T10:00:00Z'); // Thu 10:00 → minute 600
const THU_2305_UTC = new Date('2026-07-16T23:05:00Z'); // Thu 23:05 → minute 1385
const FRI_0030_UTC = new Date('2026-07-17T00:30:00Z'); // Fri 00:30 → minute 30

const thuOpen = (o: number, c: number, isClosed = false): DayHours => ({
  dayOfWeek: 4,
  opensMinutes: o,
  closesMinutes: c,
  isClosed,
});

describe('localDayAndMinute', () => {
  it('reads the local weekday + minute (UTC)', () => {
    expect(localDayAndMinute(THU_2PM_UTC, 'UTC')).toEqual({ day: 4, minute: 840 });
  });

  it('converts to the restaurant timezone', () => {
    // Thu 14:00 UTC is Thu 10:00 in New York (EDT, -4)
    expect(localDayAndMinute(THU_2PM_UTC, 'America/New_York')).toEqual({ day: 4, minute: 600 });
  });
});

describe('isOpenNow — normal window (Thu 11:00–22:00 = 660–1320)', () => {
  const hours = [thuOpen(660, 1320)];
  it('open inside the window', () => {
    expect(isOpenNow(hours, THU_2PM_UTC, 'UTC')).toBe(true);
  });
  it('closed before opening', () => {
    expect(isOpenNow(hours, THU_10AM_UTC, 'UTC')).toBe(false);
  });
  it('closed exactly at close (exclusive)', () => {
    expect(isOpenNow([thuOpen(660, 840)], THU_2PM_UTC, 'UTC')).toBe(false); // closes 14:00
  });
  it('open exactly at open (inclusive)', () => {
    expect(isOpenNow([thuOpen(840, 1320)], THU_2PM_UTC, 'UTC')).toBe(true);
  });
});

describe('isOpenNow — closed day', () => {
  it('is closed when the day is marked closed', () => {
    expect(isOpenNow([thuOpen(0, 1440, true)], THU_2PM_UTC, 'UTC')).toBe(false);
  });
  it('is closed with no row for the day', () => {
    expect(isOpenNow([], THU_2PM_UTC, 'UTC')).toBe(false);
  });
});

describe('isOpenNow — overnight (Thu 18:00–02:00 = 1080–120)', () => {
  const thuOvernight: DayHours = { dayOfWeek: 4, opensMinutes: 1080, closesMinutes: 120, isClosed: false };
  it('open late Thursday evening', () => {
    expect(isOpenNow([thuOvernight], THU_2305_UTC, 'UTC')).toBe(true);
  });
  it('open early Friday morning (spillover from Thursday)', () => {
    expect(isOpenNow([thuOvernight], FRI_0030_UTC, 'UTC')).toBe(true);
  });
  it('closed after the spillover ends', () => {
    // Fri 02:30 UTC → minute 150 > 120
    expect(isOpenNow([thuOvernight], new Date('2026-07-17T02:30:00Z'), 'UTC')).toBe(false);
  });
  it('closed in the afternoon gap before the overnight window opens', () => {
    // Thu 14:00 → minute 840 < opens 1080 (and yesterday has no row) → closed
    expect(isOpenNow([thuOvernight], THU_2PM_UTC, 'UTC')).toBe(false);
  });
  it('ignores yesterday overnight spillover once its close has passed', () => {
    // Wed 18:00–02:00; Thu 14:00 is well past the 02:00 spill → closed
    const wedOvernight: DayHours = { dayOfWeek: 3, opensMinutes: 1080, closesMinutes: 120, isClosed: false };
    expect(isOpenNow([wedOvernight], THU_2PM_UTC, 'UTC')).toBe(false);
  });
});
