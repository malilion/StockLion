import type { AlertRule, AlertRuleInput } from '../domain/alert';
import { STORAGE_KEYS } from './keys';
import { storageRepository, type StorageRepository } from './repository';
import { providerRegistry } from '../providers/registry';
import { createAppError } from '../domain/errors';

export class AlertRepository {
  private repo: StorageRepository;

  constructor(repo: StorageRepository = storageRepository) {
    this.repo = repo;
  }

  async getAll(): Promise<AlertRule[]> {
    const rules = await this.repo.get<AlertRule[]>(STORAGE_KEYS.alerts);
    return rules || [];
  }

  async getBySymbol(symbol: string): Promise<AlertRule[]> {
    const cleanSym = symbol.trim().toUpperCase();
    const all = await this.getAll();
    return all.filter((r) => r.symbol.toUpperCase() === cleanSym);
  }

  async addRule(ruleInput: AlertRuleInput): Promise<AlertRule> {
    // 嚴格門禁：v2.1 的 Alert 一律需 quote:realtime capability + valid credential
    const realtimeProvider = providerRegistry.resolve('quote:realtime');
    if (!realtimeProvider) {
      throw createAppError(
        'PERMISSION_DENIED',
        '未解鎖盤中即時行情（需於「設定」填寫並驗證富果 API Key），無法建立即時到價提醒。'
      );
    }

    const all = await this.getAll();
    const newRule: AlertRule = {
      ...(ruleInput as any),
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      symbol: ruleInput.symbol.trim().toUpperCase(),
      createdAt: new Date().toISOString(),
      triggeredCrossing: false,
    };

    all.push(newRule);
    await this.repo.set(STORAGE_KEYS.alerts, all);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const all = await this.getAll();
    const rule = all.find((r) => r.id === id);
    if (!rule) return null;

    Object.assign(rule, updates);
    await this.repo.set(STORAGE_KEYS.alerts, all);
    return rule;
  }

  async removeRule(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter((r) => r.id !== id);
    await this.repo.set(STORAGE_KEYS.alerts, filtered);
  }

  async toggleRule(id: string): Promise<boolean> {
    const all = await this.getAll();
    const rule = all.find((r) => r.id === id);
    if (!rule) return false;

    rule.enabled = !rule.enabled;
    // 重新啟用時重設 crossing
    if (rule.enabled) {
      rule.triggeredCrossing = false;
    }
    await this.repo.set(STORAGE_KEYS.alerts, all);
    return rule.enabled;
  }

  async clear(): Promise<void> {
    await this.repo.remove(STORAGE_KEYS.alerts);
  }
}

export const alertRepository = new AlertRepository();
