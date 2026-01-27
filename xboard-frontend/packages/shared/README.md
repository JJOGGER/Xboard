# @xboard/shared

Shared utilities, types, and composables for XBoard Vue 3 Frontend applications.

## Overview

This package contains common code shared between the admin and user frontend applications:

- **API Client**: Axios-based HTTP client with interceptors
- **Authentication Service**: User authentication and token management
- **TypeScript Types**: Comprehensive type definitions for all data models
- **Utility Functions**: Date, number, string, and validation helpers
- **Vue Composables**: Reusable composition functions for common patterns

## Installation

This package is part of the XBoard monorepo and is automatically linked via PNPM workspaces.

```bash
# Install dependencies
pnpm install
```

## Usage

### API Client

```typescript
import { apiClient } from '@xboard/shared';

// Make API requests
const response = await apiClient.get('/users');
const data = await apiClient.post('/users', { email: 'user@example.com' });
```

### Authentication Service

```typescript
import { authService } from '@xboard/shared';

// Login
const { token, user } = await authService.userLogin({
  email: 'user@example.com',
  password: 'password123',
});

// Get current user
const user = await authService.getCurrentUser();

// Logout
await authService.logout();
```

### Types

```typescript
import type { User, Plan, Order } from '@xboard/shared';

const user: User = {
  id: 1,
  email: 'user@example.com',
  // ...
};
```

### Utility Functions

```typescript
import {
  formatDate,
  formatBytes,
  truncate,
  isValidEmail,
} from '@xboard/shared';

// Date formatting
const formatted = formatDate(new Date()); // "2024-01-17 10:30:00"

// Number formatting
const size = formatBytes(1024 * 1024); // "1 MB"

// String utilities
const short = truncate('Long text here', 10); // "Long te..."

// Validation
const valid = isValidEmail('user@example.com'); // true
```

### Composables

```typescript
import {
  useLoading,
  useError,
  usePagination,
  useDebounce,
} from '@xboard/shared';

// Loading state
const { isLoading, withLoading } = useLoading();
await withLoading(async () => {
  // async operation
});

// Error handling
const { error, setError, clearError } = useError();

// Pagination
const {
  currentPage,
  pageSize,
  total,
  setPage,
  nextPage,
} = usePagination();

// Debouncing
const { debouncedValue } = useDebounce(searchQuery, 300);
```

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run unit tests
pnpm test:unit

# Run property-based tests
pnpm test:property

# Run tests in watch mode
pnpm test -- --watch
```

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

## Structure

```
src/
├── api/              # API client and services
│   ├── client.ts     # Axios HTTP client
│   └── auth.ts       # Authentication service
├── types/            # TypeScript type definitions
│   ├── api.ts        # API response types
│   ├── user.ts       # User types
│   ├── plan.ts       # Plan types
│   └── ...
├── utils/            # Utility functions
│   ├── date.ts       # Date utilities
│   ├── number.ts     # Number utilities
│   ├── string.ts     # String utilities
│   └── validation.ts # Validation helpers
├── composables/      # Vue composables
│   ├── useLoading.ts
│   ├── useError.ts
│   ├── usePagination.ts
│   └── useDebounce.ts
└── index.ts          # Main export
```

## License

MIT
