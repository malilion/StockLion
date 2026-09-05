import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultProviderRegistry } from '../../../src/providers/registry';
import { openDataProvider } from '../../../src/providers/open-data/provider';
import { FugleProvider } from '../../../src/providers/fugle/provider';
import { quoteBadge, type Quote } from '../../../src/domain/quote';

describe('Realtime Key Gate & Resolution Contract', () => {
  let registry: DefaultProviderRegistry;
  let fugle: FugleProvider;

  beforeEach(() => {
    registry = new DefaultProviderRegistry();
    fugle = new FugleProvider();
    registry.register(openDataProvider);
    registry.register(fugle);
  });

  it('CRITICAL: must return null for quote:realtime when key is missing or unverified', () => {
    // 預設無任何 valid key
    expect(registry.resolve('quote:realtime')).toBeNull();
  });

  it('CRITICAL: must return null for quote:realtime when key is marked invalid or rate-limited', () => {
    registry.setCredentialValid('fugle', false);
    expect(registry.resolve('quote:realtime')).toBeNull();
  });

  it('CRITICAL: must resolve FugleProvider ONLY when key is explicitly verified as valid', () => {
    registry.setCredentialValid('fugle', true);
    const resolved = registry.resolve('quote:realtime');

    expect(resolved).not.toBeNull();
    expect(resolved?.meta.id).toBe('fugle-market-data');
    expect(resolved?.meta.capabilities).toContain('quote:realtime');
  });

  it('should always safely resolve quote:eod without needing any credential', () => {
    // 不論有無 Key，EOD 始終可用
    registry.setCredentialValid('fugle', false);
    const eod = registry.resolve('quote:eod');
    expect(eod).not.toBeNull();
    expect(eod?.meta.id).toBe('open-data');
  });

  it('CRITICAL: without valid key, any quote badge MUST be eod and never realtime', () => {
    const eodQuote: Quote = {
      symbol: '2330',
      name: '台積電',
      market: 'TWSE',
      source: 'twse-open-data',
      freshness: 'eod',
      tradingDate: '2026-09-04',
      price: 1105,
      previousClose: 1085,
      open: 1090,
      high: 1110,
      low: 1090,
      volume: 35000,
      change: 20,
      changePercent: 1.84,
      asOf: '2026-09-04T13:30:00+08:00',
      receivedAt: '2026-09-05T10:00:00+08:00',
    };

    const badge = quoteBadge(eodQuote);
    expect(badge).toContain('收盤');
    expect(badge).not.toContain('即時');
  });

  it('CRITICAL: only with valid key can freshness be realtime', () => {
    const realtimeQuote: Quote = {
      symbol: '2330',
      name: '台積電',
      market: 'TWSE',
      source: 'fugle',
      freshness: 'realtime',
      price: 1115,
      previousClose: 1085,
      open: 1090,
      high: 1120,
      low: 1090,
      volume: 48000,
      change: 30,
      changePercent: 2.76,
      asOf: '2026-09-05T11:00:00+08:00',
      receivedAt: '2026-09-05T11:00:01+08:00',
    };

    const badge = quoteBadge(realtimeQuote);
    expect(badge).toBe('● 即時');
  });

  it('CRITICAL: syncWithStore should restore valid credentials from storage store', async () => {
    const mockStore: any = {
      getAll: async () => ({
        fugle: {
          id: 'cred_1',
          providerId: 'fugle',
          fields: { apiKey: 'mock_key' },
          status: 'valid',
        },
      }),
    };

    expect(registry.isCredentialValid('fugle')).toBe(false);
    await registry.syncWithStore(mockStore);
    expect(registry.isCredentialValid('fugle')).toBe(true);
    expect(registry.resolve('quote:realtime')).not.toBeNull();
  });
});
