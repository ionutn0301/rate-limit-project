import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

/**
 * In-Memory Storage Implementation
 *
 * Provides a simple, fast storage backend for rate limiting data.
 * Supports both numeric counters (for fixed window) and timestamp arrays
 * (for sliding window log algorithm).
 *
 * Advantages:
 * - Extremely fast read/write operations
 * - No external dependencies
 * - Zero latency
 *
 * Limitations:
 * - Data is lost on server restart
 * - Not suitable for distributed systems (data not shared across instances)
 * - Memory usage grows with number of clients/endpoints
 *
 * Best suited for:
 * - Development and testing
 * - Single-instance deployments
 * - Scenarios where rate limit persistence isn't critical
 */
export class MemoryStorage implements IRateLimitStorage {
  private storage: Map<string, number | number[]> = new Map();

  async get(key: string): Promise<number | number[] | null> {
    const value = this.storage.get(key);
    return value ?? null;
  }

  async set(key: string, value: number | number[]): Promise<void> {
    this.storage.set(key, value);
  }

  async increment(key: string): Promise<void> {
    const currentValue = this.storage.get(key);

    if (typeof currentValue === 'number') {
      this.storage.set(key, currentValue + 1);
    } else {
      this.storage.set(key, 1);
    }
  }

  async decrement(key: string): Promise<void> {
    const currentValue = this.storage.get(key);

    if (typeof currentValue === 'number') {
      this.storage.set(key, Math.max(0, currentValue - 1));
    }
  }

  async reset(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Clear all stored data
   * Useful for testing purposes
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }

  /**
   * Get the number of keys stored
   * Useful for monitoring memory usage
   */
  get size(): number {
    return this.storage.size;
  }
}
