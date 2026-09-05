import type { Quote } from '../domain/quote';
import type { FundamentalSnapshot } from '../domain/fundamental';
import { createAppError } from '../domain/errors';
import { providerRegistry } from '../providers/registry';
import { cacheService } from './cache-service';

export interface QuoteOptions {
  preferRealtime?: boolean;
}

export class QuoteService {
  async getBestQuote(symbol: string, options: QuoteOptions = {}): Promise<Quote> {
    const cacheKey = `quote:${symbol}`;
    const cached = cacheService.get<Quote>(cacheKey);

    if (cached) {
      // 若偏好即時但快取為 EOD，且有可用的即時 Provider，才穿透快取重新抓取
      if (!options.preferRealtime || cached.freshness === 'realtime') {
        return cached;
      }
    }

    // 1. 若偏好即時行情，嘗試解析 quote:realtime capability
    if (options.preferRealtime) {
      const realtimeProvider = providerRegistry.resolve('quote:realtime');
      if (realtimeProvider) {
        try {
          const quote = await realtimeProvider.getQuote(symbol);
          cacheService.set(cacheKey, quote, 10 * 1000); // 即時快取 10 秒
          return quote;
        } catch {
          // 安全降級至 EOD，不得把 fallback 標記為 realtime
        }
      }
    }

    // 2. 降級至 EOD Provider (如 OpenDataProvider)
    const eodProvider = providerRegistry.resolve('quote:eod');
    if (!eodProvider) {
      // 嘗試讀取 stale 快取
      const { data, isStale } = cacheService.getWithStale<Quote>(cacheKey);
      if (data && isStale) {
        return { ...data, freshness: 'stale' };
      }
      throw createAppError('DATA_UNAVAILABLE', `無可用的盤後行情 Provider`);
    }

    try {
      const quote = await eodProvider.getQuote(symbol);
      cacheService.set(cacheKey, quote, 60 * 1000); // EOD 快取 60 秒
      return quote;
    } catch (err: any) {
      const { data } = cacheService.getWithStale<Quote>(cacheKey);
      if (data) {
        return { ...data, freshness: 'stale' };
      }
      throw err;
    }
  }

  async getBestQuotes(symbols: string[], options: QuoteOptions = {}): Promise<Quote[]> {
    const quotes: Quote[] = [];
    for (const sym of symbols) {
      try {
        const q = await this.getBestQuote(sym, options);
        quotes.push(q);
      } catch {
        // 容錯跳過單一失敗股票
      }
    }
    return quotes;
  }

  async getFundamental(symbol: string): Promise<FundamentalSnapshot | null> {
    const cacheKey = `fundamental:${symbol}`;
    const cached = cacheService.get<FundamentalSnapshot>(cacheKey);
    if (cached) return cached;

    const provider = providerRegistry.resolve('fundamental:valuation');
    if (!provider || !provider.getFundamental) {
      return null;
    }

    try {
      const data = await provider.getFundamental(symbol);
      if (data) {
        cacheService.set(cacheKey, data, 10 * 60 * 1000); // 10 分鐘快取
      }
      return data;
    } catch {
      return null;
    }
  }
}

export const quoteService = new QuoteService();
