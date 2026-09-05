<script setup lang="ts">
import { computed } from 'vue';
import type { DataFreshness, Quote } from '../domain/quote';
import { quoteBadge } from '../domain/quote';

const props = defineProps<{
  quote?: Quote | null;
  freshness?: DataFreshness;
  tradingDate?: string;
}>();

const effectiveFreshness = computed<DataFreshness>(() => {
  if (props.quote) return props.quote.freshness;
  return props.freshness ?? 'eod';
});

const label = computed<string>(() => {
  if (props.quote) {
    return quoteBadge(props.quote);
  }
  switch (effectiveFreshness.value) {
    case 'realtime':
      return '● 即時';
    case 'delayed':
      return '◐ 延遲';
    case 'eod':
      return `○ ${props.tradingDate ? `${props.tradingDate} ` : ''}收盤`;
    case 'stale':
      return '⚠ 資料較舊';
  }
});
</script>

<template>
  <span
    class="quote-badge"
    :class="{
      'badge-realtime': effectiveFreshness === 'realtime',
      'badge-delayed': effectiveFreshness === 'delayed',
      'badge-eod': effectiveFreshness === 'eod',
      'badge-stale': effectiveFreshness === 'stale',
    }"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.quote-badge {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.2px;
  line-height: 1.4;
  white-space: nowrap;
}

.badge-realtime {
  background-color: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.badge-delayed {
  background-color: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.badge-eod {
  background-color: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}

.badge-stale {
  background-color: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
</style>
