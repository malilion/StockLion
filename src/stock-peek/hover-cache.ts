import type { Quote } from '../domain/quote';

export interface CachedHoverData {
  quote: Quote;
  inWatchlist: boolean;
  timestamp: number;
}

export class HoverCache {
  private cache = new Map<string, CachedHoverData>();
  private defaultTtlMs: number;

  constructor(ttlMs: number = 60_000) {
    this.defaultTtlMs = ttlMs;
  }

  get(symbol: string): CachedHoverData | null {
    const cleanSym = symbol.trim().toUpperCase();
    const entry = this.cache.get(cleanSym);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.defaultTtlMs) {
      this.cache.delete(cleanSym);
      return null;
    }

    return entry;
  }

  set(symbol: string, data: { quote: Quote; inWatchlist: boolean }, ttlMs?: number): void {
    const cleanSym = symbol.trim().toUpperCase();
    this.cache.set(cleanSym, {
      ...data,
      timestamp: Date.now(),
    });
  }

  updateWatchlist(symbol: string, inWatchlist: boolean): void {
    const cleanSym = symbol.trim().toUpperCase();
    const entry = this.cache.get(cleanSym);
    if (entry) {
      entry.inWatchlist = inWatchlist;
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const hoverCache = new HoverCache();
