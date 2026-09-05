import { createAppError } from '../../domain/errors';
import type { RawTwseStockDayAll, RawTwseValuation } from './normalizers';

export class TwseApiClient {
  private baseUrl = 'https://openapi.twse.com.tw/v1';

  async fetchAllDayQuotes(signal?: AbortSignal): Promise<RawTwseStockDayAll[]> {
    try {
      const resp = await fetch(`${this.baseUrl}/exchangeReport/STOCK_DAY_ALL`, { signal });
      if (!resp.ok) {
        throw createAppError(
          'PROVIDER_UNAVAILABLE',
          `TWSE API error: ${resp.status} ${resp.statusText}`,
          { providerId: 'open-data', retryable: true }
        );
      }
      return await resp.json();
    } catch (err: any) {
      if (err?.code) throw err;
      throw createAppError('NETWORK_ERROR', `Failed to fetch TWSE quotes: ${err?.message || err}`, {
        providerId: 'open-data',
        retryable: true,
      });
    }
  }

  async fetchValuations(signal?: AbortSignal): Promise<RawTwseValuation[]> {
    try {
      const resp = await fetch(`${this.baseUrl}/exchangeReport/BWIBBU_d`, { signal });
      if (!resp.ok) {
        throw createAppError(
          'PROVIDER_UNAVAILABLE',
          `TWSE Valuation API error: ${resp.status}`,
          { providerId: 'open-data', retryable: true }
        );
      }
      return await resp.json();
    } catch (err: any) {
      if (err?.code) throw err;
      throw createAppError('NETWORK_ERROR', `Failed to fetch TWSE valuations: ${err?.message || err}`, {
        providerId: 'open-data',
        retryable: true,
      });
    }
  }
}

export const twseApiClient = new TwseApiClient();
