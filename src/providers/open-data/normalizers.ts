import type { Quote } from '../../domain/quote';
import type { FundamentalSnapshot } from '../../domain/fundamental';
import type { Market } from '../../domain/stock';

export function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  let str = String(val).trim().replace(/,/g, '');
  if (str === '--' || str === 'N/A' || str === '除息' || str === '除權') return null;

  // 處理特殊符號如 "+20.0"、"- 5.0"、"▼ 1.5"、"▲ 2.0"、全形 "－" "＋"
  let isNegative = false;
  if (str.startsWith('▼') || str.startsWith('-') || str.startsWith('－')) {
    isNegative = true;
    str = str.replace(/^[▼\-－]\s*/, '');
  } else if (str.startsWith('▲') || str.startsWith('+') || str.startsWith('＋')) {
    str = str.replace(/^[▲\+＋]\s*/, '');
  }

  str = str.replace(/\s+/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  if (num === 0) return 0;
  return isNegative ? -num : num;
}

export interface RawTwseStockDayAll {
  Code: string;
  Name: string;
  TradeVolume: string;
  TradeValue: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
  ClosingPrice: string;
  Change: string;
  Transaction: string;
}

export interface RawTwseValuation {
  Code: string;
  Name: string;
  PEratio: string;
  DividendYield: string;
  PBratio: string;
}

export function normalizeTwseQuote(
  raw: RawTwseStockDayAll,
  tradingDate: string,
  receivedAt: string = new Date().toISOString()
): Quote {
  const price = parseNumeric(raw.ClosingPrice);
  const open = parseNumeric(raw.OpeningPrice);
  const high = parseNumeric(raw.HighestPrice);
  const low = parseNumeric(raw.LowestPrice);
  const volume = parseNumeric(raw.TradeVolume);

  let change = parseNumeric(raw.Change);
  // TWSE Change 常帶有正負或 +/- 字樣
  if (raw.Change?.includes('-') && change !== null && change > 0) {
    change = -change;
  }

  // 若能計算前日收盤
  const previousClose =
    price !== null && change !== null ? Math.round((price - change) * 100) / 100 : null;
  const changePercent =
    previousClose !== null && previousClose > 0 && change !== null
      ? Math.round(((change / previousClose) * 100) * 100) / 100
      : null;

  return {
    symbol: raw.Code,
    name: raw.Name,
    market: 'TWSE',
    source: 'twse-open-data',
    freshness: 'eod', // 硬性保證：OpenData 永遠是 eod
    tradingDate,
    asOf: `${tradingDate}T13:30:00+08:00`,
    receivedAt,
    price,
    previousClose,
    open,
    high,
    low,
    volume,
    change,
    changePercent,
  };
}

export function normalizeTpexQuote(
  raw: any,
  tradingDate: string,
  receivedAt: string = new Date().toISOString()
): Quote {
  const symbol = raw.SecuritiesCompanyCode || raw.Code || raw.symbol;
  const name = raw.CompanyName || raw.Name || raw.name;
  const price = parseNumeric(raw.Close || raw.ClosingPrice || raw.price);
  const change = parseNumeric(raw.Change || raw.change);
  const open = parseNumeric(raw.Open || raw.OpeningPrice);
  const high = parseNumeric(raw.High || raw.HighestPrice);
  const low = parseNumeric(raw.Low || raw.LowestPrice);
  const volume = parseNumeric(raw.TradeVolume || raw.TradingVolume);

  const previousClose =
    price !== null && change !== null ? Math.round((price - change) * 100) / 100 : null;
  const changePercent =
    previousClose !== null && previousClose > 0 && change !== null
      ? Math.round(((change / previousClose) * 100) * 100) / 100
      : null;

  return {
    symbol,
    name,
    market: 'TPEx',
    source: 'tpex-open-data',
    freshness: 'eod', // 硬性保證：OpenData 永遠是 eod
    tradingDate,
    asOf: `${tradingDate}T13:30:00+08:00`,
    receivedAt,
    price,
    previousClose,
    open,
    high,
    low,
    volume,
    change,
    changePercent,
  };
}

export function normalizeTwseValuation(
  raw: RawTwseValuation,
  tradingDate: string,
  receivedAt: string = new Date().toISOString()
): FundamentalSnapshot {
  return {
    symbol: raw.Code,
    pe: parseNumeric(raw.PEratio),
    pb: parseNumeric(raw.PBratio),
    dividendYield: parseNumeric(raw.DividendYield),
    eps: null,
    source: 'twse-open-data',
    freshness: 'eod',
    tradingDate,
    asOf: `${tradingDate}T13:30:00+08:00`,
    receivedAt,
  };
}
