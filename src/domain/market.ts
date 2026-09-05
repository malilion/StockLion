import type { DataStamp } from './quote';
import type { Market } from './stock';

export interface MarketStatus extends DataStamp {
  symbol: string;
  isAttention: boolean;
  isDisposition: boolean;
  isLimitUp?: boolean;
  isLimitDown?: boolean;
}

export interface MarketSummary extends DataStamp {
  market: Market;
  name: string;
  indexPrice: number;
  change: number;
  changePercent: number;
  totalVolume?: number;
  totalTurnover?: number;
  advanceCount?: number;
  declineCount?: number;
  unchangedCount?: number;
}
