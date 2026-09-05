import type { Market } from './stock';

export type RadarCategory =
  | 'gainers'
  | 'losers'
  | 'volume'
  | 'unusual_volume'
  | 'attention'
  | 'disposition';

export interface RadarItem {
  symbol: string;
  name: string;
  market: Market;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number;
  metricLabel: string;
  metricValue: string;
  tag?: string;
}

export interface RadarResult {
  category: RadarCategory;
  categoryLabel: string;
  tradingDate: string;
  items: RadarItem[];
  updatedAt: string;
}
