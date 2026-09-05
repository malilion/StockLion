<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { ChartPeriod, CandleData } from '../domain/chart';
import { chartService } from '../services/chart-service';

const props = defineProps<{
  symbol: string;
}>();

const periods: ChartPeriod[] = ['1D', '5D', '1M', '3M', '1Y'];
const selectedPeriod = ref<ChartPeriod>('1M');
const candles = ref<CandleData[]>([]);
const isLoading = ref(false);

const svgWidth = 320;
const svgHeight = 160;
const chartTop = 15;
const chartHeight = 95;
const volumeTop = 120;
const volumeHeight = 30;

async function loadChartData() {
  if (!props.symbol) return;
  isLoading.value = true;
  try {
    const history = await chartService.getChartHistory(props.symbol, selectedPeriod.value);
    candles.value = history.candles;
  } finally {
    isLoading.value = false;
  }
}

watch([() => props.symbol, selectedPeriod], () => {
  loadChartData();
});

onMounted(() => {
  loadChartData();
});

// 計算極值
const minPrice = computed(() => {
  if (candles.value.length === 0) return 0;
  return Math.min(...candles.value.map((c) => c.low));
});

const maxPrice = computed(() => {
  if (candles.value.length === 0) return 100;
  return Math.max(...candles.value.map((c) => c.high));
});

const maxVolume = computed(() => {
  if (candles.value.length === 0) return 1;
  return Math.max(...candles.value.map((c) => c.volume));
});

// 座標轉換計算
const candleElements = computed(() => {
  const list = candles.value;
  if (list.length === 0) return [];

  const priceRange = maxPrice.value - minPrice.value || 1;
  const availableWidth = svgWidth - 20;
  const slotWidth = availableWidth / list.length;
  const candleWidth = Math.max(3, Math.min(slotWidth - 2, 16));

  return list.map((candle, idx) => {
    const rectX = 10 + idx * slotWidth + (slotWidth - candleWidth) / 2;
    const wickX = rectX + candleWidth / 2;

    const openY = chartTop + chartHeight - ((candle.open - minPrice.value) / priceRange) * chartHeight;
    const closeY = chartTop + chartHeight - ((candle.close - minPrice.value) / priceRange) * chartHeight;
    const highY = chartTop + chartHeight - ((candle.high - minPrice.value) / priceRange) * chartHeight;
    const lowY = chartTop + chartHeight - ((candle.low - minPrice.value) / priceRange) * chartHeight;

    const isUp = candle.close >= candle.open;
    const rectY = Math.min(openY, closeY);
    const rectHeight = Math.max(2, Math.abs(closeY - openY));

    // Volume bar
    const volHeight = (candle.volume / (maxVolume.value || 1)) * volumeHeight;
    const volY = volumeTop + volumeHeight - volHeight;

    return {
      x: rectX,
      wickX,
      highY,
      lowY,
      rectX,
      rectY,
      width: candleWidth,
      height: rectHeight,
      volY,
      volHeight,
      isUp,
      candle,
    };
  });
});
</script>

<template>
  <div class="stock-chart-container">
    <!-- Period Select Bar -->
    <div class="period-bar">
      <button
        v-for="p in periods"
        :key="p"
        class="period-btn"
        :class="{ active: selectedPeriod === p }"
        @click="selectedPeriod = p"
      >
        {{ p }}
      </button>
    </div>

    <!-- Chart Viewport -->
    <div class="chart-viewport">
      <div v-if="isLoading" class="chart-loading">
        載入走勢圖中...
      </div>

      <svg
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        class="chart-svg"
      >
        <!-- Grid Lines -->
        <line
          :x1="10"
          :y1="chartTop"
          :x2="svgWidth - 10"
          :y2="chartTop"
          stroke="#334155"
          stroke-dasharray="3,3"
        />
        <line
          :x1="10"
          :y1="chartTop + chartHeight"
          :x2="svgWidth - 10"
          :y2="chartTop + chartHeight"
          stroke="#334155"
          stroke-dasharray="3,3"
        />
        <line
          :x1="10"
          :y1="volumeTop"
          :x2="svgWidth - 10"
          :y2="volumeTop"
          stroke="#1e293b"
        />

        <!-- High / Low labels -->
        <text :x="svgWidth - 10" :y="chartTop + 8" text-anchor="end" fill="#94a3b8" font-size="9">
          {{ maxPrice.toFixed(1) }}
        </text>
        <text :x="svgWidth - 10" :y="chartTop + chartHeight - 2" text-anchor="end" fill="#94a3b8" font-size="9">
          {{ minPrice.toFixed(1) }}
        </text>

        <!-- Candlesticks -->
        <g v-for="(item, idx) in candleElements" :key="idx">
          <!-- Wick -->
          <line
            :x1="item.wickX"
            :y1="item.highY"
            :x2="item.wickX"
            :y2="item.lowY"
            :stroke="item.isUp ? '#ef4444' : '#10b981'"
            stroke-width="1"
          />
          <!-- Body -->
          <rect
            :x="item.rectX"
            :y="item.rectY"
            :width="item.width"
            :height="item.height"
            :fill="item.isUp ? '#ef4444' : '#10b981'"
            rx="1"
          />
          <!-- Volume Bar -->
          <rect
            :x="item.rectX"
            :y="item.volY"
            :width="item.width"
            :height="item.volHeight"
            :fill="item.isUp ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.stock-chart-container {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 12px;
}

.period-bar {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-bottom: 6px;
}

.period-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s;
}

.period-btn:hover {
  color: #f8fafc;
  background-color: #334155;
}

.period-btn.active {
  color: #0b0f19;
  background-color: #fbbf24;
}

.chart-viewport {
  position: relative;
  width: 100%;
}

.chart-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.7);
  font-size: 11px;
  color: #fbbf24;
}

.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}
</style>
