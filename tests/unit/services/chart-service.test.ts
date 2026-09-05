import { describe, it, expect, beforeEach } from 'vitest';
import { ChartService } from '../../../src/services/chart-service';
import { cacheService } from '../../../src/services/cache-service';

describe('ChartService', () => {
  let chartService: ChartService;

  beforeEach(() => {
    cacheService.clear();
    chartService = new ChartService();
  });

  it('should generate valid candlestick series with OHLC relationships', async () => {
    const history = await chartService.getChartHistory('2330', '1M');

    expect(history.symbol).toBe('2330');
    expect(history.period).toBe('1M');
    expect(history.candles.length).toBeGreaterThan(0);

    for (const candle of history.candles) {
      expect(candle.high).toBeGreaterThanOrEqual(Math.max(candle.open, candle.close));
      expect(candle.low).toBeLessThanOrEqual(Math.min(candle.open, candle.close));
      expect(candle.volume).toBeGreaterThan(0);
      expect(typeof candle.time).toBe('string');
    }
  });

  it('should return cached chart history within TTL', async () => {
    const first = await chartService.getChartHistory('2330', '1M');
    const second = await chartService.getChartHistory('2330', '1M');

    expect(second).toEqual(first);
  });

  it('should support multiple chart periods (1D, 5D, 1M, 3M, 1Y)', async () => {
    const history1D = await chartService.getChartHistory('2330', '1D');
    const history1Y = await chartService.getChartHistory('2330', '1Y');

    expect(history1D.period).toBe('1D');
    expect(history1Y.period).toBe('1Y');
    expect(history1D.candles.length).not.toBe(history1Y.candles.length);
  });
});
