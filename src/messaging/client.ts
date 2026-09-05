import type { AppRequest, ExtensionResponse } from './protocol';
import { createAppError, type AppError } from '../domain/errors';

/**
 * 前端 (Popup / Content Script) 使用的型別安全 Extension 訊息傳送 Client
 */
export async function sendExtensionMessage<T>(
  type: AppRequest['type'],
  payload: AppRequest extends { type: typeof type; payload: infer P } ? P : unknown
): Promise<T> {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const message = { id, type, payload };

  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw createAppError('NETWORK_ERROR', 'Chrome extension runtime is not available');
  }

  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: ExtensionResponse<T>) => {
      if (chrome.runtime.lastError) {
        return reject(
          createAppError('NETWORK_ERROR', chrome.runtime.lastError.message || 'Messaging failed')
        );
      }

      if (!response) {
        return reject(
          createAppError('NETWORK_ERROR', 'No response received from background service worker')
        );
      }

      if (response.ok) {
        resolve(response.data);
      } else {
        reject(response.error as AppError);
      }
    });
  });
}
