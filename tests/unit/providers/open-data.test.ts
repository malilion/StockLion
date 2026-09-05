import { describe, it, expect } from 'vitest';
import {
  parseNumeric,
  normalizeTwseQuote,
  normalizeTpexQuote,
  normalizeTwseValuation,
  type RawTwseStockDayAll,
} from '../../../src/providers/open-data/normalizers';
import { openDataProvider } from '../../../src/providers/open-data/provider';

describe('OpenData Provider & Normalizers', () => {
  it('should declare correct capabilities and NEVER declare quote:realtime', () => {
    expect(openDataProvider.meta.capabilities).toContain('quote:eod');
    expect(openDataProvider.meta.capabilities).toContain('fundamental:valuation');
    expect(openDataProvider.meta.capabilities).toContain('symbol:list');

    // 硬性不可妥協規則：OpenDataProvider 禁止宣告 quote:realtime
    expect(openDataProvider.meta.capabilities).not.toContain('quote:realtime');
    expect(openDataProvider.meta.capabilities).not.toContain('chart:intraday');
  });

  it('should accurately normalize TWSE raw quote and guarantee freshness is eod', () => {
    const raw: RawTwseStockDayAll = {
      Code: '2330',
      Name: '台積電',
      TradeVolume: '35,620,100',
      TradeValue: '39,350,000,000',
      OpeningPrice: '1,090.00',
      HighestPrice: '1,110.00',
      LowestPrice: '1,090.00',
      ClosingPrice: '1,105.00',
      Change: '+20.00',
      Transaction: '45,210',
    };

    const quote = normalizeTwseQuote(raw, '2026-09-04');

    expect(quote.symbol).toBe('2330');
    expect(quote.name).toBe('台積電');
    expect(quote.market).toBe('TWSE');
    expect(quote.source).toBe('twse-open-data');
    expect(quote.tradingDate).toBe('2026-09-04');
    expect(quote.price).toBe(1105);
    expect(quote.open).toBe(1090);
    expect(quote.high).toBe(1110);
    expect(quote.low).toBe(1090);
    expect(quote.volume).toBe(35620100);
    expect(quote.change).toBe(20);
    expect(quote.previousClose).toBe(1085);
    expect(quote.changePercent).toBe(1.84);

    // 硬性保證：OpenData 永遠不得回傳 freshness: realtime
    expect(quote.freshness).toBe('eod');
    expect(quote.freshness).not.toBe('realtime');
  });

  it('should handle negative changes and zero/null values correctly in TWSE', () => {
    const raw: RawTwseStockDayAll = {
      Code: '2317',
      Name: '鴻海',
      TradeVolume: '20,000,000',
      TradeValue: '4,000,000,000',
      OpeningPrice: '205.00',
      HighestPrice: '206.00',
      LowestPrice: '201.00',
      ClosingPrice: '202.00',
      Change: '-3.00',
      Transaction: '20,000',
    };

    const quote = normalizeTwseQuote(raw, '2026-09-04');
    expect(quote.price).toBe(202);
    expect(quote.change).toBe(-3);
    expect(quote.previousClose).toBe(205);
    expect(quote.changePercent).toBe(-1.46);
    expect(quote.freshness).toBe('eod');
  });

  it('should accurately normalize TPEx OTC raw quote', () => {
    const raw = {
      SecuritiesCompanyCode: '6488',
      CompanyName: '環球晶',
      Close: '480.00',
      Change: '5.00',
      Open: '476.00',
      High: '483.00',
      Low: '475.00',
      TradingVolume: '1,500,000',
    };

    const quote = normalizeTpexQuote(raw, '2026-09-04');
    expect(quote.symbol).toBe('6488');
    expect(quote.name).toBe('環球晶');
    expect(quote.market).toBe('TPEx');
    expect(quote.source).toBe('tpex-open-data');
    expect(quote.price).toBe(480);
    expect(quote.change).toBe(5);
    expect(quote.previousClose).toBe(475);
    expect(quote.freshness).toBe('eod');
  });

  it('should normalize valuation data with PE, PB, and dividend yield', () => {
    const raw = {
      Code: '2330',
      Name: '台積電',
      PEratio: '28.5',
      DividendYield: '1.45',
      PBratio: '6.8',
    };

    const valuation = normalizeTwseValuation(raw, '2026-09-04');
    expect(valuation.symbol).toBe('2330');
    expect(valuation.pe).toBe(28.5);
    expect(valuation.dividendYield).toBe(1.45);
    expect(valuation.pb).toBe(6.8);
    expect(valuation.freshness).toBe('eod');
  });

  it('should parse various numeric formats correctly with parseNumeric', () => {
    expect(parseNumeric('1105.00')).toBe(1105);
    expect(parseNumeric('1,105.00')).toBe(1105);
    expect(parseNumeric('+20.00')).toBe(20);
    expect(parseNumeric('-3.00')).toBe(-3);
    expect(parseNumeric('- 1.50')).toBe(-1.5);
    expect(parseNumeric('▼ 2.50')).toBe(-2.5);
    expect(parseNumeric('▲ 3.00')).toBe(3);
    expect(parseNumeric('－5.00')).toBe(-5);
    expect(parseNumeric('0.00')).toBe(0);
    expect(parseNumeric('--')).toBeNull();
    expect(parseNumeric('N/A')).toBeNull();
    expect(parseNumeric('除息')).toBeNull();
    expect(parseNumeric(null)).toBeNull();
    expect(parseNumeric(undefined)).toBeNull();
    expect(parseNumeric('')).toBeNull();
  });
});
