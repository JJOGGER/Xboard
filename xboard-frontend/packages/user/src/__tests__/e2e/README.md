# User Frontend E2E Tests

This directory contains end-to-end (E2E) tests for the user frontend application using Playwright.

## Test Coverage

The E2E tests cover the following critical user flows:

### 1. User Registration and Login (`user-registration-login.spec.ts`)
**Requirements: 18.1 (Registration), 18.3 (Login)**

- User registration with valid data
- Registration validation (email format, password match)
- Duplicate email handling
- Optional invite code support
- User login with valid credentials
- Login error handling
- Form validation
- Loading states
- Authentication persistence
- Logout functionality

### 2. Plan Purchase Flow (`plan-purchase-flow.spec.ts`)
**Requirements: 20.1 (Plan Selection), 21.1 (Order Creation)**

- Display available subscription plans
- Plan pricing tiers and features
- Plan selection and period selection
- Order creation
- Coupon code application
- Price calculation
- Order summary display
- Loading and error states
- Navigation flows

### 3. Payment Processing (`payment-processing.spec.ts`)
**Requirements: 21.1 (Payment Processing)**

- Payment method selection
- Payment checkout initiation
- Order summary before payment
- Payment loading and error states
- Payment callback handling (success/failure)
- Order list display
- Order status tracking
- Order cancellation
- Payment retry
- Order filtering
- Payment security and validation
- Payment history

### 4. Subscription Access (`subscription-access.spec.ts`)
**Requirements: 22.1 (Subscription Access)**

- Subscription link display and copying
- QR code generation
- Subscription secret reset
- Server node information
- Client configuration examples
- Subscription status display
- Expiration and traffic warnings
- Subscription renewal links
- Access control and authentication
- Subscription link sharing

## Running Tests

### Run all E2E tests
```bash
pnpm test:e2e
```

### Run specific test file
```bash
pnpm test:e2e user-registration-login.spec.ts
```

### Run tests in headed mode (see browser)
```bash
pnpm test:e2e --headed
```

### Run tests in debug mode
```bash
pnpm test:e2e --debug
```

### Run tests in specific browser
```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Run tests on mobile viewports
```bash
pnpm test:e2e --project="Mobile Chrome"
pnpm test:e2e --project="Mobile Safari"
```

## Test Structure

### Helper Functions

#### `helpers/auth.ts`
Authentication helper functions:
- `login()` - Login to user frontend
- `register()` - Register new user
- `logout()` - Logout from user frontend
- `isAuthenticated()` - Check authentication status
- `getAuthToken()` - Get stored auth token
- `setAuthToken()` - Set auth token for testing
- `clearAuth()` - Clear all auth data

#### `helpers/api-mock.ts`
API mocking helper functions:
- `mockLoginSuccess()` - Mock successful login
- `mockLoginFailure()` - Mock failed login
- `mockRegisterSuccess()` - Mock successful registration
- `mockRegisterFailure()` - Mock failed registration
- `mockUserProfile()` - Mock user profile data
- `mockPlanList()` - Mock plan list
- `mockOrderCreate()` - Mock order creation
- `mockOrderList()` - Mock order list
- `mockPaymentMethods()` - Mock payment methods
- `mockPaymentCheckout()` - Mock payment checkout
- `mockSubscriptionInfo()` - Mock subscription info
- `mockServerNodes()` - Mock server nodes
- `mockResetSecret()` - Mock subscription secret reset
- `mockTrafficStats()` - Mock traffic statistics
- `mockCouponCheck()` - Mock coupon validation

## Test Patterns

### 1. Setup and Teardown
Each test suite uses `beforeEach` to:
- Clear authentication state
- Setup API mocks
- Login user (if needed)

### 2. API Mocking
Tests use Playwright's route interception to mock API responses:
```typescript
await page.route('**/api/v1/user/info', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: mockUserData }),
  });
});
```

### 3. Waiting Strategies
Tests use appropriate waiting strategies:
- `waitForURL()` - Wait for navigation
- `waitForTimeout()` - Wait for specific duration
- `waitForSelector()` - Wait for element to appear
- `isVisible({ timeout })` - Wait for element visibility

### 4. Flexible Selectors
Tests use flexible selectors to handle different UI implementations:
```typescript
const button = page.locator(
  'button:has-text("Submit"), button:has-text("提交"), button[type="submit"]'
).first();
```

## Best Practices

1. **Mock API Responses**: Always mock API responses to avoid dependencies on backend
2. **Clear State**: Clear authentication and local storage before each test
3. **Flexible Selectors**: Use multiple selector strategies to handle UI variations
4. **Timeout Handling**: Use appropriate timeouts for async operations
5. **Error Handling**: Test both success and error scenarios
6. **Loading States**: Verify loading indicators and disabled states
7. **Mobile Testing**: Include mobile viewport tests for responsive design
8. **Accessibility**: Consider keyboard navigation and screen reader support

## Debugging

### View test report
```bash
pnpm playwright show-report
```

### Generate trace
Traces are automatically generated on first retry. View them with:
```bash
pnpm playwright show-trace trace.zip
```

### Take screenshots
Screenshots are automatically taken on failure and saved to `test-results/`

### Record video
Videos are recorded on failure and saved to `test-results/`

## CI/CD Integration

Tests are configured to run in CI with:
- Retry on failure (2 retries)
- Single worker (no parallel execution)
- HTML report generation
- Trace collection on failure

## Notes

- Tests use mock data and don't require a running backend
- Base URL is configured to `http://localhost:3001` (can be changed in `playwright.config.ts`)
- Tests support both English and Chinese UI text
- Mobile viewport tests are included for responsive design validation
- All critical user flows are covered as per requirements

## Requirements Mapping

| Test File | Requirements | Description |
|-----------|-------------|-------------|
| `user-registration-login.spec.ts` | 18.1, 18.3 | User registration and login flows |
| `plan-purchase-flow.spec.ts` | 20.1, 21.1 | Plan selection and order creation |
| `payment-processing.spec.ts` | 21.1 | Payment processing and order management |
| `subscription-access.spec.ts` | 22.1 | Subscription link and server access |
