import { describe, it, expect, beforeEach } from 'vitest';
import { StockDetector } from '../../../src/stock-peek/detector';
import stockDictionary from '../../fixtures/stock-dictionary.json';
import sampleTexts from '../../fixtures/sample-texts.json';

describe('StockDetector & False-Positive Benchmarks', () => {
  let detector: StockDetector;

  beforeEach(() => {
    detector = new StockDetector();
    detector.loadDictionary(stockDictionary as any);
  });

  it('should accurately detect stocks in PTT Stock posts', () => {
    for (const post of sampleTexts.ptt_stock_posts) {
      const entities = detector.detect(post.text);
      const foundSymbols = entities.map((e) => e.symbol);

      for (const expected of post.expectedSymbols) {
        expect(
          foundSymbols,
          `Expected to find ${expected} in: "${post.text}"`
        ).toContain(expected);
      }
    }
  });

  it('should accurately detect stocks and ETFs in Threads financial posts', () => {
    for (const post of sampleTexts.threads_finance_posts) {
      const entities = detector.detect(post.text);
      const foundSymbols = entities.map((e) => e.symbol);

      for (const expected of post.expectedSymbols) {
        expect(
          foundSymbols,
          `Expected to find ${expected} in: "${post.text}"`
        ).toContain(expected);
      }
    }
  });

  it('should have 0% false-positives on tricky non-stock sentences (years, prices, phones, pudding)', () => {
    for (const testCase of sampleTexts.false_positive_cases) {
      const entities = detector.detect(testCase.text);
      expect(
        entities,
        `False positive triggered on: "${testCase.text}" (${testCase.description}). Found: ${JSON.stringify(
          entities.map((e) => e.matchedText)
        )}`
      ).toHaveLength(0);
    }
  });

  it('should merge adjacent symbol and company name into a single "both" entity', () => {
    const text = '今日焦點股 2330 台積電 逆勢抗跌！';
    const entities = detector.detect(text);

    expect(entities).toHaveLength(1);
    expect(entities[0].symbol).toBe('2330');
    expect(entities[0].name).toBe('台積電');
    expect(entities[0].matchType).toBe('both');
    expect(entities[0].matchedText).toBe('2330 台積電');
  });

  it('should ignore 4-digit numbers when no financial context keywords exist', () => {
    const text = '我們約定明天下午在 2330 會議室見面討論專案進度。';
    const entities = detector.detect(text);
    expect(entities).toHaveLength(0);
  });

  it('should detect 6-digit ETF symbols like 006208 in financial context', () => {
    const text = '許多人每月定期定額存股 006208，長期獲利穩健。';
    const entities = detector.detect(text);
    expect(entities.some((e) => e.symbol === '006208')).toBe(true);
  });
});
