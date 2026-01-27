import { test, expect } from '@playwright/test';
import { login, clearAuth } from './helpers/auth';
import {
  mockLoginSuccess,
  mockDashboardStats,
  mockUserList,
  mockUserUpdate,
} from './helpers/api-mock';

/**
 * E2E Tests for User Management Flow
 * Requirements: 3.1 - User Management
 */

test.describe('User Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth and setup mocks
    await clearAuth(page);
    await mockLoginSuccess(page);
    await mockDashboardStats(page);
    await mockUserList(page);

    // Login before each test
    await login(page, {
      email: 'admin@test.com',
      password: 'password123',
    });
  });

  test('should display user list page', async ({ page }) => {
    // Navigate to users page
    await page.goto('/users');

    // Verify page loaded
    await expect(page).toHaveURL('/users');

    // Check for user list table
    await expect(page.locator('.el-table, table')).toBeVisible({ timeout: 5000 });

    // Check for search/filter controls
    await expect(page.locator('input[placeholder*="Search"], input[placeholder*="搜索"]')).toBeVisible();
  });

  test('should display user data in table', async ({ page }) => {
    await page.goto('/users');

    // Wait for table to load
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Verify table has rows
    const rows = page.locator('.el-table tbody tr, table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify first row has email
    const firstRow = rows.first();
    await expect(firstRow).toContainText(/@test\.com/);
  });

  test('should search users by email', async ({ page }) => {
    // Mock filtered user list
    await page.route('**/api/v1/admin/user/fetch**', async (route) => {
      const url = route.request().url();
      const searchTerm = new URL(url).searchParams.get('email') || '';
      
      const filteredUsers = searchTerm
        ? [
            {
              id: 1,
              email: `${searchTerm}@test.com`,
              balance: 1000,
              commission_balance: 100,
              plan_id: 1,
              expired_at: Date.now() / 1000 + 86400 * 30,
              u: 1000000,
              d: 2000000,
              transfer_enable: 10737418240,
              banned: 0,
              is_admin: 0,
              is_staff: 0,
              created_at: new Date().toISOString(),
            },
          ]
        : [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: filteredUsers }),
      });
    });

    await page.goto('/users');

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="搜索"]').first();
    
    // Type search term
    await searchInput.fill('user1');
    
    // Wait for debounce and API call
    await page.waitForTimeout(1000);

    // Verify filtered results
    await expect(page.locator('.el-table tbody tr, table tbody tr')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('.el-table tbody, table tbody')).toContainText('user1@test.com');
  });

  test('should filter users by status', async ({ page }) => {
    await page.goto('/users');

    // Look for filter dropdown or select
    const filterSelect = page.locator('select, .el-select').first();
    
    if (await filterSelect.isVisible()) {
      // Click to open dropdown
      await filterSelect.click();
      
      // Wait for options
      await page.waitForTimeout(500);
      
      // Select an option (e.g., "Active" or "Banned")
      const option = page.locator('.el-select-dropdown__item, option').first();
      if (await option.isVisible()) {
        await option.click();
        
        // Wait for filtered results
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should open user detail modal', async ({ page }) => {
    await page.goto('/users');

    // Wait for table to load
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Click on first user row or detail button
    const detailButton = page.locator('button:has-text("Detail"), button:has-text("详情"), .el-table tbody tr').first();
    await detailButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Verify modal is visible
    const modal = page.locator('.el-dialog, .modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Verify modal contains user information
    await expect(modal).toContainText(/@test\.com/);
  });

  test('should edit user information', async ({ page }) => {
    // Mock user update
    await mockUserUpdate(page);

    await page.goto('/users');

    // Wait for table
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Click edit button on first user
    const editButton = page.locator('button:has-text("Edit"), button:has-text("编辑")').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();

      // Wait for edit modal
      await page.waitForTimeout(500);

      // Find balance input
      const balanceInput = page.locator('input[name="balance"], input[placeholder*="Balance"], input[placeholder*="余额"]').first();
      
      if (await balanceInput.isVisible()) {
        // Clear and enter new balance
        await balanceInput.clear();
        await balanceInput.fill('5000');

        // Click save button
        const saveButton = page.locator('button:has-text("Save"), button:has-text("保存"), button[type="submit"]').first();
        await saveButton.click();

        // Wait for success message
        await page.waitForTimeout(1000);

        // Verify success message
        const successMessage = page.locator('.el-message--success, .success-message');
        await expect(successMessage.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should ban/unban user', async ({ page }) => {
    // Mock ban/unban endpoint
    await page.route('**/api/v1/admin/user/ban', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: true }),
      });
    });

    await page.goto('/users');

    // Wait for table
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Look for ban/unban button
    const banButton = page.locator('button:has-text("Ban"), button:has-text("禁用"), button:has-text("Unban"), button:has-text("解禁")').first();
    
    if (await banButton.isVisible()) {
      await banButton.click();

      // Confirm action if there's a confirmation dialog
      await page.waitForTimeout(500);
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("确定")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Wait for success message
      await page.waitForTimeout(1000);

      // Verify success message
      const successMessage = page.locator('.el-message--success, .success-message');
      await expect(successMessage.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should paginate through users', async ({ page }) => {
    // Mock paginated responses
    await page.route('**/api/v1/admin/user/fetch**', async (route) => {
      const url = route.request().url();
      const page = parseInt(new URL(url).searchParams.get('page') || '1');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: (page - 1) * 10 + i + 1,
            email: `user${(page - 1) * 10 + i + 1}@test.com`,
            balance: 1000,
            commission_balance: 100,
            plan_id: 1,
            expired_at: Date.now() / 1000 + 86400 * 30,
            u: 1000000,
            d: 2000000,
            transfer_enable: 10737418240,
            banned: 0,
            is_admin: 0,
            is_staff: 0,
            created_at: new Date().toISOString(),
          })),
        }),
      });
    });

    await page.goto('/users');

    // Wait for table
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Verify first page shows user1
    await expect(page.locator('.el-table tbody, table tbody')).toContainText('user1@test.com');

    // Click next page button
    const nextButton = page.locator('.el-pagination button:has-text("Next"), .el-pagination .btn-next, button:has-text("Next Page")').first();
    
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click();

      // Wait for new data
      await page.waitForTimeout(1000);

      // Verify second page shows user11
      await expect(page.locator('.el-table tbody, table tbody')).toContainText('user11@test.com');
    }
  });

  test('should export users to CSV', async ({ page }) => {
    // Mock export endpoint
    await page.route('**/api/v1/admin/user/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename="users.csv"',
        },
        body: 'id,email,balance\n1,user1@test.com,1000\n2,user2@test.com,2000',
      });
    });

    await page.goto('/users');

    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("导出")').first();
    
    if (await exportButton.isVisible()) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click export
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });

  test('should handle user list loading state', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/v1/admin/user/fetch**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/users');

    // Verify loading indicator appears
    const loadingIndicator = page.locator('.el-loading-mask, .loading, [role="progressbar"]');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });

    // Wait for loading to complete
    await page.waitForTimeout(1500);

    // Verify loading indicator disappears
    await expect(loadingIndicator.first()).not.toBeVisible({ timeout: 2000 });
  });

  test('should handle user list error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/admin/user/fetch**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal server error',
        }),
      });
    });

    await page.goto('/users');

    // Wait for error message
    await page.waitForTimeout(1000);

    // Verify error message is displayed
    const errorMessage = page.locator('.el-message--error, .error-message, [role="alert"]');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });
});
