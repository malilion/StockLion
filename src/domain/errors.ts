export type AppErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'CREDENTIAL_INVALID'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'DATA_UNAVAILABLE'
  | 'DATA_STALE'
  | 'SYMBOL_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export interface AppError {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  providerId?: string;
  cause?: string;
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  options?: { retryable?: boolean; providerId?: string; cause?: string }
): AppError {
  const isRetryable =
    options?.retryable ??
    (code === 'RATE_LIMITED' || code === 'NETWORK_ERROR' || code === 'PROVIDER_UNAVAILABLE');

  return {
    code,
    message,
    retryable: isRetryable,
    ...(options?.providerId ? { providerId: options.providerId } : {}),
    ...(options?.cause ? { cause: options.cause } : {}),
  };
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    'retryable' in err
  );
}
