import { describe, it, expect } from 'vitest';
import { isExtensionRequest } from '../../src/messaging/protocol';

describe('Messaging Protocol', () => {
  it('should validate conforming ExtensionRequest objects', () => {
    const valid = {
      id: 'req_123',
      type: 'ping',
      payload: { timestamp: Date.now() },
    };
    expect(isExtensionRequest(valid)).toBe(true);
  });

  it('should reject invalid or malformed messages', () => {
    expect(isExtensionRequest(null)).toBe(false);
    expect(isExtensionRequest('raw string')).toBe(false);
    expect(isExtensionRequest({ id: '123' })).toBe(false);
    expect(isExtensionRequest({ type: 'ping', payload: {} })).toBe(false);
    expect(isExtensionRequest({ id: '123', type: 42, payload: {} })).toBe(false);
  });
});
