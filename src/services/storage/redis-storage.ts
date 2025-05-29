import { createClient } from 'redis';
import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

export class RedisStorage implements IRateLimitStorage {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', err => {
      console.error('Redis Client Error:', err);
    });

    this.client.connect().catch(console.error);
  }

  async get(key: string): Promise<number> {
    const value = await this.client.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async set(key: string, value: number): Promise<void> {
    await this.client.set(key, value.toString());
  }

  async increment(key: string): Promise<void> {
    await this.client.incr(key);
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(key);
  }

  async reset(key: string): Promise<void> {
    await this.client.del(key);
  }
}
