import { IRateLimitStrategy } from '../../models/rate-limit-strategy.js';
import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

/**
 * Fixed Window Rate Limiter
 *
 * This implementation uses the fixed window counter algorithm, which divides time
 * into discrete windows and counts requests within each window.
 *
 * Algorithm:
 * 1. Calculate the current window based on time (windowMs intervals)
 * 2. If we're in a new window, reset the counter
 * 3. Check if current count exceeds the limit
 * 4. If under limit, increment counter and allow request
 *
 * Advantages:
 * - Simple to understand and implement
 * - Low memory footprint (only stores counter and window ID)
 * - Very efficient with minimal computational overhead
 * - Easy to implement in distributed systems
 *
 * Trade-offs:
 * - Susceptible to burst traffic at window boundaries
 *   (e.g., 10 requests at end of window + 10 at start of next = 20 in 1 second)
 * - Less precise than sliding window algorithms
 *
 * @example
 * // With maxRequests=10 and windowMs=60000 (1 minute):
 * // Window 1: 00:00-00:59 - allows 10 requests
 * // Window 2: 01:00-01:59 - counter resets, allows 10 more requests
 */
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

  /**
   * Get the remaining number of requests allowed in the current window
   * Useful for setting X-RateLimit-Remaining headers
   */
  async getRemainingRequests(
    clientId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<number> {
    const counterKey = this.getCounterKey(clientId, endpoint);
    const windowKey = this.getWindowKey(clientId, endpoint);

    const now = Date.now();
    const currentWindow = Math.floor(now / windowMs);
    const storedWindow = await this.storage.get(windowKey);

    // If we're in a new window, all requests are available
    if (!storedWindow || storedWindow !== currentWindow) {
      return maxRequests;
    }

    const currentCount = (await this.storage.get(counterKey)) as number;
    return Math.max(0, maxRequests - currentCount);
  }

  /**
   * Get the time until the current window resets
   * Useful for setting Retry-After headers
   */
  async getResetTime(clientId: string, endpoint: string, windowMs: number): Promise<number> {
    const windowKey = this.getWindowKey(clientId, endpoint);
    const now = Date.now();
    const currentWindow = Math.floor(now / windowMs);
    const storedWindow = await this.storage.get(windowKey);

    // If no stored window or different window, reset is immediate
    if (!storedWindow || storedWindow !== currentWindow) {
      return 0;
    }

    // Calculate time until next window
    const nextWindowStart = (currentWindow + 1) * windowMs;
    return nextWindowStart - now;
  }
}
