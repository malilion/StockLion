import type { AlertEvaluationResult } from '../domain/alert';
import { evaluateAlert } from '../domain/alert';
import { alertRepository, AlertRepository } from '../storage/alert-repository';
import { quoteService, QuoteService } from './quote-service';

export class AlertEngine {
  private repo: AlertRepository;
  private quotes: QuoteService;

  constructor(repo: AlertRepository = alertRepository, quotes: QuoteService = quoteService) {
    this.repo = repo;
    this.quotes = quotes;
  }

  async evaluateAll(): Promise<AlertEvaluationResult[]> {
    const allRules = await this.repo.getAll();
    const activeRules = allRules.filter((r) => r.enabled);
    if (activeRules.length === 0) {
      return [];
    }

    // 收集所有需要查詢的唯一股票代號
    const uniqueSymbols = Array.from(new Set(activeRules.map((r) => r.symbol)));
    const quotesMap = new Map<string, any>();

    // 批次取得報價（偏好即時行情）
    await Promise.all(
      uniqueSymbols.map(async (sym) => {
        try {
          const q = await this.quotes.getBestQuote(sym, { preferRealtime: true });
          quotesMap.set(sym, q);
        } catch {
          // 報價取得失敗時跳過該檔股票
        }
      })
    );

    const results: AlertEvaluationResult[] = [];
    let stateChanged = false;

    for (const rule of activeRules) {
      const quote = quotesMap.get(rule.symbol);
      if (!quote) continue;

      const prevCrossing = rule.triggeredCrossing;
      const evalResult = evaluateAlert(rule, quote);
      results.push(evalResult);

      if (evalResult.triggered) {
        this.dispatchNotification(evalResult);
      }

      if (rule.triggeredCrossing !== prevCrossing || evalResult.triggered) {
        stateChanged = true;
      }
    }

    // 若有規則狀態變更（例如已穿越或回落重設），寫回儲存庫持久化
    if (stateChanged) {
      for (const rule of activeRules) {
        await this.repo.updateRule(rule.id, {
          triggeredCrossing: rule.triggeredCrossing,
          lastTriggeredAt: rule.lastTriggeredAt,
        });
      }
    }

    return results;
  }

  private dispatchNotification(res: AlertEvaluationResult): void {
    if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
      const notifId = `alert_${res.rule.symbol}_${Date.now()}`;
      chrome.notifications.create(
        notifId,
        {
          type: 'basic',
          iconUrl: chrome.runtime.getURL ? chrome.runtime.getURL('icons/icon-128.png') : 'icons/icon-128.png',
          title: `🦁 StockLion 股力獅 到價提醒`,
          message: res.message || `${res.rule.symbol} 已達到設定之警戒門檻！`,
          priority: 2,
        },
        () => {}
      );
    }
  }
}

export const alertEngine = new AlertEngine();
