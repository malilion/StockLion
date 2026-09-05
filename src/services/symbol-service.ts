import type { StockSymbol, Market, InstrumentType } from '../domain/stock';
import stockDictionary from '../../tests/fixtures/stock-dictionary.json';

export class SymbolService {
  private symbols: StockSymbol[] = [];
  private symbolIndex = new Map<string, StockSymbol>();

  constructor() {
    this.initDefaultSymbols();
  }

  private initDefaultSymbols() {
    const list: StockSymbol[] = (stockDictionary as any[]).map((item) => {
      let instrumentType: InstrumentType = 'stock';
      if (item.symbol.startsWith('00')) {
        instrumentType = 'etf';
      }
      return {
        symbol: item.symbol,
        name: item.name,
        fullName: item.fullName,
        market: (item.market as Market) || 'TWSE',
        instrumentType,
      };
    });

    this.loadSymbols(list);
  }

  loadSymbols(list: StockSymbol[]): void {
    this.symbols = list;
    this.symbolIndex.clear();
    for (const item of list) {
      this.symbolIndex.set(item.symbol, item);
    }
  }

  getBySymbol(symbol: string): StockSymbol | null {
    return this.symbolIndex.get(symbol) ?? null;
  }

  getAll(): StockSymbol[] {
    return [...this.symbols];
  }

  search(query: string, limit: number = 20): StockSymbol[] {
    const q = query.trim().toUpperCase();
    if (!q) return [];

    const isNumeric = /^\d+$/.test(q);

    // 分層排序權重
    const exactMatches: StockSymbol[] = [];
    const prefixMatches: StockSymbol[] = [];
    const containsMatches: StockSymbol[] = [];

    for (const item of this.symbols) {
      if (isNumeric) {
        if (item.symbol === q) {
          exactMatches.push(item);
        } else if (item.symbol.startsWith(q)) {
          prefixMatches.push(item);
        } else if (item.symbol.includes(q)) {
          containsMatches.push(item);
        }
      } else {
        if (item.name === q) {
          exactMatches.push(item);
        } else if (item.name.startsWith(q)) {
          prefixMatches.push(item);
        } else if (item.name.includes(q) || (item.fullName && item.fullName.includes(q))) {
          containsMatches.push(item);
        }
      }

      if (exactMatches.length + prefixMatches.length >= limit) {
        break;
      }
    }

    return [...exactMatches, ...prefixMatches, ...containsMatches].slice(0, limit);
  }
}

export const symbolService = new SymbolService();
