import { IRateLimitStrategy } from '../../models/rate-limit-strategy.js';
import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

export class SlidingWindowRateLimiter implements IRateLimitStrategy {
  private readonly storage: IRateLimitStorage;

  constructor(storage: IRateLimitStorage) {
    this.storage = storage;
  }

  private getKey(clientId: string, endpoint: string): string {
    return `sliding-window:${clientId}:${endpoint}`;
  }

  private getExpiryKey(clientId: string, endpoint: string): string {
    return `sliding-window:${clientId}:${endpoint}:expiry`;
  }

  async isRateLimited(
    clientId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean> {
    const key = this.getKey(clientId, endpoint);
    const expiryKey = this.getExpiryKey(clientId, endpoint);
    const currentCount = ((await this.storage.get(key)) as number) || 0;

    // Check if we need to reset the window
    const expiryTime = (await this.storage.get(expiryKey)) as number;

    if (!expiryTime || Date.now() > expiryTime) {
      await this.storage.reset(key);
      await this.storage.set(expiryKey, Date.now() + windowMs);
      await this.storage.increment(key);

      return false;
    }

    if (currentCount >= maxRequests) {
      return true;
    }

    await this.storage.increment(key);

    return false;
  }
}
