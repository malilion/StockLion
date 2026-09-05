import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAppStore } from '../../../src/stores/app';
import { radarService } from '../../../src/services/radar-service';
import type { RadarCategory } from '../../../src/domain/radar';

describe('RadarView & Category Navigation Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should support all 6 radar categories required by SPEC', async () => {
    const categories: RadarCategory[] = [
      'gainers',
      'losers',
      'volume',
      'unusual_volume',
      'attention',
      'disposition',
    ];

    for (const cat of categories) {
      const result = await radarService.getRadar(cat);
      expect(result).toBeDefined();
      expect(result.category).toBe(cat);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.tradingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('should seamlessly navigate to stock detail when an item in Radar is selected', async () => {
    const appStore = useAppStore();
    expect(appStore.selectedSymbol).toBeNull();

    const gainers = await radarService.getRadar('gainers');
    const topGainer = gainers.items[0];
    expect(topGainer).toBeDefined();

    // Clicking a radar card triggers viewStockDetail
    appStore.viewStockDetail(topGainer.symbol);
    expect(appStore.selectedSymbol).toBe(topGainer.symbol);

    // Returning closes stock detail
    appStore.closeStockDetail();
    expect(appStore.selectedSymbol).toBeNull();
  });

  it('should ensure caution tags and notes exist for attention and disposition categories', async () => {
    const attentionResult = await radarService.getRadar('attention');
    expect(attentionResult.items[0].tag).toBeDefined();
    expect(attentionResult.items[0].tag).toContain('週轉率');

    const dispositionResult = await radarService.getRadar('disposition');
    expect(dispositionResult.items[0].tag).toBeDefined();
    expect(dispositionResult.items[0].tag).toContain('撮合');
  });
});
