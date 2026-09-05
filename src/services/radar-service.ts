import type { RadarCategory, RadarItem, RadarResult } from '../domain/radar';
import { cacheService } from './cache-service';
import radarData from '../../tests/fixtures/radar.json';
import attentionData from '../../tests/fixtures/attention.json';
import dispositionData from '../../tests/fixtures/disposition.json';

const CATEGORY_LABELS: Record<RadarCategory, string> = {
  gainers: '今日漲幅排行',
  losers: '今日跌幅排行',
  volume: '成交量排行',
  unusual_volume: '爆量排行',
  attention: '注意股票清單',
  disposition: '處置股票清單',
};

export class RadarService {
  private tradingDate = '2026-09-04';

  async getRadar(category: RadarCategory): Promise<RadarResult> {
    const cacheKey = `radar:${this.tradingDate}:${category}`;
    const cached = cacheService.get<RadarResult>(cacheKey);
    if (cached) return cached;

    const items = this.computeCategoryItems(category);

    const result: RadarResult = {
      category,
      categoryLabel: CATEGORY_LABELS[category],
      tradingDate: this.tradingDate,
      items,
      updatedAt: new Date().toISOString(),
    };

    // 盤後資料快取 30 分鐘
    cacheService.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }

  private computeCategoryItems(category: RadarCategory): RadarItem[] {
    const baseList = [...(radarData as any[])];

    switch (category) {
      case 'gainers': {
        const sorted = baseList
          .filter((item) => item.changePercent > 0)
          .sort((a, b) => b.changePercent - a.changePercent);

        return sorted.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume,
          metricLabel: '漲跌幅',
          metricValue: `+${item.changePercent}%`,
        }));
      }

      case 'losers': {
        const sorted = baseList
          .filter((item) => item.changePercent < 0)
          .sort((a, b) => a.changePercent - b.changePercent);

        return sorted.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume,
          metricLabel: '漲跌幅',
          metricValue: `${item.changePercent}%`,
        }));
      }

      case 'volume': {
        const sorted = baseList.sort((a, b) => b.volume - a.volume);
        return sorted.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume,
          metricLabel: '成交量',
          metricValue: `${(item.volume / 1000).toFixed(1)} 萬張`,
        }));
      }

      case 'unusual_volume': {
        const sorted = baseList.sort((a, b) => b.volumeRatio - a.volumeRatio);
        return sorted.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume,
          metricLabel: '爆量比',
          metricValue: `${item.volumeRatio}%`,
        }));
      }

      case 'attention': {
        return (attentionData as any[]).map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume,
          metricLabel: '狀態',
          metricValue: '注意股',
          tag: item.reason,
        }));
      }

      case 'disposition': {
        return (dispositionData as any[]).map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume,
          metricLabel: '狀態',
          metricValue: '處置股',
          tag: `${item.period} (${item.reason})`,
        }));
      }
    }
  }
}

export const radarService = new RadarService();
