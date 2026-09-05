export type Market = 'TWSE' | 'TPEx';
export type InstrumentType = 'stock' | 'etf' | 'other';

export interface StockSymbol {
  symbol: string;
  name: string;
  fullName?: string;
  market: Market;
  instrumentType: InstrumentType;
  isin?: string;
}
