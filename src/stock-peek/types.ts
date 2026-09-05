import type { Market } from '../domain/stock';

export type EntityMatchType = 'symbol' | 'name' | 'both';

export interface StockDictItem {
  symbol: string;
  name: string;
  fullName?: string;
  market: Market;
}

export interface ContextKeywordMatch {
  keyword: string;
  weight: number;
}

export interface ContextAnalysis {
  score: number;
  matchedKeywords: ContextKeywordMatch[];
  hasNegativeContext: boolean;
}

export interface DetectedEntity {
  symbol: string;
  name: string;
  market: Market;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  matchType: EntityMatchType;
  confidence: number;
  contextScore: number;
}

export interface DetectorOptions {
  /** 候選字詞前後窗口字元長度，預設 35 */
  contextWindowSize?: number;
  /** 代號通過所需的最低上下文評分，預設 3 */
  symbolScoreThreshold?: number;
  /** 公司全名通過所需的最低上下文評分，預設 1 */
  nameScoreThreshold?: number;
  /** 歧義短名稱（如統一、大同）所需的最低上下文評分，預設 3 */
  ambiguousNameThreshold?: number;
}
