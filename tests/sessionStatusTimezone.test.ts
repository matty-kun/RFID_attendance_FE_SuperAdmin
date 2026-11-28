import { describe, it, expect } from 'vitest';
import { getManilaDateAndTime, getEventStatus, getSessionStatus, normalizeTime } from '../src/utils/status';

describe('Session and Event Status under Asia/Manila Timezone', () => {
  it('normalizes various time string formats to HH:mm:ss', () => {
    expect(normalizeTime('7:00')).toBe('07:00:00');
    expect(normalizeTime('08:30')).toBe('08:30:00');
    expect(normalizeTime('13:45:10')).toBe('13:45:10');
    expect(normalizeTime(null)).toBe('00:00:00');
  });

  it('converts any UTC instant into exact Manila date and time (UTC+8)', () => {
    // 2026-11-28 00:00:00 UTC is 2026-11-28 08:00:00 Asia/Manila
    const ref = new Date('2026-11-28T00:00:00Z');
    const { date, time } = getManilaDateAndTime(ref);
    expect(date).toBe('2026-11-28');
    expect(time).toBe('08:00:00');
  });

  it('handles cross-day boundary accurately in Manila timezone', () => {
    // 2026-11-28 16:30:00 UTC is 2026-11-29 00:30:00 Asia/Manila (+8 hours)
    const ref = new Date('2026-11-28T16:30:00Z');
    const { date, time } = getManilaDateAndTime(ref);
    expect(date).toBe('2026-11-29');
    expect(time).toBe('00:30:00');
  });

  it('determines event status relative to Manila calendar dates', () => {
    // Nov 28, 2026 09:00 Manila time
    const refManila = new Date('2026-11-28T01:00:00Z');

    expect(getEventStatus('2026-11-29', '2026-11-30', refManila)).toBe('upcoming');
    expect(getEventStatus('2026-11-25', '2026-11-28', refManila)).toBe('ongoing');
    expect(getEventStatus('2026-11-20', '2026-11-27', refManila)).toBe('completed');
  });

  it('determines session status as upcoming, open, or closed accurately', () => {
    // Nov 28, 2026 08:15:00 Manila time (UTC 00:15:00)
    const duringMorningIn = new Date('2026-11-28T00:15:00Z');
    expect(
      getSessionStatus('2026-11-28', '07:00:00', '12:00:00', duringMorningIn)
    ).toBe('open');

    // Nov 28, 2026 06:45:00 Manila time (UTC 22:45:00 Nov 27)
    const beforeMorning = new Date('2026-11-27T22:45:00Z');
    expect(
      getSessionStatus('2026-11-28', '07:00:00', '12:00:00', beforeMorning)
    ).toBe('upcoming');

    // Nov 28, 2026 12:05:00 Manila time (UTC 04:05:00)
    const afterMorningOut = new Date('2026-11-28T04:05:00Z');
    expect(
      getSessionStatus('2026-11-28', '07:00:00', '12:00:00', afterMorningOut)
    ).toBe('closed');
  });
});
