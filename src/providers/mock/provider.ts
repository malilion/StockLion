import type { QuoteProvider, ProviderMeta, ProviderContext } from '../types';
import type { Quote } from '../../domain/quote';
import type { FundamentalSnapshot } from '../../domain/fundamental';
import { createAppError } from '../../domain/errors';
import quote2330 from '../../../tests/fixtures/quote-eod-2330.json';
import fundamentals2330 from '../../../tests/fixtures/fundamentals-2330.json';

export type MockScenario =
  | 'eod-success'
  | 'symbol-not-found'
  | 'rate-limited'
  | 'network-error';

export class MockProvider implements QuoteProvider {
  readonly meta: ProviderMeta = {
    id: 'mock-provider',
    label: '測試專用 Mock Provider',
    capabilities: [
      'symbol:list',
      'quote:eod',
      'chart:daily',
      'fundamental:valuation',
      'radar:eod',
    ],
  };

  private scenario: MockScenario = 'eod-success';

  setScenario(scenario: MockScenario) {
    this.scenario = scenario;
  }

  async getQuote(symbol: string, _ctx?: ProviderContext): Promise<Quote> {
    if (this.scenario === 'network-error') {
      throw createAppError('NETWORK_ERROR', 'Mock network failure', {
        providerId: this.meta.id,
        retryable: true,
      });
    }

    if (this.scenario === 'rate-limited') {
      throw createAppError('RATE_LIMITED', 'Mock rate limit reached', {
        providerId: this.meta.id,
        retryable: true,
      });
    }

    if (this.scenario === 'symbol-not-found' || symbol !== '2330') {
      throw createAppError('SYMBOL_NOT_FOUND', `找不到代號 ${symbol} 的資料`, {
        providerId: this.meta.id,
        retryable: false,
      });
    }

    return {
      ...(quote2330 as Quote),
      receivedAt: new Date().toISOString(),
    };
  }

  async getQuotes(symbols: string[], ctx?: ProviderContext): Promise<Quote[]> {
    const quotes: Quote[] = [];
    for (const sym of symbols) {
      try {
        const q = await this.getQuote(sym, ctx);
        quotes.push(q);
      } catch {
        // Skip not found
      }
    }
    return quotes;
  }

  async getFundamental(symbol: string, _ctx?: ProviderContext): Promise<FundamentalSnapshot | null> {
    if (symbol === '2330') {
      return fundamentals2330 as FundamentalSnapshot;
    }
    return null;
  }
}

export const mockProvider = new MockProvider();
