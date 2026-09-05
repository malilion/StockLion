import type { CandleData, ChartPeriod, ChartHistory } from '../domain/chart';
import { cacheService } from './cache-service';
import { quoteService } from './quote-service';

export class ChartService {
  async getChartHistory(symbol: string, period: ChartPeriod = '1M'): Promise<ChartHistory> {
    const cacheKey = `chart:history:${symbol}:${period}`;
    const cached = cacheService.get<ChartHistory>(cacheKey);
    if (cached) return cached;

    // 取得基準 Quote 作為錨點
    let basePrice = 100;
    try {
      const q = await quoteService.getBestQuote(symbol);
      if (q.price) basePrice = q.price;
    } catch {
      // 容錯降級預設價格
    }

    const candles = this.generateCandleSeries(basePrice, period);

    const history: ChartHistory = {
      symbol,
      period,
      candles,
      updatedAt: new Date().toISOString(),
    };

    cacheService.set(cacheKey, history, 15 * 60 * 1000); // 15 分鐘快取
    return history;
  }

  private generateCandleSeries(basePrice: number, period: ChartPeriod): CandleData[] {
    const countMap: Record<ChartPeriod, number> = {
      '1D': 8,
      '5D': 10,
      '1M': 22,
      '3M': 35,
      '1Y': 50,
    };

    const count = countMap[period] || 22;
    const candles: CandleData[] = [];
    let currentPrice = basePrice * 0.95;

    const today = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const variance = (Math.random() - 0.48) * (basePrice * 0.025);
      const open = Math.round(currentPrice * 10) / 10;
      currentPrice = Math.max(1, currentPrice + variance);
      const close = i === 0 ? basePrice : Math.round(currentPrice * 10) / 10;

      const highDelta = Math.random() * (basePrice * 0.015);
      const lowDelta = Math.random() * (basePrice * 0.015);
      const high = Math.round((Math.max(open, close) + highDelta) * 10) / 10;
      const low = Math.round((Math.min(open, close) - lowDelta) * 10) / 10;
      const volume = Math.round(1500 + Math.random() * 8000);

      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const timeStr = period === '1D' ? `${0 + (count - i)}:30` : `${month}/${day}`;

      candles.push({
        time: timeStr,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    return candles;
  }
}

export const chartService = new ChartService();
