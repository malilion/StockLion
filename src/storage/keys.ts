export const STORAGE_KEYS = {
  schemaVersion: 'app:schema-version',
  watchlistGroups: 'watchlist:groups',
  credentials: 'credentials:v1',
  settings: 'settings:v1',
  stockSymbols: 'stock:symbols:v1',
  alerts: 'alerts:v1',
} as const;

export const CURRENT_SCHEMA_VERSION = 1;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
