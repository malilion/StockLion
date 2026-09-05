import { defineContentScript } from 'wxt/sandbox';
import { domainPolicy } from '../src/stock-peek/domain-policy';
import { StockDetector } from '../src/stock-peek/detector';
import { DOMScanner } from '../src/stock-peek/scanner';
import { HoverCard } from '../src/stock-peek/hover-card';
import stockDictionary from '../src/data/stock-dictionary.json';

export default defineContentScript({
  matches: [
    'https://www.ptt.cc/bbs/Stock/*',
    'https://tw.stock.yahoo.com/*',
    'https://www.cnyes.com/*',
    'https://www.threads.com/*',
    'https://www.threads.net/*',
    'https://money.udn.com/*',
    'https://www.ctee.com.tw/*',
  ],
  main() {
    const currentUrl = window.location.href;
    if (!domainPolicy.isAllowed(currentUrl)) {
      console.log('🦁 StockLion: Current URL outside active whitelist, skipping Stock Peek.');
      return;
    }

    console.log(`🦁 StockLion: Stock Peek active on ${window.location.hostname} (Phase 6 Production)`);

    const detector = new StockDetector();
    detector.loadDictionary(stockDictionary as any);

    const hoverCard = new HoverCard();
    const scanner = new DOMScanner(detector, hoverCard, { maxNodesPerScan: 500 });

    // 延遲初次掃描，確保主線程渲染不卡頓
    const scheduleScan = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => scanner.scan());
      } else {
        setTimeout(() => scanner.scan(), 200);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleScan);
    } else {
      scheduleScan();
    }

    // MutationObserver 監聽動態內容 (例如 PTT 推文或 Threads 瀑布流)，附加防抖
    let debounceTimer: any = null;
    const observer = new MutationObserver((mutations) => {
      let hasRelevantMutations = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          hasRelevantMutations = true;
          break;
        }
      }

      if (hasRelevantMutations) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          scheduleScan();
        }, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
});
