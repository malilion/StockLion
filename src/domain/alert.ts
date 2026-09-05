import type { Quote } from './quote';

export type AlertType = 'price-above' | 'price-below' | 'percent-change' | 'volume-ratio';

export type AlertRule =
  | {
      id: string;
      symbol: string;
      name?: string;
      type: 'price-above';
      threshold: number;
      requires: ['quote:realtime'];
      enabled: boolean;
      createdAt?: string;
      lastTriggeredAt?: string;
      triggeredCrossing?: boolean;
    }
  | {
      id: string;
      symbol: string;
      name?: string;
      type: 'price-below';
      threshold: number;
      requires: ['quote:realtime'];
      enabled: boolean;
      createdAt?: string;
      lastTriggeredAt?: string;
      triggeredCrossing?: boolean;
    }
  | {
      id: string;
      symbol: string;
      name?: string;
      type: 'percent-change';
      threshold: number;
      direction: 'up' | 'down';
      requires: ['quote:realtime'];
      enabled: boolean;
      createdAt?: string;
      lastTriggeredAt?: string;
      triggeredCrossing?: boolean;
    }
  | {
      id: string;
      symbol: string;
      name?: string;
      type: 'volume-ratio';
      threshold: number;
      requires: ['quote:realtime'];
      enabled: boolean;
      createdAt?: string;
      lastTriggeredAt?: string;
      triggeredCrossing?: boolean;
    };

export type AlertRuleInput =
  | {
      symbol: string;
      name?: string;
      type: 'price-above';
      threshold: number;
      requires: ['quote:realtime'];
      enabled: boolean;
    }
  | {
      symbol: string;
      name?: string;
      type: 'price-below';
      threshold: number;
      requires: ['quote:realtime'];
      enabled: boolean;
    }
  | {
      symbol: string;
      name?: string;
      type: 'percent-change';
      threshold: number;
      direction: 'up' | 'down';
      requires: ['quote:realtime'];
      enabled: boolean;
    }
  | {
      symbol: string;
      name?: string;
      type: 'volume-ratio';
      threshold: number;
      requires: ['quote:realtime'];
      enabled: boolean;
    };

export interface AlertEvaluationResult {
  rule: AlertRule;
  triggered: boolean;
  message?: string;
  currentValue?: number;
}

/**
 * 評估警示規則是否觸發。
 * 遵循 SPEC 嚴格要求：
 * 1. 同一 Crossing（突破或跌破）不重複通知（Notification De-dup）。
 * 2. 股價回落或脫離閾值區間後自動重設 triggeredCrossing，下次重新穿越可再次觸發。
 */
export function evaluateAlert(rule: AlertRule, quote: Quote): AlertEvaluationResult {
  if (!rule.enabled || quote.price == null) {
    return { rule, triggered: false };
  }

  const stockName = rule.name || quote.name || rule.symbol;
  let conditionMet = false;
  let message = '';
  let currentValue = quote.price;

  switch (rule.type) {
    case 'price-above': {
      conditionMet = quote.price >= rule.threshold;
      currentValue = quote.price;
      const sign = (quote.change ?? 0) >= 0 ? '+' : '';
      message = `${rule.symbol} ${stockName} 已突破 $${rule.threshold}（現價 $${quote.price}，今日 ${sign}${quote.changePercent ?? 0}%）`;
      break;
    }

    case 'price-below': {
      conditionMet = quote.price <= rule.threshold;
      currentValue = quote.price;
      const sign = (quote.change ?? 0) >= 0 ? '+' : '';
      message = `${rule.symbol} ${stockName} 已跌破 $${rule.threshold}（現價 $${quote.price}，今日 ${sign}${quote.changePercent ?? 0}%）`;
      break;
    }

    case 'percent-change': {
      const pct = quote.changePercent ?? 0;
      currentValue = pct;
      if (rule.direction === 'up') {
        conditionMet = pct >= Math.abs(rule.threshold);
        message = `${rule.symbol} ${stockName} 今日漲幅已達 +${pct}%（已超過設定之 +${rule.threshold}%）`;
      } else {
        conditionMet = pct <= -Math.abs(rule.threshold);
        message = `${rule.symbol} ${stockName} 今日跌幅已達 ${pct}%（已低於設定之 -${Math.abs(rule.threshold)}%）`;
      }
      break;
    }

    case 'volume-ratio': {
      const vol = quote.volume ?? 0;
      currentValue = vol;
      conditionMet = vol >= rule.threshold;
      message = `${rule.symbol} ${stockName} 成交量已達 ${vol} 張（突破設定門檻 ${rule.threshold} 張）`;
      break;
    }
  }

  if (conditionMet) {
    // 檢查是否已在該次 Crossing 中觸發過 (De-dup)
    if (rule.triggeredCrossing) {
      return { rule, triggered: false, currentValue };
    }

    // 新的 Crossing 觸發
    rule.triggeredCrossing = true;
    rule.lastTriggeredAt = new Date().toISOString();
    return {
      rule,
      triggered: true,
      message,
      currentValue,
    };
  } else {
    // 脫離條件區間，重設狀態以便下次穿越時可重新觸發
    if (rule.triggeredCrossing) {
      rule.triggeredCrossing = false;
    }
    return { rule, triggered: false, currentValue };
  }
}
