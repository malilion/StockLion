export interface HoverQuoteData {
  symbol: string;
  name: string;
  market: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  freshnessBadge: string;
  freshness?: 'realtime' | 'eod' | 'delayed' | 'stale';
  tradingDate?: string;
  inWatchlist?: boolean;
  onToggleWatchlist?: (symbol: string) => Promise<boolean>;
  onOpenDetail?: (symbol: string) => void;
}

export class HoverCard {
  private host: HTMLDivElement | null = null;
  private container: HTMLDivElement | null = null;
  private hideTimeout: any = null;
  private currentTarget: HTMLElement | null = null;
  private currentData: HoverQuoteData | null = null;

  constructor() {
    this.injectStyles();
  }

  private injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('stocklion-peek-styles')) return;

    // 僅注入頁面中 Target Span 的標記樣式
    const style = document.createElement('style');
    style.id = 'stocklion-peek-styles';
    style.textContent = `
      .stocklion-target {
        border-bottom: 1.5px dashed #f59e0b;
        color: inherit;
        cursor: pointer;
        transition: background-color 0.2s;
        border-radius: 2px;
        padding: 0 1px;
      }
      .stocklion-target:hover {
        background-color: rgba(245, 158, 11, 0.15);
      }
    `;
    document.head.appendChild(style);
  }

  private getCardStyleContent(): string {
    return `
      .stocklion-card-popover {
        position: relative;
        width: 240px;
        background-color: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
        padding: 12px;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
        box-sizing: border-box;
      }
      .stocklion-card-popover * {
        box-sizing: border-box;
      }
      .stocklion-card-popover.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .sl-card-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 6px;
      }
      .sl-card-name {
        font-weight: 700;
        font-size: 14px;
        color: #f1f5f9;
      }
      .sl-card-symbol {
        font-size: 12px;
        color: #94a3b8;
        margin-left: 4px;
      }
      .sl-card-badge {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        background-color: #1e293b;
        color: #fbbf24;
      }
      .sl-card-badge.realtime {
        background-color: rgba(16, 185, 129, 0.15);
        color: #10b981;
        font-weight: 600;
      }
      .sl-card-badge.eod {
        background-color: #1e293b;
        color: #94a3b8;
      }
      .sl-card-price-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin: 8px 0;
      }
      .sl-card-price {
        font-size: 20px;
        font-weight: 700;
      }
      .sl-card-change {
        font-size: 13px;
        font-weight: 600;
      }
      .sl-card-change.up { color: #ef4444; }
      .sl-card-change.down { color: #10b981; }
      .sl-card-footer {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #1e293b;
      }
      .sl-card-btn {
        flex: 1;
        background: #1e293b;
        border: 1px solid #334155;
        color: #e2e8f0;
        font-size: 11px;
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }
      .sl-card-btn:hover {
        background: #334155;
      }
      .sl-card-btn.in-watchlist {
        background: rgba(245, 158, 11, 0.15);
        border-color: #f59e0b;
        color: #fbbf24;
        font-weight: 600;
      }
    `;
  }

  show(target: HTMLElement, data: HoverQuoteData) {
    if (typeof document === 'undefined') return;
    this.clearHideTimeout();
    this.currentTarget = target;
    this.currentData = data;

    if (!this.container) {
      this.host = document.createElement('div');
      this.host.className = 'stocklion-card-host';
      this.host.style.position = 'absolute';
      this.host.style.zIndex = '2147483647';
      this.host.style.pointerEvents = 'none';

      const shadow = this.host.attachShadow ? this.host.attachShadow({ mode: 'open' }) : null;

      const style = document.createElement('style');
      style.textContent = this.getCardStyleContent();

      this.container = document.createElement('div');
      this.container.className = 'stocklion-card-popover';
      this.container.addEventListener('mouseenter', () => this.clearHideTimeout());
      this.container.addEventListener('mouseleave', () => this.hide());

      if (shadow) {
        shadow.appendChild(style);
        shadow.appendChild(this.container);
      } else {
        this.host.appendChild(style);
        this.host.appendChild(this.container);
      }

      document.body.appendChild(this.host);
    }

    const isUp = (data.change ?? 0) > 0;
    const isDown = (data.change ?? 0) < 0;
    const changeClass = isUp ? 'up' : isDown ? 'down' : '';
    const sign = isUp ? '+' : '';
    const badgeClass = data.freshness === 'realtime' ? 'realtime' : 'eod';

    const watchlistText = data.inWatchlist ? '★ 已在自選' : '⭐ 加入自選';
    const watchlistBtnClass = data.inWatchlist ? 'sl-card-btn in-watchlist' : 'sl-card-btn';

    // 嚴格使用 DOM 節點建立與 textContent，杜絕 XSS 注入
    const header = document.createElement('div');
    header.className = 'sl-card-header';

    const titleGroup = document.createElement('div');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sl-card-name';
    nameSpan.textContent = data.name;

    const symbolSpan = document.createElement('span');
    symbolSpan.className = 'sl-card-symbol';
    symbolSpan.textContent = data.symbol;

    titleGroup.appendChild(nameSpan);
    titleGroup.appendChild(symbolSpan);

    const badge = document.createElement('span');
    badge.className = `sl-card-badge ${badgeClass}`;
    badge.textContent = data.freshnessBadge;

    header.appendChild(titleGroup);
    header.appendChild(badge);

    const priceRow = document.createElement('div');
    priceRow.className = 'sl-card-price-row';

    const priceSpan = document.createElement('span');
    priceSpan.className = 'sl-card-price';
    priceSpan.textContent = data.price != null ? `$${data.price}` : '--';

    const changeSpan = document.createElement('span');
    changeSpan.className = `sl-card-change ${changeClass}`.trim();
    changeSpan.textContent =
      data.change != null
        ? `${sign}${data.change} (${sign}${data.changePercent}%)`
        : '--';

    priceRow.appendChild(priceSpan);
    priceRow.appendChild(changeSpan);

    const footer = document.createElement('div');
    footer.className = 'sl-card-footer';

    const watchlistBtn = document.createElement('button');
    watchlistBtn.className = watchlistBtnClass;
    watchlistBtn.id = 'sl-btn-watchlist';
    watchlistBtn.textContent = watchlistText;

    const detailBtn = document.createElement('button');
    detailBtn.className = 'sl-card-btn';
    detailBtn.id = 'sl-btn-detail';
    detailBtn.textContent = '→ 詳細資訊';

    footer.appendChild(watchlistBtn);
    footer.appendChild(detailBtn);

    if (typeof this.container.replaceChildren === 'function') {
      this.container.replaceChildren(header, priceRow, footer);
    } else {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      this.container.appendChild(header);
      this.container.appendChild(priceRow);
      this.container.appendChild(footer);
    }

    // 綁定按鈕事件
    if (data.onToggleWatchlist) {
      watchlistBtn.onclick = async (e) => {
        e.stopPropagation();
        watchlistBtn.disabled = true;
        try {
          const nowInWatchlist = await data.onToggleWatchlist!(data.symbol);
          data.inWatchlist = nowInWatchlist;
          watchlistBtn.textContent = nowInWatchlist ? '★ 已在自選' : '⭐ 加入自選';
          watchlistBtn.className = nowInWatchlist ? 'sl-card-btn in-watchlist' : 'sl-card-btn';
        } finally {
          watchlistBtn.disabled = false;
        }
      };
    }

    if (data.onOpenDetail) {
      detailBtn.onclick = (e) => {
        e.stopPropagation();
        data.onOpenDetail!(data.symbol);
      };
    }

    // 計算定位
    const rect = target.getBoundingClientRect();
    const scrollX = (typeof window !== 'undefined' ? window.scrollX : 0) || document.documentElement?.scrollLeft || 0;
    const scrollY = (typeof window !== 'undefined' ? window.scrollY : 0) || document.documentElement?.scrollTop || 0;
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;

    let left = rect.left + scrollX;
    let top = rect.bottom + scrollY + 6;

    // 防止右側溢出
    if (left + 250 > winWidth + scrollX) {
      left = winWidth + scrollX - 255;
    }

    const safeLeft = Math.max(8, left);
    if (this.host) {
      this.host.style.left = `${safeLeft}px`;
      this.host.style.top = `${top}px`;
    }

    // 觸發顯示動畫
    requestAnimationFrame(() => {
      this.container?.classList.add('visible');
    });
  }

  hide() {
    this.clearHideTimeout();
    this.hideTimeout = setTimeout(() => {
      if (this.container) {
        this.container.classList.remove('visible');
      }
      this.currentTarget = null;
      this.currentData = null;
    }, 150);
  }

  private clearHideTimeout() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  destroy() {
    this.clearHideTimeout();
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    } else if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.host = null;
    this.container = null;
    this.currentData = null;
  }
}

export const hoverCard = new HoverCard();
