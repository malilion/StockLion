<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWatchlistStore } from '../stores/watchlist';
import { useAppStore } from '../stores/app';
import { symbolService } from '../services/symbol-service';
import type { StockSymbol } from '../domain/stock';
import StockCard from '../components/StockCard.vue';

const watchlistStore = useWatchlistStore();
const appStore = useAppStore();

const searchQuery = ref('');
const searchResults = ref<StockSymbol[]>([]);
const isSearchOpen = ref(false);
const isAddGroupOpen = ref(false);
const newGroupName = ref('');

onMounted(() => {
  watchlistStore.loadGroups();
});

function onSearchInput() {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  searchResults.value = symbolService.search(searchQuery.value.trim(), 5);
}

async function selectSearchResult(item: StockSymbol) {
  await watchlistStore.addSymbol(item.symbol);
  searchQuery.value = '';
  searchResults.value = [];
  isSearchOpen.value = false;
}

async function handleCreateGroup() {
  if (newGroupName.value.trim()) {
    await watchlistStore.createGroup(newGroupName.value.trim());
    newGroupName.value = '';
    isAddGroupOpen.value = false;
  }
}

async function handleDeleteCurrentGroup() {
  if (watchlistStore.activeGroupId === 'default') return;
  const groupName = watchlistStore.activeGroup?.name || '此分組';
  if (typeof window !== 'undefined' && window.confirm(`確定要刪除「${groupName}」分組嗎？`)) {
    await watchlistStore.removeGroup(watchlistStore.activeGroupId);
  }
}
</script>

<template>
  <div class="watchlist-view">
    <!-- Groups Bar -->
    <div class="groups-bar">
      <div class="groups-scroll">
        <button
          v-for="group in watchlistStore.groups"
          :key="group.id"
          class="group-pill"
          :class="{ active: watchlistStore.activeGroupId === group.id }"
          @click="watchlistStore.setActiveGroup(group.id)"
        >
          {{ group.name }}
          <span class="group-count">{{ group.symbols.length }}</span>
        </button>
      </div>
      <button
        v-if="watchlistStore.activeGroupId !== 'default'"
        class="icon-btn delete-group-btn"
        title="刪除目前分組"
        @click="handleDeleteCurrentGroup"
      >
        🗑️
      </button>
      <button
        class="icon-btn add-group-btn"
        title="新增分組"
        @click="isAddGroupOpen = !isAddGroupOpen"
      >
        +
      </button>
    </div>

    <!-- Create Group Input Panel -->
    <div v-if="isAddGroupOpen" class="add-group-panel">
      <input
        v-model="newGroupName"
        type="text"
        placeholder="分組名稱 (例如: AI半導體)"
        class="input-field"
        @keyup.enter="handleCreateGroup"
      />
      <button class="btn btn-primary" @click="handleCreateGroup">建立</button>
      <button class="btn btn-secondary" @click="isAddGroupOpen = false">取消</button>
    </div>

    <!-- Actions Bar -->
    <div class="actions-bar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 搜尋代號或名稱加入自選..."
          class="search-input"
          @input="onSearchInput"
          @focus="isSearchOpen = true"
        />
        <button
          class="icon-btn refresh-btn"
          title="重新整理報價"
          :disabled="watchlistStore.isLoading"
          @click="watchlistStore.refreshQuotes"
        >
          🔄
        </button>
      </div>

      <!-- Search Dropdown Results -->
      <div
        v-if="isSearchOpen && searchResults.length > 0"
        class="search-dropdown"
      >
        <div
          v-for="item in searchResults"
          :key="item.symbol"
          class="search-item"
          @click="selectSearchResult(item)"
        >
          <div class="item-main">
            <span class="item-symbol">{{ item.symbol }}</span>
            <span class="item-name">{{ item.name }}</span>
          </div>
          <span class="item-market">{{ item.market }}</span>
        </div>
      </div>
    </div>

    <!-- Stock Cards List -->
    <div class="cards-list">
      <div
        v-if="watchlistStore.activeSymbols.length === 0"
        class="empty-state"
      >
        <span class="empty-icon">⭐</span>
        <p class="empty-msg">目前分組尚無自選股</p>
        <span class="empty-hint">請在上方的搜尋列輸入代號（如 2330）新增</span>
      </div>

      <StockCard
        v-for="symbol in watchlistStore.activeSymbols"
        :key="symbol"
        :symbol="symbol"
        :quote="watchlistStore.quotes[symbol]"
        @select="appStore.viewStockDetail(symbol)"
        @remove="watchlistStore.removeSymbol"
      />
    </div>
  </div>
</template>

<style scoped>
.watchlist-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.groups-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 8px;
}

.groups-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
}

.groups-scroll::-webkit-scrollbar {
  display: none;
}

.group-pill {
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.group-pill:hover {
  background-color: #334155;
  color: #f8fafc;
}

.group-pill.active {
  background-color: #fbbf24;
  color: #0b0f19;
  font-weight: 600;
  border-color: #fbbf24;
}

.group-count {
  font-size: 9px;
  opacity: 0.8;
}

.icon-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 12px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: #334155;
}

.add-group-panel {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  padding: 8px;
  background-color: #1e293b;
  border-radius: 6px;
}

.input-field {
  flex: 1;
  background-color: #0f172a;
  border: 1px solid #334155;
  color: #f8fafc;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.btn {
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background-color: #fbbf24;
  color: #0b0f19;
}

.btn-secondary {
  background-color: #334155;
  color: #cbd5e1;
}

.actions-bar {
  position: relative;
  margin-bottom: 12px;
}

.search-box {
  display: flex;
  gap: 6px;
}

.search-input {
  flex: 1;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  outline: none;
}

.search-input:focus {
  border-color: #fbbf24;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  margin-top: 4px;
  max-height: 180px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
}

.search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #1e293b;
  transition: background-color 0.15s;
}

.search-item:hover {
  background-color: #1e293b;
}

.item-symbol {
  font-weight: 700;
  color: #fbbf24;
  margin-right: 8px;
}

.item-name {
  color: #f1f5f9;
}

.item-market {
  font-size: 10px;
  color: #64748b;
}

.cards-list {
  flex: 1;
  overflow-y: auto;
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

.empty-msg {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 4px 0;
}

.empty-hint {
  font-size: 11px;
}
</style>
