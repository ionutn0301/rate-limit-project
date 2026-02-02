import { IRateLimitStrategy } from '../../models/rate-limit-strategy.js';
import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

/**
 * Sliding Window Log Rate Limiter
 *
 * This implementation uses the sliding window log algorithm, which provides
 * more accurate rate limiting compared to fixed window by tracking individual
 * request timestamps.
 *
 * Algorithm:
 * 1. Store timestamp of each request in a log (array)
 * 2. On each request, remove all timestamps older than the window duration
 * 3. Count remaining timestamps to determine if limit is exceeded
 * 4. If under limit, add current timestamp to the log
 *
 * Advantages over Fixed Window:
 * - No burst traffic at window boundaries
 * - More accurate rate limiting
 * - Smoother traffic distribution
 *
 * Trade-offs:
 * - Higher memory usage (stores all timestamps)
 * - Slightly more computational overhead
 *
 * @example
 * // With maxRequests=5 and windowMs=60000 (1 minute):
 * // Requests at t=0s, t=10s, t=20s, t=30s, t=40s are allowed
 * // Request at t=50s is blocked (5 requests in last 60s)
 * // At t=61s, request is allowed (t=0s request expired)
 */
export class SlidingWindowRateLimiter implements IRateLimitStrategy {
  private readonly storage: IRateLimitStorage;

  constructor(storage: IRateLimitStorage) {
    this.storage = storage;
  }

  private getKey(clientId: string, endpoint: string): string {
    return `sliding-window-log:${clientId}:${endpoint}`;
  }

  async isRateLimited(
    clientId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean> {
    const key = this.getKey(clientId, endpoint);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing timestamps from storage
    const storedData = await this.storage.get(key);
    let timestamps: number[] = [];

    if (Array.isArray(storedData)) {
      timestamps = storedData;
    }

    // Remove expired timestamps (outside the current window)
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Check if we've exceeded the rate limit
    if (timestamps.length >= maxRequests) {
      // Update storage with cleaned timestamps (remove expired ones)
      await this.storage.set(key, timestamps);
      return true;
    }

    // Add current request timestamp and store
    timestamps.push(now);
    await this.storage.set(key, timestamps);

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
    const key = this.getKey(clientId, endpoint);
    const now = Date.now();
    const windowStart = now - windowMs;

    const storedData = await this.storage.get(key);
    let timestamps: number[] = [];

    if (Array.isArray(storedData)) {
      timestamps = storedData.filter(timestamp => timestamp > windowStart);
    }

    return Math.max(0, maxRequests - timestamps.length);
  }

  /**
   * Get the time until the oldest request expires (window resets)
   * Useful for setting Retry-After headers
   */
  async getResetTime(clientId: string, endpoint: string, windowMs: number): Promise<number> {
    const key = this.getKey(clientId, endpoint);
    const now = Date.now();
    const windowStart = now - windowMs;

    const storedData = await this.storage.get(key);

    if (Array.isArray(storedData) && storedData.length > 0) {
      const validTimestamps = storedData.filter(timestamp => timestamp > windowStart);
      if (validTimestamps.length > 0) {
        const oldestTimestamp = Math.min(...validTimestamps);
        return oldestTimestamp + windowMs - now;
      }
    }

    return 0;
  }
}
