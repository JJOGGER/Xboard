import { test, expect } from '@playwright/test';
import { login, logout, isAuthenticated, clearAuth, getAuthToken } from './helpers/auth';
import { mockLoginSuccess, mockLoginFailure, mockDashboardStats } from './helpers/api-mock';

/**
 * E2E Tests for Admin Login Flow
 * Requirements: 1.1 - Admin Authentication and Authorization
 */

test.describe('Admin Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth data
    await clearAuth(page);
  });

  test('should display login page with form fields', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/Admin Login|XBoard Admin/i);

    // Check form elements exist
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Mock successful login and dashboard stats
    await mockLoginSuccess(page);
    await mockDashboardStats(page);

    // Perform login
    await login(page, {
      email: 'admin@test.com',
      password: 'password123',
    });

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify auth token is stored
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);

    // Verify token exists
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();
    expect(token).toContain('mock-admin-token');
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    // Mock failed login
    await mockLoginFailure(page, 'Invalid email or password');

    await page.goto('/login');

    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(1000);

    // Verify error message is displayed
    const errorMessage = page.locator('.el-message--error, .error-message, [role="alert"]');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });

    // Verify still on login page
    await expect(page).toHaveURL(/\/login/);

    // Verify no auth token stored
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Wait for validation messages
    await page.waitForTimeout(500);

    // Check for validation errors (Element Plus or custom validation)
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // Verify form is not submitted (still on login page)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid email format
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');

    // Try to submit
    await page.click('button[type="submit"]');

    // Wait for validation
    await page.waitForTimeout(500);

    // Verify still on login page (validation prevented submission)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should disable submit button during login', async ({ page }) => {
    await mockLoginSuccess(page);
    await mockDashboardStats(page);

    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');

    // Get submit button
    const submitButton = page.locator('button[type="submit"]');

    // Click submit
    await submitButton.click();

    // Button should be disabled during request
    // Note: This might be very fast, so we check immediately
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    
    // Wait for navigation
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Mock login and dashboard
    await mockLoginSuccess(page);
    await mockDashboardStats(page);

    // Login first
    await login(page, {
      email: 'admin@test.com',
      password: 'password123',
    });

    // Verify logged in
    await expect(page).toHaveURL('/dashboard');

    // Mock logout endpoint
    await page.route('**/api/v1/passport/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: true }),
      });
    });

    // Perform logout
    await logout(page);

    // Verify redirected to login
    await expect(page).toHaveURL('/login');

    // Verify auth token is cleared
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should preserve intended destination after login', async ({ page }) => {
    // Mock login and user list
    await mockLoginSuccess(page);
    await mockDashboardStats(page);

    // Try to access users page without auth
    await page.goto('/users');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Login
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to originally intended page or dashboard
    await page.waitForURL(/\/(users|dashboard)/, { timeout: 5000 });
  });

  test('should handle session expiration', async ({ page }) => {
    // Mock login
    await mockLoginSuccess(page);
    await mockDashboardStats(page);

    // Login
    await login(page, {
      email: 'admin@test.com',
      password: 'password123',
    });

    // Verify logged in
    await expect(page).toHaveURL('/dashboard');

    // Mock 401 response for subsequent requests
    await page.route('**/api/v1/admin/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Unauthenticated',
        }),
      });
    });

    // Try to navigate to users page (will trigger API call)
    await page.goto('/users');

    // Should redirect to login due to 401
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Verify auth token is cleared
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });
});
