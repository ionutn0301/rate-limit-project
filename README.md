# Rate Limit Project

A Node.js application demonstrating different rate limiting strategies using Express.js.

## Features

- Two types of rate limiting implementations:
  - Fixed Window Rate Limiting (used in `/foo` endpoint)
  - Sliding Window Rate Limiting (used in `/bar` endpoint)
- Multiple storage backends:
  - In-memory storage (for fixed window)
  - Redis storage (for sliding window)
- Configurable rate limits per client
- Authentication via Bearer token
- Request logging
- Global error handling

## Prerequisites

- Node.js (v16 or higher)
- Redis (for sliding window rate limiting)
- TypeScript (v5.3.3 or higher)

## Dependencies

### Core Dependencies
- Express.js (v4.18.3) - Web framework
- Redis (v5.1.1) - For persistent storage
- dotenv (v16.5.0) - Environment configuration

### Development Dependencies
- Jest (v29.7.0) - Testing framework
- ESLint (v8.57.0) - Code linting
- Prettier (v3.2.5) - Code formatting
- TypeScript (v5.3.3) - Type checking and compilation

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3000
```

## Running the Application

1. Start Redis server (required for sliding window rate limiting)
2. Start the application:
```bash
# Development mode with hot reloading
npm run dev

# Production mode
npm run build
npm start
```

## Development Tools

The project includes several development tools to maintain code quality:

```bash
# Linting
npm run lint        # Check for linting issues
npm run lint:fix    # Fix linting issues automatically

# Code formatting
npm run format      # Format code with Prettier
npm run format:check # Check if code is properly formatted
```

## Testing the Endpoints

The application supports two clients with different rate limits:

1. `client-1`:
   - `/foo`: 10 requests per minute (fixed window)
   - `/bar`: 5 requests per minute (sliding window)

2. `client-2`:
   - `/foo`: 20 requests per minute (fixed window)
   - `/bar`: 10 requests per minute (sliding window)

### Example Requests

1. Successful request to `/foo`:
```bash
curl -X GET "http://localhost:3000/foo" \
  -H "Authorization: Bearer client-1"
```

Response:
```json
{
  "success": true
}
```

2. Rate limited request to `/foo`:
```bash
# Make 11 requests in quick succession
for i in {1..11}; do
  curl -X GET "http://localhost:3000/foo" \
    -H "Authorization: Bearer client-1"
done
```

Response (on the 11th request):
```json
{
  "error": "rate limit exceeded"
}
```

3. Successful request to `/bar`:
```bash
curl -X GET "http://localhost:3000/bar" \
  -H "Authorization: Bearer client-2"
```

Response:
```json
{
  "success": true
}
```

## Running Tests

The project uses Jest as the testing framework. Tests are located in the `src/tests` directory.

```bash
npm test
```

## Configuration

The project includes several configuration files:

- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier formatting rules
- `jest.config.js` - Jest testing configuration

## Project Structure

The project follows a modular architecture with the following key components:

- `src/middleware/`: Contains authentication, rate limiting, logging, and error handling middleware
- `src/services/`: 
  - `rate-limit/`: Implements different rate limiting strategies
  - `storage/`: Implements storage backends (memory and Redis)
- `src/routes/`: Defines API endpoints
- `src/models/`: Contains TypeScript interfaces and types
- `src/config/`: Contains client configurations and rate limits
- `src/tests/`: Contains test suites for rate limiting implementations