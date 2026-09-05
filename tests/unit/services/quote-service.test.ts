import { describe, it, expect, beforeEach } from 'vitest';
import { QuoteService } from '../../../src/services/quote-service';
import { providerRegistry } from '../../../src/providers/registry';
import { mockProvider } from '../../../src/providers/mock/provider';
import { messageRouter } from '../../../src/messaging/router';
import { cacheService } from '../../../src/services/cache-service';

describe('QuoteService & MessageRouter Integration', () => {
  let quoteService: QuoteService;

  beforeEach(() => {
    cacheService.clear();
    mockProvider.setScenario('eod-success');
    providerRegistry.register(mockProvider);
    providerRegistry.setPreferred('quote:eod', 'mock-provider');
    providerRegistry.setPreferred('fundamental:valuation', 'mock-provider');
    quoteService = new QuoteService();
  });

  it('should fall back safely to EOD quote when preferRealtime is true but no realtime provider exists', async () => {
    const quote = await quoteService.getBestQuote('2330', { preferRealtime: true });

    expect(quote.symbol).toBe('2330');
    expect(quote.price).toBe(1105);

    // 關鍵契約：沒有 Realtime Provider 時，回傳 EOD，絕不標為 realtime
    expect(quote.freshness).toBe('eod');
    expect(quote.freshness).not.toBe('realtime');
  });

  it('should serve cached quote within TTL', async () => {
    const first = await quoteService.getBestQuote('2330');
    const second = await quoteService.getBestQuote('2330');

    expect(second).toEqual(first);
  });

  it('should retrieve fundamentals via quoteService', async () => {
    const fund = await quoteService.getFundamental('2330');
    expect(fund).not.toBeNull();
    expect(fund?.symbol).toBe('2330');
    expect(fund?.pe).toBe(28.5);
    expect(fund?.dividendYield).toBe(1.45);
  });

  it('should handle stock:search via messageRouter', async () => {
    const req = {
      id: 'msg-search-1',
      type: 'stock:search',
      payload: { query: '2330', limit: 5 },
    };

    const res = await messageRouter.handleMessage<any[]>(req);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].symbol).toBe('2330');
      expect(res.data[0].name).toBe('台積電');
    }
  });

  it('should handle quote:get via messageRouter', async () => {
    const req = {
      id: 'msg-quote-1',
      type: 'quote:get',
      payload: { symbol: '2330', preferRealtime: false },
    };

    const res = await messageRouter.handleMessage<any>(req);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.symbol).toBe('2330');
      expect(res.data.freshness).toBe('eod');
      expect(res.data.price).toBe(1105);
    }
  });
});
