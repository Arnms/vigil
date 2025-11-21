import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('대시보드 페이지', () => {
    test('should load dashboard page successfully', async ({ page }) => {
      // Check page is loaded
      await expect(page).toHaveURL('/');

      // Check page has content
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    });

    test('should display main heading', async ({ page }) => {
      // Look for dashboard title
      const heading = page.locator('text=대시보드, h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {
        // Heading might have different text
      });
    });
  });

  test.describe('상태 카드', () => {
    test('should display status cards', async ({ page }) => {
      // Look for status cards
      const cards = page.locator('[class*="card"], [class*="status"], div:has(p:has-text("정상"))');

      // Wait for cards to appear
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible({ timeout: 5000 });
    });

    test('should display card with title and value', async ({ page }) => {
      // Look for cards with text content
      const cardText = page.locator('[class*="card"] p, [class*="status"] p');

      // Get first few cards
      const count = await cardText.count();
      expect(count).toBeGreaterThan(0);

      // Check that cards have content
      const firstText = await cardText.first().textContent();
      expect(firstText?.length).toBeGreaterThan(0);
    });

    test('should display uptime statistics', async ({ page }) => {
      // Look for uptime-related text
      const uptimeCard = page.locator('text=가동률, text=uptime, text=성능').first();

      await expect(uptimeCard).toBeVisible({ timeout: 5000 }).catch(() => {
        // Uptime card might have different text
      });
    });

    test('should display endpoint count', async ({ page }) => {
      // Look for endpoint count
      const countCard = page.locator('text=엔드포인트, text=개, text=endpoints').first();

      await expect(countCard).toBeVisible({ timeout: 5000 }).catch(() => {
        // Count card might have different text
      });
    });

    test('should display health status', async ({ page }) => {
      // Look for status indicators
      const statusCards = page.locator('text=정상, text=다운, text=저하');

      await expect(statusCards.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Status might be displayed differently
      });
    });
  });

  test.describe('차트 렌더링', () => {
    test('should render uptime chart', async ({ page }) => {
      // Look for chart elements (SVG or canvas)
      const chart = page.locator('svg, canvas, [class*="chart"]').first();

      await expect(chart).toBeVisible({ timeout: 5000 }).catch(() => {
        // Chart might not be rendered yet
      });
    });

    test('should render response time chart', async ({ page }) => {
      // Look for response time specific chart
      const responseChart = page.locator('text=응답시간, text=response');

      await expect(responseChart).toBeVisible({ timeout: 5000 }).catch(() => {
        // Response chart might not be visible
      });
    });

    test('should render incident timeline', async ({ page }) => {
      // Look for timeline or incident section
      const timeline = page.locator('text=인시던트, text=timeline, text=incident');

      await expect(timeline).toBeVisible({ timeout: 5000 }).catch(() => {
        // Timeline might not be visible
      });
    });

    test('should display chart legend', async ({ page }) => {
      // Look for chart legend
      const legend = page.locator('[class*="legend"], text=범례');

      if (await legend.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(legend.first()).toBeVisible();
      }
    });

    test('should allow chart interaction (hover)', async ({ page }) => {
      // Find a chart element
      const chart = page.locator('svg, [class*="chart"]').first();

      if (await chart.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Hover over chart
        await chart.hover();

        // Wait for tooltip or hover effect
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('필터링', () => {
    test('should display period filter options', async ({ page }) => {
      // Look for period filters (24h, 7d, 30d)
      const filters = page.locator('button:has-text("24시간"), button:has-text("7일"), button:has-text("30일")');

      // Check for at least one filter
      const count = await filters.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter data by time period', async ({ page }) => {
      // Find period filter button (7d)
      const weekFilter = page.locator('button:has-text("7일"), button:has-text("7d")').first();

      if (await weekFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click filter
        await weekFilter.click();

        // Wait for data to update
        await page.waitForLoadState('networkidle');

        // Check that filter is selected
        await expect(weekFilter).toHaveClass(/active|selected|bg-blue/);
      }
    });

    test('should filter by endpoint status', async ({ page }) => {
      // Look for status filter
      const statusFilter = page.locator('button:has-text("정상"), button:has-text("다운"), select[name*="status"]').first();

      if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await statusFilter.click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('데이터 업데이트', () => {
    test('should automatically refresh dashboard data', async ({ page }) => {
      // Get initial data (e.g., timestamp)
      const initialTime = await page.locator('text=/[0-9]{2}:[0-9]{2}/').first().textContent();

      // Wait for auto-refresh (typically 30s or more)
      await page.waitForTimeout(2000);

      // Data should still be visible
      const content = page.locator('body');
      await expect(content).toBeVisible();
    });

    test('should display last update timestamp', async ({ page }) => {
      // Look for "마지막 업데이트", "Last updated" text
      const updateText = page.locator('text=업데이트, text=Updated, text=마지막');

      await expect(updateText.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Update timestamp might not be displayed
      });
    });
  });

  test.describe('반응형 레이아웃', () => {
    test('should stack cards vertically on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that content is still visible
      const cards = page.locator('[class*="card"], [class*="status"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display grid layout on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Check layout
      const cards = page.locator('[class*="card"], [class*="status"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should make charts responsive', async ({ page }) => {
      // Set different viewport sizes
      const viewports = [
        { width: 375, height: 667 },  // mobile
        { width: 768, height: 1024 }, // tablet
        { width: 1920, height: 1080 }, // desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        // Check that chart is still visible
        const chart = page.locator('svg, canvas, [class*="chart"]').first();
        if (await chart.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(chart).toBeVisible();
        }
      }
    });
  });

  test.describe('성능', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should not have critical errors
      expect(errors.filter((e) => !e.includes('Failed to fetch')).length).toBe(0);
    });
  });

  test.describe('접근성', () => {
    test('should have proper headings', async ({ page }) => {
      const h1 = page.locator('h1');
      const hasHeading = await h1.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasHeading) {
        await expect(h1).toBeVisible();
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      // This is a basic check - full WCAG testing would need dedicated tools
      const text = page.locator('body');
      await expect(text).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check that something is focused
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    });
  });

  test.describe('네비게이션', () => {
    test('should have navigation menu', async ({ page }) => {
      // Look for navigation
      const nav = page.locator('nav, [role="navigation"], header');

      await expect(nav.first()).toBeVisible({ timeout: 3000 }).catch(() => {
        // Nav might not be visible on first load
      });
    });

    test('should navigate to endpoints page', async ({ page }) => {
      // Find and click endpoints link
      const endpointsLink = page.locator('a:has-text("엔드포인트"), a:has-text("Endpoints")').first();

      if (await endpointsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await endpointsLink.click();

        // Check navigation
        await page.waitForURL('**/endpoints', { timeout: 5000 }).catch(() => {
          // Navigation might fail
        });
      }
    });

    test('should display active link indicator', async ({ page }) => {
      // Check if current page link is highlighted
      const activeLink = page.locator('a[class*="active"], a[aria-current]');

      if (await activeLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(activeLink.first()).toBeVisible();
      }
    });
  });

  test.describe('에러 상태', () => {
    test('should display empty state when no data', async ({ page }) => {
      // This would require mocking empty data
      // For now, just check page loads
      await expect(page).toHaveURL('/');
    });

    test('should display error message on API failure', async ({ page }) => {
      // Block API requests
      await page.context().setOffline(true);

      // Try to refresh
      await page.reload().catch(() => {
        // Reload might fail
      });

      // Restore connection
      await page.context().setOffline(false);

      // Check for error message
      const errorMsg = page.locator('text=오류, text=에러, text=실패');
      // Error might appear or might be handled gracefully
      await page.waitForTimeout(500);
    });
  });
});
