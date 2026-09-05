import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertEngine } from '../../../src/services/alert-engine';
import { AlertRepository } from '../../../src/storage/alert-repository';
import { StorageRepository } from '../../../src/storage/repository';
import { QuoteService } from '../../../src/services/quote-service';
import { providerRegistry } from '../../../src/providers/registry';
import { mockProvider } from '../../../src/providers/mock/provider';
import type { Quote } from '../../../src/domain/quote';

describe('AlertEngine Evaluation & Notification Dispatch', () => {
  let alertRepo: AlertRepository;
  let quoteService: QuoteService;
  let engine: AlertEngine;
  let mockNotificationCreate: any;

  beforeEach(() => {
    providerRegistry.clear();
    const mockRealtimeProvider: any = {
      meta: {
        id: 'mock-realtime',
        label: 'Mock Realtime',
        capabilities: ['quote:realtime'],
        credentialId: 'mock-realtime',
      },
      async getQuote(symbol: string) {
        return {
          symbol,
          name: '台積電',
          market: 'TWSE',
          source: 'mock',
          freshness: 'realtime',
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
      },
      async getQuotes(symbols: string[]) {
        return Promise.all(symbols.map((s: string) => this.getQuote(s)));
      },
    };

    providerRegistry.register(mockRealtimeProvider);
    providerRegistry.setPreferred('quote:realtime', 'mock-realtime');
    providerRegistry.setCredentialValid('mock-realtime', true);

    alertRepo = new AlertRepository(new StorageRepository());
    quoteService = new QuoteService();
    engine = new AlertEngine(alertRepo, quoteService);

    mockNotificationCreate = vi.fn((_id, _options, cb) => {
      if (cb) cb();
    });

    (globalThis as any).chrome = {
      notifications: {
        create: mockNotificationCreate,
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://mock-id/${p}`,
      },
    };
  });

  it('should evaluate active rules, trigger crossing, and dispatch notification', async () => {
    // 建立 2330 目標價 1100 突破警示 (mock 2330 報價為 1105)
    await alertRepo.addRule({
      symbol: '2330',
      name: '台積電',
      type: 'price-above',
      threshold: 1100,
      requires: ['quote:realtime'],
      enabled: true,
    });

    const results = await engine.evaluateAll();
    expect(results.length).toBe(1);
    expect(results[0].triggered).toBe(true);
    expect(mockNotificationCreate).toHaveBeenCalledOnce();
    expect(mockNotificationCreate.mock.calls[0][1].title).toContain('到價提醒');
    expect(mockNotificationCreate.mock.calls[0][1].message).toContain('突破 $1100');

    // 檢查儲存庫中狀態已更新為 triggeredCrossing = true
    const savedRules = await alertRepo.getAll();
    expect(savedRules[0].triggeredCrossing).toBe(true);
    expect(savedRules[0].lastTriggeredAt).toBeDefined();

    // 次輪評估，價格未變動 -> 不重複發送通知 (De-dup)
    const secondRound = await engine.evaluateAll();
    expect(secondRound[0].triggered).toBe(false);
    expect(mockNotificationCreate).toHaveBeenCalledOnce(); // 仍為 1 次
  });

  it('should ignore disabled rules during evaluation', async () => {
    const rule = await alertRepo.addRule({
      symbol: '2330',
      name: '台積電',
      type: 'price-above',
      threshold: 1100,
      requires: ['quote:realtime'],
      enabled: true,
    });

    await alertRepo.toggleRule(rule.id); // 停用

    const results = await engine.evaluateAll();
    expect(results.length).toBe(0);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });
});
