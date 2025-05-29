import { IRateLimitStorage } from '../../models/rate-limit-storage.js';

export class MemoryStorage implements IRateLimitStorage {
  private storage: Map<string, number> = new Map();

  async get(key: string): Promise<number> {
    const value = this.storage.get(key) ?? 0;

    return value;
  }

  async set(key: string, value: number): Promise<void> {
    this.storage.set(key, value);
  }

  async increment(key: string): Promise<void> {
    const currentValue = this.storage.get(key) ?? 0;
    const newValue = currentValue + 1;

    this.storage.set(key, newValue);
  }

  async decrement(key: string): Promise<void> {
    const currentValue = this.storage.get(key) ?? 0;
    const newValue = Math.max(0, currentValue - 1);

    this.storage.set(key, newValue);
  }

  async reset(key: string): Promise<void> {
    this.storage.delete(key);
  }
}
