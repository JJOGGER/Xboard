import { Page } from '@playwright/test';

/**
 * Helper functions for authentication in E2E tests
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login to the admin system
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
 * Logout from the admin system
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu"]');
  
  // Click logout button
  await page.click('[data-testid="logout-button"]');
  
  // Wait for navigation to login page
  await page.waitForURL('/login', { timeout: 5000 });
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
    localStorage.setItem('user_type', 'admin');
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
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage after navigation:', e);
      }
    });
  }
}
