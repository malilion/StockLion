import type { Capability } from '../../domain/capability';
import type { Quote } from '../../domain/quote';
import type { FundamentalSnapshot } from '../../domain/fundamental';
import { createAppError } from '../../domain/errors';
import type { QuoteProvider, ProviderMeta, ProviderContext } from '../types';
import { twseApiClient } from './twse';
import { tpexApiClient } from './tpex';
import {
  normalizeTwseQuote,
  normalizeTpexQuote,
  normalizeTwseValuation,
} from './normalizers';

export const OPEN_DATA_CAPABILITIES: readonly Capability[] = [
  'symbol:list',
  'quote:eod',
  'chart:daily',
  'fundamental:valuation',
  'fundamental:revenue',
  'institutional:daily',
  'market:attention',
  'market:disposition',
  'radar:eod',
] as const;

export class OpenDataProvider implements QuoteProvider {
  readonly meta: ProviderMeta = {
    id: 'open-data',
    label: '臺灣證券交易所 / 櫃買中心公開資料 (Open Data)',
    capabilities: OPEN_DATA_CAPABILITIES,
  };

  private quotesCache = new Map<string, Quote>();
  private valuationsCache = new Map<string, FundamentalSnapshot>();
  private lastFetchedAt = 0;
  private readonly CACHE_TTL = 60 * 1000; // 60 秒本機暫存

  private async refreshIfNecessary(signal?: AbortSignal): Promise<void> {
    const now = Date.now();
    if (this.quotesCache.size > 0 && now - this.lastFetchedAt < this.CACHE_TTL) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      // 平行請求 TWSE 與 TPEx
      const [twseQuotes, tpexQuotes, twseValuations] = await Promise.allSettled([
        twseApiClient.fetchAllDayQuotes(signal),
        tpexApiClient.fetchAllDayQuotes(signal),
        twseApiClient.fetchValuations(signal),
      ]);

      if (twseQuotes.status === 'fulfilled') {
        for (const raw of twseQuotes.value) {
          const q = normalizeTwseQuote(raw, todayStr);
          this.quotesCache.set(q.symbol, q);
        }
      }

      if (tpexQuotes.status === 'fulfilled') {
        for (const raw of tpexQuotes.value) {
          const q = normalizeTpexQuote(raw, todayStr);
          this.quotesCache.set(q.symbol, q);
        }
      }

      if (twseValuations.status === 'fulfilled') {
        for (const raw of twseValuations.value) {
          const v = normalizeTwseValuation(raw, todayStr);
          this.valuationsCache.set(v.symbol, v);
        }
      }

      this.lastFetchedAt = now;
    } catch (err: any) {
      if (this.quotesCache.size === 0) {
        throw createAppError('NETWORK_ERROR', `Failed to load OpenData: ${err?.message || err}`, {
          providerId: this.meta.id,
          retryable: true,
        });
      }
    }
  }

  async getQuote(symbol: string, ctx?: ProviderContext): Promise<Quote> {
    await this.refreshIfNecessary(ctx?.signal);
    const quote = this.quotesCache.get(symbol);

    if (!quote) {
      throw createAppError('SYMBOL_NOT_FOUND', `找不到代號 ${symbol} 的公開行情資料`, {
        providerId: this.meta.id,
        retryable: false,
      });
    }

    return quote;
  }

  async getQuotes(symbols: string[], ctx?: ProviderContext): Promise<Quote[]> {
    await this.refreshIfNecessary(ctx?.signal);
    const results: Quote[] = [];

    for (const sym of symbols) {
      const q = this.quotesCache.get(sym);
      if (q) results.push(q);
    }

    return results;
  }

  async getFundamental(symbol: string, ctx?: ProviderContext): Promise<FundamentalSnapshot | null> {
    await this.refreshIfNecessary(ctx?.signal);
    return this.valuationsCache.get(symbol) ?? null;
  }

  async getAllQuotes(ctx?: ProviderContext): Promise<Quote[]> {
    await this.refreshIfNecessary(ctx?.signal);
    return Array.from(this.quotesCache.values());
  }
}

export const openDataProvider = new OpenDataProvider();
