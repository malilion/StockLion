import { createAppError } from '../../domain/errors';

export class TpexApiClient {
  private baseUrl = 'https://www.tpex.org.tw/openapi/v1';

  async fetchAllDayQuotes(signal?: AbortSignal): Promise<any[]> {
    try {
      const resp = await fetch(`${this.baseUrl}/tpex_mainboard_daily_close_quotes`, { signal });
      if (!resp.ok) {
        throw createAppError(
          'PROVIDER_UNAVAILABLE',
          `TPEx API error: ${resp.status} ${resp.statusText}`,
          { providerId: 'open-data', retryable: true }
        );
      }
      return await resp.json();
    } catch (err: any) {
      if (err?.code) throw err;
      throw createAppError('NETWORK_ERROR', `Failed to fetch TPEx quotes: ${err?.message || err}`, {
        providerId: 'open-data',
        retryable: true,
      });
    }
  }
}

export const tpexApiClient = new TpexApiClient();
