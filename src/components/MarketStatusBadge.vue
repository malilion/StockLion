<script setup lang="ts">
import { computed } from 'vue';
import type { MarketStatus } from '../domain/market';

const props = defineProps<{
  status?: MarketStatus | null;
}>();

const isDisposition = computed(() => props.status?.isDisposition ?? false);
const isAttention = computed(() => props.status?.isAttention ?? false);
const isLimitUp = computed(() => props.status?.isLimitUp ?? false);
const isLimitDown = computed(() => props.status?.isLimitDown ?? false);
</script>

<template>
  <div class="market-status-group">
    <span v-if="isDisposition" class="status-tag disposition">
      🚫 處置股
    </span>
    <span v-else-if="isAttention" class="status-tag attention">
      ⚠️ 注意股
    </span>

    <span v-if="isLimitUp" class="status-tag limit-up">
      ▲ 漲停
    </span>
    <span v-if="isLimitDown" class="status-tag limit-down">
      ▼ 跌停
    </span>

    <span
      v-if="!isDisposition && !isAttention && !isLimitUp && !isLimitDown"
      class="status-tag normal"
    >
      ● 正常交易
    </span>
  </div>
</template>

<style scoped>
.market-status-group {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.status-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}

.status-tag.normal {
  background-color: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}

.status-tag.attention {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.5);
}

.status-tag.disposition {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.status-tag.limit-up {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid #ef4444;
}

.status-tag.limit-down {
  background-color: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid #10b981;
}
</style>
