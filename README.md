# 🚦 Rate Limit Project

A production-ready Node.js API rate limiting solution demonstrating multiple rate limiting algorithms with pluggable storage backends. Built with TypeScript, Express.js, and best practices for enterprise applications.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

## 🌟 Features

### Rate Limiting Strategies

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Fixed Window** | High-throughput APIs, simple use cases | Simple, memory efficient, fast | Susceptible to burst traffic at window boundaries |
| **Sliding Window Log** | Precise rate limiting, financial APIs | Accurate, no boundary bursts | Higher memory usage |

### Key Capabilities

- 🔄 **Multiple Strategies**: Choose between Fixed Window and Sliding Window algorithms
- 💾 **Pluggable Storage**: In-memory (development) or Redis (production/distributed)
- 👥 **Per-Client Limits**: Configure different rate limits for different API clients
- 🛣️ **Per-Endpoint Limits**: Different limits for different routes
- 📊 **Rate Limit Headers**: Standard `X-RateLimit-*` headers for client transparency
- 🧪 **Comprehensive Tests**: Unit tests demonstrating algorithm differences
- 📝 **Full TypeScript**: Type-safe implementation with interfaces

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Application                     │
├─────────────────────────────────────────────────────────────┤
│  Middleware Pipeline                                         │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  ┌─────────┐ │
│  │ Logger  │→ │   Auth   │→ │  Rate Limiter │→ │ Handler │ │
│  └─────────┘  └──────────┘  └───────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Rate Limiting Strategies (Interchangeable)                  │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │ Fixed Window        │  │ Sliding Window Log         │   │
│  │ • Counter per window│  │ • Timestamp array          │   │
│  │ • O(1) operations   │  │ • Precise tracking         │   │
│  └─────────────────────┘  └────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Storage Backends (Pluggable)                                │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │ Memory Storage      │  │ Redis Storage              │   │
│  │ • Fast, ephemeral   │  │ • Persistent, distributed  │   │
│  └─────────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📖 Algorithm Deep Dive

### Fixed Window Counter

The Fixed Window algorithm divides time into discrete intervals and counts requests within each interval.

```
Time: 0s         60s        120s       180s
      |----------|----------|----------|
Window:    1          2          3
Count:   [0→10]     [0→10]     [0→10]
```

**How it works:**
1. Calculate current window: `windowId = floor(now / windowMs)`
2. If new window, reset counter to 0
3. If `counter >= maxRequests`, reject request
4. Otherwise, increment counter and allow

**Boundary Issue Example:**
```
Window 1 (00:00-00:59): 10 requests at 00:59 ✓
Window 2 (01:00-01:59): 10 requests at 01:00 ✓
Result: 20 requests in 2 seconds! (burst at boundary)
```

### Sliding Window Log

The Sliding Window Log algorithm tracks the timestamp of each individual request, providing precise rate limiting without boundary issues.

```
Time: 0s   10s   20s   30s   40s   50s   60s   70s
      |-----|-----|-----|-----|-----|-----|-----|
Timestamps: [0, 10, 20, 30, 40]
                              ↑ At t=50s, window looks back 60s
                                Still has 5 requests, can accept 5 more
```

**How it works:**
1. Retrieve stored timestamps array
2. Remove timestamps older than `(now - windowMs)`
3. If `timestamps.length >= maxRequests`, reject
4. Otherwise, add current timestamp and allow

**No Boundary Issue:**
```
Requests at 00:59: 10 timestamps stored
At 01:00: All 10 timestamps still within 60s window
Result: New requests blocked until 01:59 (smooth limiting)
```

## 🚀 Quick Start

### Prerequisites

- Node.js v16 or higher
- Redis (optional, for distributed rate limiting)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rate-limit-project.git
cd rate-limit-project

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Configuration

```env
# Server Configuration
PORT=3000

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
```

### Running the Application

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
```

## 📡 API Usage

### Authentication

All endpoints require Bearer token authentication using client IDs:

```bash
curl -H "Authorization: Bearer client-1" http://localhost:3000/foo
```

### Available Endpoints

| Endpoint | Rate Limit Strategy | Description |
|----------|---------------------|-------------|
| `GET /foo` | Fixed Window | Demo endpoint with fixed window limiting |
| `GET /bar` | Sliding Window | Demo endpoint with sliding window limiting |

### Client Rate Limits

| Client | `/foo` Limit | `/bar` Limit |
|--------|-------------|--------------|
| `client-1` | 10 req/min | 5 req/min |
| `client-2` | 20 req/min | 10 req/min |

### Response Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 10
X-RateLimit-Window-Ms: 60000
X-RateLimit-Strategy: fixed
X-RateLimit-Remaining: 7
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "limit": 10,
  "windowMs": 60000
}
```

## 🧪 Testing

The test suite demonstrates the key differences between algorithms:

```bash
npm test
```

### Test Coverage

- ✅ Basic rate limiting (allow/block)
- ✅ Window reset behavior
- ✅ Client isolation
- ✅ Endpoint isolation
- ✅ Remaining request calculation
- ✅ **Algorithm comparison** (demonstrates boundary burst difference)

### Key Test: Strategy Comparison

```typescript
it('should demonstrate the difference between fixed and sliding window', async () => {
  // Set time just before a window boundary
  jest.setSystemTime(windowMs - 100);
  
  // Both accept maxRequests...
  // Cross the window boundary...
  
  // Fixed window: Allows request (new window) - potential burst!
  expect(fixedResult).toBe(false);
  
  // Sliding window: Still blocks (requests in sliding window)
  expect(slidingResult).toBe(true);
});
```

## 📁 Project Structure

```
src/
├── app.ts                    # Express application setup
├── config/
│   └── clients.ts            # Client rate limit configurations
├── middleware/
│   ├── auth.ts               # Bearer token authentication
│   ├── error-handler.ts      # Global error handling
│   ├── logger.ts             # Request/response logging
│   └── rate-limit.ts         # Rate limiting middleware factory
├── models/
│   ├── client.ts             # Client configuration interface
│   ├── rate-limit-storage.ts # Storage interface
│   ├── rate-limit-strategy.ts# Strategy interface
│   ├── rate-limit.ts         # Rate limit model
│   └── types.ts              # Shared type definitions
├── routes/
│   ├── bar.ts                # /bar endpoint (sliding window)
│   └── foo.ts                # /foo endpoint (fixed window)
├── services/
│   ├── rate-limit/
│   │   ├── fixed-window.ts   # Fixed window implementation
│   │   └── sliding-window.ts # Sliding window implementation
│   └── storage/
│       ├── memory-storage.ts # In-memory storage
│       └── redis-storage.ts  # Redis storage
└── tests/
    └── rate-limit.test.ts    # Comprehensive test suite
```

## 🔧 Extending the Project

### Adding a New Rate Limiting Strategy

1. Implement the `IRateLimitStrategy` interface:

```typescript
import { IRateLimitStrategy } from '../models/rate-limit-strategy.js';

export class TokenBucketRateLimiter implements IRateLimitStrategy {
  async isRateLimited(
    clientId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean> {
    // Your implementation
  }
}
```

2. Register in the middleware factory

### Adding a New Storage Backend

1. Implement the `IRateLimitStorage` interface:

```typescript
import { IRateLimitStorage } from '../models/rate-limit-storage.js';

export class PostgresStorage implements IRateLimitStorage {
  async get(key: string): Promise<number | number[] | null> { /* ... */ }
  async set(key: string, value: number | number[]): Promise<void> { /* ... */ }
  async increment(key: string): Promise<void> { /* ... */ }
  async decrement(key: string): Promise<void> { /* ... */ }
  async reset(key: string): Promise<void> { /* ... */ }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Necula Ionut-Alexandru** - [ionutn0301@gmail.com](mailto:ionutn0301@gmail.com)

---

⭐ If you found this project useful, please consider giving it a star!
