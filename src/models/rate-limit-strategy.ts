/**
 * Interface for rate limiting strategy implementations.
 * Defines the contract for determining if a request should be rate limited.
 */
export interface IRateLimitStrategy {
  /**
   * Determines if a request should be rate limited based on the client's configuration
   * @param clientId - The unique identifier of the client making the request
   * @param endpoint - The endpoint being accessed
   * @param maxRequests - The maximum number of requests allowed in the time window
   * @param windowMs - The time window in milliseconds
   * @returns Promise resolving to true if the request should be rate limited, false otherwise
   */
  isRateLimited(
    clientId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean>;
}
