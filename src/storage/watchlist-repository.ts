import type { WatchlistGroup } from '../domain/watchlist';
import { STORAGE_KEYS } from './keys';
import { storageRepository, type StorageRepository } from './repository';

export const DEFAULT_WATCHLIST_GROUP: WatchlistGroup = {
  id: 'default',
  name: '預設自選',
  order: 0,
  symbols: ['2330', '2317', '2454', '0050'],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export class WatchlistRepository {
  private repo: StorageRepository;

  constructor(repo: StorageRepository = storageRepository) {
    this.repo = repo;
  }

  async getGroups(): Promise<WatchlistGroup[]> {
    const groups = await this.repo.get<WatchlistGroup[]>(STORAGE_KEYS.watchlistGroups);
    if (!groups || groups.length === 0) {
      return this.initDefaultGroups();
    }
    return groups.sort((a, b) => a.order - b.order);
  }

  async saveGroups(groups: WatchlistGroup[]): Promise<void> {
    await this.repo.set(STORAGE_KEYS.watchlistGroups, groups);
  }

  async initDefaultGroups(): Promise<WatchlistGroup[]> {
    const defaultList: WatchlistGroup[] = [
      {
        ...DEFAULT_WATCHLIST_GROUP,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await this.saveGroups(defaultList);
    return defaultList;
  }

  async addGroup(name: string): Promise<WatchlistGroup> {
    const groups = await this.getGroups();
    const newGroup: WatchlistGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || '新分組',
      order: groups.length,
      symbols: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    groups.push(newGroup);
    await this.saveGroups(groups);
    return newGroup;
  }

  async removeGroup(groupId: string): Promise<void> {
    const groups = await this.getGroups();
    const filtered = groups.filter((g) => g.id !== groupId);
    // 重設 order
    filtered.forEach((g, idx) => {
      g.order = idx;
    });
    await this.saveGroups(filtered);
  }

  async renameGroup(groupId: string, newName: string): Promise<void> {
    const groups = await this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      group.name = newName.trim();
      group.updatedAt = new Date().toISOString();
      await this.saveGroups(groups);
    }
  }

  async addSymbolToGroup(groupId: string, symbol: string): Promise<void> {
    const cleanSym = symbol.trim().toUpperCase();
    const groups = await this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    if (!group.symbols.includes(cleanSym)) {
      group.symbols.push(cleanSym);
      group.updatedAt = new Date().toISOString();
      await this.saveGroups(groups);
    }
  }

  async removeSymbolFromGroup(groupId: string, symbol: string): Promise<void> {
    const cleanSym = symbol.trim().toUpperCase();
    const groups = await this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    group.symbols = group.symbols.filter((s) => s !== cleanSym);
    group.updatedAt = new Date().toISOString();
    await this.saveGroups(groups);
  }

  async reorderSymbols(groupId: string, symbols: string[]): Promise<void> {
    const groups = await this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    group.symbols = symbols;
    group.updatedAt = new Date().toISOString();
    await this.saveGroups(groups);
  }
}

export const watchlistRepository = new WatchlistRepository();
