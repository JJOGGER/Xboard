import { Page } from '@playwright/test';

/**
 * Helper functions for user authentication in E2E tests
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirmation: string;
  invite_code?: string;
}

/**
 * Login to the user frontend
 */
export async function login(page: Page, credentials: LoginCredentials) {
  await page.goto('/login');
  
  // Fill in credentials
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Register a new user
 */
export async function register(page: Page, data: RegisterData) {
  await page.goto('/register');
  
  // Fill in registration form
  await page.fill('input[name="email"]', data.email);
  await page.fill('input[name="password"]', data.password);
  await page.fill('input[name="password_confirmation"]', data.password_confirmation);
  
  if (data.invite_code) {
    await page.fill('input[name="invite_code"]', data.invite_code);
  }
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for navigation (could be to login or dashboard depending on email verification)
  await page.waitForTimeout(2000);
}

/**
 * Logout from the user frontend
 */
export async function logout(page: Page) {
  // Click user menu
  const userMenu = page.locator('[data-testid="user-menu"], .user-menu, .n-dropdown-trigger').first();
  await userMenu.click();
  
  // Wait for dropdown
  await page.waitForTimeout(500);
  
  // Click logout button
  const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Logout"), button:has-text("登出")').first();
  await logoutButton.click();
  
  // Wait for navigation to home or login page
  await page.waitForTimeout(1000);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  return token !== null;
}

/**
 * Get stored auth token
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('auth_token'));
}

/**
 * Set auth token directly (for test setup)
 */
export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_type', 'user');
  }, token);
}

/**
 * Clear all auth data
 */
export async function clearAuth(page: Page) {
  // Navigate to a page first to ensure localStorage is accessible
  try {
    // Try to access current page's localStorage
    await page.evaluate(() => {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_type');
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore if localStorage is not accessible
        console.warn('Could not clear storage:', e);
      }
    });
  } catch (error) {
    // If evaluation fails, navigate to the app first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_type');
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage after navigation:', e);
      }
    });
  }
}

/**
 * Set user data in localStorage (for test setup)
 */
export async function setUserData(page: Page, userData: any) {
  await page.evaluate((data) => {
    localStorage.setItem('user_data', JSON.stringify(data));
  }, userData);
}
