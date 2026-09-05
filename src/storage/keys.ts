export const STORAGE_KEYS = {
  schemaVersion: 'app:schema-version',
  watchlistGroups: 'watchlist:groups',
  credentials: 'credentials:v1',
  settings: 'settings:v1',
  stockSymbols: 'stock:symbols:v1',
  alerts: 'alerts:v1',
} as const;

// v2: 憑證 fields 改為 AES-GCM 加密儲存（向後相容舊的明文格式，首次啟動自動遷移）
export const CURRENT_SCHEMA_VERSION = 2;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
