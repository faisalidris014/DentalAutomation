import type { OpenDentalConfig } from './types';
import { PMSConnectionError } from '../types';

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export class OpenDentalClient {
  private baseUrl: string;
  private authHeader: string;
  private apiMode: OpenDentalConfig['apiMode'];
  private pageLimit: number;
  private lastRequestTime = 0;

  constructor(config: OpenDentalConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `ODFHIR ${config.developerKey}/${config.customerKey}`;
    this.apiMode = config.apiMode;
    this.pageLimit = config.apiMode === 'remote' ? 100 : 1000;
  }

  private async throttle(isWrite: boolean): Promise<void> {
    if (this.apiMode !== 'remote') return;

    const minInterval = isWrite ? 1000 : 5000;
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < minInterval) {
      await new Promise((r) => setTimeout(r, minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT',
    endpoint: string,
    params?: Record<string, string>,
    body?: unknown,
  ): Promise<T> {
    await this.throttle(method !== 'GET');

    let url = `${this.baseUrl}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
            lastError = new PMSConnectionError(`OpenDental API error ${response.status}: ${text}`);
            await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
            continue;
          }
          throw new PMSConnectionError(`OpenDental API error ${response.status}: ${text}`);
        }

        const data = await response.json();
        return data as T;
      } catch (err) {
        if (err instanceof PMSConnectionError) throw err;

        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
          continue;
        }
      }
    }

    throw lastError ?? new PMSConnectionError('Unknown error');
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', endpoint, params);
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, undefined, body);
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, undefined, body);
  }

  async getAll<T>(endpoint: string, params?: Record<string, string>): Promise<T[]> {
    const allItems: T[] = [];
    let offset = 0;

    while (true) {
      const reqParams = {
        ...params,
        Limit: String(this.pageLimit),
        Offset: String(offset),
      };

      const items = await this.get<T[]>(endpoint, reqParams);
      if (!Array.isArray(items)) {
        // Single item or wrapped response — return as-is
        return items ? [items as T] : [];
      }

      allItems.push(...items);

      if (items.length < this.pageLimit) break;
      offset += this.pageLimit;
    }

    return allItems;
  }
}
