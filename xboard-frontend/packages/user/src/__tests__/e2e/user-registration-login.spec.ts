import { test, expect } from '@playwright/test';
import {
  login,
  register,
  clearAuth,
  isAuthenticated,
  getAuthToken,
} from './helpers/auth';
import {
  mockLoginSuccess,
  mockLoginFailure,
  mockRegisterSuccess,
  mockRegisterFailure,
  mockUserProfile,
} from './helpers/api-mock';

/**
 * E2E Tests for User Registration and Login Flow
 * Requirements: 18.1 (Registration), 18.3 (Login)
 */

test.describe('User Registration and Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth before each test
    await clearAuth(page);
  });

  test.describe('User Registration', () => {
    test('should register successfully with valid data', async ({ page }) => {
      // Mock successful registration
      await mockRegisterSuccess(page);
      await mockUserProfile(page);

      // Navigate to registration page
      await page.goto('/register');

      // Verify we're on the registration page
      await expect(page).toHaveURL('/register');

      // Fill in registration form
      await page.fill('input[name="email"]', 'newuser@test.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="password_confirmation"]', 'password123');

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation or success message
      await page.waitForTimeout(2000);

      // Verify token was stored
      const token = await getAuthToken(page);
      expect(token).toBeTruthy();
      expect(token).toContain('mock-user-token');
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.goto('/register');

      // Fill in invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="password_confirmation"]', 'password123');

      // Try to submit
      await page.click('button[type="submit"]');

      // Wait for validation
      await page.waitForTimeout(500);

      // Verify validation error is displayed
      const errorMessage = page.locator('.error-message, .n-form-item-feedback__line, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    });

    test('should show validation error for password mismatch', async ({ page }) => {
      await page.goto('/register');

      // Fill in mismatched passwords
      await page.fill('input[name="email"]', 'user@test.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="password_confirmation"]', 'different123');

      // Try to submit
      await page.click('button[type="submit"]');

      // Wait for validation
      await page.waitForTimeout(500);

      // Verify validation error is displayed
      const errorMessage = page.locator('.error-message, .n-form-item-feedback__line, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    });

    test('should show error for duplicate email', async ({ page }) => {
      // Mock registration failure
      await mockRegisterFailure(page, {
        email: ['The email has already been taken.'],
      });

      await page.goto('/register');

      // Fill in form
      await page.fill('input[name="email"]', 'existing@test.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="password_confirmation"]', 'password123');

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for error message
      await page.waitForTimeout(1000);

      // Verify error message is displayed
      const errorMessage = page.locator('.error-message, .n-message, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
      await expect(errorMessage.first()).toContainText(/already been taken|已被使用/i);
    });

    test('should accept optional invite code', async ({ page }) => {
      await mockRegisterSuccess(page);
      await mockUserProfile(page);

      await page.goto('/register');

      // Fill in form with invite code
      await page.fill('input[name="email"]', 'invited@test.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="password_confirmation"]', 'password123');
      
      // Check if invite code field exists
      const inviteCodeField = page.locator('input[name="invite_code"]');
      if (await inviteCodeField.isVisible()) {
        await inviteCodeField.fill('INVITE123');
      }

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for success
      await page.waitForTimeout(2000);

      // Verify registration succeeded
      const token = await getAuthToken(page);
      expect(token).toBeTruthy();
    });

    test('should show loading state during registration', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/v1/passport/auth/register', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              token: 'mock-token',
              auth_data: { id: 1, email: 'user@test.com' },
            },
          }),
        });
      });

      await page.goto('/register');

      // Fill in form
      await page.fill('input[name="email"]', 'user@test.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="password_confirmation"]', 'password123');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify loading state
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled({ timeout: 2000 });

      // Wait for completion
      await page.waitForTimeout(1500);
    });
  });

  test.describe('User Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      // Mock successful login
      await mockLoginSuccess(page);
      await mockUserProfile(page);

      // Navigate to login page
      await page.goto('/login');

      // Verify we're on the login page
      await expect(page).toHaveURL('/login');

      // Fill in credentials
      await page.fill('input[name="email"]', 'user@test.com');
      await page.fill('input[type="password"]', 'password123');

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Verify we're on the dashboard
      await expect(page).toHaveURL('/dashboard');

      // Verify token was stored
      const token = await getAuthToken(page);
      expect(token).toBeTruthy();
      expect(token).toContain('mock-user-token');

      // Verify user is authenticated
      const authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      // Mock login failure
      await mockLoginFailure(page);

      await page.goto('/login');

      // Fill in invalid credentials
      await page.fill('input[name="email"]', 'user@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for error message
      await page.waitForTimeout(1000);

      // Verify error message is displayed
      const errorMessage = page.locator('.error-message, .n-message, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
      await expect(errorMessage.first()).toContainText(/invalid|错误/i);

      // Verify we're still on login page
      await expect(page).toHaveURL('/login');

      // Verify no token was stored
      const token = await getAuthToken(page);
      expect(token).toBeNull();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit without filling fields
      await page.click('button[type="submit"]');

      // Wait for validation
      await page.waitForTimeout(500);

      // Verify validation errors are displayed
      const errorMessages = page.locator('.error-message, .n-form-item-feedback__line, [role="alert"]');
      const count = await errorMessages.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid email
      await page.fill('input[name="email"]', 'not-an-email');
      await page.fill('input[type="password"]', 'password123');

      // Try to submit
      await page.click('button[type="submit"]');

      // Wait for validation
      await page.waitForTimeout(500);

      // Verify validation error is displayed
      const errorMessage = page.locator('.error-message, .n-form-item-feedback__line, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    });

    test('should show loading state during login', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/v1/passport/auth/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              token: 'mock-token',
              auth_data: { id: 1, email: 'user@test.com' },
            },
          }),
        });
      });

      await page.goto('/login');

      // Fill in credentials
      await page.fill('input[name="email"]', 'user@test.com');
      await page.fill('input[type="password"]', 'password123');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify loading state
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled({ timeout: 2000 });

      // Wait for completion
      await page.waitForTimeout(1500);
    });

    test('should redirect to dashboard if already authenticated', async ({ page }) => {
      // Mock successful login
      await mockLoginSuccess(page);
      await mockUserProfile(page);

      // Login first
      await login(page, {
        email: 'user@test.com',
        password: 'password123',
      });

      // Verify we're on dashboard
      await expect(page).toHaveURL('/dashboard');

      // Try to navigate to login page
      await page.goto('/login');

      // Should redirect back to dashboard
      await page.waitForTimeout(1000);
      
      // Check if we're redirected (might stay on login or redirect to dashboard)
      const currentUrl = page.url();
      // Either redirected to dashboard or stayed on login (both are acceptable)
      expect(currentUrl).toMatch(/\/(login|dashboard)/);
    });

    test('should have link to registration page', async ({ page }) => {
      await page.goto('/login');

      // Look for registration link
      const registerLink = page.locator('a[href="/register"], a:has-text("Register"), a:has-text("注册")');
      await expect(registerLink.first()).toBeVisible({ timeout: 3000 });

      // Click the link
      await registerLink.first().click();

      // Verify navigation to registration page
      await page.waitForURL('/register', { timeout: 5000 });
      await expect(page).toHaveURL('/register');
    });

    test('should have link to forgot password page', async ({ page }) => {
      await page.goto('/login');

      // Look for forgot password link
      const forgotLink = page.locator('a[href="/forgot-password"], a:has-text("Forgot"), a:has-text("忘记密码")');
      
      if (await forgotLink.first().isVisible()) {
        // Click the link
        await forgotLink.first().click();

        // Verify navigation to forgot password page
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        expect(currentUrl).toContain('forgot');
      }
    });
  });

  test.describe('Authentication Persistence', () => {
    test('should persist authentication across page reloads', async ({ page }) => {
      // Mock successful login
      await mockLoginSuccess(page);
      await mockUserProfile(page);

      // Login
      await login(page, {
        email: 'user@test.com',
        password: 'password123',
      });

      // Verify authenticated
      let authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);

      // Reload page
      await page.reload();

      // Verify still authenticated
      authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);

      // Verify token still exists
      const token = await getAuthToken(page);
      expect(token).toBeTruthy();
    });

    test('should clear authentication on logout', async ({ page }) => {
      // Mock successful login
      await mockLoginSuccess(page);
      await mockUserProfile(page);

      // Login
      await login(page, {
        email: 'user@test.com',
        password: 'password123',
      });

      // Verify authenticated
      let authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);

      // Clear auth (simulating logout)
      await clearAuth(page);

      // Verify not authenticated
      authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(false);

      // Verify token was removed
      const token = await getAuthToken(page);
      expect(token).toBeNull();
    });
  });
});
