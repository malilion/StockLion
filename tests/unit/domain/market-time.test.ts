import { describe, it, expect } from 'vitest';
import { getTaiwanDate, isTaiwanMarketHours } from '../../../src/domain/market-time';

describe('Market Time Utility (isTaiwanMarketHours)', () => {
  it('should accurately convert UTC time to Asia/Taipei (UTC+8)', () => {
    // 2026-09-04 01:30:00 UTC = 2026-09-04 09:30:00 Taipei (Friday)
    const d = new Date('2026-09-04T01:30:00Z');
    const tw = getTaiwanDate(d);

    expect(tw.year).toBe(2026);
    expect(tw.month).toBe(9);
    expect(tw.day).toBe(4);
    expect(tw.dayOfWeek).toBe(5); // Friday
    expect(tw.hours).toBe(9);
    expect(tw.minutes).toBe(30);
    expect(tw.dateString).toBe('2026-09-04');
  });

  it('should return true during Taiwan market hours on weekdays', () => {
    // 2026-09-02 (Wednesday) 10:00 Taipei = 02:00 UTC
    const wedMidday = new Date('2026-09-02T02:00:00Z');
    expect(isTaiwanMarketHours(wedMidday)).toBe(true);

    // 08:55 Taipei (buffer start) = 00:55 UTC
    const wedBufferStart = new Date('2026-09-02T00:55:00Z');
    expect(isTaiwanMarketHours(wedBufferStart)).toBe(true);

    // 13:30 Taipei (market close) = 05:30 UTC
    const wedMarketClose = new Date('2026-09-02T05:30:00Z');
    expect(isTaiwanMarketHours(wedMarketClose)).toBe(true);

    // 13:35 Taipei (buffer end) = 05:35 UTC
    const wedBufferEnd = new Date('2026-09-02T05:35:00Z');
    expect(isTaiwanMarketHours(wedBufferEnd)).toBe(true);
  });

  it('should return false outside Taiwan market hours on weekdays', () => {
    // 08:50 Taipei = 00:50 UTC (before buffer)
    const early = new Date('2026-09-02T00:50:00Z');
    expect(isTaiwanMarketHours(early)).toBe(false);

    // 13:40 Taipei = 05:40 UTC (after buffer)
    const afternoon = new Date('2026-09-02T05:40:00Z');
    expect(isTaiwanMarketHours(afternoon)).toBe(false);

    // 21:00 Taipei = 13:00 UTC (night)
    const night = new Date('2026-09-02T13:00:00Z');
    expect(isTaiwanMarketHours(night)).toBe(false);
  });

  it('should return false on weekends regardless of hour', () => {
    // 2026-09-05 is Saturday
    const sat10am = new Date('2026-09-05T02:00:00Z');
    expect(isTaiwanMarketHours(sat10am)).toBe(false);

    // 2026-09-06 is Sunday
    const sun10am = new Date('2026-09-06T02:00:00Z');
    expect(isTaiwanMarketHours(sun10am)).toBe(false);
  });
});
