import { defineBackground } from 'wxt/sandbox';
import { messageRouter } from '../src/messaging/router';
import { storageRepository } from '../src/storage/repository';

export default defineBackground(() => {
  console.log('🦁 StockLion Background Service Worker initialized');

  // 初始化儲存庫 Schema 版本
  storageRepository.initSchemaVersion().then((version) => {
    console.log(`🦁 Storage schema initialized at version ${version}`);
  });

  // 掛載訊息路由器監聽器
  messageRouter.attachListener();
});
