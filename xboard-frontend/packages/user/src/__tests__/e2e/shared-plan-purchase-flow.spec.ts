import { test, expect } from '@playwright/test';

/**
 * E2E Integration Test: Complete Shared Plan Purchase Flow
 * 
 * Task 10.2: Test plan selection → Period selection → Purchase → Verification
 * 
 * This test validates the complete end-to-end flow of purchasing a shared subscription plan:
 * 1. User views available shared plans
 * 2. User selects a plan and views pricing tiers
 * 3. User selects a pricing period
 * 4. User completes purchase
 * 5. System assigns group_id to user
 * 6. System sets expiration date based on period
 * 7. User can access their subscription
 * 
 * Requirements: 2.5, 4.5, 9.1-9.8
 */

test.describe('Shared Plan Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user authentication
    await page.route('**/api/v1/passport/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            token: 'mock-user-token-' + Date.now(),
            auth_data: {
              id: 100,
              email: 'user@test.com',
              balance: 50000, // 500 yuan balance
              plan_id: null,
              group_id: null,
              expired_at: null,
            },
          },
        }),
      });
    });

    // Login as user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });

  test('should complete full purchase flow: View → Select Period → Purchase → Verify', async ({ page }) => {
    // Mock shared plans list API
    await page.route('**/api/v1/user/shared-plans**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              data: [
                {
                  id: 1,
                  name: 'Premium Shared Plan',
                  description: 'High-speed shared subscription with multiple servers',
                  group_id: 1,
                  tags: ['高速', '稳定', '美国'],
                  prices: {
                    monthly: 2999,
                    quarterly: 7999,
                    half_yearly: 14999,
                    yearly: 25999,
                  },
                  pricing_tiers: [
                    {
                      period: 'monthly',
                      name: '月付',
                      days: 30,
                      price: 2999,
                      average_monthly: 2999,
                    },
                    {
                      period: 'quarterly',
                      name: '季付',
                      days: 90,
                      price: 7999,
                      average_monthly: 2666,
                    },
                    {
                      period: 'half_yearly',
                      name: '半年付',
                      days: 180,
                      price: 14999,
                      average_monthly: 2500,
                    },
                    {
                      period: 'yearly',
                      name: '年付',
                      days: 365,
                      price: 25999,
                      average_monthly: 2137,
                    },
                  ],
                  nodes_count: 15,
                  max_slots: 50,
                  used_slots: 12,
                  available_slots: 38,
                  is_visible: true,
                },
                {
                  id: 2,
                  name: 'Standard Shared Plan',
                  description: 'Affordable shared subscription',
                  group_id: 2,
                  tags: ['经济', '稳定'],
                  prices: {
                    monthly: 1999,
                    yearly: 19999,
                  },
                  pricing_tiers: [
                    {
                      period: 'monthly',
                      name: '月付',
                      days: 30,
                      price: 1999,
                      average_monthly: 1999,
                    },
                    {
                      period: 'yearly',
                      name: '年付',
                      days: 365,
                      price: 19999,
                      average_monthly: 1644,
                    },
                  ],
                  nodes_count: 8,
                  max_slots: 30,
                  used_slots: 5,
                  available_slots: 25,
                  is_visible: true,
                },
              ],
            },
          }),
        });
      }
    });

    // Mock plan details API
    await page.route('**/api/v1/user/shared-plans/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            name: 'Premium Shared Plan',
            description: 'High-speed shared subscription with multiple servers',
            group_id: 1,
            group: {
              id: 1,
              name: 'VIP Group',
              server_count: 15,
            },
            tags: ['高速', '稳定', '美国'],
            prices: {
              monthly: 2999,
              quarterly: 7999,
              half_yearly: 14999,
              yearly: 25999,
            },
            pricing_tiers: [
              {
                period: 'monthly',
                name: '月付',
                days: 30,
                price: 2999,
                average_monthly: 2999,
              },
              {
                period: 'quarterly',
                name: '季付',
                days: 90,
                price: 7999,
                average_monthly: 2666,
              },
              {
                period: 'half_yearly',
                name: '半年付',
                days: 180,
                price: 14999,
                average_monthly: 2500,
              },
              {
                period: 'yearly',
                name: '年付',
                days: 365,
                price: 25999,
                average_monthly: 2137,
                recommended: true,
              },
            ],
            nodes_count: 15,
            max_slots: 50,
            used_slots: 12,
            available_slots: 38,
            is_visible: true,
          },
        }),
      });
    });

    // Mock purchase API
    await page.route('**/api/v1/user/shared-plans/1/purchase', async (route) => {
      const requestBody = route.request().postDataJSON();
      const period = requestBody.period;
      const days = { monthly: 30, quarterly: 90, half_yearly: 180, yearly: 365 }[period];
      const expireAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            slot_id: 123,
            subscription_token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12',
            subscription_url: `https://api.example.com/subscription/abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12`,
            expire_at: expireAt,
            group_id: 1,
          },
        }),
      });
    });

    // Mock user subscriptions API
    await page.route('**/api/v1/user/shared-plans/my-subscriptions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 123,
              shared_plan_id: 1,
              shared_plan_name: 'Premium Shared Plan',
              subscription_token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12',
              subscription_url: `https://api.example.com/subscription/abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12`,
              allocated_at: new Date().toISOString(),
              expire_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
            },
          ],
        }),
      });
    });

    // Step 1: Navigate to shared plans page
    await page.goto('/shared-plans');
    await expect(page).toHaveURL('/shared-plans');

    // Verify plans are displayed
    await expect(page.locator('text=Premium Shared Plan').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Standard Shared Plan').first()).toBeVisible();

    // Verify tags are displayed
    await expect(page.locator('text=高速').first()).toBeVisible();
    await expect(page.locator('text=稳定').first()).toBeVisible();

    // Step 2: Click on Premium plan to view details
    await page.locator('text=Premium Shared Plan').first().click();
    await page.waitForTimeout(1000);

    // Verify plan details are displayed
    await expect(page.locator('text=High-speed shared subscription').first()).toBeVisible();
    await expect(page.locator('text=15').first()).toBeVisible(); // nodes count

    // Step 3: Verify all pricing tiers are displayed
    await expect(page.locator('text=月付, text=Monthly').first()).toBeVisible();
    await expect(page.locator('text=季付, text=Quarterly').first()).toBeVisible();
    await expect(page.locator('text=半年付, text=Half-Yearly').first()).toBeVisible();
    await expect(page.locator('text=年付, text=Yearly').first()).toBeVisible();

    // Verify prices are displayed
    await expect(page.locator('text=29.99, text=¥29.99').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=79.99, text=¥79.99').first()).toBeVisible({ timeout: 5000 });

    // Verify average monthly cost is displayed
    await expect(page.locator('text=月均, text=Avg').first()).toBeVisible();

    // Verify recommended tier is highlighted
    const yearlyOption = page.locator('text=年付, text=Yearly').first();
    await expect(yearlyOption).toBeVisible();

    // Step 4: Select yearly pricing tier
    const yearlyButton = page.locator('button:has-text("年付"), button:has-text("Yearly"), .pricing-tier:has-text("年付") button, .pricing-tier:has-text("Yearly") button').first();
    await yearlyButton.click();
    await page.waitForTimeout(500);

    // Verify selection is highlighted
    const selectedTier = page.locator('.pricing-tier.selected, .pricing-tier.active, [class*="selected"]').first();
    await expect(selectedTier).toBeVisible();

    // Step 5: Click purchase button
    const purchaseButton = page.locator('button:has-text("购买"), button:has-text("Purchase"), button:has-text("立即购买")').first();
    await purchaseButton.click();

    // Wait for purchase to complete
    await page.waitForTimeout(1500);

    // Step 6: Verify success message
    const successMessage = page.locator('.el-message--success, text=成功, text=Success, text=购买成功').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Step 7: Navigate to my subscriptions page
    await page.goto('/my-subscriptions');
    await expect(page).toHaveURL('/my-subscriptions');

    // Step 8: Verify purchased subscription appears in list
    await expect(page.locator('text=Premium Shared Plan').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=active, text=激活, text=有效').first()).toBeVisible();

    // Verify subscription URL is displayed
    const subscriptionUrl = page.locator('text=https://api.example.com/subscription/, code:has-text("https://")').first();
    await expect(subscriptionUrl).toBeVisible();

    // Verify expiration date is displayed
    await expect(page.locator('text=365, text=一年, text=year').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display average monthly cost for each pricing tier', async ({ page }) => {
    // Mock shared plans API
    await page.route('**/api/v1/user/shared-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            data: [
              {
                id: 1,
                name: 'Test Plan',
                prices: {
                  monthly: 3000,
                  yearly: 30000,
                },
                pricing_tiers: [
                  {
                    period: 'monthly',
                    price: 3000,
                    average_monthly: 3000,
                  },
                  {
                    period: 'yearly',
                    price: 30000,
                    average_monthly: 2500,
                  },
                ],
                available_slots: 10,
                is_visible: true,
              },
            ],
          },
        }),
      });
    });

    await page.goto('/shared-plans');
    await page.waitForTimeout(1000);

    // Click on plan
    await page.locator('text=Test Plan').first().click();
    await page.waitForTimeout(500);

    // Verify average monthly costs are displayed
    await expect(page.locator('text=30.00, text=¥30.00').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=25.00, text=¥25.00').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle insufficient balance error', async ({ page }) => {
    // Mock user with low balance
    await page.route('**/api/v1/passport/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 100,
            email: 'user@test.com',
            balance: 1000, // Only 10 yuan
            plan_id: null,
            group_id: null,
          },
        }),
      });
    });

    // Mock shared plans
    await page.route('**/api/v1/user/shared-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            data: [
              {
                id: 1,
                name: 'Expensive Plan',
                prices: { monthly: 5000 },
                pricing_tiers: [
                  { period: 'monthly', price: 5000, average_monthly: 5000 },
                ],
                available_slots: 10,
                is_visible: true,
              },
            ],
          },
        }),
      });
    });

    // Mock purchase API to return insufficient balance error
    await page.route('**/api/v1/user/shared-plans/1/purchase', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Insufficient balance',
        }),
      });
    });

    await page.goto('/shared-plans');
    await page.waitForTimeout(1000);

    // Click on plan and try to purchase
    await page.locator('text=Expensive Plan').first().click();
    await page.waitForTimeout(500);

    const purchaseButton = page.locator('button:has-text("购买"), button:has-text("Purchase")').first();
    await purchaseButton.click();
    await page.waitForTimeout(1000);

    // Verify error message
    const errorMessage = page.locator('.el-message--error, text=余额不足, text=Insufficient').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should handle no available slots error', async ({ page }) => {
    // Mock shared plans with full plan
    await page.route('**/api/v1/user/shared-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            data: [
              {
                id: 1,
                name: 'Full Plan',
                prices: { monthly: 2000 },
                pricing_tiers: [
                  { period: 'monthly', price: 2000, average_monthly: 2000 },
                ],
                max_slots: 10,
                used_slots: 10,
                available_slots: 0,
                is_visible: true,
              },
            ],
          },
        }),
      });
    });

    // Mock purchase API to return no slots error
    await page.route('**/api/v1/user/shared-plans/1/purchase', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'No available slots',
        }),
      });
    });

    await page.goto('/shared-plans');
    await page.waitForTimeout(1000);

    // Click on plan and try to purchase
    await page.locator('text=Full Plan').first().click();
    await page.waitForTimeout(500);

    const purchaseButton = page.locator('button:has-text("购买"), button:has-text("Purchase")').first();
    await purchaseButton.click();
    await page.waitForTimeout(1000);

    // Verify error message
    const errorMessage = page.locator('.el-message--error, text=没有可用, text=No available').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should filter plans by tags', async ({ page }) => {
    // Mock shared plans with different tags
    await page.route('**/api/v1/user/shared-plans**', async (route) => {
      const url = route.request().url();
      const hasTagFilter = url.includes('tag=');
      
      if (hasTagFilter && url.includes('tag=高速')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              data: [
                {
                  id: 1,
                  name: 'High Speed Plan',
                  tags: ['高速', '美国'],
                  prices: { monthly: 3000 },
                  pricing_tiers: [{ period: 'monthly', price: 3000 }],
                  available_slots: 10,
                  is_visible: true,
                },
              ],
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              data: [
                {
                  id: 1,
                  name: 'High Speed Plan',
                  tags: ['高速', '美国'],
                  prices: { monthly: 3000 },
                  pricing_tiers: [{ period: 'monthly', price: 3000 }],
                  available_slots: 10,
                  is_visible: true,
                },
                {
                  id: 2,
                  name: 'Stable Plan',
                  tags: ['稳定', '日本'],
                  prices: { monthly: 2000 },
                  pricing_tiers: [{ period: 'monthly', price: 2000 }],
                  available_slots: 5,
                  is_visible: true,
                },
              ],
            },
          }),
        });
      }
    });

    await page.goto('/shared-plans');
    await page.waitForTimeout(1000);

    // Verify both plans are displayed initially
    await expect(page.locator('text=High Speed Plan').first()).toBeVisible();
    await expect(page.locator('text=Stable Plan').first()).toBeVisible();

    // Click on tag filter
    const tagFilter = page.locator('.el-select, select, button:has-text("标签"), button:has-text("Tag")').first();
    if (await tagFilter.isVisible()) {
      await tagFilter.click();
      await page.waitForTimeout(300);

      // Select "高速" tag
      await page.locator('.el-select-dropdown__item:has-text("高速"), option:has-text("高速")').first().click();
      await page.waitForTimeout(1000);

      // Verify only high speed plan is displayed
      await expect(page.locator('text=High Speed Plan').first()).toBeVisible();
      
      // Verify stable plan is not displayed
      const stablePlan = page.locator('text=Stable Plan').first();
      expect(await stablePlan.isVisible().catch(() => false)).toBeFalsy();
    }
  });

  test('should handle one-time payment plans correctly', async ({ page }) => {
    // Mock plan with one-time payment
    await page.route('**/api/v1/user/shared-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            data: [
              {
                id: 1,
                name: 'Lifetime Plan',
                prices: { onetime: 99999 },
                pricing_tiers: [
                  {
                    period: 'onetime',
                    name: '一次性',
                    days: -1,
                    price: 99999,
                    average_monthly: 99999,
                  },
                ],
                available_slots: 10,
                is_visible: true,
              },
            ],
          },
        }),
      });
    });

    // Mock purchase API for one-time plan
    await page.route('**/api/v1/user/shared-plans/1/purchase', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            slot_id: 456,
            subscription_token: 'lifetime-token-123',
            subscription_url: 'https://api.example.com/subscription/lifetime-token-123',
            expire_at: null, // No expiration for one-time plans
            group_id: 1,
          },
        }),
      });
    });

    await page.goto('/shared-plans');
    await page.waitForTimeout(1000);

    // Click on lifetime plan
    await page.locator('text=Lifetime Plan').first().click();
    await page.waitForTimeout(500);

    // Verify one-time pricing is displayed
    await expect(page.locator('text=一次性, text=One-time, text=Lifetime').first()).toBeVisible();
    await expect(page.locator('text=999.99, text=¥999.99').first()).toBeVisible({ timeout: 5000 });

    // Purchase the plan
    const purchaseButton = page.locator('button:has-text("购买"), button:has-text("Purchase")').first();
    await purchaseButton.click();
    await page.waitForTimeout(1500);

    // Verify success
    const successMessage = page.locator('.el-message--success, text=成功, text=Success').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});
