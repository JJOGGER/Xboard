# E2E Tests for Admin System

This directory contains end-to-end (E2E) tests for the XBoard Admin System using Playwright.

## Overview

The E2E tests validate critical user flows in the admin system:

1. **Admin Login Flow** (`admin-login.spec.ts`)
   - Login with valid/invalid credentials
   - Form validation
   - Session management
   - Logout functionality
   - Route protection

2. **User Management Flow** (`user-management.spec.ts`)
   - User list display and pagination
   - User search and filtering
   - User detail viewing
   - User editing (balance, traffic, etc.)
   - User ban/unban
   - User export to CSV

3. **Order Management Flow** (`order-management.spec.ts`)
   - Order list display and pagination
   - Order filtering by status and date
   - Order detail viewing
   - Order status updates (mark as paid, cancel)
   - Order editing
   - Order statistics

4. **Configuration Management Flow** (`config-management.spec.ts`)
   - Configuration page display
   - Site settings updates
   - Email configuration and testing
   - Telegram bot setup
   - Subscription settings
   - Commission settings
   - Security settings

## Requirements Coverage

These tests validate the following requirements:

- **Requirement 1.1**: Admin Authentication and Authorization
- **Requirement 3.1**: User Management
- **Requirement 6.1**: Order Management
- **Requirement 12.1**: System Configuration

## Running the Tests

### Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Install Playwright browsers:
   ```bash
   pnpm exec playwright install
   ```

3. **Start the dev server** (required):
   ```bash
   # In a separate terminal, start the admin dev server
   pnpm dev
   
   # Or from the root directory
   pnpm dev:admin
   ```
   
   The dev server must be running on `http://localhost:3000` before running E2E tests.

### Run All E2E Tests

**Important**: Make sure the dev server is running first!

```bash
# From the admin package directory
pnpm test:e2e

# Or from the root directory
pnpm --filter @xboard/admin test:e2e
```

### Run Specific Test File

```bash
pnpm exec playwright test admin-login.spec.ts
```

### Run Tests in UI Mode

```bash
pnpm exec playwright test --ui
```

### Run Tests in Debug Mode

```bash
pnpm exec playwright test --debug
```

### Run Tests in Headed Mode

```bash
pnpm exec playwright test --headed
```

## Test Structure

### Helper Functions

The `helpers/` directory contains utility functions for common test operations:

- **`auth.ts`**: Authentication helpers (login, logout, token management)
- **`api-mock.ts`**: API mocking helpers for consistent test data

### Test Organization

Each test file follows this structure:

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: clear auth, mock APIs, login
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## API Mocking

Tests use Playwright's route mocking to intercept API calls and return controlled responses. This ensures:

- Tests run without a backend server
- Consistent test data
- Fast test execution
- Isolation from backend changes

Example:
```typescript
await page.route('**/api/v1/admin/user/fetch**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: mockUsers }),
  });
});
```

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:5173`
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Mock API responses** for consistent test data
3. **Wait for elements** using Playwright's auto-waiting
4. **Use page.waitForTimeout sparingly** - prefer waitForSelector
5. **Clean up after tests** - clear auth, reset state
6. **Test user flows, not implementation** - focus on what users do
7. **Keep tests independent** - each test should run in isolation

## Debugging

### View Test Report

After running tests:
```bash
pnpm exec playwright show-report
```

### View Traces

Traces are captured on first retry. View them with:
```bash
pnpm exec playwright show-trace trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots in `test-results/`
- Videos in `test-results/`

## CI/CD Integration

Tests run automatically in CI with:
- Parallel execution disabled
- 2 retries on failure
- HTML report generation
- Artifact upload for failures

## Troubleshooting

### Tests Timing Out

- Increase timeout in test or config
- Check if dev server is running
- Verify API mocks are set up correctly

### Flaky Tests

- Add explicit waits for dynamic content
- Use more specific selectors
- Check for race conditions
- Verify API mock timing

### Element Not Found

- Check selector specificity
- Verify element is visible (not hidden by CSS)
- Wait for element to appear
- Check if element is in shadow DOM

## Future Improvements

- [ ] Add visual regression testing
- [ ] Add accessibility testing
- [ ] Add performance testing
- [ ] Add mobile viewport testing
- [ ] Add cross-browser testing in CI
- [ ] Add test coverage reporting
- [ ] Add parallel test execution
- [ ] Add test data factories
