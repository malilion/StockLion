<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../stores/app';
import { useWatchlistStore } from '../stores/watchlist';
import { symbolService } from '../services/symbol-service';
import type { StockSymbol } from '../domain/stock';

const appStore = useAppStore();
const watchlistStore = useWatchlistStore();

const searchQuery = ref('');
const activeFilter = ref<'ALL' | 'TWSE' | 'TPEx' | 'ETF'>('ALL');

// 熱門快速標的推薦
const quickPicks = [
  { symbol: '2330', name: '台積電' },
  { symbol: '2317', name: '鴻海' },
  { symbol: '2454', name: '聯發科' },
  { symbol: '0050', name: '元大台灣50' },
  { symbol: '00878', name: '國泰永續高股息' },
  { symbol: '2603', name: '長榮' },
];

const searchResults = computed(() => {
  const q = searchQuery.value.trim();
  if (!q) return [];

  const rawResults = symbolService.search(q, 50);

  if (activeFilter.value === 'ALL') {
    return rawResults;
  }
  if (activeFilter.value === 'ETF') {
    return rawResults.filter((s) => s.instrumentType === 'etf');
  }
  return rawResults.filter((s) => s.market === activeFilter.value && s.instrumentType !== 'etf');
});

function handleQuickPick(symbol: string) {
  searchQuery.value = symbol;
}

function isSymbolInWatchlist(symbol: string): boolean {
  return watchlistStore.activeSymbols.includes(symbol);
}

async function toggleWatchlist(item: StockSymbol, event: MouseEvent) {
  event.stopPropagation();
  if (isSymbolInWatchlist(item.symbol)) {
    await watchlistStore.removeSymbol(item.symbol);
  } else {
    await watchlistStore.addSymbol(item.symbol);
  }
}
</script>

<template>
  <div class="search-view">
    <!-- Search Input Bar -->
    <div class="search-bar-wrapper">
      <div class="search-input-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋代號或名稱 (例: 2330 或 台積電)"
          class="search-input"
          autofocus
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          title="清除"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Category Filter Chips -->
    <div class="filter-chips">
      <button
        class="chip-btn"
        :class="{ active: activeFilter === 'ALL' }"
        @click="activeFilter = 'ALL'"
      >
        全部
      </button>
      <button
        class="chip-btn"
        :class="{ active: activeFilter === 'TWSE' }"
        @click="activeFilter = 'TWSE'"
      >
        上市
      </button>
      <button
        class="chip-btn"
        :class="{ active: activeFilter === 'TPEx' }"
        @click="activeFilter = 'TPEx'"
      >
        上櫃
      </button>
      <button
        class="chip-btn"
        :class="{ active: activeFilter === 'ETF' }"
        @click="activeFilter = 'ETF'"
      >
        ETF
      </button>
    </div>

    <!-- Content Area: Results or Initial Quick Picks -->
    <div class="results-container">
      <!-- Empty Search: Show Quick Picks -->
      <div v-if="!searchQuery.trim()" class="quick-picks-section">
        <div class="section-title">熱門查詢標的</div>
        <div class="quick-tags-grid">
          <button
            v-for="pick in quickPicks"
            :key="pick.symbol"
            class="tag-btn"
            @click="handleQuickPick(pick.symbol)"
          >
            <span class="tag-sym">{{ pick.symbol }}</span>
            <span class="tag-name">{{ pick.name }}</span>
          </button>
        </div>

        <div class="offline-hint">
          <span class="hint-icon">⚡</span>
          <span>內建完整台股上市櫃與 ETF 字典，支援離線快速即搜即得。</span>
        </div>
      </div>

      <!-- No Results Found -->
      <div v-else-if="searchResults.length === 0" class="empty-state">
        <span class="empty-icon">🔍</span>
        <div class="empty-text">找不到符合「{{ searchQuery }}」的標的</div>
        <span class="empty-sub">請檢查代號或股票名稱是否正確</span>
      </div>

      <!-- Search Results List -->
      <div v-else class="results-list">
        <div
          v-for="item in searchResults"
          :key="item.symbol"
          class="result-item"
          @click="appStore.viewStockDetail(item.symbol)"
        >
          <div class="item-left">
            <div class="symbol-line">
              <span class="item-symbol">{{ item.symbol }}</span>
              <span class="item-name">{{ item.name }}</span>
            </div>
            <div class="badge-line">
              <span class="badge" :class="item.market === 'TWSE' ? 'badge-twse' : 'badge-tpex'">
                {{ item.market === 'TWSE' ? '上市' : '上櫃' }}
              </span>
              <span v-if="item.instrumentType === 'etf'" class="badge badge-etf">ETF</span>
            </div>
          </div>

          <div class="item-right">
            <button
              class="action-btn"
              :class="{ added: isSymbolInWatchlist(item.symbol) }"
              :title="isSymbolInWatchlist(item.symbol) ? '從自選移除' : '加入自選'"
              @click="toggleWatchlist(item, $event)"
            >
              {{ isSymbolInWatchlist(item.symbol) ? '✓ 已自選' : '+ 自選' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-bar-wrapper {
  margin-bottom: 8px;
}

.search-input-box {
  display: flex;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
  transition: border-color 0.2s;
}

.search-input-box:focus-within {
  border-color: #fbbf24;
}

.search-icon {
  font-size: 14px;
  opacity: 0.7;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
}

.search-input::placeholder {
  color: #64748b;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 4px;
  font-size: 12px;
}

.clear-btn:hover {
  color: #f8fafc;
}

.filter-chips {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.chip-btn {
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.chip-btn:hover {
  background-color: #334155;
  color: #f8fafc;
}

.chip-btn.active {
  background-color: #fbbf24;
  color: #0b0f19;
  font-weight: 600;
  border-color: #fbbf24;
}

.results-container {
  flex: 1;
  overflow-y: auto;
}

.quick-picks-section {
  padding: 8px 0;
}

.section-title {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: 600;
}

.quick-tags-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.tag-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.tag-btn:hover {
  background-color: #334155;
}

.tag-sym {
  font-weight: 700;
  color: #fbbf24;
  font-size: 12px;
}

.tag-name {
  color: #cbd5e1;
  font-size: 12px;
}

.offline-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background-color: rgba(30, 41, 59, 0.5);
  border: 1px dashed #334155;
  border-radius: 6px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}

.hint-icon {
  font-size: 14px;
  color: #fbbf24;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  color: #64748b;
  text-align: center;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.empty-sub {
  font-size: 11px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.result-item:hover {
  background-color: #273549;
  border-color: #475569;
}

.symbol-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.item-symbol {
  font-size: 13px;
  font-weight: 700;
  color: #fbbf24;
}

.item-name {
  font-size: 13px;
  color: #f8fafc;
}

.badge-line {
  display: flex;
  gap: 4px;
}

.badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
}

.badge-twse {
  background-color: #1e3a8a;
  color: #93c5fd;
}

.badge-tpex {
  background-color: #4c1d95;
  color: #c4b5fd;
}

.badge-etf {
  background-color: #065f46;
  color: #6ee7b7;
}

.action-btn {
  background-color: #334155;
  border: 1px solid #475569;
  color: #cbd5e1;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #fbbf24;
  color: #0b0f19;
  border-color: #fbbf24;
}

.action-btn.added {
  background-color: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
}
</style>
