import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encryptString,
  decryptValue,
  isEncryptedBlob,
  type EncryptedBlob,
} from '../../../src/domain/crypto';

/**
 * crypto.ts 單元測試
 *
 * 涵蓋三種情境：
 *  1. 無 chrome 環境（測試預設）→ graceful degradation：明文原樣進出
 *  2. 有 chrome + Web Crypto → 真正 AES-GCM 加解密往返
 *  3. isEncryptedBlob 型別守衛 + 向後相容（舊明文字串）解密
 */

describe('crypto — graceful degradation (無 chrome 環境)', () => {
  it('cryptoAvailable 為 false 時 encryptString 應原樣回傳明文', async () => {
    // 測試環境沒有 globalThis.chrome，走 degradation 分支
    const result = await encryptString('fugle_live_token_8x2Q');
    expect(result).toBe('fugle_live_token_8x2Q');
  });

  it('decryptValue 對明文字串應原樣回傳（向後相容舊資料）', async () => {
    const result = await decryptValue('legacy_plaintext_key');
    expect(result).toBe('legacy_plaintext_key');
  });
});

describe('crypto — isEncryptedBlob 型別守衛', () => {
  it('應正確辨識合法的加密 blob', () => {
    const blob: EncryptedBlob = { __enc: 'aes-gcm-v1', iv: 'abc', data: 'def' };
    expect(isEncryptedBlob(blob)).toBe(true);
  });

  it('應拒絕明文字串與不完整物件', () => {
    expect(isEncryptedBlob('plaintext')).toBe(false);
    expect(isEncryptedBlob(null)).toBe(false);
    expect(isEncryptedBlob(undefined)).toBe(false);
    expect(isEncryptedBlob({ iv: 'x', data: 'y' })).toBe(false); // 缺 __enc
    expect(isEncryptedBlob({ __enc: 'aes-gcm-v1', iv: 'x' })).toBe(false); // 缺 data
  });
});

describe('crypto — AES-GCM 真正加解密往返 (mock chrome + Web Crypto)', () => {
  let store: Record<string, any>;

  beforeEach(() => {
    // 用記憶體物件模擬 chrome.storage.local，讓 cryptoAvailable() 為 true
    store = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store[key] }),
          set: async (obj: Record<string, any>) => {
            Object.assign(store, obj);
          },
        },
      },
    };
    // node 20+ 已內建 globalThis.crypto.subtle；此處確認存在
    expect(globalThis.crypto?.subtle).toBeDefined();
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
    vi.restoreAllMocks();
  });

  it('加密後應產出 aes-gcm-v1 blob，且不等於明文', async () => {
    const plaintext = 'fugle_secret_token_ABCD1234';
    const enc = await encryptString(plaintext);

    expect(typeof enc).not.toBe('string');
    expect(isEncryptedBlob(enc)).toBe(true);
    const blob = enc as EncryptedBlob;
    expect(blob.__enc).toBe('aes-gcm-v1');
    expect(blob.iv.length).toBeGreaterThan(0);
    expect(blob.data.length).toBeGreaterThan(0);
    // 密文（base64）不應直接包含明文
    expect(blob.data).not.toContain(plaintext);
  });

  it('加密 → 解密應還原原始明文', async () => {
    const plaintext = 'fugle_secret_token_ABCD1234';
    const enc = await encryptString(plaintext);
    const dec = await decryptValue(enc);
    expect(dec).toBe(plaintext);
  });

  it('相同明文兩次加密應產生不同密文（隨機 IV）', async () => {
    const plaintext = 'same_input_value';
    const a = (await encryptString(plaintext)) as EncryptedBlob;
    const b = (await encryptString(plaintext)) as EncryptedBlob;
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
    // 但都能解回同一明文
    expect(await decryptValue(a)).toBe(plaintext);
    expect(await decryptValue(b)).toBe(plaintext);
  });

  it('裝置金鑰應被建立並重複使用（第二次加密沿用同把金鑰）', async () => {
    await encryptString('first');
    const keyAfterFirst = JSON.stringify(store['crypto:device-key:v1']);
    await encryptString('second');
    const keyAfterSecond = JSON.stringify(store['crypto:device-key:v1']);
    expect(keyAfterFirst).toBeDefined();
    expect(keyAfterFirst).toBe(keyAfterSecond);
  });

  it('空字串也能正確加解密往返', async () => {
    const enc = await encryptString('');
    const dec = await decryptValue(enc);
    expect(dec).toBe('');
  });

  it('中文與特殊字元應正確往返（UTF-8）', async () => {
    const plaintext = '台積電_2330_🦁_金鑰!@#$';
    const enc = await encryptString(plaintext);
    const dec = await decryptValue(enc);
    expect(dec).toBe(plaintext);
  });
});
