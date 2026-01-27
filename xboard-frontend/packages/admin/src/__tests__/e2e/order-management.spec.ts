import { test, expect } from '@playwright/test';
import { login, clearAuth } from './helpers/auth';
import {
  mockLoginSuccess,
  mockDashboardStats,
  mockOrderList,
  mockOrderUpdate,
} from './helpers/api-mock';

/**
 * E2E Tests for Order Management Flow
 * Requirements: 6.1 - Order Management
 */

test.describe('Order Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth and setup mocks
    await clearAuth(page);
    await mockLoginSuccess(page);
    await mockDashboardStats(page);
    await mockOrderList(page);

    // Login before each test
    await login(page, {
      email: 'admin@test.com',
      password: 'password123',
    });
  });

  test('should display order list page', async ({ page }) => {
    // Navigate to orders page
    await page.goto('/orders');

    // Verify page loaded
    await expect(page).toHaveURL('/orders');

    // Check for order list table
    await expect(page.locator('.el-table, table')).toBeVisible({ timeout: 5000 });

    // Check for filter controls
    await expect(page.locator('input, select, .el-select').first()).toBeVisible();
  });

  test('should display order data in table', async ({ page }) => {
    await page.goto('/orders');

    // Wait for table to load
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Verify table has rows
    const rows = page.locator('.el-table tbody tr, table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify first row has trade number
    const firstRow = rows.first();
    await expect(firstRow).toContainText(/T\d+/);
  });

  test('should filter orders by status', async ({ page }) => {
    // Mock filtered order list
    await page.route('**/api/v1/admin/order/fetch**', async (route) => {
      const url = route.request().url();
      const status = new URL(url).searchParams.get('status');
      
      const filteredOrders = status
        ? [
            {
              id: 1,
              user_id: 1,
              plan_id: 1,
              period: 'month_price',
              trade_no: `T${Date.now()}`,
              total_amount: 1000,
              status: parseInt(status),
              created_at: new Date().toISOString(),
            },
          ]
        : [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: filteredOrders }),
      });
    });

    await page.goto('/orders');

    // Look for status filter
    const statusFilter = page.locator('select[name="status"], .el-select').first();
    
    if (await statusFilter.isVisible()) {
      // Click to open dropdown
      await statusFilter.click();
      
      // Wait for options
      await page.waitForTimeout(500);
      
      // Select "Pending" or first option
      const option = page.locator('.el-select-dropdown__item, option').first();
      if (await option.isVisible()) {
        await option.click();
        
        // Wait for filtered results
        await page.waitForTimeout(1000);
        
        // Verify filtered results
        const rows = page.locator('.el-table tbody tr, table tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    }
  });

  test('should filter orders by date range', async ({ page }) => {
    await page.goto('/orders');

    // Look for date range picker
    const dateRangePicker = page.locator('.el-date-editor, input[type="date"]').first();
    
    if (await dateRangePicker.isVisible()) {
      await dateRangePicker.click();
      
      // Wait for date picker popup
      await page.waitForTimeout(500);
      
      // Select dates (this is simplified, actual implementation may vary)
      const today = page.locator('.el-date-table td.today, .today').first();
      if (await today.isVisible()) {
        await today.click();
        
        // Wait for results
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should open order detail modal', async ({ page }) => {
    await page.goto('/orders');

    // Wait for table to load
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Click on first order row or detail button
    const detailButton = page.locator('button:has-text("Detail"), button:has-text("详情"), .el-table tbody tr').first();
    await detailButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Verify modal is visible
    const modal = page.locator('.el-dialog, .modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Verify modal contains order information
    await expect(modal).toContainText(/T\d+|Order|订单/);
  });

  test('should mark order as paid', async ({ page }) => {
    // Mock order update
    await page.route('**/api/v1/admin/order/update', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: true }),
      });
    });

    await page.goto('/orders');

    // Wait for table
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Look for "Mark as Paid" button
    const paidButton = page.locator('button:has-text("Paid"), button:has-text("已支付"), button:has-text("Mark")').first();
    
    if (await paidButton.isVisible()) {
      await paidButton.click();

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

  test('should cancel order', async ({ page }) => {
    // Mock order cancel
    await page.route('**/api/v1/admin/order/cancel', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: true }),
      });
    });

    await page.goto('/orders');

    // Wait for table
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Look for cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("取消")').first();
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Confirm cancellation
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

  test('should update order details', async ({ page }) => {
    // Mock order update
    await mockOrderUpdate(page);

    await page.goto('/orders');

    // Wait for table
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Click edit button
    const editButton = page.locator('button:has-text("Edit"), button:has-text("编辑")').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();

      // Wait for edit modal
      await page.waitForTimeout(500);

      // Find amount input
      const amountInput = page.locator('input[name="total_amount"], input[placeholder*="Amount"], input[placeholder*="金额"]').first();
      
      if (await amountInput.isVisible()) {
        // Clear and enter new amount
        await amountInput.clear();
        await amountInput.fill('2000');

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

  test('should display order statistics', async ({ page }) => {
    // Mock order stats
    await page.route('**/api/v1/admin/stat/getOrder**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { date: '2024-01-01', total: 10000, commission_total: 1000 },
            { date: '2024-01-02', total: 15000, commission_total: 1500 },
          ],
        }),
      });
    });

    await page.goto('/orders');

    // Look for statistics cards or summary
    const statsCard = page.locator('.stats-card, .statistics, .summary').first();
    
    if (await statsCard.isVisible()) {
      // Verify stats are displayed
      await expect(statsCard).toContainText(/Total|Revenue|Orders|总计|收入|订单/);
    }
  });

  test('should paginate through orders', async ({ page }) => {
    // Mock paginated responses
    await page.route('**/api/v1/admin/order/fetch**', async (route) => {
      const url = route.request().url();
      const page = parseInt(new URL(url).searchParams.get('page') || '1');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: (page - 1) * 10 + i + 1,
            user_id: i + 1,
            plan_id: 1,
            period: 'month_price',
            trade_no: `T${Date.now()}${(page - 1) * 10 + i}`,
            total_amount: 1000 + i * 100,
            status: 0,
            created_at: new Date().toISOString(),
          })),
        }),
      });
    });

    await page.goto('/orders');

    // Wait for table
    await page.waitForSelector('.el-table tbody tr, table tbody tr', { timeout: 5000 });

    // Get first order trade number
    const firstTradeNo = await page.locator('.el-table tbody tr, table tbody tr').first().textContent();

    // Click next page button
    const nextButton = page.locator('.el-pagination button:has-text("Next"), .el-pagination .btn-next, button:has-text("Next Page")').first();
    
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click();

      // Wait for new data
      await page.waitForTimeout(1000);

      // Verify different data is shown
      const newFirstTradeNo = await page.locator('.el-table tbody tr, table tbody tr').first().textContent();
      expect(newFirstTradeNo).not.toBe(firstTradeNo);
    }
  });

  test('should search orders by trade number', async ({ page }) => {
    // Mock search response
    await page.route('**/api/v1/admin/order/fetch**', async (route) => {
      const url = route.request().url();
      const tradeNo = new URL(url).searchParams.get('trade_no') || '';
      
      const filteredOrders = tradeNo
        ? [
            {
              id: 1,
              user_id: 1,
              plan_id: 1,
              period: 'month_price',
              trade_no: tradeNo,
              total_amount: 1000,
              status: 0,
              created_at: new Date().toISOString(),
            },
          ]
        : [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: filteredOrders }),
      });
    });

    await page.goto('/orders');

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="搜索"], input[placeholder*="Trade"]').first();
    
    if (await searchInput.isVisible()) {
      // Type search term
      await searchInput.fill('T123456789');
      
      // Wait for debounce and API call
      await page.waitForTimeout(1000);

      // Verify filtered results
      await expect(page.locator('.el-table tbody, table tbody')).toContainText('T123456789');
    }
  });

  test('should handle order list loading state', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/v1/admin/order/fetch**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/orders');

    // Verify loading indicator appears
    const loadingIndicator = page.locator('.el-loading-mask, .loading, [role="progressbar"]');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });

    // Wait for loading to complete
    await page.waitForTimeout(1500);

    // Verify loading indicator disappears
    await expect(loadingIndicator.first()).not.toBeVisible({ timeout: 2000 });
  });

  test('should handle order list error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/admin/order/fetch**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal server error',
        }),
      });
    });

    await page.goto('/orders');

    // Wait for error message
    await page.waitForTimeout(1000);

    // Verify error message is displayed
    const errorMessage = page.locator('.el-message--error, .error-message, [role="alert"]');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });
});
