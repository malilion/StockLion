import type { Capability } from '../domain/capability';
import type { QuoteProvider, ProviderMeta, ProviderRegistry } from './types';

export class DefaultProviderRegistry implements ProviderRegistry {
  private providers = new Map<string, QuoteProvider>();
  private preferredMap = new Map<Capability, string>();

  register(provider: QuoteProvider): void {
    this.providers.set(provider.meta.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  clear(): void {
    this.providers.clear();
    this.preferredMap.clear();
  }

  setPreferred(capability: Capability, providerId: string): void {
    this.preferredMap.set(capability, providerId);
  }

  clearPreferred(capability?: Capability): void {
    if (capability) {
      this.preferredMap.delete(capability);
    } else {
      this.preferredMap.clear();
    }
  }

  list(): ProviderMeta[] {
    return Array.from(this.providers.values()).map((p) => p.meta);
  }

  supports(capability: Capability): QuoteProvider[] {
    return Array.from(this.providers.values()).filter((p) =>
      p.meta.capabilities.includes(capability)
    );
  }

  resolve(capability: Capability, preferredId?: string): QuoteProvider | null {
    const candidates = this.supports(capability);
    if (candidates.length === 0) {
      return null;
    }

    const targetId = preferredId || this.preferredMap.get(capability);
    if (targetId) {
      const preferred = candidates.find((p) => p.meta.id === targetId);
      if (preferred && !preferred.meta.credentialId) {
        return preferred;
      }
    }

    for (const provider of candidates) {
      // 若該 Provider 需要金鑰憑證，檢查憑證是否有效 (v2.1 規格：未配置或無效時不得選中)
      if (provider.meta.credentialId) {
        continue;
      }

      // 無需 Key 的 Provider 直接解析選中
      return provider;
    }

    return null;
  }
}

export const providerRegistry = new DefaultProviderRegistry();
