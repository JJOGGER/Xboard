import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { mockLoginSuccess, mockDashboardStats } from './helpers/api-mock';

/**
 * E2E Integration Test: Complete Shared Plan Import Flow
 * 
 * Task 10.1: Test URL input → Preview → Configuration → Create
 * 
 * This test validates the complete end-to-end flow of importing a shared subscription plan:
 * 1. Admin navigates to import page
 * 2. Admin enters subscription URL
 * 3. System parses and displays preview with all nodes
 * 4. Admin configures plan (name, group, tags, pricing)
 * 5. System creates plan and saves to database
 * 6. Admin can view the created plan in the list
 * 
 * Requirements: All requirements from shared-plan-improvements spec
 */

test.describe('Shared Plan Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await mockLoginSuccess(page);
    await mockDashboardStats(page);

    // Login as admin
    await login(page, {
      email: 'admin@test.com',
      password: 'password123',
    });

    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
  });

  test('should complete full import flow: URL → Preview → Configuration → Create', async ({ page }) => {
    // Mock server groups API
    await page.route('**/api/v1/admin/server/group/fetch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 1, name: 'VIP Group', server_count: 10 },
            { id: 2, name: 'Standard Group', server_count: 5 },
          ],
        }),
      });
    });

    // Mock subscription preview API
    await page.route('**/api/v1/admin/shared-plans/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            format: 'clash',
            nodes_count: 15,
            nodes: [
              {
                name: 'HK-01',
                server: 'hk1.example.com',
                port: 443,
                protocol: 'trojan',
                network: 'tcp',
                tls: true,
                config: { password: 'test123' },
              },
              {
                name: 'US-01',
                server: 'us1.example.com',
                port: 8388,
                protocol: 'ss',
                network: 'tcp',
                tls: false,
                config: { cipher: 'aes-256-gcm' },
              },
              {
                name: 'JP-01',
                server: 'jp1.example.com',
                port: 443,
                protocol: 'vmess',
                network: 'ws',
                tls: true,
                config: { uuid: '12345678-1234-1234-1234-123456789012' },
              },
            ],
            traffic_info: {
              total: 107374182400,
              used: 53687091200,
              remaining: 53687091200,
              usage_percentage: 50.0,
              expire_at: '2024-12-31T23:59:59Z',
              remaining_days: 45,
            },
          },
        }),
      });
    });

    // Mock existing tags API for suggestions
    await page.route('**/api/v1/admin/shared-plans**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              data: [
                {
                  id: 1,
                  name: 'Existing Plan',
                  tags: ['高速', '稳定', '美国'],
                },
              ],
            },
          }),
        });
      } else {
        // This is the POST request to create the plan
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 2,
              name: 'Premium US Servers',
              description: 'High-speed US servers',
              group_id: 1,
              tags: ['高速', '美国', '稳定'],
              prices: {
                monthly: 2000,
                quarterly: 5400,
                yearly: 18000,
              },
              max_slots: 50,
              nodes_count: 15,
              used_slots: 0,
              available_slots: 50,
              is_visible: true,
            },
          }),
        });
      }
    });

    // Step 1: Navigate to import page
    await page.goto('/shared-plans/import');
    await expect(page).toHaveURL('/shared-plans/import');

    // Verify we're on step 1 (URL input)
    await expect(page.locator('text=输入订阅地址, text=Enter Subscription URL').first()).toBeVisible();

    // Step 2: Enter subscription URL
    const urlInput = page.locator('input[placeholder*="订阅"], input[placeholder*="subscription"]').first();
    await urlInput.fill('https://example.com/subscription?token=test123');

    // Click next/preview button
    const nextButton = page.locator('button:has-text("下一步"), button:has-text("Next"), button:has-text("预览"), button:has-text("Preview")').first();
    await nextButton.click();

    // Step 3: Verify preview display
    await page.waitForTimeout(1000); // Wait for API call

    // Verify format badge is displayed
    await expect(page.locator('text=CLASH, text=Clash').first()).toBeVisible();

    // Verify node count is displayed
    await expect(page.locator('text=15').first()).toBeVisible();

    // Verify traffic information is displayed
    await expect(page.locator('text=100 GB, text=100GB').first()).toBeVisible({ timeout: 5000 });

    // Verify nodes table is displayed
    await expect(page.locator('text=HK-01').first()).toBeVisible();
    await expect(page.locator('text=US-01').first()).toBeVisible();
    await expect(page.locator('text=JP-01').first()).toBeVisible();

    // Verify node details (server, port, protocol)
    await expect(page.locator('text=hk1.example.com').first()).toBeVisible();
    await expect(page.locator('text=443').first()).toBeVisible();
    await expect(page.locator('text=trojan').first()).toBeVisible();

    // Click next to go to configuration step
    const configButton = page.locator('button:has-text("下一步"), button:has-text("Next"), button:has-text("配置"), button:has-text("Configure")').last();
    await configButton.click();

    // Step 4: Configure plan details
    await page.waitForTimeout(500);

    // Fill in plan name
    const nameInput = page.locator('input[placeholder*="套餐名称"], input[placeholder*="plan name"]').first();
    await nameInput.fill('Premium US Servers');

    // Fill in description
    const descInput = page.locator('textarea[placeholder*="描述"], textarea[placeholder*="description"]').first();
    await descInput.fill('High-speed US servers');

    // Select server group
    const groupSelect = page.locator('.el-select').first();
    await groupSelect.click();
    await page.waitForTimeout(300);
    await page.locator('.el-select-dropdown__item:has-text("VIP Group")').first().click();

    // Add tags
    const tagInput = page.locator('.el-select:has-text("标签"), .el-select:has-text("Tags")').first();
    await tagInput.click();
    await page.waitForTimeout(300);
    
    // Type and add first tag
    await page.keyboard.type('高速');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    
    // Type and add second tag
    await page.keyboard.type('美国');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    
    // Type and add third tag
    await page.keyboard.type('稳定');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Click outside to close dropdown
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Set pricing tiers
    // Monthly price
    const monthlyInput = page.locator('input[placeholder*="月付"], .el-input-number').first();
    await monthlyInput.fill('2000');

    // Quarterly price
    const quarterlyInput = page.locator('input[placeholder*="季付"]').first();
    await quarterlyInput.fill('5400');

    // Yearly price
    const yearlyInput = page.locator('input[placeholder*="年付"]').first();
    await yearlyInput.fill('18000');

    // Set max slots
    const slotsInput = page.locator('input[placeholder*="最大用户数"], input[placeholder*="max"]').last();
    await slotsInput.fill('50');

    // Step 5: Submit form
    const submitButton = page.locator('button:has-text("创建"), button:has-text("Create"), button[type="submit"]').last();
    await submitButton.click();

    // Wait for success message or redirect
    await page.waitForTimeout(1500);

    // Verify success (either message or redirect to list)
    const successMessage = page.locator('.el-message--success, text=成功, text=Success').first();
    const isOnListPage = page.url().includes('/shared-plans') && !page.url().includes('/import');
    
    expect(await successMessage.isVisible().catch(() => false) || isOnListPage).toBeTruthy();

    // Step 6: Verify plan appears in list (if redirected)
    if (isOnListPage) {
      await expect(page.locator('text=Premium US Servers').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate required fields in configuration step', async ({ page }) => {
    // Mock preview API
    await page.route('**/api/v1/admin/shared-plans/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            format: 'clash',
            nodes_count: 5,
            nodes: [
              { name: 'HK-01', server: 'hk1.example.com', port: 443, protocol: 'trojan' },
            ],
          },
        }),
      });
    });

    // Mock server groups
    await page.route('**/api/v1/admin/server/group/fetch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 1, name: 'VIP Group', server_count: 10 }],
        }),
      });
    });

    // Navigate to import page
    await page.goto('/shared-plans/import');

    // Enter URL and go to preview
    const urlInput = page.locator('input[placeholder*="订阅"], input[placeholder*="subscription"]').first();
    await urlInput.fill('https://example.com/subscription');
    
    const nextButton = page.locator('button:has-text("下一步"), button:has-text("Next")').first();
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Go to configuration step
    const configButton = page.locator('button:has-text("下一步"), button:has-text("Next")').last();
    await configButton.click();
    await page.waitForTimeout(500);

    // Try to submit without filling required fields
    const submitButton = page.locator('button:has-text("创建"), button:has-text("Create"), button[type="submit"]').last();
    await submitButton.click();

    // Wait for validation messages
    await page.waitForTimeout(500);

    // Verify validation errors are shown
    const errorMessages = page.locator('.el-form-item__error, .error-message, [role="alert"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);

    // Verify form is not submitted (still on import page)
    await expect(page).toHaveURL(/\/import/);
  });

  test('should preserve form data when navigating between steps', async ({ page }) => {
    // Mock APIs
    await page.route('**/api/v1/admin/shared-plans/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            format: 'clash',
            nodes_count: 3,
            nodes: [{ name: 'HK-01', server: 'hk1.example.com', port: 443, protocol: 'trojan' }],
          },
        }),
      });
    });

    await page.route('**/api/v1/admin/server/group/fetch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 1, name: 'VIP Group', server_count: 10 }],
        }),
      });
    });

    // Navigate to import page
    await page.goto('/shared-plans/import');

    // Step 1: Enter URL
    const urlInput = page.locator('input[placeholder*="订阅"], input[placeholder*="subscription"]').first();
    await urlInput.fill('https://example.com/subscription');
    await page.locator('button:has-text("下一步"), button:has-text("Next")').first().click();
    await page.waitForTimeout(1000);

    // Step 2: Go to configuration
    await page.locator('button:has-text("下一步"), button:has-text("Next")').last().click();
    await page.waitForTimeout(500);

    // Step 3: Fill in some data
    const nameInput = page.locator('input[placeholder*="套餐名称"], input[placeholder*="plan name"]').first();
    await nameInput.fill('Test Plan Name');

    const descInput = page.locator('textarea[placeholder*="描述"], textarea[placeholder*="description"]').first();
    await descInput.fill('Test Description');

    // Step 4: Go back to preview
    const backButton = page.locator('button:has-text("上一步"), button:has-text("Back"), button:has-text("Previous")').first();
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(500);

      // Step 5: Go forward to configuration again
      await page.locator('button:has-text("下一步"), button:has-text("Next")').last().click();
      await page.waitForTimeout(500);

      // Step 6: Verify data is preserved
      const nameValue = await nameInput.inputValue();
      const descValue = await descInput.inputValue();

      expect(nameValue).toBe('Test Plan Name');
      expect(descValue).toBe('Test Description');
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock preview API to return error
    await page.route('**/api/v1/admin/shared-plans/preview', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Failed to parse subscription URL',
        }),
      });
    });

    // Navigate to import page
    await page.goto('/shared-plans/import');

    // Enter URL
    const urlInput = page.locator('input[placeholder*="订阅"], input[placeholder*="subscription"]').first();
    await urlInput.fill('https://invalid.example.com/subscription');

    // Click next
    const nextButton = page.locator('button:has-text("下一步"), button:has-text("Next")').first();
    await nextButton.click();

    // Wait for error message
    await page.waitForTimeout(1000);

    // Verify error message is displayed
    const errorMessage = page.locator('.el-message--error, .error-message, text=Failed, text=失败').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify still on step 1
    await expect(page.locator('text=输入订阅地址, text=Enter Subscription URL').first()).toBeVisible();
  });

  test('should display all node details in preview', async ({ page }) => {
    // Mock preview with detailed nodes
    await page.route('**/api/v1/admin/shared-plans/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            format: 'clash',
            nodes_count: 2,
            nodes: [
              {
                name: 'HK-Premium-01',
                server: 'hk-premium.example.com',
                port: 8443,
                protocol: 'trojan',
                network: 'tcp',
                tls: true,
                config: { password: 'secret123', sni: 'example.com' },
              },
              {
                name: 'US-Standard-02',
                server: 'us-standard.example.com',
                port: 8388,
                protocol: 'ss',
                network: 'tcp',
                tls: false,
                config: { cipher: 'aes-256-gcm', password: 'pass456' },
              },
            ],
            traffic_info: {
              total: 107374182400,
              used: 10737418240,
              remaining: 96636764160,
              usage_percentage: 10.0,
              expire_at: '2025-06-30T23:59:59Z',
              remaining_days: 160,
            },
          },
        }),
      });
    });

    // Navigate and preview
    await page.goto('/shared-plans/import');
    const urlInput = page.locator('input[placeholder*="订阅"], input[placeholder*="subscription"]').first();
    await urlInput.fill('https://example.com/subscription');
    await page.locator('button:has-text("下一步"), button:has-text("Next")').first().click();
    await page.waitForTimeout(1000);

    // Verify all node details are displayed
    await expect(page.locator('text=HK-Premium-01').first()).toBeVisible();
    await expect(page.locator('text=US-Standard-02').first()).toBeVisible();
    await expect(page.locator('text=hk-premium.example.com').first()).toBeVisible();
    await expect(page.locator('text=us-standard.example.com').first()).toBeVisible();
    await expect(page.locator('text=8443').first()).toBeVisible();
    await expect(page.locator('text=8388').first()).toBeVisible();
    await expect(page.locator('text=trojan').first()).toBeVisible();
    await expect(page.locator('text=ss').first()).toBeVisible();

    // Verify traffic info
    await expect(page.locator('text=100 GB, text=100GB').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=10%, text=10.0%').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=160').first()).toBeVisible({ timeout: 5000 });
  });
});
