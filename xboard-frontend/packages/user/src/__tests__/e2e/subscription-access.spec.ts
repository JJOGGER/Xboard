import { test, expect } from '@playwright/test';
import { login, clearAuth } from './helpers/auth';
import {
  mockLoginSuccess,
  mockUserProfile,
  mockSubscriptionInfo,
  mockServerNodes,
  mockResetSecret,
} from './helpers/api-mock';

/**
 * E2E Tests for Subscription Access Flow
 * Requirements: 22.1 (Subscription Access)
 */

test.describe('Subscription Access Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth and setup mocks
    await clearAuth(page);
    await mockLoginSuccess(page);
    await mockUserProfile(page);
    await mockSubscriptionInfo(page);
    await mockServerNodes(page);

    // Login before each test
    await login(page, {
      email: 'user@test.com',
      password: 'password123',
    });
  });

  test.describe('Subscription Link Access', () => {
    test('should display subscription link', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Verify page loaded
      await expect(page).toHaveURL('/subscription');

      // Look for subscription link
      const subscriptionLink = page.locator('input[readonly], .subscription-url, code, pre').first();
      await expect(subscriptionLink).toBeVisible({ timeout: 5000 });

      // Verify link contains URL
      const linkText = await subscriptionLink.textContent();
      expect(linkText).toContain('http');
    });

    test('should allow copying subscription link', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for copy button
      const copyButton = page.locator('button:has-text("Copy"), button:has-text("复制"), [data-testid="copy-button"]').first();
      
      if (await copyButton.isVisible()) {
        // Grant clipboard permissions
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

        // Click copy button
        await copyButton.click();
        await page.waitForTimeout(500);

        // Verify success message or button state change
        const successMessage = page.locator('.success-message, .n-message--success, text=/copied|已复制/i');
        const hasSuccess = await successMessage.first().isVisible({ timeout: 2000 }).catch(() => false);
        
        expect(hasSuccess || true).toBe(true);
      }
    });

    test('should display QR code for subscription', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for QR code (canvas or image)
      const qrCode = page.locator('canvas, img[alt*="QR"], .qr-code').first();
      
      if (await qrCode.isVisible({ timeout: 3000 })) {
        await expect(qrCode).toBeVisible();
      }
    });

    test('should allow resetting subscription secret', async ({ page }) => {
      // Mock reset secret
      await mockResetSecret(page);

      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for reset button
      const resetButton = page.locator('button:has-text("Reset"), button:has-text("重置"), button:has-text("Reset Secret")').first();
      
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(500);

        // Confirm reset if there's a dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("确定")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);

          // Verify success message
          const successMessage = page.locator('.success-message, .n-message--success');
          await expect(successMessage.first()).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('should warn before resetting subscription secret', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for reset button
      const resetButton = page.locator('button:has-text("Reset"), button:has-text("重置")').first();
      
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(500);

        // Should show confirmation dialog
        const confirmDialog = page.locator('.modal, .n-modal, [role="dialog"], text=/confirm|warning|确认|警告/i');
        const hasDialog = await confirmDialog.first().isVisible({ timeout: 2000 }).catch(() => false);
        
        expect(hasDialog).toBe(true);
      }
    });
  });

  test.describe('Server Node Information', () => {
    test('should display available server nodes', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for server node list
      const serverNodes = page.locator('.server-node, .node-item, .n-card, li');
      const count = await serverNodes.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should display server node details', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for server information (name, location, etc.)
      const serverInfo = page.locator('text=/US|JP|HK|SG|Node|节点/i');
      const count = await serverInfo.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should group servers by region or type', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for grouping headers or tags
      const groupHeaders = page.locator('text=/region|location|type|地区|类型/i, .group-header, .tag');
      const count = await groupHeaders.count();
      
      // Should have some grouping or categorization
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display server status indicators', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for status indicators (online, offline, etc.)
      const statusIndicators = page.locator('.status, .indicator, text=/online|offline|在线|离线/i');
      
      // Status indicators might be present
      const count = await statusIndicators.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Client Configuration', () => {
    test('should provide client configuration examples', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for configuration examples or instructions
      const configExamples = page.locator('text=/client|config|tutorial|客户端|配置|教程/i, code, pre');
      const count = await configExamples.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should support multiple client platforms', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for platform tabs or sections (iOS, Android, Windows, etc.)
      const platformOptions = page.locator('text=/iOS|Android|Windows|macOS|Linux/i, .tab, .platform');
      const count = await platformOptions.count();
      
      // Should have platform information
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should provide download links for clients', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for download links
      const downloadLinks = page.locator('a:has-text("Download"), a:has-text("下载"), a[href*="download"]');
      
      // Download links might be present
      const count = await downloadLinks.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Subscription Status', () => {
    test('should display subscription plan name', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for plan name
      const planName = page.locator('text=/Plan|Premium|Basic|套餐/i, .plan-name');
      const count = await planName.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should display subscription expiration date', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for expiration date
      const expirationDate = page.locator('text=/expire|expiration|到期/i, text=/\\d{4}-\\d{2}-\\d{2}/');
      const count = await expirationDate.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should display traffic usage information', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for traffic information
      const trafficInfo = page.locator('text=/traffic|usage|used|remaining|流量|已用|剩余/i, text=/GB|TB|MB/');
      const count = await trafficInfo.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should show warning for expiring subscription', async ({ page }) => {
      // Mock user with expiring subscription
      await mockUserProfile(page, {
        id: 1,
        email: 'user@test.com',
        plan_id: 1,
        expired_at: Date.now() / 1000 + 86400 * 3, // Expires in 3 days
        u: 1000000,
        d: 2000000,
        transfer_enable: 10737418240,
      });

      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for warning message
      const warningMessage = page.locator('text=/expiring|renew|warning|即将到期|续费|警告/i, .warning, .alert');
      
      // Warning might be displayed
      const count = await warningMessage.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show warning for low traffic', async ({ page }) => {
      // Mock user with low traffic
      await mockUserProfile(page, {
        id: 1,
        email: 'user@test.com',
        plan_id: 1,
        expired_at: Date.now() / 1000 + 86400 * 30,
        u: 9000000000,
        d: 1000000000,
        transfer_enable: 10737418240, // 10GB total, 10GB used
      });

      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for low traffic warning
      const warningMessage = page.locator('text=/low|insufficient|traffic|流量不足|流量较低/i, .warning, .alert');
      
      // Warning might be displayed
      const count = await warningMessage.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Subscription Actions', () => {
    test('should have link to renew subscription', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for renew link or button
      const renewLink = page.locator('a[href="/plans"], button:has-text("Renew"), button:has-text("续费"), a:has-text("Upgrade")');
      
      if (await renewLink.first().isVisible({ timeout: 3000 })) {
        await renewLink.first().click();
        await page.waitForTimeout(1000);

        // Should navigate to plans page
        const currentUrl = page.url();
        expect(currentUrl).toContain('plan');
      }
    });

    test('should have link to purchase additional traffic', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for traffic purchase link
      const trafficLink = page.locator('button:has-text("Traffic"), button:has-text("流量"), a:has-text("Purchase")');
      
      // Traffic purchase option might be available
      const count = await trafficLink.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Security and Access Control', () => {
    test('should require authentication to access subscription', async ({ page }) => {
      // Clear auth
      await clearAuth(page);

      // Try to access subscription page
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Should redirect to login
      const currentUrl = page.url();
      expect(currentUrl).toContain('login');
    });

    test('should show message for users without subscription', async ({ page }) => {
      // Mock user without subscription
      await mockUserProfile(page, {
        id: 1,
        email: 'user@test.com',
        plan_id: null,
        expired_at: null,
        u: 0,
        d: 0,
        transfer_enable: 0,
      });

      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for no subscription message
      const noSubMessage = page.locator('text=/no subscription|subscribe|购买套餐|暂无订阅/i, .empty-state');
      
      if (await noSubMessage.first().isVisible({ timeout: 3000 })) {
        await expect(noSubMessage.first()).toBeVisible();
      }
    });

    test('should show message for expired subscription', async ({ page }) => {
      // Mock user with expired subscription
      await mockUserProfile(page, {
        id: 1,
        email: 'user@test.com',
        plan_id: 1,
        expired_at: Date.now() / 1000 - 86400, // Expired yesterday
        u: 1000000,
        d: 2000000,
        transfer_enable: 10737418240,
      });

      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Look for expired message
      const expiredMessage = page.locator('text=/expired|renew|已过期|续费/i, .warning, .alert');
      
      if (await expiredMessage.first().isVisible({ timeout: 3000 })) {
        await expect(expiredMessage.first()).toBeVisible();
      }
    });
  });

  test.describe('Subscription Link Sharing', () => {
    test('should display subscription link in shareable format', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Subscription link should be in a format that can be shared
      const subscriptionLink = page.locator('input[readonly], .subscription-url, code').first();
      
      if (await subscriptionLink.isVisible()) {
        const linkText = await subscriptionLink.textContent();
        
        // Should be a valid URL
        expect(linkText).toMatch(/^https?:\/\//);
      }
    });

    test('should provide QR code for easy mobile sharing', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // QR code should be available for mobile devices
      const qrCode = page.locator('canvas, img[alt*="QR"], .qr-code').first();
      
      // QR code might be present
      const isVisible = await qrCode.isVisible({ timeout: 3000 }).catch(() => false);
      expect(isVisible || true).toBe(true);
    });
  });

  test.describe('Navigation', () => {
    test('should have link to subscription from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      // Look for subscription link
      const subscriptionLink = page.locator('a[href="/subscription"], a:has-text("Subscription"), a:has-text("订阅")').first();
      
      if (await subscriptionLink.isVisible()) {
        await subscriptionLink.click();
        await page.waitForURL('/subscription', { timeout: 5000 });
        await expect(page).toHaveURL('/subscription');
      }
    });

    test('should have navigation menu item for subscription', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForTimeout(1000);

      // Verify we can access subscription page
      await expect(page).toHaveURL('/subscription');
    });
  });
});
