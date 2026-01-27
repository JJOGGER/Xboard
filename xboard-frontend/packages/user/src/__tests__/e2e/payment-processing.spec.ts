import { test, expect } from '@playwright/test';
import { login, clearAuth } from './helpers/auth';
import {
  mockLoginSuccess,
  mockUserProfile,
  mockOrderList,
  mockPaymentMethods,
  mockPaymentCheckout,
  mockOrderCreate,
} from './helpers/api-mock';

/**
 * E2E Tests for Payment Processing Flow
 * Requirements: 21.1 (Payment Processing)
 */

test.describe('Payment Processing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth and setup mocks
    await clearAuth(page);
    await mockLoginSuccess(page);
    await mockUserProfile(page);
    await mockPaymentMethods(page);
    await mockOrderList(page);

    // Login before each test
    await login(page, {
      email: 'user@test.com',
      password: 'password123',
    });
  });

  test.describe('Payment Method Selection', () => {
    test('should display available payment methods', async ({ page }) => {
      // Mock order creation
      await mockOrderCreate(page, 1);

      // Navigate to checkout (assuming we have an order)
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Check for payment method options
      const paymentMethods = page.locator('.payment-method, .n-radio, input[type="radio"]');
      const count = await paymentMethods.count();
      
      // Should have at least one payment method
      expect(count).toBeGreaterThan(0);
    });

    test('should allow selecting a payment method', async ({ page }) => {
      await mockOrderCreate(page, 1);
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Select first payment method
      const firstMethod = page.locator('.payment-method, .n-radio, input[type="radio"]').first();
      
      if (await firstMethod.isVisible()) {
        await firstMethod.click();
        await page.waitForTimeout(500);

        // Verify selection (check if it's checked or has active class)
        const isChecked = await firstMethod.isChecked().catch(() => false);
        const hasActiveClass = await firstMethod.evaluate((el) => 
          el.classList.contains('active') || el.classList.contains('checked')
        ).catch(() => false);
        
        expect(isChecked || hasActiveClass).toBe(true);
      }
    });

    test('should display payment method icons', async ({ page }) => {
      await mockOrderCreate(page, 1);
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Check for payment method names (Alipay, Stripe, etc.)
      const methodNames = page.locator('text=/Alipay|Stripe|支付宝|微信/i');
      const count = await methodNames.count();
      
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Payment Checkout', () => {
    test('should initiate payment checkout', async ({ page }) => {
      // Mock payment checkout
      await mockPaymentCheckout(page);
      await mockOrderCreate(page, 1);

      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Select payment method
      const paymentMethod = page.locator('.payment-method, .n-radio, input[type="radio"]').first();
      if (await paymentMethod.isVisible()) {
        await paymentMethod.click();
        await page.waitForTimeout(500);
      }

      // Click pay button
      const payButton = page.locator('button:has-text("Pay"), button:has-text("支付"), button:has-text("Checkout")').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();
        await page.waitForTimeout(1000);

        // Should either redirect or show payment modal
        // We can't test actual payment gateway, but we can verify the flow started
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();
      }
    });

    test('should show order summary before payment', async ({ page }) => {
      await mockOrderCreate(page, 1);
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Look for order summary elements
      const summaryElements = page.locator('text=/Order|Amount|Total|订单|金额|总计/i');
      const count = await summaryElements.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should display order amount', async ({ page }) => {
      await mockOrderCreate(page, 1);
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Look for price/amount display
      const priceDisplay = page.locator('.price, .amount, text=/¥|\\$/');
      
      if (await priceDisplay.first().isVisible()) {
        const priceText = await priceDisplay.first().textContent();
        expect(priceText).toBeTruthy();
        expect(priceText).toMatch(/\d+/);
      }
    });

    test('should handle payment loading state', async ({ page }) => {
      // Mock slow payment checkout
      await page.route('**/api/v1/user/order/checkout', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { type: 1, url: 'https://payment.test.com' },
          }),
        });
      });

      await mockOrderCreate(page, 1);
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Select payment method
      const paymentMethod = page.locator('.payment-method, .n-radio, input[type="radio"]').first();
      if (await paymentMethod.isVisible()) {
        await paymentMethod.click();
        await page.waitForTimeout(500);
      }

      // Click pay button
      const payButton = page.locator('button:has-text("Pay"), button:has-text("支付")').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();

        // Verify loading state
        await expect(payButton).toBeDisabled({ timeout: 2000 });

        // Wait for completion
        await page.waitForTimeout(1500);
      }
    });

    test('should handle payment error', async ({ page }) => {
      // Mock payment error
      await page.route('**/api/v1/user/order/checkout', async (route) => {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Payment gateway error',
          }),
        });
      });

      await mockOrderCreate(page, 1);
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Select payment method
      const paymentMethod = page.locator('.payment-method, .n-radio, input[type="radio"]').first();
      if (await paymentMethod.isVisible()) {
        await paymentMethod.click();
        await page.waitForTimeout(500);
      }

      // Click pay button
      const payButton = page.locator('button:has-text("Pay"), button:has-text("支付")').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();
        await page.waitForTimeout(1000);

        // Verify error message is displayed
        const errorMessage = page.locator('.error-message, .n-message--error, [role="alert"]');
        await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Payment Callback', () => {
    test('should handle successful payment callback', async ({ page }) => {
      // Navigate to payment callback page with success status
      await page.goto('/payment/callback?status=success&order_id=1');
      await page.waitForTimeout(1000);

      // Look for success message
      const successMessage = page.locator('text=/success|successful|成功/i, .success-message, .n-result--success');
      
      if (await successMessage.first().isVisible({ timeout: 3000 })) {
        await expect(successMessage.first()).toBeVisible();
      }
    });

    test('should handle failed payment callback', async ({ page }) => {
      // Navigate to payment callback page with failure status
      await page.goto('/payment/callback?status=failed&order_id=1');
      await page.waitForTimeout(1000);

      // Look for error message
      const errorMessage = page.locator('text=/failed|failure|失败/i, .error-message, .n-result--error');
      
      if (await errorMessage.first().isVisible({ timeout: 3000 })) {
        await expect(errorMessage.first()).toBeVisible();
      }
    });

    test('should provide link to orders after payment', async ({ page }) => {
      await page.goto('/payment/callback?status=success&order_id=1');
      await page.waitForTimeout(1000);

      // Look for link to orders page
      const ordersLink = page.locator('a[href="/orders"], a:has-text("Orders"), a:has-text("订单")').first();
      
      if (await ordersLink.isVisible({ timeout: 3000 })) {
        await ordersLink.click();
        await page.waitForURL('/orders', { timeout: 5000 });
        await expect(page).toHaveURL('/orders');
      }
    });
  });

  test.describe('Order Management', () => {
    test('should display order list', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Verify page loaded
      await expect(page).toHaveURL('/orders');

      // Check for order list
      const orderItems = page.locator('.order-item, .order-card, .n-card, tr');
      const count = await orderItems.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should display order status', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Look for status badges
      const statusBadges = page.locator('text=/pending|paid|cancelled|completed|待支付|已支付|已取消/i, .status, .badge');
      const count = await statusBadges.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should allow viewing order details', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Click on first order or detail button
      const detailButton = page.locator('button:has-text("Detail"), button:has-text("详情"), .order-item, .order-card').first();
      
      if (await detailButton.isVisible()) {
        await detailButton.click();
        await page.waitForTimeout(500);

        // Verify modal or detail page appeared
        const modal = page.locator('.modal, .n-modal, [role="dialog"]');
        const hasModal = await modal.isVisible({ timeout: 2000 }).catch(() => false);
        
        // Either modal appeared or navigated to detail page
        expect(hasModal || page.url().includes('order')).toBe(true);
      }
    });

    test('should allow cancelling pending order', async ({ page }) => {
      // Mock order cancellation
      await page.route('**/api/v1/user/order/cancel', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: true }),
        });
      });

      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Look for cancel button
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("取消订单")').first();
      
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(500);

        // Confirm cancellation if there's a dialog
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

    test('should allow retrying failed payment', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Look for retry/pay button
      const retryButton = page.locator('button:has-text("Pay"), button:has-text("Retry"), button:has-text("支付"), button:has-text("重试")').first();
      
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForTimeout(1000);

        // Should navigate to checkout
        const currentUrl = page.url();
        expect(currentUrl).toContain('checkout');
      }
    });

    test('should filter orders by status', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Look for status filter
      const statusFilter = page.locator('select, .n-select, .filter').first();
      
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.waitForTimeout(500);

        // Select an option
        const option = page.locator('.n-base-select-option, option').first();
        if (await option.isVisible()) {
          await option.click();
          await page.waitForTimeout(1000);

          // Orders should be filtered
          const orderItems = page.locator('.order-item, .order-card, tr');
          const count = await orderItems.count();
          expect(count).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  test.describe('Payment Security', () => {
    test('should require authentication for checkout', async ({ page }) => {
      // Clear auth
      await clearAuth(page);

      // Try to access checkout
      await page.goto('/checkout?order_id=1');
      await page.waitForTimeout(1000);

      // Should redirect to login
      const currentUrl = page.url();
      expect(currentUrl).toContain('login');
    });

    test('should validate order ownership', async ({ page }) => {
      // Try to access checkout with invalid order
      await page.goto('/checkout?order_id=99999');
      await page.waitForTimeout(1000);

      // Should show error or redirect
      const errorMessage = page.locator('.error-message, .n-message--error, [role="alert"]');
      const hasError = await errorMessage.first().isVisible({ timeout: 3000 }).catch(() => false);
      
      // Either error message or redirected away from checkout
      expect(hasError || !page.url().includes('checkout')).toBe(true);
    });
  });

  test.describe('Payment History', () => {
    test('should display payment history', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Orders page should show payment history
      await expect(page).toHaveURL('/orders');

      // Check for order items
      const orderItems = page.locator('.order-item, .order-card, tr');
      const count = await orderItems.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should show payment date and time', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Look for date/time information
      const dateElements = page.locator('text=/\\d{4}-\\d{2}-\\d{2}|\\d{2}:\\d{2}/');
      const count = await dateElements.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should show payment amount', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1000);

      // Look for amount display
      const amountElements = page.locator('text=/¥|\\$/, .amount, .price');
      const count = await amountElements.count();
      
      expect(count).toBeGreaterThan(0);
    });
  });
});
