export type ChartPeriod = '1D' | '5D' | '1M' | '3M' | '1Y';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartHistory {
  symbol: string;
  period: ChartPeriod;
  candles: CandleData[];
  updatedAt: string;
}
