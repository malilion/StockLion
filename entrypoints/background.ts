import { defineBackground } from 'wxt/sandbox';
import { messageRouter } from '../src/messaging/router';
import { storageRepository } from '../src/storage/repository';
import { alertEngine } from '../src/services/alert-engine';

export default defineBackground(() => {
  console.log('🦁 StockLion Background Service Worker initialized');

  // 初始化儲存庫 Schema 版本
  storageRepository.initSchemaVersion().then((version) => {
    console.log(`🦁 Storage schema initialized at version ${version}`);
  });

  // 掛載訊息路由器監聽器
  messageRouter.attachListener();

  // 設置分鐘級警示排程 (Chrome Alarms API)
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create('stocklion:alert-poll', {
      periodInMinutes: 1,
      delayInMinutes: 1,
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'stocklion:alert-poll') {
        alertEngine.evaluateAll();
      }
    });
  }

  // 監聽通知點擊
  if (typeof chrome !== 'undefined' && chrome.notifications?.onClicked) {
    chrome.notifications.onClicked.addListener((notifId) => {
      console.log('🦁 Alert notification clicked:', notifId);
    });
  }
});
