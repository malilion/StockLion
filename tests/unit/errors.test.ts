import { describe, it, expect } from 'vitest';
import { createAppError, isAppError } from '../../src/domain/errors';

describe('Domain AppError', () => {
  it('should create an AppError with correct retryable defaults', () => {
    const rateLimitedErr = createAppError('RATE_LIMITED', 'Too many requests');
    expect(rateLimitedErr.code).toBe('RATE_LIMITED');
    expect(rateLimitedErr.message).toBe('Too many requests');
    expect(rateLimitedErr.retryable).toBe(true);

    const credentialErr = createAppError('CREDENTIAL_INVALID', 'Invalid token');
    expect(credentialErr.code).toBe('CREDENTIAL_INVALID');
    expect(credentialErr.retryable).toBe(false);

    const networkErr = createAppError('NETWORK_ERROR', 'Connection failed');
    expect(networkErr.retryable).toBe(true);

    const customRetryable = createAppError('UNKNOWN', 'Custom', { retryable: true, providerId: 'fugle' });
    expect(customRetryable.retryable).toBe(true);
    expect(customRetryable.providerId).toBe('fugle');
  });

  it('should accurately identify AppError objects', () => {
    const err = createAppError('DATA_UNAVAILABLE', 'No data');
    expect(isAppError(err)).toBe(true);
    expect(isAppError(new Error('Standard error'))).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError({})).toBe(false);
  });
});
