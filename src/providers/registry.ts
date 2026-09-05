import type { Capability } from '../domain/capability';
import type { QuoteProvider, ProviderMeta, ProviderRegistry } from './types';
import { credentialStore, type CredentialStore } from '../storage/credential-store';

export class DefaultProviderRegistry implements ProviderRegistry {
  private providers = new Map<string, QuoteProvider>();
  private preferredMap = new Map<Capability, string>();
  private validCredentials = new Set<string>();

  register(provider: QuoteProvider): void {
    this.providers.set(provider.meta.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  clear(): void {
    this.providers.clear();
    this.preferredMap.clear();
    this.validCredentials.clear();
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

  setCredentialValid(credentialId: string, isValid: boolean): void {
    if (isValid) {
      this.validCredentials.add(credentialId);
    } else {
      this.validCredentials.delete(credentialId);
    }
  }

  isCredentialValid(credentialId: string): boolean {
    return this.validCredentials.has(credentialId);
  }

  async syncWithStore(store?: CredentialStore): Promise<void> {
    const targetStore = store ?? credentialStore;
    const all = await targetStore.getAll();
    this.validCredentials.clear();
    for (const [providerId, cred] of Object.entries(all)) {
      if (cred?.status === 'valid') {
        this.validCredentials.add(providerId);
      }
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
      if (preferred) {
        if (!preferred.meta.credentialId || this.validCredentials.has(preferred.meta.credentialId)) {
          return preferred;
        }
      }
    }

    for (const provider of candidates) {
      // 若該 Provider 需要金鑰憑證，檢查憑證是否有效
      if (provider.meta.credentialId) {
        if (this.validCredentials.has(provider.meta.credentialId)) {
          return provider;
        }
        continue;
      }

      // 無需 Key 的 Provider 直接解析選中
      return provider;
    }

    return null;
  }
}

export const providerRegistry = new DefaultProviderRegistry();
