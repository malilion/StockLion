<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Quote } from '../domain/quote';
import type { FundamentalSnapshot } from '../domain/fundamental';
import type { MarketStatus } from '../domain/market';
import { quoteService } from '../services/quote-service';
import { symbolService } from '../services/symbol-service';
import { useWatchlistStore } from '../stores/watchlist';
import QuoteBadge from '../components/QuoteBadge.vue';
import StockChart from '../components/StockChart.vue';
import FundamentalGrid from '../components/FundamentalGrid.vue';
import MarketStatusBadge from '../components/MarketStatusBadge.vue';
import AlertModal from '../components/AlertModal.vue';

const isAlertModalOpen = ref(false);

const props = defineProps<{
  symbol: string;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const watchlistStore = useWatchlistStore();

const quote = ref<Quote | null>(null);
const fundamental = ref<FundamentalSnapshot | null>(null);
const marketStatus = ref<MarketStatus | null>(null);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

const stockInfo = computed(() => {
  return symbolService.getBySymbol(props.symbol) || {
    symbol: props.symbol,
    name: quote.value?.name || props.symbol,
    market: quote.value?.market || 'TWSE',
    instrumentType: 'stock',
  };
});

const isWatchlisted = computed(() => {
  return watchlistStore.activeSymbols.includes(props.symbol);
});

async function loadStockDetail() {
  if (!props.symbol) return;
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const [q, f] = await Promise.allSettled([
      quoteService.getBestQuote(props.symbol, { preferRealtime: true }),
      quoteService.getFundamental(props.symbol),
    ]);

    if (q.status === 'fulfilled') {
      quote.value = q.value;
    } else {
      errorMessage.value = q.reason?.message || '無法取得個股報價';
    }

    if (f.status === 'fulfilled') {
      fundamental.value = f.value;
    }

    // 模擬或讀取注意/處置狀態
    marketStatus.value = {
      symbol: props.symbol,
      isAttention: false,
      isDisposition: false,
      isLimitUp: quote.value?.changePercent != null && quote.value.changePercent >= 9.8,
      isLimitDown: quote.value?.changePercent != null && quote.value.changePercent <= -9.8,
      source: 'twse-open-data',
      freshness: 'eod',
      asOf: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    errorMessage.value = err?.message || '載入詳細資料失敗';
  } finally {
    isLoading.value = false;
  }
}

async function toggleWatchlist() {
  if (isWatchlisted.value) {
    await watchlistStore.removeSymbol(props.symbol);
  } else {
    await watchlistStore.addSymbol(props.symbol);
  }
}

watch(() => props.symbol, () => {
  loadStockDetail();
});

onMounted(() => {
  loadStockDetail();
});

const isUp = computed(() => (quote.value?.change ?? 0) > 0);
const isDown = computed(() => (quote.value?.change ?? 0) < 0);
const sign = computed(() => (isUp.value ? '+' : ''));
</script>

<template>
  <div class="stock-detail-view">
    <!-- Top Bar Navigation -->
    <div class="detail-header">
      <button class="back-btn" title="返回" @click="emit('back')">
        ← 返回
      </button>

      <div class="title-area">
        <span class="stock-name">{{ stockInfo.name }}</span>
        <span class="stock-symbol">{{ stockInfo.symbol }}</span>
        <span class="market-pill">{{ stockInfo.market }}</span>
      </div>

      <div class="header-actions">
        <button
          class="alert-btn"
          title="設定到價提醒"
          @click="isAlertModalOpen = true"
        >
          🔔
        </button>
        <button
          class="star-btn"
          :class="{ active: isWatchlisted }"
          :title="isWatchlisted ? '自選股中 (點擊移除)' : '加入自選股'"
          @click="toggleWatchlist"
        >
          {{ isWatchlisted ? '⭐ 已自選' : '☆ 加入' }}
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="errorMessage" class="error-banner">
      <span>{{ errorMessage }}</span>
      <button class="retry-btn" @click="loadStockDetail">重試</button>
    </div>

    <!-- Core Price Banner -->
    <div class="price-banner">
      <div class="price-main">
        <span class="current-price" :class="{ up: isUp, down: isDown }">
          {{ quote?.price != null ? `$${quote.price}` : '--' }}
        </span>
        <div class="change-group" :class="{ up: isUp, down: isDown }">
          <span class="change-amt">
            {{ quote?.change != null ? `${sign}${quote.change}` : '--' }}
          </span>
          <span class="change-pct">
            {{ quote?.changePercent != null ? `(${sign}${quote.changePercent}%)` : '--' }}
          </span>
        </div>
      </div>

      <div class="badge-area">
        <QuoteBadge :quote="quote" />
        <MarketStatusBadge :status="marketStatus" />
      </div>
    </div>

    <!-- OHLCV Grid Stats -->
    <div class="ohlc-grid">
      <div class="stat-col">
        <span class="stat-title">開盤</span>
        <span class="stat-data">{{ quote?.open != null ? `$${quote.open}` : '--' }}</span>
      </div>
      <div class="stat-col">
        <span class="stat-title">最高</span>
        <span class="stat-data high">{{ quote?.high != null ? `$${quote.high}` : '--' }}</span>
      </div>
      <div class="stat-col">
        <span class="stat-title">最低</span>
        <span class="stat-data low">{{ quote?.low != null ? `$${quote.low}` : '--' }}</span>
      </div>
      <div class="stat-col">
        <span class="stat-title">昨收</span>
        <span class="stat-data">{{ quote?.previousClose != null ? `$${quote.previousClose}` : '--' }}</span>
      </div>
      <div class="stat-col">
        <span class="stat-title">成交量</span>
        <span class="stat-data">{{ quote?.volume != null ? quote.volume.toLocaleString() : '--' }}</span>
      </div>
    </div>

    <!-- Interactive Daily K-Chart -->
    <StockChart :symbol="symbol" />

    <!-- Fundamentals Valuation Grid -->
    <div class="section-label">基本面估值</div>
    <FundamentalGrid :fundamental="fundamental" />

    <!-- Disclaimer / Note -->
    <div class="footer-note">
      資料來源：臺灣證券交易所 (Open Data) • 收盤盤後更新
    </div>

    <!-- Alert Modal -->
    <AlertModal
      :is-open="isAlertModalOpen"
      :symbol="symbol"
      :name="stockInfo.name"
      :current-price="quote?.price"
      @close="isAlertModalOpen = false"
    />
  </div>
</template>

<style scoped>
.stock-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #f8fafc;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1e293b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alert-btn {
  background: transparent;
  border: 1px solid #334155;
  color: #fbbf24;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.alert-btn:hover {
  background: #1e293b;
  border-color: #f59e0b;
}

.back-btn {
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.back-btn:hover {
  background: #1e293b;
  color: #f8fafc;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stock-name {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.stock-symbol {
  font-size: 13px;
  color: #94a3b8;
}

.market-pill {
  font-size: 9px;
  padding: 1px 4px;
  background-color: #1e293b;
  color: #fbbf24;
  border-radius: 3px;
}

.star-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.star-btn.active {
  background: rgba(245, 158, 11, 0.15);
  border-color: #fbbf24;
  color: #fbbf24;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  color: #f87171;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.retry-btn {
  background: #ef4444;
  color: #fff;
  border: none;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}

.price-banner {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  background-color: #1e293b;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.price-main {
  display: flex;
  flex-direction: column;
}

.current-price {
  font-size: 24px;
  font-weight: 800;
  color: #f8fafc;
}

.current-price.up,
.change-group.up {
  color: #ef4444;
}

.current-price.down,
.change-group.down {
  color: #10b981;
}

.change-group {
  display: flex;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 2px;
}

.badge-area {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.ohlc-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background-color: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 6px 4px;
  margin-bottom: 12px;
  text-align: center;
}

.stat-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-title {
  font-size: 10px;
  color: #64748b;
}

.stat-data {
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
}

.stat-data.high {
  color: #f87171;
}

.stat-data.low {
  color: #34d399;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
}

.footer-note {
  font-size: 9px;
  color: #64748b;
  text-align: center;
  margin-top: 4px;
}
</style>
