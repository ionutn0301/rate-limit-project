import { createClient, RedisClientType } from 'redis';
import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

/**
 * Redis Storage Implementation
 *
 * Provides a distributed, persistent storage backend for rate limiting data.
 * Supports both numeric counters (for fixed window) and timestamp arrays
 * (for sliding window log algorithm).
 *
 * Advantages:
 * - Data persists across server restarts
 * - Shared state across multiple application instances
 * - Suitable for distributed systems and load-balanced environments
 * - High performance with sub-millisecond operations
 *
 * Requirements:
 * - Redis server running and accessible
 * - REDIS_URL environment variable or default localhost:6379
 *
 * Best suited for:
 * - Production deployments
 * - Multi-instance/clustered applications
 * - Scenarios requiring rate limit persistence
 */
export class RedisStorage implements IRateLimitStorage {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', err => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async get(key: string): Promise<number | number[] | null> {
    await this.ensureConnection();
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    // Try to parse as JSON (for arrays)
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not JSON, treat as number
    }

    return parseInt(value, 10);
  }

  async set(key: string, value: number | number[]): Promise<void> {
    await this.ensureConnection();

    if (Array.isArray(value)) {
      await this.client.set(key, JSON.stringify(value));
    } else {
      await this.client.set(key, value.toString());
    }
  }

  async increment(key: string): Promise<void> {
    await this.ensureConnection();
    await this.client.incr(key);
  }

  async decrement(key: string): Promise<void> {
    await this.ensureConnection();
    await this.client.decr(key);
  }

  async reset(key: string): Promise<void> {
    await this.ensureConnection();
    await this.client.del(key);
  }

  /**
   * Set a key with an expiration time
   * Useful for automatic cleanup of rate limit data
   */
  async setWithExpiry(key: string, value: number | number[], expiryMs: number): Promise<void> {
    await this.ensureConnection();

    const stringValue = Array.isArray(value) ? JSON.stringify(value) : value.toString();
    await this.client.set(key, stringValue, { PX: expiryMs });
  }

  /**
   * Disconnect from Redis
   * Should be called during application shutdown
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Check if the client is connected to Redis
   */
  get connected(): boolean {
    return this.isConnected;
  }
}
