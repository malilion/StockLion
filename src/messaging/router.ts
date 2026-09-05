import {
  isExtensionRequest,
  type AppRequest,
  type ExtensionResponse,
  type ExtensionSuccess,
  type ExtensionFailure,
} from './protocol';
import { createAppError, isAppError, type AppError } from '../domain/errors';
import { storageRepository } from '../storage/repository';

export type MessageHandler<TPayload = any, TResult = any> = (
  payload: TPayload,
  sender: chrome.runtime.MessageSender
) => Promise<TResult> | TResult;

export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    this.register('ping', (payload: { timestamp: number }) => {
      return {
        pong: true as const,
        timestamp: Date.now(),
        echo: payload?.timestamp ?? 0,
      };
    });

    this.register('schema:get-version', async () => {
      const version = await storageRepository.getSchemaVersion();
      return { version };
    });
  }

  register<TType extends string, TPayload, TResult>(
    type: TType,
    handler: (payload: TPayload, sender: chrome.runtime.MessageSender) => Promise<TResult> | TResult
  ) {
    this.handlers.set(type, handler as MessageHandler);
  }

  async handleMessage<T = unknown>(
    message: unknown,
    sender: chrome.runtime.MessageSender = {} as chrome.runtime.MessageSender
  ): Promise<ExtensionResponse<T>> {
    if (!isExtensionRequest(message)) {
      return {
        id: 'unknown',
        ok: false,
        error: createAppError('INVALID_INPUT', 'Malformed extension message format'),
      };
    }

    const { id, type, payload } = message as AppRequest;
    const handler = this.handlers.get(type);

    if (!handler) {
      return {
        id,
        ok: false,
        error: createAppError(
          'INVALID_INPUT',
          `Unknown or unhandled message type: ${type}`,
          { retryable: false }
        ),
      };
    }

    try {
      const result = await handler(payload, sender);
      const success: ExtensionSuccess<typeof result> = {
        id,
        ok: true,
        data: result,
      };
      return success;
    } catch (err: unknown) {
      let appError: AppError;
      if (isAppError(err)) {
        appError = err;
      } else if (err instanceof Error) {
        appError = createAppError('UNKNOWN', err.message, { cause: err.stack });
      } else {
        appError = createAppError('UNKNOWN', String(err));
      }

      const failure: ExtensionFailure = {
        id,
        ok: false,
        error: appError,
      };
      return failure;
    }
  }

  attachListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Return true to indicate asynchronous sendResponse
        this.handleMessage(message, sender).then((response) => {
          sendResponse(response);
        });
        return true;
      });
    }
  }
}

export const messageRouter = new MessageRouter();
