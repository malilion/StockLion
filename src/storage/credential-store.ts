import type { StoredCredential, CredentialStatus } from '../domain/credential';
import { STORAGE_KEYS } from './keys';
import { storageRepository, type StorageRepository } from './repository';
import { encryptString, decryptValue, type EncryptedBlob } from '../domain/crypto';

/**
 * 內部儲存格式：fields 的每個值可能是「加密 blob」或（舊資料的）明文字串。
 * 對外 API（save 的入參、get/getAll 的回傳）一律使用明文 Record<string, string>，
 * 因此 provider / router 等呼叫端無需任何改動。
 */
type StoredFieldValue = EncryptedBlob | string;
interface RawStoredCredential extends Omit<StoredCredential, 'fields'> {
  fields: Record<string, StoredFieldValue>;
}

async function encryptFields(
  fields: Record<string, string>
): Promise<Record<string, StoredFieldValue>> {
  const out: Record<string, StoredFieldValue> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = await encryptString(v);
  }
  return out;
}

async function decryptFields(
  fields: Record<string, StoredFieldValue>
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = await decryptValue(v);
  }
  return out;
}

export class CredentialStore {
  private repo: StorageRepository;

  constructor(repo: StorageRepository = storageRepository) {
    this.repo = repo;
  }

  /** 讀取原始（可能加密）的憑證表 */
  private async getAllRaw(): Promise<Record<string, RawStoredCredential>> {
    const data = await this.repo.get<Record<string, RawStoredCredential>>(
      STORAGE_KEYS.credentials
    );
    return data || {};
  }

  async getAll(): Promise<Record<string, StoredCredential>> {
    const raw = await this.getAllRaw();
    const out: Record<string, StoredCredential> = {};
    for (const [providerId, cred] of Object.entries(raw)) {
      out[providerId] = {
        ...cred,
        fields: await decryptFields(cred.fields || {}),
      };
    }
    return out;
  }

  async get(providerId: string): Promise<StoredCredential | null> {
    const all = await this.getAll();
    return all[providerId] || null;
  }

  async save(
    providerId: string,
    fields: Record<string, string>,
    status: CredentialStatus = 'unverified'
  ): Promise<StoredCredential> {
    const raw = await this.getAllRaw();
    const existing = raw[providerId];

    const encryptedFields = await encryptFields(fields);

    const cred: RawStoredCredential = {
      id: existing?.id || `cred_${providerId}_${Date.now()}`,
      providerId,
      fields: encryptedFields,
      status,
      validatedAt: status === 'valid' ? new Date().toISOString() : existing?.validatedAt,
      lastErrorCode: undefined,
    };

    raw[providerId] = cred;
    await this.repo.set(STORAGE_KEYS.credentials, raw);

    // 對外回傳明文形式
    return { ...cred, fields };
  }

  async updateStatus(
    providerId: string,
    status: CredentialStatus,
    errorCode?: string
  ): Promise<StoredCredential | null> {
    const raw = await this.getAllRaw();
    const cred = raw[providerId];
    if (!cred) return null;

    cred.status = status;
    if (status === 'valid') {
      cred.validatedAt = new Date().toISOString();
      cred.lastErrorCode = undefined;
    } else {
      cred.lastErrorCode = errorCode;
    }

    raw[providerId] = cred;
    await this.repo.set(STORAGE_KEYS.credentials, raw);

    return { ...cred, fields: await decryptFields(cred.fields || {}) };
  }

  async remove(providerId: string): Promise<void> {
    const raw = await this.getAllRaw();
    if (raw[providerId]) {
      delete raw[providerId];
      await this.repo.set(STORAGE_KEYS.credentials, raw);
    }
  }

  async clear(): Promise<void> {
    await this.repo.remove(STORAGE_KEYS.credentials);
  }

  /**
   * 遷移：將既有的明文金鑰就地加密回寫（schema v1 → v2 時呼叫一次即可）。
   * 已是加密格式者自動略過。無明文需遷移時回傳 0。
   */
  async migrateEncryptExisting(): Promise<number> {
    const raw = await this.getAllRaw();
    let migrated = 0;
    for (const [providerId, cred] of Object.entries(raw)) {
      const hasPlaintext = Object.values(cred.fields || {}).some(
        (v) => typeof v === 'string'
      );
      if (!hasPlaintext) continue;

      // 先解密（明文原樣返回）再重新加密
      const plain = await decryptFields(cred.fields || {});
      cred.fields = await encryptFields(plain);
      raw[providerId] = cred;
      migrated++;
    }
    if (migrated > 0) {
      await this.repo.set(STORAGE_KEYS.credentials, raw);
    }
    return migrated;
  }
}

export const credentialStore = new CredentialStore();
