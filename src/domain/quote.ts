import type { Market } from './stock';

export type DataFreshness =
  | 'realtime'
  | 'delayed'
  | 'eod'
  | 'stale';

export interface DataStamp {
  source: string;
  freshness: DataFreshness;
  /** Provider 所宣告的資料時間 (ISO string) */
  asOf: string;
  /** Extension 實際收到資料的時間 (ISO string) */
  receivedAt: string;
  /** 若為盤後資料，必須填交易日 YYYY-MM-DD */
  tradingDate?: string;
}

export interface Quote extends DataStamp {
  symbol: string;
  name: string;
  market: Market;

  price: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;

  change: number | null;
  changePercent: number | null;
}

/**
 * 全域統一的報價狀態 Badge 標示函式 (規格 35.2)
 */
export function quoteBadge(quote: Quote): string {
  switch (quote.freshness) {
    case 'realtime':
      return '● 即時';
    case 'delayed':
      return '◐ 延遲';
    case 'eod':
      return `○ ${quote.tradingDate ? `${quote.tradingDate} ` : ''}收盤`;
    case 'stale':
      return '⚠ 資料較舊';
  }
}
