import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION, type StorageKey } from './keys';

export class StorageRepository {
  private memoryStore = new Map<string, unknown>();

  private isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.storage !== 'undefined' &&
      typeof chrome.storage.local !== 'undefined'
    );
  }

  async get<T>(key: StorageKey): Promise<T | null> {
    if (this.isChromeStorageAvailable()) {
      return new Promise<T | null>((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve((result[key] as T) ?? null);
          }
        });
      });
    }

    const value = this.memoryStore.get(key);
    return value !== undefined ? (value as T) : null;
  }

  async set<T>(key: StorageKey, value: T): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }

    this.memoryStore.set(key, value);
  }

  async remove(key: StorageKey): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise<void>((resolve, reject) => {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }

    this.memoryStore.delete(key);
  }

  async clear(): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise<void>((resolve, reject) => {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }

    this.memoryStore.clear();
  }

  async getSchemaVersion(): Promise<number> {
    const version = await this.get<number>(STORAGE_KEYS.schemaVersion);
    return version ?? 0;
  }

  async initSchemaVersion(): Promise<number> {
    const current = await this.getSchemaVersion();
    if (current === 0) {
      await this.set(STORAGE_KEYS.schemaVersion, CURRENT_SCHEMA_VERSION);
      return CURRENT_SCHEMA_VERSION;
    }
    return current;
  }
}

export const storageRepository = new StorageRepository();
