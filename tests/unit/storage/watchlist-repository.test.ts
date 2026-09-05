import { describe, it, expect, beforeEach } from 'vitest';
import { WatchlistRepository } from '../../../src/storage/watchlist-repository';
import { StorageRepository } from '../../../src/storage/repository';

describe('WatchlistRepository', () => {
  let storage: StorageRepository;
  let repo: WatchlistRepository;

  beforeEach(() => {
    storage = new StorageRepository();
    repo = new WatchlistRepository(storage);
  });

  it('should initialize default groups if storage is empty', async () => {
    const groups = await repo.getGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('default');
    expect(groups[0].name).toBe('預設自選');
    expect(groups[0].symbols).toEqual(['2330', '2317', '2454', '0050']);
  });

  it('should add new groups and keep orders in sync', async () => {
    const newGroup = await repo.addGroup('AI 概念股');
    expect(newGroup.name).toBe('AI 概念股');
    expect(newGroup.order).toBe(1);

    const groups = await repo.getGroups();
    expect(groups).toHaveLength(2);
    expect(groups[1].id).toBe(newGroup.id);
  });

  it('should add and deduplicate symbols in a group', async () => {
    await repo.addSymbolToGroup('default', '3017');
    let groups = await repo.getGroups();
    expect(groups[0].symbols).toContain('3017');

    // 重複加入應被忽略
    await repo.addSymbolToGroup('default', '3017');
    groups = await repo.getGroups();
    const count = groups[0].symbols.filter((s) => s === '3017').length;
    expect(count).toBe(1);
  });

  it('should remove symbols from a group', async () => {
    await repo.removeSymbolFromGroup('default', '2317');
    const groups = await repo.getGroups();
    expect(groups[0].symbols).not.toContain('2317');
    expect(groups[0].symbols).toContain('2330');
  });

  it('should reorder symbols correctly', async () => {
    const newOrder = ['0050', '2454', '2317', '2330'];
    await repo.reorderSymbols('default', newOrder);

    const groups = await repo.getGroups();
    expect(groups[0].symbols).toEqual(newOrder);
  });

  it('should persist data across separate repository instances sharing the same storage', async () => {
    await repo.addGroup('ETF 專區');
    await repo.addSymbolToGroup('default', '2603');

    // 建立新實例讀取相同 storage
    const newRepoInstance = new WatchlistRepository(storage);
    const groups = await newRepoInstance.getGroups();

    expect(groups.length).toBe(2);
    expect(groups[0].symbols).toContain('2603');
    expect(groups[1].name).toBe('ETF 專區');
  });

  it('should remove group and reorder remaining groups', async () => {
    const groupA = await repo.addGroup('Group A');
    const groupB = await repo.addGroup('Group B');

    await repo.removeGroup(groupA.id);

    const groups = await repo.getGroups();
    expect(groups.find((g) => g.id === groupA.id)).toBeUndefined();
    expect(groups.find((g) => g.id === groupB.id)).toBeDefined();
    // 檢查 order 是否重新整理
    expect(groups[1].order).toBe(1);
  });
});
