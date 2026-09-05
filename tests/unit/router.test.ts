import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageRouter } from '../../src/messaging/router';
import { sendExtensionMessage } from '../../src/messaging/client';
import { createAppError } from '../../src/domain/errors';

describe('MessageRouter & Round-trip Messaging', () => {
  let router: MessageRouter;

  beforeEach(() => {
    router = new MessageRouter();
  });

  it('should successfully handle ping request round-trip', async () => {
    const timestamp = Date.now();
    const req = {
      id: 'req-ping-1',
      type: 'ping',
      payload: { timestamp },
    };

    const response = await router.handleMessage<{ pong: boolean; echo: number; timestamp: number }>(req);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.id).toBe('req-ping-1');
      expect(response.data.pong).toBe(true);
      expect(response.data.echo).toBe(timestamp);
      expect(typeof response.data.timestamp).toBe('number');
    }
  });

  it('should return ExtensionFailure for malformed requests', async () => {
    const response = await router.handleMessage('not-an-object');
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.retryable).toBe(false);
    }
  });

  it('should return ExtensionFailure for unregistered message types', async () => {
    const req = {
      id: 'req-unknown-1',
      type: 'unregistered_type',
      payload: {},
    };

    const response = await router.handleMessage(req);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.id).toBe('req-unknown-1');
      expect(response.error.code).toBe('INVALID_INPUT');
    }
  });

  it('should propagate AppError thrown by handlers', async () => {
    router.register('test:error', () => {
      throw createAppError('CREDENTIAL_INVALID', 'Mock invalid credential');
    });

    const req = {
      id: 'req-err-1',
      type: 'test:error',
      payload: {},
    };

    const response = await router.handleMessage(req);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.id).toBe('req-err-1');
      expect(response.error.code).toBe('CREDENTIAL_INVALID');
      expect(response.error.message).toBe('Mock invalid credential');
      expect(response.error.retryable).toBe(false);
    }
  });

  it('should wrap generic Error into UNKNOWN AppError', async () => {
    router.register('test:throw-generic', () => {
      throw new Error('Unexpected crash');
    });

    const req = {
      id: 'req-crash-1',
      type: 'test:throw-generic',
      payload: {},
    };

    const response = await router.handleMessage(req);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.id).toBe('req-crash-1');
      expect(response.error.code).toBe('UNKNOWN');
      expect(response.error.message).toBe('Unexpected crash');
    }
  });

  it('should work end-to-end with sendExtensionMessage client when chrome.runtime is mocked', async () => {
    const timestamp = Date.now();

    // Mock chrome.runtime.sendMessage to forward to our router instance
    const originalChrome = (globalThis as any).chrome;
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn((msg: unknown, callback: (resp: any) => void) => {
          router.handleMessage(msg).then((resp) => {
            callback(resp);
          });
        }),
        lastError: null,
      },
    };

    try {
      const data = await sendExtensionMessage<{ pong: boolean; echo: number }>(
        'ping',
        { timestamp }
      );
      expect(data.pong).toBe(true);
      expect(data.echo).toBe(timestamp);
    } finally {
      (globalThis as any).chrome = originalChrome;
    }
  });
});
