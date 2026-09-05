<script setup lang="ts">
import type { FundamentalSnapshot } from '../domain/fundamental';

defineProps<{
  fundamental?: FundamentalSnapshot | null;
  loading?: boolean;
}>();
</script>

<template>
  <div class="fundamental-grid">
    <div class="stat-card">
      <span class="stat-label">本益比 PE</span>
      <span class="stat-value">
        {{ fundamental?.pe != null ? `${fundamental.pe}x` : '--' }}
      </span>
    </div>

    <div class="stat-card">
      <span class="stat-label">淨值比 PB</span>
      <span class="stat-value">
        {{ fundamental?.pb != null ? `${fundamental.pb}x` : '--' }}
      </span>
    </div>

    <div class="stat-card">
      <span class="stat-label">殖利率</span>
      <span class="stat-value">
        {{ fundamental?.dividendYield != null ? `${fundamental.dividendYield}%` : '--' }}
      </span>
    </div>

    <div class="stat-card">
      <span class="stat-label">每股盈餘 EPS</span>
      <span class="stat-value">
        {{ fundamental?.eps != null ? `$${fundamental.eps}` : '--' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.fundamental-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.stat-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
}
</style>
