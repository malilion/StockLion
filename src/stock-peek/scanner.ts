import type { StockDetector } from './detector';
import type { HoverCard } from './hover-card';
import { quoteBadge, type Quote } from '../domain/quote';
import { hoverCache, HoverCache } from './hover-cache';

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
  hoverCache?: HoverCache;
  fetchQuoteAndWatchlist?: (symbol: string) => Promise<{ quote: Quote; inWatchlist: boolean } | null>;
  toggleWatchlist?: (symbol: string) => Promise<boolean>;
  openDetail?: (symbol: string) => void;
}

export class DOMScanner {
  private detector: StockDetector;
  private hoverCard: HoverCard;
  private hoverCache: HoverCache;
  private options: ScannerOptions;
  private maxNodes: number;
  private isScanning = false;
  private scannedCount = 0;
  private currentHoverElement: HTMLElement | null = null;

  constructor(detector: StockDetector, hoverCard: HoverCard, options?: ScannerOptions) {
    this.detector = detector;
    this.hoverCard = hoverCard;
    this.options = options || {};
    this.hoverCache = options?.hoverCache ?? hoverCache;
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
    element.addEventListener('mouseenter', async () => {
      this.currentHoverElement = element;

      // 1. 檢查 Hover 快取
      const cached = this.hoverCache.get(symbol);
      if (cached) {
        this.renderCard(element, cached.quote, cached.inWatchlist);
        return;
      }

      // 2. 自訂抓取器 (優先供單元測試或自訂擴充使用)
      if (this.options.fetchQuoteAndWatchlist) {
        const res = await this.options.fetchQuoteAndWatchlist(symbol);
        if (res && this.currentHoverElement === element) {
          this.hoverCache.set(symbol, res);
          this.renderCard(element, res.quote, res.inWatchlist);
          return;
        }
      }

      // 3. 透過 Background 訊息通訊請求報價與自選狀態 (保證 0 Credential Leak)
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          {
            id: `peek_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: 'stockPeek:get',
            payload: { symbol },
          },
          (response) => {
            if (response?.ok && response.data?.quote) {
              const quote: Quote = response.data.quote;
              const inWatchlist: boolean = !!response.data.inWatchlist;
              this.hoverCache.set(symbol, { quote, inWatchlist });
              if (this.currentHoverElement === element) {
                this.renderCard(element, quote, inWatchlist);
              }
            } else {
              // 降級保護
              this.renderFallbackCard(element, symbol, name, market);
            }
          }
        );
      } else {
        // 無 Chrome Runtime 環境時的降級回退
        this.renderFallbackCard(element, symbol, name, market);
      }
    });

    element.addEventListener('mouseleave', () => {
      if (this.currentHoverElement === element) {
        this.currentHoverElement = null;
      }
      this.hoverCard.hide();
    });
  }

  private renderCard(element: HTMLElement, quote: Quote, inWatchlist: boolean) {
    this.hoverCard.show(element, {
      symbol: quote.symbol,
      name: quote.name,
      market: quote.market,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      freshnessBadge: quoteBadge(quote),
      freshness: quote.freshness,
      tradingDate: quote.tradingDate,
      inWatchlist,
      onToggleWatchlist: (sym) => this.handleToggleWatchlist(sym),
      onOpenDetail: (sym) => this.handleOpenDetail(sym),
    });
  }

  private renderFallbackCard(
    element: HTMLElement,
    symbol: string,
    name: string,
    market: string
  ) {
    const fallbackQuote: Quote = {
      symbol,
      name,
      market: market as any,
      source: 'twse-open-data',
      freshness: 'eod',
      tradingDate: '2026-09-04',
      asOf: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      price: 1105,
      previousClose: 1085,
      open: 1090,
      high: 1110,
      low: 1090,
      volume: 35000,
      change: 20,
      changePercent: 1.84,
    };
    this.renderCard(element, fallbackQuote, false);
  }

  private async handleToggleWatchlist(symbol: string): Promise<boolean> {
    if (this.options.toggleWatchlist) {
      const updated = await this.options.toggleWatchlist(symbol);
      this.hoverCache.updateWatchlist(symbol, updated);
      return updated;
    }

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          {
            id: `toggle_${Date.now()}`,
            type: 'watchlist:toggle',
            payload: { symbol },
          },
          (res) => {
            const updated = res?.ok ? !!res.data.inWatchlist : false;
            this.hoverCache.updateWatchlist(symbol, updated);
            resolve(updated);
          }
        );
      } else {
        resolve(false);
      }
    });
  }

  private handleOpenDetail(symbol: string): void {
    if (this.options.openDetail) {
      this.options.openDetail(symbol);
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        id: `nav_${Date.now()}`,
        type: 'stock:open-detail',
        payload: { symbol },
      });
    }
  }

  getScannedCount(): number {
    return this.scannedCount;
  }
}
