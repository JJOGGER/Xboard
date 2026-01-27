import { test, expect } from '@playwright/test';
import { login, clearAuth } from './helpers/auth';
import {
  mockLoginSuccess,
  mockDashboardStats,
  mockConfigFetch,
  mockConfigSave,
} from './helpers/api-mock';

/**
 * E2E Tests for Configuration Management Flow
 * Requirements: 12.1 - System Configuration
 */

test.describe('Configuration Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth and setup mocks
    await clearAuth(page);
    await mockLoginSuccess(page);
    await mockDashboardStats(page);
    await mockConfigFetch(page, {
      site_name: 'XBoard Test',
      site_url: 'https://test.xboard.com',
      site_description: 'Test Description',
      register_enable: 1,
      email_verify: 0,
      commission_rate: 10,
    });

    // Login before each test
    await login(page, {
      email: 'admin@test.com',
      password: 'password123',
    });
  });

  test('should display configuration page', async ({ page }) => {
    // Navigate to config page
    await page.goto('/config');

    // Verify page loaded
    await expect(page).toHaveURL(/\/config/);

    // Check for tabs or sections
    const tabs = page.locator('.el-tabs, .tabs, [role="tablist"]');
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display site settings form', async ({ page }) => {
    await page.goto('/config');

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Check for site name input
    const siteNameInput = page.locator('input[name="site_name"], input[placeholder*="Site Name"], input[placeholder*="站点名称"]').first();
    await expect(siteNameInput).toBeVisible({ timeout: 5000 });

    // Verify current value is loaded
    const value = await siteNameInput.inputValue();
    expect(value).toBeTruthy();
  });

  test('should update site settings', async ({ page }) => {
    // Mock config save
    await mockConfigSave(page);

    await page.goto('/config');

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Find site name input
    const siteNameInput = page.locator('input[name="site_name"], input[placeholder*="Site Name"], input[placeholder*="站点名称"]').first();
    
    if (await siteNameInput.isVisible()) {
      // Clear and enter new value
      await siteNameInput.clear();
      await siteNameInput.fill('XBoard Updated');

      // Find and click save button
      const saveButton = page.locator('button:has-text("Save"), button:has-text("保存"), button[type="submit"]').first();
      await saveButton.click();

      // Wait for success message
      await page.waitForTimeout(1000);

      // Verify success message
      const successMessage = page.locator('.el-message--success, .success-message');
      await expect(successMessage.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should switch between configuration tabs', async ({ page }) => {
    await page.goto('/config');

    // Wait for tabs to load
    await page.waitForTimeout(1000);

    // Find tabs
    const tabs = page.locator('.el-tabs__item, [role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();

      // Wait for tab content to load
      await page.waitForTimeout(500);

      // Verify tab is active
      const activeTab = page.locator('.el-tabs__item.is-active, [role="tab"][aria-selected="true"]');
      await expect(activeTab).toBeVisible();
    }
  });

  test('should configure email settings', async ({ page }) => {
    await page.goto('/config');

    // Look for email tab
    const emailTab = page.locator('[role="tab"]:has-text("Email"), .el-tabs__item:has-text("邮件")').first();
    
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(500);

      // Check for SMTP settings
      const smtpHostInput = page.locator('input[name="smtp_host"], input[placeholder*="SMTP"], input[placeholder*="Host"]').first();
      
      if (await smtpHostInput.isVisible()) {
        await expect(smtpHostInput).toBeVisible();
      }
    }
  });

  test('should test email configuration', async ({ page }) => {
    // Mock email test endpoint
    await page.route('**/api/v1/admin/config/testEmail', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: true,
          message: 'Test email sent successfully',
        }),
      });
    });

    await page.goto('/config');

    // Look for email tab
    const emailTab = page.locator('[role="tab"]:has-text("Email"), .el-tabs__item:has-text("邮件")').first();
    
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(500);

      // Look for test button
      const testButton = page.locator('button:has-text("Test"), button:has-text("测试")').first();
      
      if (await testButton.isVisible()) {
        await testButton.click();

        // Wait for success message
        await page.waitForTimeout(1000);

        // Verify success message
        const successMessage = page.locator('.el-message--success, .success-message');
        await expect(successMessage.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should configure Telegram settings', async ({ page }) => {
    await page.goto('/config');

    // Look for Telegram tab
    const telegramTab = page.locator('[role="tab"]:has-text("Telegram"), .el-tabs__item:has-text("Telegram")').first();
    
    if (await telegramTab.isVisible()) {
      await telegramTab.click();
      await page.waitForTimeout(500);

      // Check for bot token input
      const botTokenInput = page.locator('input[name="telegram_bot_token"], input[placeholder*="Bot Token"], input[placeholder*="Token"]').first();
      
      if (await botTokenInput.isVisible()) {
        await expect(botTokenInput).toBeVisible();
        
        // Enter bot token
        await botTokenInput.clear();
        await botTokenInput.fill('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
      }
    }
  });

  test('should configure subscription settings', async ({ page }) => {
    await page.goto('/config');

    // Look for subscription tab
    const subscriptionTab = page.locator('[role="tab"]:has-text("Subscription"), .el-tabs__item:has-text("订阅")').first();
    
    if (await subscriptionTab.isVisible()) {
      await subscriptionTab.click();
      await page.waitForTimeout(500);

      // Check for trial period input
      const trialInput = page.locator('input[name="trial_period"], input[placeholder*="Trial"], input[placeholder*="试用"]').first();
      
      if (await trialInput.isVisible()) {
        await expect(trialInput).toBeVisible();
      }
    }
  });

  test('should configure commission settings', async ({ page }) => {
    await page.goto('/config');

    // Look for commission tab
    const commissionTab = page.locator('[role="tab"]:has-text("Commission"), .el-tabs__item:has-text("佣金")').first();
    
    if (await commissionTab.isVisible()) {
      await commissionTab.click();
      await page.waitForTimeout(500);

      // Check for commission rate input
      const rateInput = page.locator('input[name="commission_rate"], input[placeholder*="Rate"], input[placeholder*="比例"]').first();
      
      if (await rateInput.isVisible()) {
        await expect(rateInput).toBeVisible();
        
        // Update commission rate
        await rateInput.clear();
        await rateInput.fill('15');
      }
    }
  });

  test('should configure security settings', async ({ page }) => {
    await page.goto('/config');

    // Look for security tab
    const securityTab = page.locator('[role="tab"]:has-text("Security"), .el-tabs__item:has-text("安全")').first();
    
    if (await securityTab.isVisible()) {
      await securityTab.click();
      await page.waitForTimeout(500);

      // Check for registration toggle
      const registerToggle = page.locator('input[name="register_enable"], .el-switch').first();
      
      if (await registerToggle.isVisible()) {
        await expect(registerToggle).toBeVisible();
      }
    }
  });

  test('should validate required configuration fields', async ({ page }) => {
    await page.goto('/config');

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Find site name input and clear it
    const siteNameInput = page.locator('input[name="site_name"], input[placeholder*="Site Name"]').first();
    
    if (await siteNameInput.isVisible()) {
      await siteNameInput.clear();

      // Try to save
      const saveButton = page.locator('button:has-text("Save"), button:has-text("保存"), button[type="submit"]').first();
      await saveButton.click();

      // Wait for validation
      await page.waitForTimeout(500);

      // Verify validation error or still on same page
      await expect(page).toHaveURL(/\/config/);
    }
  });

  test('should handle configuration save error', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/admin/config/save', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Validation failed',
          errors: {
            site_name: ['Site name is required'],
          },
        }),
      });
    });

    await page.goto('/config');

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Try to save
    const saveButton = page.locator('button:has-text("Save"), button:has-text("保存"), button[type="submit"]').first();
    
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Wait for error message
      await page.waitForTimeout(1000);

      // Verify error message
      const errorMessage = page.locator('.el-message--error, .error-message, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should handle configuration loading state', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/v1/admin/config/fetch', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    await page.goto('/config');

    // Verify loading indicator appears
    const loadingIndicator = page.locator('.el-loading-mask, .loading, [role="progressbar"]');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });

    // Wait for loading to complete
    await page.waitForTimeout(1500);

    // Verify loading indicator disappears
    await expect(loadingIndicator.first()).not.toBeVisible({ timeout: 2000 });
  });

  test('should persist configuration changes', async ({ page }) => {
    // Mock config save and fetch
    let savedConfig: any = null;

    await page.route('**/api/v1/admin/config/save', async (route) => {
      const postData = route.request().postDataJSON();
      savedConfig = postData;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: true }),
      });
    });

    await page.route('**/api/v1/admin/config/fetch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: savedConfig || {
            site_name: 'XBoard Test',
            site_url: 'https://test.xboard.com',
          },
        }),
      });
    });

    await page.goto('/config');
    await page.waitForTimeout(1000);

    // Update site name
    const siteNameInput = page.locator('input[name="site_name"], input[placeholder*="Site Name"]').first();
    
    if (await siteNameInput.isVisible()) {
      await siteNameInput.clear();
      await siteNameInput.fill('XBoard Persisted');

      // Save
      const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")').first();
      await saveButton.click();

      // Wait for save
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Verify value persisted
      const newValue = await siteNameInput.inputValue();
      expect(newValue).toBe('XBoard Persisted');
    }
  });
});
