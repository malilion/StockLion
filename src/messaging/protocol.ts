import type { AppError } from '../domain/errors';

export interface ExtensionRequest<TType extends string, TPayload> {
  id: string;
  type: TType;
  payload: TPayload;
}

export interface ExtensionSuccess<T> {
  id: string;
  ok: true;
  data: T;
}

export interface ExtensionFailure {
  id: string;
  ok: false;
  error: AppError;
}

export type ExtensionResponse<T = unknown> = ExtensionSuccess<T> | ExtensionFailure;

export interface PingPayload {
  timestamp: number;
}

export interface PingResponseData {
  pong: true;
  timestamp: number;
  echo: number;
}

export interface SchemaVersionResponseData {
  version: number;
}

export type AppRequest =
  | ExtensionRequest<'ping', PingPayload>
  | ExtensionRequest<'schema:get-version', Record<string, never>>
  | ExtensionRequest<'quote:get', { symbol: string; preferRealtime: boolean }>
  | ExtensionRequest<'quote:getMany', { symbols: string[]; preferRealtime: boolean }>
  | ExtensionRequest<'stock:search', { query: string; limit?: number }>
  | ExtensionRequest<'stockPeek:get', { symbol: string }>
  | ExtensionRequest<'watchlist:check', { symbol: string }>
  | ExtensionRequest<'watchlist:toggle', { symbol: string }>
  | ExtensionRequest<'stock:open-detail', { symbol: string }>
  | ExtensionRequest<'credential:validate', { credentialId?: string; apiKey: string }>
  | ExtensionRequest<'credential:get', { providerId: string }>
  | ExtensionRequest<'credential:remove', { providerId: string }>
  | ExtensionRequest<'provider:capabilities', Record<string, never>>
  | ExtensionRequest<'alert:evaluate', Record<string, never>>;

export function isExtensionRequest(message: unknown): message is ExtensionRequest<string, unknown> {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof (message as Record<string, unknown>).id === 'string' &&
    typeof (message as Record<string, unknown>).type === 'string' &&
    'payload' in (message as Record<string, unknown>)
  );
}
