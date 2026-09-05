import { defineStore } from 'pinia';
import { ref } from 'vue';
import { sendExtensionMessage } from '../messaging/client';
import type { PingResponseData } from '../messaging/protocol';

export type TabType = 'market' | 'watchlist' | 'radar' | 'search' | 'settings';

export const useAppStore = defineStore('app', () => {
  const currentTab = ref<TabType>('market');
  const isBackgroundConnected = ref<boolean | null>(null);
  const latency = ref<number | null>(null);
  const lastError = ref<string | null>(null);

  function setTab(tab: TabType) {
    currentTab.value = tab;
  }

  async function checkConnection() {
    const start = Date.now();
    try {
      const response = await sendExtensionMessage<PingResponseData>('ping', {
        timestamp: start,
      });
      if (response && response.pong) {
        isBackgroundConnected.value = true;
        latency.value = Date.now() - start;
        lastError.value = null;
      }
    } catch (err: any) {
      isBackgroundConnected.value = false;
      lastError.value = err?.message || '連線失敗';
    }
  }

  return {
    currentTab,
    isBackgroundConnected,
    latency,
    lastError,
    setTab,
    checkConnection,
  };
});
