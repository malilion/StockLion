<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { RadarCategory, RadarResult } from '../domain/radar';
import { radarService } from '../services/radar-service';
import { useAppStore } from '../stores/app';
import QuoteBadge from '../components/QuoteBadge.vue';

const appStore = useAppStore();

const categories: { id: RadarCategory; label: string; icon: string }[] = [
  { id: 'gainers', label: '漲幅榜', icon: '🔥' },
  { id: 'losers', label: '跌幅榜', icon: '📉' },
  { id: 'volume', label: '成交量', icon: '📊' },
  { id: 'unusual_volume', label: '爆量排行', icon: '⚡' },
  { id: 'attention', label: '注意股', icon: '⚠️' },
  { id: 'disposition', label: '處置股', icon: '🚫' },
];

const activeCategory = ref<RadarCategory>('gainers');
const radarData = ref<RadarResult | null>(null);
const isLoading = ref<boolean>(false);

async function loadRadar(category: RadarCategory) {
  isLoading.value = true;
  try {
    radarData.value = await radarService.getRadar(category);
  } finally {
    isLoading.value = false;
  }
}

watch(activeCategory, (newCat) => {
  loadRadar(newCat);
});

onMounted(() => {
  loadRadar(activeCategory.value);
});

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-gold';
  if (rank === 2) return 'rank-silver';
  if (rank === 3) return 'rank-bronze';
  return 'rank-normal';
}
</script>

<template>
  <div class="radar-view">
    <!-- Category Tabs -->
    <div class="category-scroll">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="category-pill"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-label">{{ cat.label }}</span>
      </button>
    </div>

    <!-- Date & Info Header -->
    <div class="date-banner">
      <span class="date-text">
        📅 交易日：{{ radarData?.tradingDate || '2026-09-04' }}（盤後更新 • 免金鑰）
      </span>
      <button
        class="refresh-btn"
        title="重新整理"
        :disabled="isLoading"
        @click="loadRadar(activeCategory)"
      >
        🔄
      </button>
    </div>

    <!-- List Area -->
    <div class="radar-list">
      <div v-if="isLoading" class="radar-loading">
        載入雷達資訊中...
      </div>

      <div
        v-for="(item, idx) in radarData?.items || []"
        :key="item.symbol"
        class="radar-card"
        @click="appStore.viewStockDetail(item.symbol)"
      >
        <!-- Rank -->
        <div class="rank-badge" :class="getRankClass(idx + 1)">
          {{ idx + 1 }}
        </div>

        <!-- Stock Info -->
        <div class="item-info">
          <div class="item-name-row">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-symbol">{{ item.symbol }}</span>
            <span class="market-tag">{{ item.market }}</span>
          </div>
          <div v-if="item.tag" class="item-reason">
            {{ item.tag }}
          </div>
          <div v-else class="item-badge-row">
            <QuoteBadge freshness="eod" :trading-date="radarData?.tradingDate" />
          </div>
        </div>

        <!-- Metric & Price -->
        <div class="item-metrics">
          <span
            class="metric-pill"
            :class="{
              up: (item.changePercent ?? 0) > 0,
              down: (item.changePercent ?? 0) < 0,
              warn: activeCategory === 'attention' || activeCategory === 'disposition',
            }"
          >
            {{ item.metricValue }}
          </span>
          <div class="item-price">
            ${{ item.price ?? '--' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.radar-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.category-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 8px;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-pill:hover {
  background-color: #334155;
  color: #f8fafc;
}

.category-pill.active {
  background-color: #fbbf24;
  color: #0b0f19;
  font-weight: 600;
  border-color: #fbbf24;
}

.date-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
}

.date-text {
  font-size: 10px;
  color: #94a3b8;
}

.refresh-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 11px;
}

.radar-list {
  flex: 1;
  overflow-y: auto;
}

.radar-loading {
  text-align: center;
  padding: 30px;
  font-size: 12px;
  color: #94a3b8;
}

.radar-card {
  display: flex;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radar-card:hover {
  background-color: #273549;
  border-color: #475569;
}

.rank-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  margin-right: 10px;
  flex-shrink: 0;
}

.rank-gold {
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
  color: #0b0f19;
}

.rank-silver {
  background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
  color: #0b0f19;
}

.rank-bronze {
  background: linear-gradient(135deg, #f97316 0%, #c2410c 100%);
  color: #f8fafc;
}

.rank-normal {
  background-color: #0f172a;
  color: #64748b;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.item-name {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

.item-symbol {
  font-size: 11px;
  color: #94a3b8;
}

.market-tag {
  font-size: 9px;
  padding: 1px 3px;
  background-color: #0f172a;
  color: #64748b;
  border-radius: 2px;
}

.item-reason {
  font-size: 10px;
  color: #fbbf24;
}

.item-badge-row {
  display: flex;
  margin-top: 2px;
}

.item-metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.metric-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #0f172a;
  color: #cbd5e1;
}

.metric-pill.up {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.15);
}

.metric-pill.down {
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.15);
}

.metric-pill.warn {
  color: #fbbf24;
  background-color: rgba(245, 158, 11, 0.15);
}

.item-price {
  font-size: 11px;
  color: #94a3b8;
}
</style>
