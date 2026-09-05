import { describe, it, expect } from 'vitest';
import { evaluateAlert, type AlertRule } from '../../../src/domain/alert';
import type { Quote } from '../../../src/domain/quote';

describe('Alert Rules & Threshold Crossing De-dup Engine', () => {
  const baseQuote: Quote = {
    symbol: '2330',
    name: '台積電',
    market: 'TWSE',
    source: 'fugle',
    freshness: 'realtime',
    price: 1100,
    previousClose: 1080,
    open: 1085,
    high: 1105,
    low: 1085,
    volume: 30000,
    change: 20,
    changePercent: 1.85,
    asOf: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };

  describe('price-above Threshold Crossing', () => {
    it('should trigger on initial crossing and prevent duplicate triggers while price remains elevated', () => {
      const rule: AlertRule = {
        id: 'alert_1',
        symbol: '2330',
        name: '台積電',
        type: 'price-above',
        threshold: 1100,
        requires: ['quote:realtime'],
        enabled: true,
      };

      // 1. 股價剛好達到門檻 1100 -> 首次突破 (Crossing)
      const res1 = evaluateAlert(rule, { ...baseQuote, price: 1100 });
      expect(res1.triggered).toBe(true);
      expect(res1.message).toContain('突破 $1100');
      expect(rule.triggeredCrossing).toBe(true);
      expect(rule.lastTriggeredAt).toBeDefined();

      // 2. 下一分鐘，股價進一步攀升至 1105 -> 仍在門檻上方，但不應重複觸發通知 (De-dup)
      const res2 = evaluateAlert(rule, { ...baseQuote, price: 1105 });
      expect(res2.triggered).toBe(false);
      expect(rule.triggeredCrossing).toBe(true);

      // 3. 隨後股價回落至 1095 -> 脫離條件區間，重設 crossing 狀態
      const res3 = evaluateAlert(rule, { ...baseQuote, price: 1095 });
      expect(res3.triggered).toBe(false);
      expect(rule.triggeredCrossing).toBe(false);

      // 4. 股價再次突破 1100 -> 再次觸發通知！
      const res4 = evaluateAlert(rule, { ...baseQuote, price: 1102 });
      expect(res4.triggered).toBe(true);
      expect(rule.triggeredCrossing).toBe(true);
    });
  });

  describe('price-below Threshold Crossing', () => {
    it('should trigger when price drops below threshold and de-dup until reset', () => {
      const rule: AlertRule = {
        id: 'alert_2',
        symbol: '2330',
        name: '台積電',
        type: 'price-below',
        threshold: 1050,
        requires: ['quote:realtime'],
        enabled: true,
      };

      // 股價 1060，未跌破
      const res1 = evaluateAlert(rule, { ...baseQuote, price: 1060 });
      expect(res1.triggered).toBe(false);

      // 股價跌至 1045 -> 跌破觸發
      const res2 = evaluateAlert(rule, { ...baseQuote, price: 1045 });
      expect(res2.triggered).toBe(true);
      expect(res2.message).toContain('跌破 $1050');
      expect(rule.triggeredCrossing).toBe(true);

      // 股價續跌至 1040 -> 不重複通知
      const res3 = evaluateAlert(rule, { ...baseQuote, price: 1040 });
      expect(res3.triggered).toBe(false);

      // 股價反彈回 1055 -> 重設
      const res4 = evaluateAlert(rule, { ...baseQuote, price: 1055 });
      expect(res4.triggered).toBe(false);
      expect(rule.triggeredCrossing).toBe(false);
    });
  });

  describe('percent-change Threshold Crossing', () => {
    it('should trigger when positive or negative percentage change reaches threshold', () => {
      const upRule: AlertRule = {
        id: 'alert_up',
        symbol: '2330',
        type: 'percent-change',
        direction: 'up',
        threshold: 3.0,
        requires: ['quote:realtime'],
        enabled: true,
      };

      // 漲幅 2.5% -> 未達
      expect(evaluateAlert(upRule, { ...baseQuote, changePercent: 2.5 }).triggered).toBe(false);

      // 漲幅 3.2% -> 觸發
      const upRes = evaluateAlert(upRule, { ...baseQuote, changePercent: 3.2 });
      expect(upRes.triggered).toBe(true);
      expect(upRes.message).toContain('漲幅已達 +3.2%');

      // 漲幅 3.5% -> 不重複觸發
      expect(evaluateAlert(upRule, { ...baseQuote, changePercent: 3.5 }).triggered).toBe(false);
    });
  });

  describe('Disabled and Null Price Guards', () => {
    it('should never trigger if rule is disabled or quote price is null', () => {
      const disabledRule: AlertRule = {
        id: 'alert_dis',
        symbol: '2330',
        type: 'price-above',
        threshold: 1000,
        requires: ['quote:realtime'],
        enabled: false,
      };

      const res = evaluateAlert(disabledRule, { ...baseQuote, price: 1100 });
      expect(res.triggered).toBe(false);

      const nullPriceRes = evaluateAlert(
        { ...disabledRule, enabled: true },
        { ...baseQuote, price: null }
      );
      expect(nullPriceRes.triggered).toBe(false);
    });
  });
});
