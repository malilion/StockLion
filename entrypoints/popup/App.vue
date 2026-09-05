<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore, type TabType } from '../../src/stores/app';
import WatchlistView from '../../src/views/WatchlistView.vue';
import StockDetailView from '../../src/views/StockDetailView.vue';
import RadarView from '../../src/views/RadarView.vue';
import SearchView from '../../src/views/SearchView.vue';
import SettingsView from '../../src/views/SettingsView.vue';

const appStore = useAppStore();

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'market', label: '市場', icon: '📊' },
  { id: 'watchlist', label: '自選', icon: '⭐' },
  { id: 'radar', label: '雷達', icon: '🔥' },
  { id: 'search', label: '搜尋', icon: '🔍' },
  { id: 'settings', label: '設定', icon: '⚙️' },
];

onMounted(async () => {
  appStore.checkConnection();
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const res = await chrome.storage.local.get('active_nav_symbol');
      if (res?.active_nav_symbol) {
        appStore.viewStockDetail(res.active_nav_symbol);
        await chrome.storage.local.remove('active_nav_symbol');
      }
    } catch {
      // ignore storage errors
    }
  }
});
</script>

<template>
  <div class="popup-container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <img src="/icons/icon-48.png" alt="StockLion" class="brand-logo" />
        <div class="title-group">
          <h1 class="title">StockLion</h1>
          <span class="subtitle">股力獅 v2.1</span>
        </div>
      </div>
      <div class="connection-status">
        <span
          class="status-dot"
          :class="{
            online: appStore.isBackgroundConnected === true,
            offline: appStore.isBackgroundConnected === false,
            connecting: appStore.isBackgroundConnected === null,
          }"
        ></span>
        <span class="status-text">
          {{
            appStore.isBackgroundConnected === true
              ? `已連線 (${appStore.latency}ms)`
              : appStore.isBackgroundConnected === false
              ? '離線'
              : '連線中'
          }}
        </span>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="tabs-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: appStore.currentTab === tab.id }"
        @click="appStore.setTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Main Content Area -->
    <main class="content-area">
      <!-- Stock Detail View Overlay -->
      <StockDetailView
        v-if="appStore.selectedSymbol"
        :symbol="appStore.selectedSymbol"
        @back="appStore.closeStockDetail"
      />

      <!-- Market Tab -->
      <section v-else-if="appStore.currentTab === 'market'" class="tab-content">
        <div class="indices-grid">
          <div class="card index-card">
            <div class="card-header">
              <span class="card-title">加權指數 (TWSE)</span>
              <span class="badge badge-eod">○ 盤後收盤</span>
            </div>
            <div class="card-body">
              <div class="price-val">24,568.12</div>
              <div class="change-val positive">+320.15 (+1.32%)</div>
            </div>
          </div>

          <div class="card index-card">
            <div class="card-header">
              <span class="card-title">櫃買指數 (TPEx)</span>
              <span class="badge badge-eod">○ 盤後收盤</span>
            </div>
            <div class="card-body">
              <div class="price-val">268.45</div>
              <div class="change-val positive">+1.82 (+0.68%)</div>
            </div>
          </div>
        </div>

        <!-- Quick Shortcuts -->
        <div class="section-heading">快速功能</div>
        <div class="shortcuts-grid">
          <div class="shortcut-card" @click="appStore.setTab('watchlist')">
            <span class="shortcut-icon">⭐</span>
            <div class="shortcut-info">
              <div class="shortcut-title">自選追蹤</div>
              <div class="shortcut-desc">管理群組與即時/盤後報價</div>
            </div>
          </div>

          <div class="shortcut-card" @click="appStore.setTab('radar')">
            <span class="shortcut-icon">🔥</span>
            <div class="shortcut-info">
              <div class="shortcut-title">今日雷達</div>
              <div class="shortcut-desc">爆量、漲跌排行、注意處置股</div>
            </div>
          </div>

          <div class="shortcut-card" @click="appStore.setTab('search')">
            <span class="shortcut-icon">🔍</span>
            <div class="shortcut-info">
              <div class="shortcut-title">離線搜尋</div>
              <div class="shortcut-desc">內建上市櫃代碼字典搜尋</div>
            </div>
          </div>

          <div class="shortcut-card" @click="appStore.setTab('settings')">
            <span class="shortcut-icon">⚙️</span>
            <div class="shortcut-info">
              <div class="shortcut-title">系統與 Key</div>
              <div class="shortcut-desc">設定行情 Key、警報與懸浮</div>
            </div>
          </div>
        </div>

        <!-- Market Info Banner -->
        <div class="market-info-card">
          <div class="info-title">💡 報價規範與來源說明</div>
          <p class="info-text">
            StockLion 嚴格遵循 BYO Key 隱私規範。未設定 Key 時，一律透過證交所 / 櫃買中心公開數據提供盤後收盤資料；欲啟用盤中即時報價與價格警報，請至設定輸入 Fugle API Key。
          </p>
        </div>
      </section>

      <!-- Watchlist Tab -->
      <section v-else-if="appStore.currentTab === 'watchlist'" class="tab-content">
        <WatchlistView />
      </section>

      <!-- Radar Tab -->
      <section v-else-if="appStore.currentTab === 'radar'" class="tab-content">
        <RadarView />
      </section>

      <!-- Search Tab -->
      <section v-else-if="appStore.currentTab === 'search'" class="tab-content">
        <SearchView />
      </section>

      <!-- Settings Tab -->
      <section v-else-if="appStore.currentTab === 'settings'" class="tab-content">
        <SettingsView />
      </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <span class="footer-note">No backend • No account • BYO Key</span>
    </footer>
  </div>
</template>

<style scoped>
.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 480px;
  background-color: #0b0f19;
  color: #f8fafc;
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #1e293b;
  background: linear-gradient(180deg, #111827 0%, #0b0f19 100%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
}

.title-group {
  display: flex;
  flex-direction: column;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #f1f5f9;
}

.subtitle {
  font-size: 11px;
  color: #fbbf24;
  font-weight: 500;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94a3b8;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #64748b;
}

.status-dot.online {
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.status-dot.offline {
  background-color: #ef4444;
}

.status-dot.connecting {
  background-color: #f59e0b;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid #1e293b;
  background-color: #0f172a;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #f8fafc;
  background-color: #1e293b;
}

.tab-btn.active {
  color: #fbbf24;
  border-bottom: 2px solid #fbbf24;
  background-color: #1e293b;
}

.tab-icon {
  font-size: 14px;
  margin-bottom: 2px;
}

.content-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: 12px;
  color: #94a3b8;
}

.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-eod {
  background-color: #334155;
  color: #cbd5e1;
}

.price-val {
  font-size: 22px;
  font-weight: 700;
  color: #f8fafc;
}

.change-val {
  font-size: 13px;
  font-weight: 600;
  margin-top: 2px;
}

.change-val.positive {
  color: #ef4444; /* 台股紅漲 */
}

.change-val.negative {
  color: #10b981; /* 台股綠跌 */
}

.indices-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.indices-grid .card {
  margin-bottom: 0;
}

.section-heading {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.shortcut-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.shortcut-card:hover {
  background-color: #273549;
  border-color: #fbbf24;
}

.shortcut-icon {
  font-size: 20px;
}

.shortcut-info {
  display: flex;
  flex-direction: column;
}

.shortcut-title {
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
}

.shortcut-desc {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 1px;
}

.market-info-card {
  background-color: rgba(30, 41, 59, 0.4);
  border: 1px dashed #334155;
  border-radius: 8px;
  padding: 12px;
}

.info-title {
  font-size: 11px;
  font-weight: 600;
  color: #fbbf24;
  margin-bottom: 4px;
}

.info-text {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.footer {
  padding: 8px 16px;
  border-top: 1px solid #1e293b;
  text-align: center;
  background-color: #0b0f19;
}

.footer-note {
  font-size: 10px;
  color: #64748b;
  letter-spacing: 0.5px;
}
</style>
