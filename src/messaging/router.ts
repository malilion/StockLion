import {
  isExtensionRequest,
  type AppRequest,
  type ExtensionResponse,
  type ExtensionSuccess,
  type ExtensionFailure,
} from './protocol';
import { createAppError, isAppError, type AppError } from '../domain/errors';
import { storageRepository } from '../storage/repository';
import { symbolService } from '../services/symbol-service';
import { quoteService } from '../services/quote-service';
import { providerRegistry } from '../providers/registry';
import { openDataProvider } from '../providers/open-data/provider';
import { fugleProvider } from '../providers/fugle/provider';
import { watchlistRepository } from '../storage/watchlist-repository';
import { credentialStore } from '../storage/credential-store';
import { maskApiKey } from '../domain/credential';
import { alertRepository } from '../storage/alert-repository';
import { alertEngine } from '../services/alert-engine';

// 預設註冊 OpenDataProvider 與 FugleProvider (需驗證 Key 解鎖)
providerRegistry.register(openDataProvider);
providerRegistry.register(fugleProvider);

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

    this.register('stock:search', (payload: { query: string; limit?: number }) => {
      return symbolService.search(payload.query, payload.limit);
    });

    this.register(
      'quote:get',
      async (payload: { symbol: string; preferRealtime?: boolean }) => {
        return await quoteService.getBestQuote(payload.symbol, {
          preferRealtime: payload.preferRealtime,
        });
      }
    );

    this.register(
      'quote:getMany',
      async (payload: { symbols: string[]; preferRealtime?: boolean }) => {
        return await quoteService.getBestQuotes(payload.symbols, {
          preferRealtime: payload.preferRealtime,
        });
      }
    );

    this.register('provider:capabilities', () => {
      const allProviders = providerRegistry.list();
      const capabilities = Array.from(
        new Set(allProviders.flatMap((p) => p.capabilities))
      );
      return { capabilities, providers: allProviders };
    });

    this.register('watchlist:check', async (payload: { symbol: string }) => {
      const inWatchlist = await watchlistRepository.hasSymbol(payload.symbol);
      return { inWatchlist, symbol: payload.symbol };
    });

    this.register('watchlist:toggle', async (payload: { symbol: string }) => {
      const inWatchlist = await watchlistRepository.toggleSymbol(payload.symbol);
      return { inWatchlist, symbol: payload.symbol };
    });

    this.register('stock:open-detail', async (payload: { symbol: string }) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ active_nav_symbol: payload.symbol });
      }
      return { success: true, symbol: payload.symbol };
    });

    this.register('stockPeek:get', async (payload: { symbol: string }) => {
      const quote = await quoteService.getBestQuote(payload.symbol);
      const inWatchlist = await watchlistRepository.hasSymbol(payload.symbol);
      return { quote, inWatchlist };
    });

    this.register('credential:validate', async (payload: { apiKey: string }) => {
      const res = await fugleProvider.validate(payload.apiKey);
      if (res.ok) {
        await credentialStore.save('fugle', { apiKey: payload.apiKey }, 'valid');
        providerRegistry.setCredentialValid('fugle', true);
      } else {
        await credentialStore.save('fugle', { apiKey: payload.apiKey }, res.status);
        providerRegistry.setCredentialValid('fugle', false);
      }
      return res;
    });

    this.register('credential:get', async (payload: { providerId: string }) => {
      const cred = await credentialStore.get(payload.providerId);
      return {
        hasKey: !!cred?.fields?.apiKey,
        maskedKey: cred?.fields?.apiKey ? maskApiKey(cred.fields.apiKey) : '',
        status: cred?.status || 'missing',
        validatedAt: cred?.validatedAt,
        lastErrorCode: cred?.lastErrorCode,
      };
    });

    this.register('credential:remove', async (payload: { providerId: string }) => {
      await credentialStore.remove(payload.providerId);
      providerRegistry.setCredentialValid(payload.providerId, false);
      return { ok: true };
    });

    this.register('alert:evaluate', async () => {
      return await alertEngine.evaluateAll();
    });

    this.register('alert:list', async (payload?: { symbol?: string }) => {
      if (payload?.symbol) {
        return await alertRepository.getBySymbol(payload.symbol);
      }
      return await alertRepository.getAll();
    });

    this.register('alert:add', async (payload: any) => {
      return await alertRepository.addRule(payload);
    });

    this.register('alert:remove', async (payload: { id: string }) => {
      await alertRepository.removeRule(payload.id);
      return { ok: true };
    });

    this.register('alert:toggle', async (payload: { id: string }) => {
      const enabled = await alertRepository.toggleRule(payload.id);
      return { enabled };
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
        this.handleMessage(message, sender).then((response) => {
          sendResponse(response);
        });
        return true;
      });
    }
  }
}

export const messageRouter = new MessageRouter();
