import type { RadarCategory, RadarItem, RadarResult } from '../domain/radar';
import { cacheService } from './cache-service';
import { openDataProvider, OpenDataProvider } from '../providers/open-data/provider';
import type { Quote } from '../domain/quote';
import fallbackRadar from '../data/fallback-radar.json';

const CATEGORY_LABELS: Record<RadarCategory, string> = {
  gainers: '今日漲幅排行',
  losers: '今日跌幅排行',
  volume: '成交量排行',
  unusual_volume: '爆量排行',
  attention: '注意股票清單',
  disposition: '處置股票清單',
};

export class RadarService {
  private openData: OpenDataProvider;

  constructor(openData: OpenDataProvider = openDataProvider) {
    this.openData = openData;
  }

  async getRadar(category: RadarCategory): Promise<RadarResult> {
    let quotes: Quote[] = [];
    try {
      quotes = await this.openData.getAllQuotes();
    } catch {
      // 離線降級至本機備份雷達資料
    }

    const tradingDate = quotes[0]?.tradingDate || fallbackRadar.tradingDate;
    const cacheKey = `radar:${tradingDate}:${category}`;
    const cached = cacheService.get<RadarResult>(cacheKey);
    if (cached) return cached;

    const items = this.computeCategoryItems(category, quotes);

    const result: RadarResult = {
      category,
      categoryLabel: CATEGORY_LABELS[category],
      tradingDate,
      items,
      updatedAt: new Date().toISOString(),
    };

    // 盤後資料快取 30 分鐘
    cacheService.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }

  private computeCategoryItems(category: RadarCategory, quotes: Quote[]): RadarItem[] {
    switch (category) {
      case 'gainers': {
        const source =
          quotes.length > 0
            ? quotes.filter((q) => q.changePercent != null && q.changePercent > 0)
            : fallbackRadar.rankings.filter((item) => item.changePercent > 0);

        const sorted = [...source]
          .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
          .slice(0, 20);

        return sorted.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market as any,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume ?? 0,
          metricLabel: '漲跌幅',
          metricValue: `+${item.changePercent}%`,
        }));
      }

      case 'losers': {
        const source =
          quotes.length > 0
            ? quotes.filter((q) => q.changePercent != null && q.changePercent < 0)
            : fallbackRadar.rankings.filter((item) => item.changePercent < 0);

        const sorted = [...source]
          .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
          .slice(0, 20);

        return sorted.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market as any,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume ?? 0,
          metricLabel: '漲跌幅',
          metricValue: `${item.changePercent}%`,
        }));
      }

      case 'volume': {
        const source =
          quotes.length > 0
            ? quotes.filter((q) => q.volume != null && q.volume > 0)
            : fallbackRadar.rankings;

        const sorted = [...source]
          .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
          .slice(0, 20);

        return sorted.map((item) => {
          const vol = item.volume ?? 0;
          return {
            symbol: item.symbol,
            name: item.name,
            market: item.market as any,
            price: item.price,
            change: item.change,
            changePercent: item.changePercent,
            volume: vol,
            metricLabel: '成交量',
            metricValue: `${(vol / 1000).toFixed(1)} 萬張`,
          };
        });
      }

      case 'unusual_volume': {
        const sorted = [...fallbackRadar.rankings].sort((a, b) => b.volumeRatio - a.volumeRatio);
        return sorted.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market as any,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume ?? 0,
          metricLabel: '爆量比',
          metricValue: `${item.volumeRatio}%`,
        }));
      }

      case 'attention': {
        return fallbackRadar.attention.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market as any,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume ?? 0,
          metricLabel: '狀態',
          metricValue: '注意股',
          tag: item.reason,
        }));
      }

      case 'disposition': {
        return fallbackRadar.disposition.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: item.market as any,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          volume: item.volume ?? 0,
          metricLabel: '狀態',
          metricValue: '處置股',
          tag: `${item.period} (${item.reason})`,
        }));
      }
    }
  }
}

export const radarService = new RadarService();
