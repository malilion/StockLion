import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WatchlistGroup } from '../domain/watchlist';
import type { Quote } from '../domain/quote';
import { watchlistRepository } from '../storage/watchlist-repository';
import { quoteService } from '../services/quote-service';

export const useWatchlistStore = defineStore('watchlist', () => {
  const groups = ref<WatchlistGroup[]>([]);
  const activeGroupId = ref<string>('default');
  const quotes = ref<Record<string, Quote>>({});
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const activeGroup = computed<WatchlistGroup | undefined>(() => {
    return groups.value.find((g) => g.id === activeGroupId.value) || groups.value[0];
  });

  const activeSymbols = computed<string[]>(() => {
    return activeGroup.value?.symbols || [];
  });

  async function loadGroups() {
    isLoading.value = true;
    try {
      const loaded = await watchlistRepository.getGroups();
      groups.value = loaded;
      if (!groups.value.some((g) => g.id === activeGroupId.value)) {
        activeGroupId.value = groups.value[0]?.id || 'default';
      }
      await refreshQuotes();
    } catch (err: any) {
      error.value = err?.message || '載入自選股失敗';
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshQuotes() {
    const symbols = activeSymbols.value;
    if (symbols.length === 0) return;

    try {
      const fetchedQuotes = await quoteService.getBestQuotes(symbols, {
        preferRealtime: false,
      });

      for (const q of fetchedQuotes) {
        quotes.value[q.symbol] = q;
      }
    } catch (err: any) {
      console.warn('報價更新受阻:', err);
    }
  }

  async function addSymbol(symbol: string) {
    if (!activeGroup.value) return;
    await watchlistRepository.addSymbolToGroup(activeGroup.value.id, symbol);
    await loadGroups();
  }

  async function removeSymbol(symbol: string) {
    if (!activeGroup.value) return;
    await watchlistRepository.removeSymbolFromGroup(activeGroup.value.id, symbol);
    // 更新本地狀態
    if (activeGroup.value) {
      activeGroup.value.symbols = activeGroup.value.symbols.filter((s) => s !== symbol);
    }
  }

  async function createGroup(name: string) {
    const created = await watchlistRepository.addGroup(name);
    await loadGroups();
    activeGroupId.value = created.id;
  }

  async function removeGroup(groupId: string) {
    await watchlistRepository.removeGroup(groupId);
    await loadGroups();
  }

  function setActiveGroup(groupId: string) {
    activeGroupId.value = groupId;
    refreshQuotes();
  }

  return {
    groups,
    activeGroupId,
    activeGroup,
    activeSymbols,
    quotes,
    isLoading,
    error,
    loadGroups,
    refreshQuotes,
    addSymbol,
    removeSymbol,
    createGroup,
    removeGroup,
    setActiveGroup,
  };
});
