import { describe, it, expect, beforeEach } from 'vitest';
import { RadarService } from '../../../src/services/radar-service';
import { cacheService } from '../../../src/services/cache-service';

describe('RadarService', () => {
  let service: RadarService;

  beforeEach(() => {
    cacheService.clear();
    service = new RadarService();
  });

  it('should compute gainers sorted by changePercent descending with positive values', async () => {
    const result = await service.getRadar('gainers');

    expect(result.category).toBe('gainers');
    expect(result.tradingDate).toBe('2026-09-04');
    expect(result.items.length).toBeGreaterThan(0);

    // 驗證降序
    for (let i = 0; i < result.items.length - 1; i++) {
      expect(result.items[i].changePercent).toBeGreaterThanOrEqual(result.items[i + 1].changePercent!);
      expect(result.items[i].changePercent).toBeGreaterThan(0);
    }
  });

  it('should compute losers sorted by changePercent ascending with negative values', async () => {
    const result = await service.getRadar('losers');

    expect(result.category).toBe('losers');
    expect(result.items.length).toBeGreaterThan(0);

    // 驗證跌幅由大到小（負值由小到大）
    for (let i = 0; i < result.items.length - 1; i++) {
      expect(result.items[i].changePercent).toBeLessThanOrEqual(result.items[i + 1].changePercent!);
      expect(result.items[i].changePercent).toBeLessThan(0);
    }
  });

  it('should compute volume rankings sorted by volume descending', async () => {
    const result = await service.getRadar('volume');

    expect(result.category).toBe('volume');
    expect(result.items.length).toBeGreaterThan(0);

    for (let i = 0; i < result.items.length - 1; i++) {
      expect(result.items[i].volume).toBeGreaterThanOrEqual(result.items[i + 1].volume);
    }
  });

  it('should compute unusual volume (爆量排行) sorted by ratio', async () => {
    const result = await service.getRadar('unusual_volume');

    expect(result.category).toBe('unusual_volume');
    expect(result.items.length).toBeGreaterThan(0);
    // 第一名應為奇鋐 245%
    expect(result.items[0].symbol).toBe('3017');
    expect(result.items[0].metricValue).toBe('245%');
  });

  it('should return attention and disposition stocks with reasons and tags', async () => {
    const attention = await service.getRadar('attention');
    expect(attention.items.length).toBeGreaterThan(0);
    expect(attention.items[0].metricValue).toBe('注意股');
    expect(attention.items[0].tag).toBeDefined();

    const disposition = await service.getRadar('disposition');
    expect(disposition.items.length).toBeGreaterThan(0);
    expect(disposition.items[0].metricValue).toBe('處置股');
    expect(disposition.items[0].tag).toContain('09/01 ~ 09/14');
  });

  it('should cache results across multiple queries', async () => {
    const first = await service.getRadar('gainers');
    const second = await service.getRadar('gainers');

    expect(second).toEqual(first);
  });
});
