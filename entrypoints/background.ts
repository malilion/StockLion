import { defineBackground } from 'wxt/sandbox';
import { messageRouter } from '../src/messaging/router';
import { storageRepository } from '../src/storage/repository';
import { alertEngine } from '../src/services/alert-engine';
import { providerRegistry } from '../src/providers/registry';

export default defineBackground(() => {
  console.log('🦁 StockLion Background Service Worker initialized');

  // 初始化儲存庫 Schema 版本並還原已驗證金鑰狀態 (MV3 生命週期安全)
  storageRepository.initSchemaVersion().then(async (version) => {
    console.log(`🦁 Storage schema initialized at version ${version}`);
    await providerRegistry.syncWithStore();
    console.log('🦁 Provider credentials restored from storage');
  });

  // 掛載訊息路由器監聽器
  messageRouter.attachListener();

  // 設置分鐘級警示排程 (Chrome Alarms API)
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create('stocklion:alert-poll', {
      periodInMinutes: 1,
      delayInMinutes: 1,
    });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'stocklion:alert-poll') {
        await providerRegistry.syncWithStore();
        await alertEngine.evaluateAll({ isBackgroundPoll: true });
      }
    });
  }

  // 監聽通知點擊並自動導向該個股詳情頁
  if (typeof chrome !== 'undefined' && chrome.notifications?.onClicked) {
    chrome.notifications.onClicked.addListener(async (notifId) => {
      console.log('🦁 Alert notification clicked:', notifId);
      if (notifId.startsWith('alert_')) {
        const parts = notifId.split('_');
        const symbol = parts[1];
        if (symbol && chrome.storage?.local) {
          await chrome.storage.local.set({ active_nav_symbol: symbol });
          if (chrome.action?.openPopup) {
            chrome.action.openPopup().catch(() => {});
          }
        }
      }
    });
  }
});
