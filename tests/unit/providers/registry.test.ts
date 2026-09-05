import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultProviderRegistry } from '../../../src/providers/registry';
import { openDataProvider } from '../../../src/providers/open-data/provider';
import { mockProvider } from '../../../src/providers/mock/provider';

describe('ProviderRegistry', () => {
  let registry: DefaultProviderRegistry;

  beforeEach(() => {
    registry = new DefaultProviderRegistry();
  });

  it('should register and list providers', () => {
    registry.register(openDataProvider);
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].id).toBe('open-data');
  });

  it('should find providers supporting a specific capability', () => {
    registry.register(openDataProvider);
    registry.register(mockProvider);

    const eodProviders = registry.supports('quote:eod');
    expect(eodProviders).toHaveLength(2);

    const realtimeProviders = registry.supports('quote:realtime');
    expect(realtimeProviders).toHaveLength(0);
  });

  it('should resolve quote:eod without credentials', () => {
    registry.register(openDataProvider);
    const resolved = registry.resolve('quote:eod');
    expect(resolved).not.toBeNull();
    expect(resolved?.meta.id).toBe('open-data');
  });

  it('should resolve quote:realtime as null when no valid realtime provider exists', () => {
    registry.register(openDataProvider);
    // 規格約束：不得自動把 quote:realtime 回退給 EOD provider
    const resolved = registry.resolve('quote:realtime');
    expect(resolved).toBeNull();
  });

  it('should not resolve providers that require credentials before validation', () => {
    const fakeRealtimeProvider = {
      meta: {
        id: 'fake-fugle',
        label: 'Fake Fugle',
        capabilities: ['quote:realtime'] as const,
        credentialId: 'fugle-token',
      },
      getQuote: vi.fn(),
      getQuotes: vi.fn(),
    };

    registry.register(fakeRealtimeProvider as any);
    const resolved = registry.resolve('quote:realtime');
    expect(resolved).toBeNull();
  });
});
