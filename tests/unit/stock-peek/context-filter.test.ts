import { describe, it, expect } from 'vitest';
import { ContextFilter } from '../../../src/stock-peek/context-filter';

describe('ContextFilter', () => {
  const filter = new ContextFilter();

  it('should grant high positive scores for strong financial keywords', () => {
    const text = '今天台積電股票表現強勢，盤中直接強攻漲停！';
    const index = text.indexOf('台積電');
    const analysis = filter.analyze(text, index, index + 3, false);
    expect(analysis.score).toBeGreaterThanOrEqual(6); // 包含 '股票' (+3) 與 '漲停' (+3)
    expect(analysis.hasNegativeContext).toBe(false);
  });

  it('should detect and reject 4-digit numbers adjacent to other digits', () => {
    const text = '本季總產量達到 123305 顆晶片';
    const index = text.indexOf('2330');
    const analysis = filter.analyze(text, index, index + 4, true);
    expect(analysis.score).toBe(-999);
    expect(analysis.hasNegativeContext).toBe(true);
  });

  it('should detect and reject years (e.g., 2024年)', () => {
    const text = '2024年巴黎奧運正式開幕';
    const index = text.indexOf('2024');
    const analysis = filter.analyze(text, index, index + 4, true);
    expect(analysis.score).toBe(-999);
    expect(analysis.hasNegativeContext).toBe(true);
  });

  it('should detect and penalize phone number formats', () => {
    const text = '聯絡專線請撥 0912-2317-2454';
    const index = text.indexOf('2317');
    const analysis = filter.analyze(text, index, index + 4, true);
    expect(analysis.score).toBe(-999);
    expect(analysis.hasNegativeContext).toBe(true);
  });

  it('should detect negative goods keywords for ambiguous company names', () => {
    const puddingText = '今天下午去便利商店買了統一布丁當點心';
    const puddingIndex = puddingText.indexOf('統一');
    const puddingAnalysis = filter.analyze(puddingText, puddingIndex, puddingIndex + 2, false);
    expect(puddingAnalysis.hasNegativeContext).toBe(true);

    const cookerText = '台灣人家裡必備的大同電鍋很好用';
    const cookerIndex = cookerText.indexOf('大同');
    const cookerAnalysis = filter.analyze(cookerText, cookerIndex, cookerIndex + 2, false);
    expect(cookerAnalysis.hasNegativeContext).toBe(true);
  });
});
