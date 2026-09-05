<script setup lang="ts">
import { computed } from 'vue';
import type { Quote } from '../domain/quote';
import QuoteBadge from './QuoteBadge.vue';

const props = defineProps<{
  symbol: string;
  name?: string;
  market?: string;
  quote?: Quote | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'remove', symbol: string): void;
  (e: 'select', symbol: string): void;
}>();

const displayName = computed(() => props.quote?.name || props.name || props.symbol);
const displayPrice = computed(() => {
  if (props.quote?.price != null) {
    return props.quote.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }
  return '--';
});

const isUp = computed(() => (props.quote?.change ?? 0) > 0);
const isDown = computed(() => (props.quote?.change ?? 0) < 0);
const sign = computed(() => (isUp.value ? '+' : ''));

const changeText = computed(() => {
  if (props.quote?.change != null && props.quote?.changePercent != null) {
    return `${sign.value}${props.quote.change} (${sign.value}${props.quote.changePercent}%)`;
  }
  return '--';
});
</script>

<template>
  <div class="stock-card" @click="emit('select', symbol)">
    <div class="card-left">
      <div class="symbol-row">
        <span class="stock-symbol">{{ symbol }}</span>
        <span class="stock-name">{{ displayName }}</span>
        <span v-if="market || quote?.market" class="market-tag">
          {{ market || quote?.market }}
        </span>
      </div>
      <div class="badge-row">
        <QuoteBadge :quote="quote" />
      </div>
    </div>

    <div class="card-right">
      <div class="price-row">
        <span
          class="price-val"
          :class="{ up: isUp, down: isDown }"
        >
          {{ displayPrice }}
        </span>
        <button
          class="remove-btn"
          title="從自選股移除"
          @click.stop="emit('remove', symbol)"
        >
          ✕
        </button>
      </div>
      <div
        class="change-val"
        :class="{ up: isUp, down: isDown }"
      >
        {{ changeText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.stock-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stock-card:hover {
  background-color: #273549;
  border-color: #475569;
}

.card-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.symbol-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stock-symbol {
  font-weight: 700;
  font-size: 14px;
  color: #f8fafc;
  letter-spacing: 0.3px;
}

.stock-name {
  font-size: 13px;
  color: #cbd5e1;
}

.market-tag {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  background-color: #0f172a;
  color: #94a3b8;
}

.badge-row {
  display: flex;
  align-items: center;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-val {
  font-size: 16px;
  font-weight: 700;
  color: #f8fafc;
}

.price-val.up,
.change-val.up {
  color: #ef4444; /* 台股紅漲 */
}

.price-val.down,
.change-val.down {
  color: #10b981; /* 台股綠跌 */
}

.change-val {
  font-size: 11px;
  font-weight: 600;
}

.remove-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0.6;
  transition: opacity 0.2s, color 0.2s;
}

.remove-btn:hover {
  opacity: 1;
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
