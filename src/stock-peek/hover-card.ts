export interface HoverQuoteData {
  symbol: string;
  name: string;
  market: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  freshnessBadge: string;
  tradingDate?: string;
}

export class HoverCard {
  private container: HTMLDivElement | null = null;
  private hideTimeout: any = null;
  private currentTarget: HTMLElement | null = null;

  constructor() {
    this.injectStyles();
  }

  private injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('stocklion-peek-styles')) return;

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
      .stocklion-card-popover {
        position: absolute;
        z-index: 2147483647;
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
        transition: background 0.2s;
      }
      .sl-card-btn:hover {
        background: #334155;
      }
    `;
    document.head.appendChild(style);
  }

  show(target: HTMLElement, data: HoverQuoteData) {
    if (typeof document === 'undefined') return;
    this.clearHideTimeout();
    this.currentTarget = target;

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'stocklion-card-popover';
      this.container.addEventListener('mouseenter', () => this.clearHideTimeout());
      this.container.addEventListener('mouseleave', () => this.hide());
      document.body.appendChild(this.container);
    }

    const isUp = (data.change ?? 0) > 0;
    const isDown = (data.change ?? 0) < 0;
    const changeClass = isUp ? 'up' : isDown ? 'down' : '';
    const sign = isUp ? '+' : '';

    this.container.innerHTML = `
      <div class="sl-card-header">
        <div>
          <span class="sl-card-name">${data.name}</span>
          <span class="sl-card-symbol">${data.symbol}</span>
        </div>
        <span class="sl-card-badge">${data.freshnessBadge}</span>
      </div>
      <div class="sl-card-price-row">
        <span class="sl-card-price">${data.price != null ? `$${data.price}` : '--'}</span>
        <span class="sl-card-change ${changeClass}">
          ${data.change != null ? `${sign}${data.change} (${sign}${data.changePercent}%)` : '--'}
        </span>
      </div>
      <div class="sl-card-footer">
        <button class="sl-card-btn" id="sl-btn-watchlist">⭐ 加入自選</button>
        <button class="sl-card-btn" id="sl-btn-detail">→ 詳細資訊</button>
      </div>
    `;

    // 計算定位
    const rect = target.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    let left = rect.left + scrollX;
    let top = rect.bottom + scrollY + 6;

    // 防止右側溢出
    if (left + 250 > window.innerWidth + scrollX) {
      left = window.innerWidth + scrollX - 255;
    }

    this.container.style.left = `${Math.max(8, left)}px`;
    this.container.style.top = `${top}px`;

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
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}

export const hoverCard = new HoverCard();
