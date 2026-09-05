import type {
  DetectedEntity,
  DetectorOptions,
  StockDictItem,
} from './types';
import { ContextFilter, AMBIGUOUS_NAMES } from './context-filter';

export class StockDetector {
  private symbolMap = new Map<string, StockDictItem>();
  private nameMap = new Map<string, StockDictItem>();
  private contextFilter: ContextFilter;

  private symbolThreshold: number;
  private nameThreshold: number;
  private ambiguousThreshold: number;

  constructor(options?: DetectorOptions) {
    this.contextFilter = new ContextFilter(options);
    this.symbolThreshold = options?.symbolScoreThreshold ?? 3;
    this.nameThreshold = options?.nameScoreThreshold ?? 1;
    this.ambiguousThreshold = options?.ambiguousNameThreshold ?? 3;
  }

  loadDictionary(items: StockDictItem[]) {
    this.symbolMap.clear();
    this.nameMap.clear();

    for (const item of items) {
      this.symbolMap.set(item.symbol, item);
      this.nameMap.set(item.name, item);
    }
  }

  detect(text: string): DetectedEntity[] {
    if (!text || (this.symbolMap.size === 0 && this.nameMap.size === 0)) {
      return [];
    }

    const candidates: DetectedEntity[] = [];

    // 1. 掃描數字代號 (4 ~ 5 位數字)
    const symbolRegex = /\b(\d{4,5})\b/g;
    let match: RegExpExecArray | null;

    while ((match = symbolRegex.exec(text)) !== null) {
      const symbol = match[1];
      const stock = this.symbolMap.get(symbol);
      if (!stock) continue;

      const startIndex = match.index;
      const endIndex = startIndex + symbol.length;

      // 檢查候選數字前後是否緊鄰對應公司名稱 (如 "2330 台積電" 或 "台積電(2330)")
      const nextWindow = text.slice(endIndex, endIndex + stock.name.length + 3);
      const prevWindow = text.slice(Math.max(0, startIndex - stock.name.length - 3), startIndex);
      const isAdjacentToName = nextWindow.includes(stock.name) || prevWindow.includes(stock.name);

      const context = this.contextFilter.analyze(text, startIndex, endIndex, true);

      // 若緊鄰對應公司名稱，直接放行；否則必須 >= symbolThreshold
      if (isAdjacentToName || (context.score >= this.symbolThreshold && !context.hasNegativeContext)) {
        candidates.push({
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market,
          startIndex,
          endIndex,
          matchedText: symbol,
          matchType: 'symbol',
          confidence: isAdjacentToName ? 1.0 : Math.min(1.0, 0.6 + context.score * 0.08),
          contextScore: isAdjacentToName ? Math.max(context.score, 5) : context.score,
        });
      }
    }

    // 2. 掃描公司名稱
    for (const [name, stock] of this.nameMap.entries()) {
      let searchPos = 0;
      while (searchPos < text.length) {
        const foundIndex = text.indexOf(name, searchPos);
        if (foundIndex === -1) break;

        const startIndex = foundIndex;
        const endIndex = startIndex + name.length;
        searchPos = endIndex;

        // 檢查前後是否緊鄰代號
        const nextWindow = text.slice(endIndex, endIndex + 8);
        const prevWindow = text.slice(Math.max(0, startIndex - 8), startIndex);
        const isAdjacentToSymbol = nextWindow.includes(stock.symbol) || prevWindow.includes(stock.symbol);

        const isAmbiguous = AMBIGUOUS_NAMES.has(name);
        const context = this.contextFilter.analyze(text, startIndex, endIndex, false);
        const threshold = isAmbiguous ? this.ambiguousThreshold : this.nameThreshold;

        if (isAdjacentToSymbol || (context.score >= threshold && !context.hasNegativeContext)) {
          candidates.push({
            symbol: stock.symbol,
            name: stock.name,
            market: stock.market,
            startIndex,
            endIndex,
            matchedText: name,
            matchType: 'name',
            confidence: isAdjacentToSymbol ? 1.0 : Math.min(1.0, 0.7 + context.score * 0.08),
            contextScore: isAdjacentToSymbol ? Math.max(context.score, 5) : context.score,
          });
        }
      }
    }

    // 3. 排序並合併相鄰的「代號 + 公司名」(例如 "2330 台積電" 或 "台積電 2330")
    candidates.sort((a, b) => a.startIndex - b.startIndex);

    const merged: DetectedEntity[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const current = candidates[i];
      const next = i + 1 < candidates.length ? candidates[i + 1] : null;

      // 檢查是否緊鄰且屬於同一檔股票 (距離在 3 個字元以內，如空白或括弧)
      if (
        next &&
        next.symbol === current.symbol &&
        next.startIndex >= current.endIndex &&
        next.startIndex - current.endIndex <= 3
      ) {
        merged.push({
          symbol: current.symbol,
          name: current.name,
          market: current.market,
          startIndex: current.startIndex,
          endIndex: next.endIndex,
          matchedText: text.slice(current.startIndex, next.endIndex),
          matchType: 'both',
          confidence: 1.0,
          contextScore: Math.max(current.contextScore, next.contextScore) + 2,
        });
        i++; // 跳過已合併的下一個
      } else {
        // 檢查是否與前一個重疊
        const prev = merged.length > 0 ? merged[merged.length - 1] : null;
        if (prev && current.startIndex < prev.endIndex) {
          // 重疊衝突，保留信心度更高者
          if (current.confidence > prev.confidence) {
            merged[merged.length - 1] = current;
          }
        } else {
          merged.push(current);
        }
      }
    }

    return merged;
  }
}

export const stockDetector = new StockDetector();
