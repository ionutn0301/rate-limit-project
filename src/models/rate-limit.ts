export interface IRateLimitStorage {
  get(key: string): Promise<number | number[] | null>;
  set(key: string, value: number | number[]): Promise<void>;
  increment(key: string): Promise<void>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

export interface IRateLimitStrategy {
  isRateLimited(
    clientId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean>;
}
