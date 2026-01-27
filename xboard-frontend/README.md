# XBoard Vue 3 Frontend

Modern Vue 3-based admin management system and user frontend for the XBoard proxy panel.

## Overview

This is a monorepo containing three packages:

- **@xboard/admin**: Admin management system
- **@xboard/user**: User-facing frontend website
- **@xboard/shared**: Shared utilities, types, and composables

## Tech Stack

- **Framework**: Vue 3 with Composition API and `<script setup>`
- **Language**: TypeScript 5.0+
- **Build Tool**: Vite 5.0+
- **State Management**: Pinia 2.0+
- **Routing**: Vue Router 4.0+
- **HTTP Client**: Axios
- **UI Frameworks**:
  - Admin: Element Plus
  - User: Naive UI
- **Styling**: TailwindCSS 3.0+
- **Testing**: Vitest + Playwright
- **Package Manager**: PNPM

## Project Structure

```
xboard-frontend/
├── packages/
│   ├── admin/          # Admin system application
│   ├── user/           # User frontend application
│   └── shared/         # Shared utilities and components
├── package.json        # Root package.json
├── pnpm-workspace.yaml # PNPM workspace configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PNPM 8+

### Installation

```bash
# Install PNPM globally (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install
```

### Development

```bash
# Run admin system in development mode
pnpm dev:admin

# Run user frontend in development mode
pnpm dev:user

# Run both applications
pnpm dev:admin & pnpm dev:user
```

### Building

```bash
# Build admin system
pnpm build:admin

# Build user frontend
pnpm build:user

# Build both applications
pnpm build
```

### Testing

```bash
# Run all tests
pnpm test

# Run unit tests
pnpm test:unit

# Run property-based tests
pnpm test:property

# Run E2E tests
pnpm test:e2e
```

### Linting and Formatting

```bash
# Lint all packages
pnpm lint

# Format all files
pnpm format
```

## Package Documentation

- [Shared Package](./packages/shared/README.md)
- Admin Package (coming soon)
- User Package (coming soon)

## Development Workflow

1. **Shared Layer First**: Common utilities, types, and composables are developed in the shared package
2. **Admin System**: Administrative interface for managing users, plans, servers, etc.
3. **User Frontend**: Customer-facing website for subscriptions and account management

## Environment Variables

Each package requires environment variables for configuration:

```bash
# Admin System (.env)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=XBoard Admin

# User Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=XBoard
```

## API Integration

The frontend applications consume the existing Laravel backend APIs:

- Base URL: Configured via `VITE_API_BASE_URL`
- Authentication: Bearer token (Laravel Sanctum)
- Request/Response: JSON format

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT

## Status

🚧 **In Development** - Shared layer implementation completed. Admin and user applications coming soon.

### Completed

- ✅ Project structure setup
- ✅ Shared package implementation
  - ✅ API client with Axios
  - ✅ Authentication service
  - ✅ TypeScript types and interfaces
  - ✅ Utility functions (date, number, string, validation)
  - ✅ Vue composables (loading, error, pagination, debounce)

### In Progress

- 🔄 Admin system implementation
- 🔄 User frontend implementation

### Upcoming

- ⏳ Testing suite
- ⏳ Documentation
- ⏳ Deployment configuration
