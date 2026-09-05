<script setup lang="ts">
import { computed } from 'vue';
import { providerRegistry } from '../providers/registry';
import { useAppStore } from '../stores/app';

const appStore = useAppStore();

const isRealtimeUnlocked = computed(() => {
  return providerRegistry.resolve('quote:realtime') !== null;
});
</script>

<template>
  <slot v-if="isRealtimeUnlocked" />
  <div v-else class="realtime-gate-fallback">
    <slot name="fallback">
      <div class="gate-card">
        <div class="gate-icon">🔒</div>
        <div class="gate-title">此功能需解鎖盤中即時行情</div>
        <div class="gate-desc">
          目前處於免金鑰模式（盤後收盤資料）。請前往「設定」填寫免費申請之富果行情 API Key 即可解鎖即時報價。
        </div>
        <button class="gate-btn" @click="appStore.setTab('settings')">
          ⚙️ 前往設定解鎖
        </button>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.realtime-gate-fallback {
  padding: 12px;
}

.gate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background-color: #1e293b;
  border: 1px dashed #475569;
  border-radius: 8px;
  padding: 16px 14px;
}

.gate-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.gate-title {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 6px;
}

.gate-desc {
  font-size: 11px;
  line-height: 1.5;
  color: #94a3b8;
  margin-bottom: 12px;
}

.gate-btn {
  background-color: #f59e0b;
  color: #0b0f19;
  border: none;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.gate-btn:hover {
  background-color: #fbbf24;
}
</style>
