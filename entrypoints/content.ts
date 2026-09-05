import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: [
    'https://www.ptt.cc/bbs/Stock/*',
    'https://tw.stock.yahoo.com/*',
    'https://www.cnyes.com/*',
    'https://www.threads.com/*',
  ],
  main() {
    console.log('🦁 StockLion Content Script loaded (Phase 1 Skeleton)');
  },
});
