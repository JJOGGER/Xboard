import { Page, Route } from '@playwright/test';

/**
 * Helper functions for mocking API responses in E2E tests
 */

export interface MockResponse {
  status?: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * Mock a successful login response
 */
export async function mockLoginSuccess(page: Page, userData?: any) {
  await page.route('**/api/v1/passport/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          token: 'mock-admin-token-' + Date.now(),
          auth_data: userData || {
            id: 1,
            email: 'admin@test.com',
            is_admin: 1,
            is_staff: 0,
            balance: 0,
            commission_balance: 0,
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
 * Mock user list response
 */
export async function mockUserList(page: Page, users: any[] = []) {
  await page.route('**/api/v1/admin/user/fetch**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: users.length > 0 ? users : generateMockUsers(10),
      }),
    });
  });
}

/**
 * Mock user update response
 */
export async function mockUserUpdate(page: Page) {
  await page.route('**/api/v1/admin/user/update**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: true,
      }),
    });
  });
}

/**
 * Mock order list response
 */
export async function mockOrderList(page: Page, orders: any[] = []) {
  await page.route('**/api/v1/admin/order/fetch**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: orders.length > 0 ? orders : generateMockOrders(10),
      }),
    });
  });
}

/**
 * Mock order update response
 */
export async function mockOrderUpdate(page: Page) {
  await page.route('**/api/v1/admin/order/update**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: true,
      }),
    });
  });
}

/**
 * Mock config fetch response
 */
export async function mockConfigFetch(page: Page, config: any = {}) {
  await page.route('**/api/v1/admin/config/fetch', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: config,
      }),
    });
  });
}

/**
 * Mock config save response
 */
export async function mockConfigSave(page: Page) {
  await page.route('**/api/v1/admin/config/save', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: true,
      }),
    });
  });
}

/**
 * Mock dashboard stats response
 */
export async function mockDashboardStats(page: Page) {
  await page.route('**/api/v1/admin/stat/getOverride', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          month_income: 10000,
          month_register_total: 150,
          ticket_pending_total: 5,
          commission_pending_total: 2000,
          day_income: 500,
          last_month_income: 9500,
        },
      }),
    });
  });
}

/**
 * Generate mock users for testing
 */
function generateMockUsers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    email: `user${i + 1}@test.com`,
    balance: Math.floor(Math.random() * 10000),
    commission_balance: Math.floor(Math.random() * 1000),
    plan_id: Math.random() > 0.5 ? 1 : null,
    expired_at: Math.random() > 0.5 ? Date.now() / 1000 + 86400 * 30 : null,
    u: Math.floor(Math.random() * 1000000000),
    d: Math.floor(Math.random() * 1000000000),
    transfer_enable: 10737418240,
    banned: 0,
    is_admin: 0,
    is_staff: 0,
    created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
  }));
}

/**
 * Generate mock orders for testing
 */
function generateMockOrders(count: number) {
  const statuses = [0, 1, 2, 3, 4];
  const periods = ['month_price', 'quarter_price', 'half_year_price', 'year_price'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    user_id: Math.floor(Math.random() * 100) + 1,
    plan_id: Math.floor(Math.random() * 5) + 1,
    period: periods[Math.floor(Math.random() * periods.length)],
    trade_no: `T${Date.now()}${i}`,
    total_amount: Math.floor(Math.random() * 10000) + 1000,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
  }));
}
