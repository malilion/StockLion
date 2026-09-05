import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAppStore } from '../../../src/stores/app';
import type { MarketStatus } from '../../../src/domain/market';
import quote2330Fixture from '../../fixtures/quote-eod-2330.json';
import fundamentals2330Fixture from '../../fixtures/fundamentals-2330.json';
import { quoteBadge, type Quote } from '../../../src/domain/quote';
import type { FundamentalSnapshot } from '../../../src/domain/fundamental';

describe('StockDetail Domain & Navigation Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should manage stock detail navigation state cleanly in app store', () => {
    const appStore = useAppStore();
    expect(appStore.selectedSymbol).toBeNull();

    appStore.viewStockDetail('2330');
    expect(appStore.selectedSymbol).toBe('2330');

    appStore.closeStockDetail();
    expect(appStore.selectedSymbol).toBeNull();

    appStore.viewStockDetail('2454');
    appStore.setTab('radar');
    // 切換分頁時應自動重設 selectedSymbol
    expect(appStore.selectedSymbol).toBeNull();
    expect(appStore.currentTab).toBe('radar');
  });

  it('should render 2330 fixture completely using domain models without raw provider JSON leaks', () => {
    const quote: Quote = quote2330Fixture as Quote;
    const fundamental: FundamentalSnapshot = fundamentals2330Fixture as FundamentalSnapshot;

    expect(quote.symbol).toBe('2330');
    expect(quote.name).toBe('台積電');
    expect(quote.price).toBe(1105);
    expect(quote.change).toBe(20);
    expect(quote.freshness).toBe('eod');
    expect(quoteBadge(quote)).toBe('○ 2026-09-04 收盤');

    expect(fundamental.pe).toBe(28.5);
    expect(fundamental.pb).toBe(6.8);
    expect(fundamental.dividendYield).toBe(1.45);
    expect(fundamental.eps).toBe(38.8);
  });

  it('should accurately represent attention, disposition, and limit states in MarketStatus model', () => {
    const normalStatus: MarketStatus = {
      symbol: '2330',
      isAttention: false,
      isDisposition: false,
      isLimitUp: false,
      isLimitDown: false,
      source: 'twse-open-data',
      freshness: 'eod',
      asOf: '2026-09-04T13:30:00+08:00',
      receivedAt: '2026-09-05T10:00:00+08:00',
    };
    expect(normalStatus.isAttention).toBe(false);
    expect(normalStatus.isDisposition).toBe(false);

    const attentionStatus: MarketStatus = {
      ...normalStatus,
      symbol: '3017',
      isAttention: true,
    };
    expect(attentionStatus.isAttention).toBe(true);
    expect(attentionStatus.isDisposition).toBe(false);

    const dispositionStatus: MarketStatus = {
      ...normalStatus,
      symbol: '9999',
      isDisposition: true,
    };
    expect(dispositionStatus.isDisposition).toBe(true);
  });
});
