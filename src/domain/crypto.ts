/**
 * AES-GCM 加密工具 — 用於將機敏憑證（如 Fugle API Key）加密後再存入 chrome.storage.local。
 *
 * 使用 Web Crypto API (SubtleCrypto)，Chrome MV3 Service Worker 原生支援，零第三方依賴。
 * 每台裝置產生一把隨機 AES-256-GCM 金鑰，與密文分離儲存；每次加密使用隨機 IV。
 *
 * ⚠️ 安全限度：由於裝置金鑰同樣存在本機 storage，這無法抵擋「已能任意讀取本機 storage
 * 的攻擊者」。它能防禦的是：純文字掃描、備份/同步意外外洩明文、以及 storage dump 時
 * 一眼看到金鑰。若需更強保護，需引入使用者密碼（PBKDF2 派生金鑰、不落地）。
 */

const DEVICE_KEY_STORAGE = 'crypto:device-key:v1';

export interface EncryptedBlob {
  __enc: 'aes-gcm-v1';
  iv: string; // base64
  data: string; // base64
}

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** 判斷任意值是否為本模組產生的加密 blob */
export function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as any).__enc === 'aes-gcm-v1' &&
    typeof (value as any).iv === 'string' &&
    typeof (value as any).data === 'string'
  );
}

function cryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof chrome !== 'undefined' &&
    typeof chrome.storage?.local !== 'undefined'
  );
}

/** 取得（或初次產生）裝置金鑰，以 JWK 形式存在本機 */
async function getDeviceKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get(DEVICE_KEY_STORAGE);
  const jwk = stored[DEVICE_KEY_STORAGE];

  if (jwk) {
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ]);
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('jwk', key);
  await chrome.storage.local.set({ [DEVICE_KEY_STORAGE]: exported });
  return key;
}

/**
 * 加密明文字串。若執行環境不支援 Web Crypto（例如單元測試的 memory store），
 * 則回傳原始明文（graceful degradation），確保功能不中斷。
 */
export async function encryptString(plaintext: string): Promise<EncryptedBlob | string> {
  if (!cryptoAvailable()) return plaintext;
  try {
    const key = await getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(plaintext);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
    return { __enc: 'aes-gcm-v1', iv: bufToB64(iv.buffer), data: bufToB64(cipher) };
  } catch {
    return plaintext;
  }
}

/**
 * 解密。接受加密 blob 或（向後相容的）明文字串；後者原樣回傳。
 */
export async function decryptValue(value: EncryptedBlob | string): Promise<string> {
  if (typeof value === 'string') return value; // 舊的明文格式，向後相容
  if (!isEncryptedBlob(value)) return String(value);
  if (!cryptoAvailable()) return ''; // 無法解密（不應發生）
  const key = await getDeviceKey();
  const iv = new Uint8Array(b64ToBuf(value.iv));
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, b64ToBuf(value.data));
  return new TextDecoder().decode(plainBuf);
}
