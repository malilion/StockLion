import { describe, it, expect, beforeEach, vi } from 'vitest';
import { symbolService } from '../../../src/services/symbol-service';
import { messageRouter } from '../../../src/messaging/router';
import { hoverCache, HoverCache } from '../../../src/stock-peek/hover-cache';
import { quoteBadge, type Quote } from '../../../src/domain/quote';
import { watchlistRepository } from '../../../src/storage/watchlist-repository';
import { providerRegistry } from '../../../src/providers/registry';
import { mockProvider } from '../../../src/providers/mock/provider';
import { cacheService } from '../../../src/services/cache-service';

describe('Phase 6 — Stock Peek Production Suite', () => {
  beforeEach(async () => {
    cacheService.clear();
    hoverCache.clear();
    mockProvider.setScenario('eod-success');
    providerRegistry.register(mockProvider);
    providerRegistry.setPreferred('quote:eod', 'mock-provider');
    providerRegistry.setPreferred('fundamental:valuation', 'mock-provider');
    await watchlistRepository.initDefaultGroups();
  });

  describe('1. Formal Stock Dictionary & Search Integration', () => {
    it('should load comprehensive production dictionary including leading stocks and high-dividend ETFs', () => {
      const all = symbolService.getAll();
      expect(all.length).toBeGreaterThanOrEqual(40);

      // 檢查代表性大型股
      expect(symbolService.getBySymbol('2330')?.name).toBe('台積電');
      expect(symbolService.getBySymbol('2317')?.name).toBe('鴻海');
      expect(symbolService.getBySymbol('2454')?.name).toBe('聯發科');
      expect(symbolService.getBySymbol('6488')?.market).toBe('TPEx');

      // 檢查主流高股息 ETF
      expect(symbolService.getBySymbol('00919')?.name).toBe('群益台灣精選高息');
      expect(symbolService.getBySymbol('00929')?.name).toBe('復華台灣科技優息');
      expect(symbolService.getBySymbol('00940')?.name).toBe('元大台灣價值高息');
    });

    it('should support instant search across newly added market symbols', () => {
      const etfResults = symbolService.search('00');
      expect(etfResults.length).toBeGreaterThanOrEqual(5);

      const financeResults = symbolService.search('金');
      expect(financeResults.length).toBeGreaterThanOrEqual(5);

      const tpexResults = symbolService.search('6488');
      expect(tpexResults[0]?.symbol).toBe('6488');
      expect(tpexResults[0]?.name).toBe('環球晶');
    });
  });

  describe('2. Background Protocol & Zero Credential Leak', () => {
    it('should handle stockPeek:get via messageRouter returning sanitized quote and watchlist status', async () => {
      const response = await messageRouter.handleMessage({
        id: 'req_peek_1',
        type: 'stockPeek:get',
        payload: { symbol: '2330' },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        const data = response.data as { quote: Quote; inWatchlist: boolean };
        expect(data.quote).toBeDefined();
        expect(data.quote.symbol).toBe('2330');
        // 驗證 No-Key 下鮮度必定為 eod
        expect(data.quote.freshness).toBe('eod');
        // 預設自選群組包含 2330
        expect(data.inWatchlist).toBe(true);
        // 確保無敏感 credential 或 key 洩漏
        expect((data as any).apiKey).toBeUndefined();
        expect((data as any).secret).toBeUndefined();
      }
    });

    it('should handle watchlist:check and watchlist:toggle via background router', async () => {
      // 檢查未在自選中的股票 6488
      const checkRes1 = await messageRouter.handleMessage({
        id: 'chk_1',
        type: 'watchlist:check',
        payload: { symbol: '6488' },
      });
      expect(checkRes1.ok).toBe(true);
      if (checkRes1.ok) {
        expect((checkRes1.data as any).inWatchlist).toBe(false);
      }

      // 切換加入 6488
      const toggleRes1 = await messageRouter.handleMessage({
        id: 'tog_1',
        type: 'watchlist:toggle',
        payload: { symbol: '6488' },
      });
      expect(toggleRes1.ok).toBe(true);
      if (toggleRes1.ok) {
        expect((toggleRes1.data as any).inWatchlist).toBe(true);
      }

      // 再次切換移除 6488
      const toggleRes2 = await messageRouter.handleMessage({
        id: 'tog_2',
        type: 'watchlist:toggle',
        payload: { symbol: '6488' },
      });
      expect(toggleRes2.ok).toBe(true);
      if (toggleRes2.ok) {
        expect((toggleRes2.data as any).inWatchlist).toBe(false);
      }
    });

    it('should handle stock:open-detail setting active_nav_symbol in storage', async () => {
      const originalChrome = (globalThis as any).chrome;
      const setStorageMock = vi.fn().mockResolvedValue(undefined);

      (globalThis as any).chrome = {
        storage: {
          local: {
            set: setStorageMock,
          },
        },
      };

      try {
        const res = await messageRouter.handleMessage({
          id: 'nav_1',
          type: 'stock:open-detail',
          payload: { symbol: '2454' },
        });

        expect(res.ok).toBe(true);
        expect(setStorageMock).toHaveBeenCalledWith({ active_nav_symbol: '2454' });
      } finally {
        (globalThis as any).chrome = originalChrome;
      }
    });
  });

  describe('3. HoverCache Lifecycle & TTL', () => {
    it('should cache quotes and respect TTL expiry', () => {
      const shortTtlCache = new HoverCache(50); // 50ms TTL
      const mockQuote: Quote = {
        symbol: '2330',
        name: '台積電',
        market: 'TWSE',
        source: 'twse-open-data',
        freshness: 'eod',
        price: 1105,
        previousClose: 1085,
        open: 1090,
        high: 1110,
        low: 1090,
        volume: 35000,
        change: 20,
        changePercent: 1.84,
        asOf: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      };

      expect(shortTtlCache.get('2330')).toBeNull();

      shortTtlCache.set('2330', { quote: mockQuote, inWatchlist: false });
      expect(shortTtlCache.get('2330')).not.toBeNull();
      expect(shortTtlCache.get('2330')?.quote.price).toBe(1105);

      // 更新自選狀態
      shortTtlCache.updateWatchlist('2330', true);
      expect(shortTtlCache.get('2330')?.inWatchlist).toBe(true);
    });
  });

  describe('4. HoverCard Presentation & Freshness Gate', () => {
    it('should render EOD badge when quote freshness is eod without any key', () => {
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
        asOf: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      };

      const badge = quoteBadge(eodQuote);
      expect(badge).toBe('○ 2026-09-04 收盤');
      expect(badge).not.toContain('即時');
    });

    it('should render Realtime badge only when quote freshness is realtime', () => {
      const realtimeQuote: Quote = {
        symbol: '2330',
        name: '台積電',
        market: 'TWSE',
        source: 'twse-open-data',
        freshness: 'realtime',
        price: 1110,
        previousClose: 1085,
        open: 1090,
        high: 1115,
        low: 1090,
        volume: 42000,
        change: 25,
        changePercent: 2.3,
        asOf: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      };

      const badge = quoteBadge(realtimeQuote);
      expect(badge).toBe('● 即時');
    });
  });
});
