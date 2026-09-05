import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FugleProvider } from '../../../src/providers/fugle/provider';
import { CredentialStore } from '../../../src/storage/credential-store';
import { StorageRepository } from '../../../src/storage/repository';

describe('FugleProvider & Status Code Demultiplexing', () => {
  let mockStorage: Record<string, any>;
  let credStore: CredentialStore;
  let mockFetcher: any;
  let provider: FugleProvider;

  beforeEach(() => {
    credStore = new CredentialStore(new StorageRepository());
    mockFetcher = vi.fn();
    provider = new FugleProvider({ fetcher: mockFetcher, credStore });
  });

  describe('Validation Flow', () => {
    it('should validate successfully and mark valid on 200 response', async () => {
      mockFetcher.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ symbol: '2330', name: '台積電' }),
      });

      const result = await provider.validate('valid_demo_token');
      expect(result.ok).toBe(true);
      expect(result.status).toBe('valid');

      const saved = await credStore.get('fugle');
      expect(saved?.status).toBe('valid');
      expect(saved?.validatedAt).toBeDefined();
    });

    it('should mark invalid on 401 / 403 response without clearing key', async () => {
      mockFetcher.mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      const result = await provider.validate('expired_or_bad_token');
      expect(result.ok).toBe(false);
      expect(result.status).toBe('invalid');
      expect(result.errorCode).toBe('CREDENTIAL_INVALID');

      const saved = await credStore.get('fugle');
      expect(saved?.status).toBe('invalid');
      expect(saved?.lastErrorCode).toBe('CREDENTIAL_INVALID');
    });

    it('should mark rate-limited on 429 response without clearing key', async () => {
      mockFetcher.mockResolvedValueOnce({
        status: 429,
        ok: false,
      });

      const result = await provider.validate('rate_limited_token');
      expect(result.ok).toBe(false);
      expect(result.status).toBe('rate-limited');
      expect(result.errorCode).toBe('RATE_LIMITED');

      const saved = await credStore.get('fugle');
      expect(saved?.status).toBe('rate-limited');
      expect(saved?.lastErrorCode).toBe('RATE_LIMITED');
    });

    it('should handle network error as temporary-error', async () => {
      mockFetcher.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await provider.validate('token_with_timeout');
      expect(result.ok).toBe(false);
      expect(result.status).toBe('temporary-error');
      expect(result.errorCode).toBe('NETWORK_ERROR');

      const saved = await credStore.get('fugle');
      expect(saved?.status).toBe('temporary-error');
    });
  });

  describe('Quote Fetching & Normalization', () => {
    it('should throw error if attempting getQuote without a valid credential', async () => {
      await expect(provider.getQuote('2330')).rejects.toThrow('未設定或未驗證富果 API Key');
    });

    it('should fetch and normalize realtime quote properly', async () => {
      await credStore.save('fugle', { apiKey: 'active_token' }, 'valid');

      mockFetcher.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          symbol: '2330',
          name: '台積電',
          closePrice: 1115,
          previousClose: 1085,
          openPrice: 1090,
          highPrice: 1120,
          lowPrice: 1090,
          total: { unit: 45000 },
          change: 30,
          changePercent: 2.76,
          updatedAt: '2026-09-05T11:00:00+08:00',
        }),
      });

      const quote = await provider.getQuote('2330');
      expect(quote.symbol).toBe('2330');
      expect(quote.price).toBe(1115);
      expect(quote.change).toBe(30);
      expect(quote.changePercent).toBe(2.76);
      expect(quote.source).toBe('fugle');
      expect(quote.freshness).toBe('realtime');
    });

    it('should handle 401 during getQuote by marking credential invalid', async () => {
      await credStore.save('fugle', { apiKey: 'revoked_token' }, 'valid');

      mockFetcher.mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      await expect(provider.getQuote('2330')).rejects.toThrow();

      const cred = await credStore.get('fugle');
      expect(cred?.status).toBe('invalid');
    });
  });
});
