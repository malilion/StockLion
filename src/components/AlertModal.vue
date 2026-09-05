<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { AlertRule, AlertType } from '../domain/alert';
import { alertRepository } from '../storage/alert-repository';
import RealtimeGate from './RealtimeGate.vue';

const props = defineProps<{
  isOpen: boolean;
  symbol: string;
  name: string;
  currentPrice?: number | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const alertType = ref<AlertType>('price-above');
const thresholdValue = ref<number | ''>('');
const percentDirection = ref<'up' | 'down'>('up');
const rules = ref<AlertRule[]>([]);
const isSubmitting = ref(false);
const errorMsg = ref('');

onMounted(() => {
  if (props.isOpen) {
    loadRules();
    initDefaultThreshold();
  }
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadRules();
      initDefaultThreshold();
    }
  }
);

function initDefaultThreshold() {
  if (props.currentPrice && props.currentPrice > 0) {
    thresholdValue.value = Math.round(props.currentPrice * 1.05 * 10) / 10;
  } else {
    thresholdValue.value = '';
  }
}

async function loadRules() {
  errorMsg.value = '';
  rules.value = await alertRepository.getBySymbol(props.symbol);
}

async function handleAddAlert() {
  errorMsg.value = '';
  if (thresholdValue.value === '' || thresholdValue.value <= 0) {
    errorMsg.value = '請輸入大於 0 的有效數值';
    return;
  }

  isSubmitting.value = true;
  try {
    if (alertType.value === 'percent-change') {
      await alertRepository.addRule({
        symbol: props.symbol,
        name: props.name,
        type: 'percent-change',
        threshold: Number(thresholdValue.value),
        direction: percentDirection.value,
        requires: ['quote:realtime'],
        enabled: true,
      });
    } else {
      await alertRepository.addRule({
        symbol: props.symbol,
        name: props.name,
        type: alertType.value as any,
        threshold: Number(thresholdValue.value),
        requires: ['quote:realtime'],
        enabled: true,
      });
    }

    await loadRules();
    initDefaultThreshold();
  } catch (err: any) {
    errorMsg.value = err.message || '新增警示失敗';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleToggle(id: string) {
  await alertRepository.toggleRule(id);
  await loadRules();
}

async function handleDelete(id: string) {
  await alertRepository.removeRule(id);
  await loadRules();
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <div class="header-title-group">
          <span class="modal-title">🔔 到價與異動提醒</span>
          <span class="modal-subtitle">{{ symbol }} {{ name }}</span>
        </div>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <RealtimeGate>
          <!-- Form -->
          <div class="form-section">
            <label class="field-label">警示類型</label>
            <div class="type-selector">
              <button
                class="type-btn"
                :class="{ active: alertType === 'price-above' }"
                @click="alertType = 'price-above'"
              >
                ≥ 目標突破
              </button>
              <button
                class="type-btn"
                :class="{ active: alertType === 'price-below' }"
                @click="alertType = 'price-below'"
              >
                ≤ 目標跌破
              </button>
              <button
                class="type-btn"
                :class="{ active: alertType === 'percent-change' }"
                @click="alertType = 'percent-change'"
              >
                ± 漲跌幅
              </button>
            </div>

            <div class="input-row">
              <div v-if="alertType === 'percent-change'" class="dir-selector">
                <button
                  class="dir-btn"
                  :class="{ active: percentDirection === 'up' }"
                  @click="percentDirection = 'up'"
                >
                  漲幅超過 (+)
                </button>
                <button
                  class="dir-btn"
                  :class="{ active: percentDirection === 'down' }"
                  @click="percentDirection = 'down'"
                >
                  跌幅超過 (-)
                </button>
              </div>

              <div class="num-input-wrap">
                <input
                  v-model.number="thresholdValue"
                  type="number"
                  class="num-input"
                  :placeholder="alertType === 'percent-change' ? '例如 5 (代表 5%)' : '輸入目標價格'"
                  step="any"
                />
                <span class="input-unit">
                  {{ alertType === 'percent-change' ? '%' : '元' }}
                </span>
              </div>
            </div>

            <div v-if="errorMsg" class="error-banner">
              {{ errorMsg }}
            </div>

            <button
              class="add-btn"
              :disabled="isSubmitting || thresholdValue === ''"
              @click="handleAddAlert"
            >
              {{ isSubmitting ? '建立中...' : '+ 新增提醒' }}
            </button>
          </div>

          <!-- Existing Rules List -->
          <div class="rules-section">
            <div class="rules-title">已設定提醒 ({{ rules.length }})</div>
            <div v-if="rules.length === 0" class="empty-rules">
              尚未針對 {{ symbol }} 設定到價提醒。
            </div>
            <div v-for="r in rules" :key="r.id" class="rule-card">
              <div class="rule-info">
                <span class="rule-type-tag">
                  {{
                    r.type === 'price-above'
                      ? `突破 ≥ $${r.threshold}`
                      : r.type === 'price-below'
                      ? `跌破 ≤ $${r.threshold}`
                      : r.type === 'percent-change'
                      ? `${r.direction === 'up' ? '漲幅 ≥ +' : '跌幅 ≤ -'}${r.threshold}%`
                      : `爆量 ≥ ${r.threshold}`
                  }}
                </span>
                <span v-if="r.triggeredCrossing" class="triggered-tag">● 已達標</span>
              </div>
              <div class="rule-actions">
                <button
                  class="toggle-btn"
                  :class="{ active: r.enabled }"
                  @click="handleToggle(r.id)"
                >
                  {{ r.enabled ? '啟用中' : '已暫停' }}
                </button>
                <button class="delete-btn" title="刪除" @click="handleDelete(r.id)">
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <!-- Notice -->
          <div class="notice-footer">
            ⚠️ 提醒說明：受 Chrome MV3 機制限制，警示掃描為分鐘級輪詢排程，非秒級推播；符合條件時將發送瀏覽器桌面通知。
          </div>
        </RealtimeGate>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  width: 90%;
  max-width: 340px;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
}

.header-title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.modal-title {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
}

.modal-subtitle {
  font-size: 11px;
  color: #fbbf24;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
}

.modal-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 440px;
  overflow-y: auto;
}

.field-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 4px;
}

.type-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.type-btn {
  flex: 1;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.type-btn.active {
  background-color: #fbbf24;
  color: #0b0f19;
  font-weight: 700;
  border-color: #fbbf24;
}

.dir-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.dir-btn {
  flex: 1;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.dir-btn.active {
  border-color: #f59e0b;
  color: #fbbf24;
  font-weight: 600;
}

.num-input-wrap {
  display: flex;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 2px 8px;
  margin-bottom: 8px;
}

.num-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 12px;
  padding: 6px 0;
  outline: none;
}

.input-unit {
  font-size: 11px;
  color: #94a3b8;
}

.error-banner {
  font-size: 10px;
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.add-btn {
  width: 100%;
  background-color: #f59e0b;
  color: #0b0f19;
  border: none;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-btn:hover:not(:disabled) {
  background-color: #fbbf24;
}

.add-btn:disabled {
  background-color: #475569;
  color: #94a3b8;
  cursor: not-allowed;
}

.rules-section {
  border-top: 1px solid #1e293b;
  padding-top: 10px;
}

.rules-title {
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.empty-rules {
  font-size: 10px;
  color: #64748b;
  text-align: center;
  padding: 10px 0;
}

.rule-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 4px;
}

.rule-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rule-type-tag {
  font-size: 11px;
  font-weight: 700;
  color: #f8fafc;
}

.triggered-tag {
  font-size: 9px;
  color: #10b981;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-btn {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #475569;
  background-color: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.toggle-btn.active {
  background-color: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 11px;
  padding: 2px;
}

.notice-footer {
  font-size: 9px;
  line-height: 1.4;
  color: #64748b;
  background-color: #1e293b;
  padding: 6px;
  border-radius: 4px;
  margin-top: 4px;
}
</style>
