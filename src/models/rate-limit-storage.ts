/**
 * Interface for rate limit storage implementations.
 * Defines the contract for storing and retrieving rate limit data.
 */
export interface IRateLimitStorage {
  /**
   * Retrieves the current count or array of timestamps for a given key
   * @param key - The unique identifier for the rate limit counter
   * @returns Promise resolving to the current count or array of timestamps, or null if not found
   */
  get(key: string): Promise<number | number[] | null>;

  /**
   * Sets a value for a given key
   * @param key - The unique identifier for the rate limit counter
   * @param value - The value to store (count or array of timestamps)
   */
  set(key: string, value: number | number[]): Promise<void>;

  /**
   * Increments the counter for a given key
   * @param key - The unique identifier for the rate limit counter
   */
  increment(key: string): Promise<void>;

  /**
   * Decrements the counter for a given key
   * @param key - The unique identifier for the rate limit counter
   */
  decrement(key: string): Promise<void>;

  /**
   * Resets the counter for a given key
   * @param key - The unique identifier for the rate limit counter
   */
  reset(key: string): Promise<void>;
}
