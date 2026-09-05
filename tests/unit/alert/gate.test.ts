import { describe, it, expect, beforeEach } from 'vitest';
import { AlertRepository } from '../../../src/storage/alert-repository';
import { StorageRepository } from '../../../src/storage/repository';
import { providerRegistry } from '../../../src/providers/registry';
import { fugleProvider } from '../../../src/providers/fugle/provider';
import { openDataProvider } from '../../../src/providers/open-data/provider';

describe('Realtime Key Gate Enforcement on Alert Creation', () => {
  let repo: StorageRepository;
  let alertRepo: AlertRepository;

  beforeEach(() => {
    providerRegistry.clear();
    providerRegistry.register(openDataProvider);
    providerRegistry.register(fugleProvider);
    // 預設無 valid key
    providerRegistry.setCredentialValid('fugle', false);

    repo = new StorageRepository();
    alertRepo = new AlertRepository(repo);
  });

  it('CRITICAL: must forbid creating realtime alert when valid key is absent', async () => {
    // 確保當前無法解析 quote:realtime
    expect(providerRegistry.resolve('quote:realtime')).toBeNull();

    await expect(
      alertRepo.addRule({
        symbol: '2330',
        name: '台積電',
        type: 'price-above',
        threshold: 1200,
        requires: ['quote:realtime'],
        enabled: true,
      })
    ).rejects.toThrow('未解鎖盤中即時行情');

    const rules = await alertRepo.getAll();
    expect(rules.length).toBe(0);
  });

  it('CRITICAL: successfully creates and persists alert when valid realtime key exists', async () => {
    // 模擬已通過金鑰驗證
    providerRegistry.setCredentialValid('fugle', true);
    expect(providerRegistry.resolve('quote:realtime')).not.toBeNull();

    const created = await alertRepo.addRule({
      symbol: '2330',
      name: '台積電',
      type: 'price-above',
      threshold: 1200,
      requires: ['quote:realtime'],
      enabled: true,
    });

    expect(created.id).toBeDefined();
    expect(created.symbol).toBe('2330');
    expect(created.threshold).toBe(1200);
    expect(created.triggeredCrossing).toBe(false);

    const rules = await alertRepo.getAll();
    expect(rules.length).toBe(1);
    expect(rules[0].id).toBe(created.id);
  });

  it('should toggle and remove alert rules cleanly', async () => {
    providerRegistry.setCredentialValid('fugle', true);

    const created = await alertRepo.addRule({
      symbol: '2454',
      name: '聯發科',
      type: 'price-below',
      threshold: 1400,
      requires: ['quote:realtime'],
      enabled: true,
    });

    // Toggle to disable
    const toggled1 = await alertRepo.toggleRule(created.id);
    expect(toggled1).toBe(false);
    expect((await alertRepo.getAll())[0].enabled).toBe(false);

    // Toggle to re-enable
    const toggled2 = await alertRepo.toggleRule(created.id);
    expect(toggled2).toBe(true);
    expect((await alertRepo.getAll())[0].enabled).toBe(true);

    // Remove
    await alertRepo.removeRule(created.id);
    expect((await alertRepo.getAll()).length).toBe(0);
  });

  it('should update multiple rules in batch cleanly', async () => {
    providerRegistry.setCredentialValid('fugle', true);

    const r1 = await alertRepo.addRule({
      symbol: '2330',
      type: 'price-above',
      threshold: 1200,
      requires: ['quote:realtime'],
      enabled: true,
    });
    const r2 = await alertRepo.addRule({
      symbol: '2317',
      type: 'price-below',
      threshold: 200,
      requires: ['quote:realtime'],
      enabled: true,
    });

    const batchUpdates = new Map();
    batchUpdates.set(r1.id, { triggeredCrossing: true, lastTriggeredAt: '2026-09-05T12:00:00Z' });
    batchUpdates.set(r2.id, { triggeredCrossing: false });

    await alertRepo.updateRulesBatch(batchUpdates);

    const updated = await alertRepo.getAll();
    const updated1 = updated.find((r) => r.id === r1.id);
    const updated2 = updated.find((r) => r.id === r2.id);

    expect(updated1?.triggeredCrossing).toBe(true);
    expect(updated1?.lastTriggeredAt).toBe('2026-09-05T12:00:00Z');
    expect(updated2?.triggeredCrossing).toBe(false);
  });
});
