import { IRateLimitStrategy } from '../../models/rate-limit-strategy.js';
import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

export class FixedWindowRateLimiter implements IRateLimitStrategy {
  private readonly storage: IRateLimitStorage;

  constructor(storage: IRateLimitStorage) {
    this.storage = storage;
  }

  private getCounterKey(clientId: string, endpoint: string): string {
    return `fixed-window:${clientId}:${endpoint}:counter`;
  }

  private getWindowKey(clientId: string, endpoint: string): string {
    return `fixed-window:${clientId}:${endpoint}:window`;
  }

  async isRateLimited(
    clientId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean> {
    const counterKey = this.getCounterKey(clientId, endpoint);
    const windowKey = this.getWindowKey(clientId, endpoint);

    const now = Date.now();
    const currentWindow = Math.floor(now / windowMs);
    const storedWindow = await this.storage.get(windowKey);

    // If we're in a new window, reset the counter
    if (!storedWindow || storedWindow !== currentWindow) {
      await this.storage.set(counterKey, 0);
      await this.storage.set(windowKey, currentWindow);
    }

    const currentCount = (await this.storage.get(counterKey)) as number;
    if (currentCount >= maxRequests) {
      return true;
    }

    await this.storage.increment(counterKey);
    return false;
  }
}
