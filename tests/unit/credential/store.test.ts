import { describe, it, expect, beforeEach } from 'vitest';
import { CredentialStore } from '../../../src/storage/credential-store';
import { maskApiKey } from '../../../src/domain/credential';
import { StorageRepository } from '../../../src/storage/repository';

describe('CredentialStore & Key Masking', () => {
  let mockStorage: Record<string, any>;
  let repo: StorageRepository;
  let store: CredentialStore;

  beforeEach(() => {
    repo = new StorageRepository();
    store = new CredentialStore(repo);
  });

  it('should mask API keys properly for secure display', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey('12345678')).toBe('••••••••');
    expect(maskApiKey('fugle_live_token_8x2Q')).toBe('fugl••••••8x2Q');
    expect(maskApiKey('  my_secret_token_1234  ')).toBe('my_s••••••1234');
  });

  it('should save credential with unverified status by default', async () => {
    const cred = await store.save('fugle', { apiKey: 'fugle_test_token_1234' });
    expect(cred.providerId).toBe('fugle');
    expect(cred.status).toBe('unverified');
    expect(cred.fields.apiKey).toBe('fugle_test_token_1234');

    const retrieved = await store.get('fugle');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.fields.apiKey).toBe('fugle_test_token_1234');
  });

  it('should update status to valid and record validatedAt timestamp', async () => {
    await store.save('fugle', { apiKey: 'valid_key_12345' });
    const updated = await store.updateStatus('fugle', 'valid');

    expect(updated?.status).toBe('valid');
    expect(updated?.validatedAt).toBeDefined();
    expect(updated?.lastErrorCode).toBeUndefined();
  });

  it('should preserve key when rate-limited (429) per SPEC requirements', async () => {
    await store.save('fugle', { apiKey: 'valid_key_12345' });
    const updated = await store.updateStatus('fugle', 'rate-limited', 'RATE_LIMITED');

    expect(updated?.status).toBe('rate-limited');
    expect(updated?.lastErrorCode).toBe('RATE_LIMITED');

    // 關鍵要求：429 不得清空金鑰
    const check = await store.get('fugle');
    expect(check?.fields.apiKey).toBe('valid_key_12345');
  });

  it('should preserve key when invalid (401) but mark status invalid per SPEC requirements', async () => {
    await store.save('fugle', { apiKey: 'bad_key_12345' });
    const updated = await store.updateStatus('fugle', 'invalid', 'CREDENTIAL_INVALID');

    expect(updated?.status).toBe('invalid');
    expect(updated?.lastErrorCode).toBe('CREDENTIAL_INVALID');

    // 401 標記為 invalid，但保留輸入以供使用者修正
    const check = await store.get('fugle');
    expect(check?.fields.apiKey).toBe('bad_key_12345');
  });

  it('should remove credential completely when user clicks remove', async () => {
    await store.save('fugle', { apiKey: 'key_to_delete' });
    expect(await store.get('fugle')).not.toBeNull();

    await store.remove('fugle');
    expect(await store.get('fugle')).toBeNull();
  });
});
