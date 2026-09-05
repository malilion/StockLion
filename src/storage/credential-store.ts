import type { StoredCredential, CredentialStatus } from '../domain/credential';
import { STORAGE_KEYS } from './keys';
import { storageRepository, type StorageRepository } from './repository';

export class CredentialStore {
  private repo: StorageRepository;

  constructor(repo: StorageRepository = storageRepository) {
    this.repo = repo;
  }

  async getAll(): Promise<Record<string, StoredCredential>> {
    const data = await this.repo.get<Record<string, StoredCredential>>(
      STORAGE_KEYS.credentials
    );
    return data || {};
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
    const all = await this.getAll();
    const existing = all[providerId];

    const cred: StoredCredential = {
      id: existing?.id || `cred_${providerId}_${Date.now()}`,
      providerId,
      fields,
      status,
      validatedAt: status === 'valid' ? new Date().toISOString() : existing?.validatedAt,
      lastErrorCode: undefined,
    };

    all[providerId] = cred;
    await this.repo.set(STORAGE_KEYS.credentials, all);
    return cred;
  }

  async updateStatus(
    providerId: string,
    status: CredentialStatus,
    errorCode?: string
  ): Promise<StoredCredential | null> {
    const all = await this.getAll();
    const cred = all[providerId];
    if (!cred) return null;

    cred.status = status;
    if (status === 'valid') {
      cred.validatedAt = new Date().toISOString();
      cred.lastErrorCode = undefined;
    } else {
      cred.lastErrorCode = errorCode;
    }

    all[providerId] = cred;
    await this.repo.set(STORAGE_KEYS.credentials, all);
    return cred;
  }

  async remove(providerId: string): Promise<void> {
    const all = await this.getAll();
    if (all[providerId]) {
      delete all[providerId];
      await this.repo.set(STORAGE_KEYS.credentials, all);
    }
  }

  async clear(): Promise<void> {
    await this.repo.remove(STORAGE_KEYS.credentials);
  }
}

export const credentialStore = new CredentialStore();
