import type { StockDetector } from './detector';
import type { HoverCard } from './hover-card';
import { quoteBadge, type Quote } from '../domain/quote';

const IGNORED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'INPUT',
  'TEXTAREA',
  'PRE',
  'CODE',
  'SVG',
  'BUTTON',
  'A',
]);

export interface ScannerOptions {
  maxNodesPerScan?: number;
}

export class DOMScanner {
  private detector: StockDetector;
  private hoverCard: HoverCard;
  private maxNodes: number;
  private isScanning = false;
  private scannedCount = 0;

  constructor(detector: StockDetector, hoverCard: HoverCard, options?: ScannerOptions) {
    this.detector = detector;
    this.hoverCard = hoverCard;
    this.maxNodes = options?.maxNodesPerScan ?? 500;
  }

  scan(root: Node = document.body): number {
    if (this.isScanning || !root || typeof document === 'undefined') return 0;
    this.isScanning = true;
    let matchedSpans = 0;

    try {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node: Node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            // 忽略不可見或表單/代碼元素
            if (IGNORED_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
            if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
            if (parent.classList.contains('stocklion-target')) return NodeFilter.FILTER_REJECT;
            if (parent.closest('.stocklion-card-popover')) return NodeFilter.FILTER_REJECT;

            // 忽略空字串或純空白
            if (!node.textContent || node.textContent.trim().length === 0) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const textNodes: Text[] = [];
      let current: Node | null = walker.nextNode();

      while (current && textNodes.length < this.maxNodes) {
        textNodes.push(current as Text);
        current = walker.nextNode();
      }

      this.scannedCount += textNodes.length;

      // 處理收集到的文字節點
      for (const textNode of textNodes) {
        const text = textNode.textContent;
        if (!text) continue;

        const entities = this.detector.detect(text);
        if (entities.length === 0) continue;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        for (const entity of entities) {
          // 加入實體前方的文字
          if (entity.startIndex > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.slice(lastIndex, entity.startIndex))
            );
          }

          // 建立高亮 span
          const span = document.createElement('span');
          span.className = 'stocklion-target';
          span.setAttribute('data-symbol', entity.symbol);
          span.setAttribute('data-name', entity.name);
          span.setAttribute('data-market', entity.market);
          span.textContent = entity.matchedText;

          // 綁定 Hover 事件
          this.attachHoverEvents(span, entity.symbol, entity.name, entity.market);

          fragment.appendChild(span);
          lastIndex = entity.endIndex;
          matchedSpans++;
        }

        // 加入尾部剩餘文字
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      }
    } finally {
      this.isScanning = false;
    }

    return matchedSpans;
  }

  private attachHoverEvents(
    element: HTMLElement,
    symbol: string,
    name: string,
    market: string
  ) {
    element.addEventListener('mouseenter', () => {
      // 模擬/讀取 Quote 資料 (在 Phase 6 會接駁 Background 訊息協議)
      const mockQuote: Quote = {
        symbol,
        name,
        market: market as any,
        source: 'twse-open-data',
        freshness: 'eod',
        tradingDate: '09/04',
        asOf: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        price: symbol === '2330' ? 1105 : symbol === '2454' ? 1420 : 250,
        previousClose: symbol === '2330' ? 1085 : symbol === '2454' ? 1400 : 248,
        open: 1090,
        high: 1110,
        low: 1090,
        volume: 35000,
        change: symbol === '2330' ? 20 : symbol === '2454' ? 20 : 2,
        changePercent: symbol === '2330' ? 1.84 : 1.43,
      };

      this.hoverCard.show(element, {
        symbol,
        name,
        market,
        price: mockQuote.price,
        change: mockQuote.change,
        changePercent: mockQuote.changePercent,
        freshnessBadge: quoteBadge(mockQuote),
        tradingDate: mockQuote.tradingDate,
      });
    });

    element.addEventListener('mouseleave', () => {
      this.hoverCard.hide();
    });
  }

  getScannedCount(): number {
    return this.scannedCount;
  }
}
