import type { ContextAnalysis, ContextKeywordMatch, DetectorOptions } from './types';

const STRONG_KEYWORDS = [
  '股票', '股價', '漲停', '跌停', '收盤', '開盤',
  '標的', '持股', '存股', '多單', '空單', 'ETF',
  '做多', '做空', '台股', '美股', '加權指數'
];

const MEDIUM_KEYWORDS = [
  '大盤', '外資', '投信', '自營商', '買超', '賣超',
  '主力', '量能', '爆量', '季線', '月線', '均線',
  '破線', '突破', '回檔', '殖利率', '本益比', '除權息', '營收', '財報'
];

const WEAK_KEYWORDS = [
  '漲', '跌', '買', '賣', '張', '籌碼', '股'
];

const NEGATIVE_PATTERNS = [
  /電鍋/,                  // 大同電鍋
  /布丁|麵包|純喫茶|超商/,  // 統一超商/布丁
  /電話|專線|撥打|手機/,    // 電話號碼
  /訂單|編號|序號|門票/,    // 訂單編號
  /奧運|賽事|運動員/,       // 體育運動
  /特價|優惠|售價|折價券/,   // 純消費特價商品
];

export const AMBIGUOUS_NAMES = new Set(['統一', '大同', '東元']);

export class ContextFilter {
  private windowSize: number;

  constructor(options?: DetectorOptions) {
    this.windowSize = options?.contextWindowSize ?? 40;
  }

  analyze(
    fullText: string,
    startIndex: number,
    endIndex: number,
    isDigitSymbol: boolean
  ): ContextAnalysis {
    const windowStart = Math.max(0, startIndex - this.windowSize);
    const windowEnd = Math.min(fullText.length, endIndex + this.windowSize);

    // 取得前後文窗口 (排除候選字本身)
    const prefixText = fullText.slice(windowStart, startIndex);
    const suffixText = fullText.slice(endIndex, windowEnd);
    const windowText = prefixText + ' ' + suffixText;

    const matchedKeywords: ContextKeywordMatch[] = [];
    let score = 0;
    let hasNegative = false;

    // 1. 數字代號專屬負向邊界檢查
    if (isDigitSymbol) {
      // 檢查是否緊鄰前後數字 (例如 12330 或 23301)
      const prevChar = startIndex > 0 ? fullText[startIndex - 1] : '';
      const nextChar = endIndex < fullText.length ? fullText[endIndex] : '';
      if (/\d/.test(prevChar) || /\d/.test(nextChar)) {
        return { score: -999, matchedKeywords: [], hasNegativeContext: true };
      }

      // 檢查是否為電話格式 (例如 0912-2317 或 2317-2454)
      if (prefixText.endsWith('-') || suffixText.startsWith('-')) {
        return { score: -999, matchedKeywords: [], hasNegativeContext: true };
      }

      // 檢查是否為年份 (如 "2024年" 或 "2024/")
      if (/^\s*[年月日\/\-]/.test(suffixText)) {
        return { score: -999, matchedKeywords: [], hasNegativeContext: true };
      }

      // 檢查前方是否為年份修飾詞 (例如 "西元2024" 或 "民國113")
      if (/西元|民國|西元\s*$/.test(prefixText)) {
        return { score: -999, matchedKeywords: [], hasNegativeContext: true };
      }

      // 檢查是否為金額但無其他股票關鍵字 (如 "$2330" 或 "2330元")
      const isPriceNotation =
        prefixText.endsWith('$') ||
        prefixText.endsWith('NT$') ||
        /^\s*元/.test(suffixText);
      if (isPriceNotation) {
        score -= 2;
      }
    }

    // 2. 檢測負向關鍵字
    for (const pattern of NEGATIVE_PATTERNS) {
      if (pattern.test(windowText)) {
        hasNegative = true;
        score -= 4;
        break;
      }
    }

    // 3. 檢測正向強關鍵字 (+3)
    for (const kw of STRONG_KEYWORDS) {
      if (windowText.includes(kw)) {
        matchedKeywords.push({ keyword: kw, weight: 3 });
        score += 3;
      }
    }

    // 4. 檢測正向中關鍵字 (+2)
    for (const kw of MEDIUM_KEYWORDS) {
      if (windowText.includes(kw)) {
        matchedKeywords.push({ keyword: kw, weight: 2 });
        score += 2;
      }
    }

    // 5. 檢測正向弱關鍵字 (+1)
    for (const kw of WEAK_KEYWORDS) {
      if (windowText.includes(kw)) {
        matchedKeywords.push({ keyword: kw, weight: 1 });
        score += 1;
      }
    }

    return {
      score,
      matchedKeywords,
      hasNegativeContext: hasNegative,
    };
  }
}

export const contextFilter = new ContextFilter();
