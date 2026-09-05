import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWatchlistStore } from '../../../src/stores/watchlist';
import { watchlistRepository } from '../../../src/storage/watchlist-repository';

describe('useWatchlistStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await watchlistRepository.initDefaultGroups();
  });

  it('should load groups and set active group', async () => {
    const store = useWatchlistStore();
    await store.loadGroups();

    expect(store.groups.length).toBeGreaterThan(0);
    expect(store.activeGroup).toBeDefined();
    expect(store.activeSymbols).toContain('2330');
  });

  it('should add and remove symbols via store', async () => {
    const store = useWatchlistStore();
    await store.loadGroups();

    await store.addSymbol('3017');
    expect(store.activeSymbols).toContain('3017');

    await store.removeSymbol('3017');
    expect(store.activeSymbols).not.toContain('3017');
  });

  it('should switch active groups', async () => {
    const store = useWatchlistStore();
    await store.loadGroups();

    await store.createGroup('高股息');
    expect(store.activeGroup?.name).toBe('高股息');

    store.setActiveGroup('default');
    expect(store.activeGroup?.id).toBe('default');
  });
});
