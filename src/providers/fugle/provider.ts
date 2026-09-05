import type { QuoteProvider, ProviderMeta, ProviderContext } from '../types';
import type { Quote } from '../../domain/quote';
import type { CredentialStatus } from '../../domain/credential';
import { createAppError } from '../../domain/errors';
import { credentialStore, CredentialStore } from '../../storage/credential-store';

export interface FugleValidationResult {
  ok: boolean;
  status: CredentialStatus;
  errorCode?: string;
  errorMessage?: string;
}

export class FugleProvider implements QuoteProvider {
  readonly meta: ProviderMeta = {
    id: 'fugle-market-data',
    label: '富果 Fugle 行情 API',
    capabilities: ['quote:realtime', 'chart:intraday'] as const,
    credentialId: 'fugle',
  };

  private fetcher: typeof fetch;
  private credStore: CredentialStore;

  constructor(options?: { fetcher?: typeof fetch; credStore?: CredentialStore }) {
    this.fetcher = options?.fetcher ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (null as any));
    this.credStore = options?.credStore ?? credentialStore;
  }

  async validate(apiKey: string): Promise<FugleValidationResult> {
    const key = apiKey.trim();
    if (!key) {
      return {
        ok: false,
        status: 'missing',
        errorCode: 'INVALID_INPUT',
        errorMessage: '請輸入有效的富果 API Key',
      };
    }

    try {
      const res = await this.fetcher(
        'https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/2330',
        {
          headers: {
            'X-API-KEY': key,
          },
        }
      );

      if (res.status >= 200 && res.status < 300) {
        await this.credStore.save('fugle', { apiKey: key }, 'valid');
        return { ok: true, status: 'valid' };
      }

      if (res.status === 401 || res.status === 403) {
        await this.credStore.save('fugle', { apiKey: key }, 'invalid');
        await this.credStore.updateStatus('fugle', 'invalid', 'CREDENTIAL_INVALID');
        return {
          ok: false,
          status: 'invalid',
          errorCode: 'CREDENTIAL_INVALID',
          errorMessage: '富果 API Key 驗證失敗，請檢查金鑰是否正確或已過期',
        };
      }

      if (res.status === 429) {
        await this.credStore.save('fugle', { apiKey: key }, 'rate-limited');
        await this.credStore.updateStatus('fugle', 'rate-limited', 'RATE_LIMITED');
        return {
          ok: false,
          status: 'rate-limited',
          errorCode: 'RATE_LIMITED',
          errorMessage: '超出富果 API 頻率上限（免費額度 60 次/分），已保留金鑰',
        };
      }

      // 5xx 或其他非預期狀態碼
      await this.credStore.save('fugle', { apiKey: key }, 'temporary-error');
      await this.credStore.updateStatus('fugle', 'temporary-error', 'NETWORK_ERROR');
      return {
        ok: false,
        status: 'temporary-error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: `富果 API 伺服器暫時無法連線 (HTTP ${res.status})`,
      };
    } catch (err: any) {
      await this.credStore.save('fugle', { apiKey: key }, 'temporary-error');
      await this.credStore.updateStatus('fugle', 'temporary-error', 'NETWORK_ERROR');
      return {
        ok: false,
        status: 'temporary-error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: '網路連線異常，無法連線至富果 API',
      };
    }
  }

  async getQuote(symbol: string, ctx?: ProviderContext): Promise<Quote> {
    const cred = await this.credStore.get('fugle');
    if (!cred || cred.status !== 'valid' || !cred.fields.apiKey) {
      throw createAppError('CREDENTIAL_INVALID', '未設定或未驗證富果 API Key');
    }

    const cleanSym = symbol.trim().toUpperCase();
    const url = `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${cleanSym}`;

    try {
      const res = await this.fetcher(url, {
        headers: {
          'X-API-KEY': cred.fields.apiKey,
        },
        signal: ctx?.signal,
      });

      if (res.status === 401 || res.status === 403) {
        await this.credStore.updateStatus('fugle', 'invalid', 'CREDENTIAL_INVALID');
        throw createAppError('CREDENTIAL_INVALID', '富果 API Key 失效或未授權 (401)');
      }

      if (res.status === 429) {
        await this.credStore.updateStatus('fugle', 'rate-limited', 'RATE_LIMITED');
        throw createAppError('RATE_LIMITED', '富果 API 超出請求限制 (429)');
      }

      if (!res.ok) {
        throw createAppError('NETWORK_ERROR', `富果 API 請求失敗 (HTTP ${res.status})`);
      }

      const raw = await res.json();
      return this.normalizeQuote(cleanSym, raw);
    } catch (err: any) {
      if (err.name === 'AppError') throw err;
      throw createAppError('NETWORK_ERROR', err.message || '連線富果行情 API 失敗');
    }
  }

  async getQuotes(symbols: string[], ctx?: ProviderContext): Promise<Quote[]> {
    const results: Quote[] = [];
    const concurrency = 5;

    for (let i = 0; i < symbols.length; i += concurrency) {
      const chunk = symbols.slice(i, i + concurrency);
      const chunkQuotes = await Promise.all(chunk.map((sym) => this.getQuote(sym, ctx)));
      results.push(...chunkQuotes);
    }

    return results;
  }

  private normalizeQuote(symbol: string, raw: any): Quote {
    const price = raw.closePrice ?? raw.lastPrice ?? raw.avgPrice ?? null;
    const previousClose = raw.previousClose ?? null;
    const change = raw.change ?? (price != null && previousClose != null ? price - previousClose : null);
    const changePercent =
      raw.changePercent ??
      (change != null && previousClose != null && previousClose > 0
        ? Math.round(((change / previousClose) * 100) * 100) / 100
        : null);

    return {
      symbol,
      name: raw.name || symbol,
      market: (raw.market || 'TWSE') as any,
      source: 'fugle',
      freshness: 'realtime',
      asOf: raw.updatedAt || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      price,
      previousClose,
      open: raw.openPrice ?? null,
      high: raw.highPrice ?? null,
      low: raw.lowPrice ?? null,
      volume: raw.total?.unit ?? raw.volume ?? null,
      change,
      changePercent,
    };
  }
}

export const fugleProvider = new FugleProvider();
