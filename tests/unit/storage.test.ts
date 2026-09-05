import { describe, it, expect, beforeEach } from 'vitest';
import { StorageRepository } from '../../src/storage/repository';
import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION } from '../../src/storage/keys';

describe('StorageRepository', () => {
  let repo: StorageRepository;

  beforeEach(() => {
    repo = new StorageRepository();
  });

  it('should initialize schema version correctly', async () => {
    const initial = await repo.getSchemaVersion();
    expect(initial).toBe(0);

    const initialized = await repo.initSchemaVersion();
    expect(initialized).toBe(CURRENT_SCHEMA_VERSION);

    const current = await repo.getSchemaVersion();
    expect(current).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('should get, set, remove and clear values', async () => {
    await repo.set(STORAGE_KEYS.settings, { theme: 'dark' });
    const settings = await repo.get<{ theme: string }>(STORAGE_KEYS.settings);
    expect(settings).toEqual({ theme: 'dark' });

    await repo.remove(STORAGE_KEYS.settings);
    const removed = await repo.get(STORAGE_KEYS.settings);
    expect(removed).toBeNull();

    await repo.set(STORAGE_KEYS.settings, { theme: 'light' });
    await repo.clear();
    const afterClear = await repo.get(STORAGE_KEYS.settings);
    expect(afterClear).toBeNull();
  });
});
