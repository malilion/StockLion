import type { Capability } from '../domain/capability';
import type { Quote } from '../domain/quote';
import type { FundamentalSnapshot } from '../domain/fundamental';

export interface ProviderContext {
  now: Date;
  signal?: AbortSignal;
}

export interface ProviderMeta {
  id: string;
  label: string;
  capabilities: readonly Capability[];
  credentialId?: string;
}

export interface QuoteProvider {
  readonly meta: ProviderMeta;
  getQuote(symbol: string, ctx?: ProviderContext): Promise<Quote>;
  getQuotes(symbols: string[], ctx?: ProviderContext): Promise<Quote[]>;
  getFundamental?(symbol: string, ctx?: ProviderContext): Promise<FundamentalSnapshot | null>;
}

export interface ProviderRegistry {
  register(provider: QuoteProvider): void;
  list(): ProviderMeta[];
  supports(capability: Capability): QuoteProvider[];
  resolve(capability: Capability): QuoteProvider | null;
}
