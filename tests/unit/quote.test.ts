import { describe, it, expect } from 'vitest';
import { quoteBadge, type Quote } from '../../src/domain/quote';

describe('Domain Quote & Badge', () => {
  const baseQuote: Omit<Quote, 'freshness' | 'tradingDate'> = {
    symbol: '2330',
    name: '台積電',
    market: 'TWSE',
    source: 'twse-open-data',
    asOf: '2026-09-04T13:30:00+08:00',
    receivedAt: '2026-09-05T10:00:00+08:00',
    price: 1105,
    previousClose: 1085,
    open: 1090,
    high: 1110,
    low: 1090,
    volume: 35000,
    change: 20,
    changePercent: 1.84,
  };

  it('should render correct badge for realtime quote', () => {
    const quote: Quote = {
      ...baseQuote,
      freshness: 'realtime',
    };
    expect(quoteBadge(quote)).toBe('● 即時');
  });

  it('should render correct badge for eod quote with tradingDate', () => {
    const quote: Quote = {
      ...baseQuote,
      freshness: 'eod',
      tradingDate: '2026-09-04',
    };
    expect(quoteBadge(quote)).toBe('○ 2026-09-04 收盤');
  });

  it('should render correct badge for delayed and stale quotes', () => {
    const delayedQuote: Quote = { ...baseQuote, freshness: 'delayed' };
    expect(quoteBadge(delayedQuote)).toBe('◐ 延遲');

    const staleQuote: Quote = { ...baseQuote, freshness: 'stale' };
    expect(quoteBadge(staleQuote)).toBe('⚠ 資料較舊');
  });
});
