<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { CredentialStatus } from '../domain/credential';
import { credentialStore } from '../storage/credential-store';
import { fugleProvider } from '../providers/fugle/provider';
import { providerRegistry } from '../providers/registry';

const apiKeyInput = ref('');
const isMasked = ref(true);
const status = ref<CredentialStatus>('missing');
const isValidating = ref(false);
const feedbackMessage = ref('');
const feedbackType = ref<'success' | 'error' | 'info'>('info');
const validatedAt = ref<string | undefined>(undefined);

onMounted(async () => {
  await loadCredential();
});

async function loadCredential() {
  const cred = await credentialStore.get('fugle');
  if (cred && cred.fields.apiKey) {
    apiKeyInput.value = cred.fields.apiKey;
    status.value = cred.status;
    validatedAt.value = cred.validatedAt;
    providerRegistry.setCredentialValid('fugle', cred.status === 'valid');
  } else {
    apiKeyInput.value = '';
    status.value = 'missing';
    validatedAt.value = undefined;
    providerRegistry.setCredentialValid('fugle', false);
  }
}

async function handleValidateAndSave() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    feedbackType.value = 'error';
    feedbackMessage.value = '請輸入有效的富果 API Key';
    return;
  }

  isValidating.value = true;
  feedbackMessage.value = '正在連線富果 API 驗證金鑰...';
  feedbackType.value = 'info';

  try {
    const result = await fugleProvider.validate(key);
    status.value = result.status;

    if (result.ok) {
      await credentialStore.save('fugle', { apiKey: key }, 'valid');
      providerRegistry.setCredentialValid('fugle', true);
      validatedAt.value = new Date().toISOString();
      feedbackType.value = 'success';
      feedbackMessage.value = '✅ 驗證成功！已解鎖盤中即時行情（● 即時）。';
    } else {
      await credentialStore.save('fugle', { apiKey: key }, result.status);
      providerRegistry.setCredentialValid('fugle', false);
      feedbackType.value = 'error';
      feedbackMessage.value = `❌ ${result.errorMessage || '金鑰驗證失敗'}`;
    }
  } catch (err: any) {
    status.value = 'temporary-error';
    feedbackType.value = 'error';
    feedbackMessage.value = `連線異常：${err.message || '未知錯誤'}`;
  } finally {
    isValidating.value = false;
  }
}

async function handleClear() {
  await credentialStore.remove('fugle');
  providerRegistry.setCredentialValid('fugle', false);
  apiKeyInput.value = '';
  status.value = 'missing';
  validatedAt.value = undefined;
  feedbackType.value = 'info';
  feedbackMessage.value = '已清除金鑰，系統回退至免金鑰模式（○ 收盤盤後資料）。';
}

function getStatusBadgeClass(s: CredentialStatus): string {
  switch (s) {
    case 'valid':
      return 'badge-valid';
    case 'invalid':
      return 'badge-invalid';
    case 'rate-limited':
      return 'badge-limited';
    case 'validating':
      return 'badge-validating';
    default:
      return 'badge-missing';
  }
}

function getStatusLabel(s: CredentialStatus): string {
  switch (s) {
    case 'valid':
      return '● 即時行情已解鎖 (Valid)';
    case 'invalid':
      return '✕ 金鑰無效 (Invalid)';
    case 'rate-limited':
      return '▲ 額度超限保留中 (Rate Limited)';
    case 'validating':
      return '◌ 驗證中...';
    case 'temporary-error':
      return '⚠️ 連線異常 (Temporary Error)';
    default:
      return '○ 免金鑰模式 (EOD 盤後資料)';
  }
}
</script>

<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="section-title-row">
      <h2 class="section-title">BYO Key 金鑰管理</h2>
      <span class="status-badge" :class="getStatusBadgeClass(status)">
        {{ getStatusLabel(status) }}
      </span>
    </div>

    <!-- Key Input Card -->
    <div class="card key-card">
      <label class="input-label" for="fugle-api-key">富果行情 API Key (Token)</label>
      <div class="input-wrapper">
        <input
          id="fugle-api-key"
          v-model="apiKeyInput"
          :type="isMasked ? 'password' : 'text'"
          class="key-input"
          placeholder="貼上富果行情 API Key..."
          autocomplete="off"
          spellcheck="false"
        />
        <button
          type="button"
          class="mask-toggle-btn"
          :title="isMasked ? '顯示金鑰' : '遮蔽金鑰'"
          @click="isMasked = !isMasked"
        >
          {{ isMasked ? '👁️' : '🔒' }}
        </button>
      </div>

      <div v-if="feedbackMessage" class="feedback-banner" :class="feedbackType">
        {{ feedbackMessage }}
      </div>

      <div class="btn-row">
        <button
          class="btn btn-primary"
          :disabled="isValidating || !apiKeyInput.trim()"
          @click="handleValidateAndSave"
        >
          {{ isValidating ? '驗證中...' : '測試並儲存金鑰' }}
        </button>
        <button
          v-if="status !== 'missing' || apiKeyInput.trim()"
          class="btn btn-danger"
          :disabled="isValidating"
          @click="handleClear"
        >
          清除金鑰
        </button>
      </div>
    </div>

    <!-- Application Guide Card -->
    <div class="card guide-card">
      <h3 class="guide-title">💡 如何免費取得富果行情 API Key？</h3>
      <ol class="guide-steps">
        <li><strong>免開證券戶</strong>：只需以手機或 Email 註冊富果會員。</li>
        <li><strong>免費申請</strong>：登入後至富果開發者文件點選「行情 API 金鑰申請」。</li>
        <li><strong>充足額度</strong>：免費方案提供 60 次/分 請求額度，完全滿足自選股即時監控。</li>
      </ol>
      <a
        href="https://developer.fugle.tw/marketdata/document/token"
        target="_blank"
        rel="noopener noreferrer"
        class="guide-link-btn"
      >
        🔗 前往富果開發者中心申請
      </a>
    </div>

    <!-- Security Assurance Banner -->
    <div class="security-banner">
      🛡️ <strong>零外洩保證</strong>：您的金鑰僅儲存於 Chrome 本機儲存庫，絕不上傳任何第三方伺服器，網頁 Content Script 也無法存取。
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.badge-valid {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.badge-invalid {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.badge-limited {
  background-color: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.badge-validating {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.badge-missing {
  background-color: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}

.card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
}

.input-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 2px 6px;
  margin-bottom: 10px;
}

.key-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 12px;
  padding: 6px;
  outline: none;
  font-family: monospace;
}

.mask-toggle-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  color: #94a3b8;
}

.feedback-banner {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.feedback-banner.success {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.feedback-banner.error {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.feedback-banner.info {
  background-color: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.btn-row {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #fbbf24;
  color: #0b0f19;
}

.btn-primary:hover:not(:disabled) {
  background-color: #f59e0b;
}

.btn-primary:disabled {
  background-color: #475569;
  color: #94a3b8;
  cursor: not-allowed;
}

.btn-danger {
  flex: 0 0 auto;
  background-color: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
}

.btn-danger:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.15);
}

.guide-card {
  border-color: #1e3a8a;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
}

.guide-title {
  font-size: 12px;
  font-weight: 700;
  color: #93c5fd;
  margin: 0 0 6px 0;
}

.guide-steps {
  font-size: 11px;
  line-height: 1.6;
  color: #94a3b8;
  padding-left: 18px;
  margin: 0 0 10px 0;
}

.guide-steps strong {
  color: #f1f5f9;
}

.guide-link-btn {
  display: inline-block;
  font-size: 11px;
  color: #60a5fa;
  text-decoration: none;
  font-weight: 600;
}

.guide-link-btn:hover {
  text-decoration: underline;
}

.security-banner {
  font-size: 10px;
  line-height: 1.4;
  color: #64748b;
  text-align: center;
  padding: 4px;
}
</style>
