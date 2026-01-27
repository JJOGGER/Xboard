import { Page, Route } from '@playwright/test';

/**
 * Helper functions for mocking API responses in user E2E tests
 */

export interface MockResponse {
  status?: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * Mock a successful user login response
 */
export async function mockLoginSuccess(page: Page, userData?: any) {
  await page.route('**/api/v1/passport/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          token: 'mock-user-token-' + Date.now(),
          auth_data: userData || {
            id: 1,
            email: 'user@test.com',
            is_admin: 0,
            is_staff: 0,
            balance: 1000,
            commission_balance: 500,
            plan_id: 1,
            expired_at: Date.now() / 1000 + 86400 * 30,
            u: 1000000,
            d: 2000000,
            transfer_enable: 10737418240,
          },
        },
      }),
    });
  });
}

/**
 * Mock a failed login response
 */
export async function mockLoginFailure(page: Page, message = 'Invalid credentials') {
  await page.route('**/api/v1/passport/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        message,
        errors: {
          email: ['Invalid credentials'],
        },
      }),
    });
  });
}

/**
 * Mock a successful registration response
 */
export async function mockRegisterSuccess(page: Page) {
  await page.route('**/api/v1/passport/auth/register', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          token: 'mock-user-token-' + Date.now(),
          auth_data: {
            id: 1,
            email: 'newuser@test.com',
            is_admin: 0,
            is_staff: 0,
            balance: 0,
            commission_balance: 0,
            plan_id: null,
            expired_at: null,
            u: 0,
            d: 0,
            transfer_enable: 0,
          },
        },
      }),
    });
  });
}

/**
 * Mock a failed registration response
 */
export async function mockRegisterFailure(page: Page, errors: any = {}) {
  await page.route('**/api/v1/passport/auth/register', async (route: Route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Validation failed',
        errors: errors || {
          email: ['The email has already been taken.'],
        },
      }),
    });
  });
}

/**
 * Mock user profile fetch
 */
export async function mockUserProfile(page: Page, userData?: any) {
  await page.route('**/api/v1/user/info', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: userData || {
          id: 1,
          email: 'user@test.com',
          balance: 1000,
          commission_balance: 500,
          plan_id: 1,
          expired_at: Date.now() / 1000 + 86400 * 30,
          u: 1000000,
          d: 2000000,
          transfer_enable: 10737418240,
          banned: 0,
        },
      }),
    });
  });
}

/**
 * Mock plan list response
 */
export async function mockPlanList(page: Page, plans: any[] = []) {
  await page.route('**/api/v1/user/plan/fetch', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: plans.length > 0 ? plans : generateMockPlans(),
      }),
    });
  });
}

/**
 * Mock order creation response
 */
export async function mockOrderCreate(page: Page, orderId = 1) {
  await page.route('**/api/v1/user/order/save', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: orderId,
          trade_no: `T${Date.now()}`,
          total_amount: 1000,
          status: 0,
        },
      }),
    });
  });
}

/**
 * Mock order list response
 */
export async function mockOrderList(page: Page, orders: any[] = []) {
  await page.route('**/api/v1/user/order/fetch', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: orders.length > 0 ? orders : generateMockOrders(5),
      }),
    });
  });
}

/**
 * Mock payment method list
 */
export async function mockPaymentMethods(page: Page, methods: any[] = []) {
  await page.route('**/api/v1/user/order/getPaymentMethod', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: methods.length > 0 ? methods : generateMockPaymentMethods(),
      }),
    });
  });
}

/**
 * Mock payment checkout response
 */
export async function mockPaymentCheckout(page: Page, paymentUrl = 'https://payment.test.com/checkout') {
  await page.route('**/api/v1/user/order/checkout', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          type: 1, // redirect
          url: paymentUrl,
        },
      }),
    });
  });
}

/**
 * Mock subscription info response
 */
export async function mockSubscriptionInfo(page: Page, subscriptionData?: any) {
  await page.route('**/api/v1/user/getSubscribe', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: subscriptionData || {
          subscribe_url: 'https://sub.test.com/subscribe/abc123',
          plan_name: 'Premium Plan',
          expired_at: Date.now() / 1000 + 86400 * 30,
          u: 1000000,
          d: 2000000,
          transfer_enable: 10737418240,
        },
      }),
    });
  });
}

/**
 * Mock server node list
 */
export async function mockServerNodes(page: Page, nodes: any[] = []) {
  await page.route('**/api/v1/user/server/fetch', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: nodes.length > 0 ? nodes : generateMockServerNodes(),
      }),
    });
  });
}

/**
 * Mock subscription secret reset
 */
export async function mockResetSecret(page: Page) {
  await page.route('**/api/v1/user/resetSecurity', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          subscribe_url: 'https://sub.test.com/subscribe/xyz789',
        },
      }),
    });
  });
}

/**
 * Mock traffic statistics
 */
export async function mockTrafficStats(page: Page, stats?: any) {
  await page.route('**/api/v1/user/getStat', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: stats || generateMockTrafficStats(),
      }),
    });
  });
}

/**
 * Mock coupon check
 */
export async function mockCouponCheck(page: Page, valid = true, discount = 100) {
  await page.route('**/api/v1/user/coupon/check', async (route: Route) => {
    if (valid) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            name: 'Test Coupon',
            type: 2, // fixed amount
            value: discount,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invalid or expired coupon',
        }),
      });
    }
  });
}

/**
 * Generate mock plans for testing
 */
function generateMockPlans() {
  return [
    {
      id: 1,
      name: 'Basic Plan',
      content: 'Basic features',
      month_price: 1000,
      quarter_price: 2700,
      half_year_price: 5400,
      year_price: 10000,
      transfer_enable: 107374182400, // 100GB
      speed_limit: null,
      device_limit: 3,
      show: 1,
      sort: 1,
    },
    {
      id: 2,
      name: 'Premium Plan',
      content: 'Premium features',
      month_price: 2000,
      quarter_price: 5400,
      half_year_price: 10800,
      year_price: 20000,
      transfer_enable: 322122547200, // 300GB
      speed_limit: null,
      device_limit: 5,
      show: 1,
      sort: 2,
    },
  ];
}

/**
 * Generate mock orders for testing
 */
function generateMockOrders(count: number) {
  const statuses = [0, 1, 2, 3];
  const periods = ['month_price', 'quarter_price', 'year_price'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    plan_id: Math.floor(Math.random() * 2) + 1,
    period: periods[Math.floor(Math.random() * periods.length)],
    trade_no: `T${Date.now()}${i}`,
    total_amount: Math.floor(Math.random() * 10000) + 1000,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
  }));
}

/**
 * Generate mock payment methods
 */
function generateMockPaymentMethods() {
  return [
    {
      id: 1,
      name: 'Alipay',
      payment: 'alipay',
      icon: null,
      show: 1,
      sort: 1,
    },
    {
      id: 2,
      name: 'Stripe',
      payment: 'stripe',
      icon: null,
      show: 1,
      sort: 2,
    },
  ];
}

/**
 * Generate mock server nodes
 */
function generateMockServerNodes() {
  return [
    {
      id: 1,
      name: 'US Node 1',
      host: 'us1.test.com',
      port: 443,
      protocol: 'vmess',
      show: 1,
      sort: 1,
      tags: ['US', 'Premium'],
    },
    {
      id: 2,
      name: 'JP Node 1',
      host: 'jp1.test.com',
      port: 443,
      protocol: 'vmess',
      show: 1,
      sort: 2,
      tags: ['JP', 'Premium'],
    },
  ];
}

/**
 * Generate mock traffic statistics
 */
function generateMockTrafficStats() {
  return {
    today: {
      u: 100000000,
      d: 200000000,
    },
    month: {
      u: 1000000000,
      d: 2000000000,
    },
    history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      u: Math.floor(Math.random() * 100000000),
      d: Math.floor(Math.random() * 200000000),
    })),
  };
}
