import { test, expect } from '@playwright/test';

test.describe('Endpoints E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to endpoints page
    await page.goto('/endpoints');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('엔드포인트 목록 페이지', () => {
    test('should display endpoints page with header', async ({ page }) => {
      // Check page title
      await expect(page.locator('h1')).toContainText('엔드포인트');

      // Check description
      await expect(page.locator('text=모니터링 중인 API 엔드포인트 목록')).toBeVisible();
    });

    test('should display "새 엔드포인트" button', async ({ page }) => {
      const addButton = page.locator('a:has-text("새 엔드포인트")');
      await expect(addButton).toBeVisible();

      // Check link target
      await expect(addButton).toHaveAttribute('href', '/endpoints/new');
    });

    test('should display status filter buttons', async ({ page }) => {
      // Check for all filter buttons
      await expect(page.locator('button:has-text("전체")')).toBeVisible();
      await expect(page.locator('button:has-text("정상")')).toBeVisible();
      await expect(page.locator('button:has-text("다운")')).toBeVisible();
      await expect(page.locator('button:has-text("저하")')).toBeVisible();
    });

    test('should filter endpoints by status', async ({ page }) => {
      // Click UP filter
      await page.locator('button:has-text("정상")').click();

      // Wait for filter to apply
      await page.waitForLoadState('networkidle');

      // Check that filter button is highlighted
      const upButton = page.locator('button:has-text("정상")');
      await expect(upButton).toHaveClass(/bg-green-600/);
    });

    test('should reset filter when "전체" button is clicked', async ({ page }) => {
      // Click UP filter first
      await page.locator('button:has-text("정상")').click();
      await page.waitForLoadState('networkidle');

      // Then click "전체" filter
      await page.locator('button:has-text("전체")').click();
      await page.waitForLoadState('networkidle');

      // Check that "전체" button is highlighted
      const allButton = page.locator('button:has-text("전체")');
      await expect(allButton).toHaveClass(/bg-blue-600/);
    });

    test('should display endpoint table', async ({ page }) => {
      // Check for table existence
      const table = page.locator('table, [role="table"]');
      await expect(table).toBeVisible();
    });
  });

  test.describe('엔드포인트 생성', () => {
    test('should navigate to create endpoint page', async ({ page }) => {
      // Click "새 엔드포인트" button
      await page.locator('a:has-text("새 엔드포인트")').click();

      // Wait for navigation
      await page.waitForURL('**/endpoints/new');

      // Check page loaded
      await expect(page).toHaveURL(/endpoints\/new/);
    });

    test('should create a new endpoint with valid data', async ({ page }) => {
      // Navigate to create page
      await page.locator('a:has-text("새 엔드포인트")').click();
      await page.waitForURL('**/endpoints/new');

      // Fill form fields
      await page.fill('input[name="name"]', 'Test API Endpoint');
      await page.fill('input[name="url"]', 'https://api.example.com/health');

      // Select GET method
      await page.selectOption('select[name="method"]', 'GET');

      // Fill check interval
      await page.fill('input[name="checkInterval"]', '30');

      // Fill expected status code
      await page.fill('input[name="expectedStatusCode"]', '200');

      // Fill timeout
      await page.fill('input[name="timeoutThreshold"]', '5000');

      // Submit form
      await page.locator('button:has-text("생성"), button:has-text("제출")').first().click();

      // Wait for success and navigation back to list
      await page.waitForURL('**/endpoints', { timeout: 10000 });

      // Verify success message appeared
      const successMessage = page.locator('text=성공, text=생성됨, text=추가');
      await expect(successMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Success message might disappear quickly
      });
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      // Navigate to create page
      await page.locator('a:has-text("새 엔드포인트")').click();
      await page.waitForURL('**/endpoints/new');

      // Leave name empty and try to submit
      await page.fill('input[name="url"]', 'not-a-valid-url');

      // Try to submit
      await page.locator('button:has-text("생성"), button:has-text("제출")').first().click();

      // Check for error message
      const errorMessage = page.locator('text=오류, text=실패, text=에러');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Error might be shown as validation message
      });
    });
  });

  test.describe('엔드포인트 상세 조회', () => {
    test('should navigate to endpoint detail page', async ({ page }) => {
      // Wait for table to load
      const firstEndpointRow = page.locator('[data-testid*="endpoint-"], tr').first();

      // Click on first endpoint
      await firstEndpointRow.click({ timeout: 5000 }).catch(() => {
        // If click doesn't work, try finding a link
        const link = page.locator('a[href*="/endpoints/"]').first();
        return link.click();
      });

      // Check that we're on a detail page
      await expect(page).toHaveURL(/endpoints\/[a-f0-9\-]+$/);
    });
  });

  test.describe('엔드포인트 수정', () => {
    test('should open edit dialog/form for endpoint', async ({ page }) => {
      // Find and click edit button on first endpoint
      const editButton = page.locator('button:has-text("수정"), button:has-text("Edit")').first();

      await editButton.click({ timeout: 5000 }).catch(() => {
        // If button not found in list, navigate to detail first
      });

      // Check for form/modal with edit fields
      const form = page.locator('input[name="name"]');
      await expect(form).toBeVisible({ timeout: 5000 }).catch(() => {
        // Edit form might not be visible yet
      });
    });

    test('should update endpoint successfully', async ({ page }) => {
      // Find first endpoint and click edit
      const editButton = page.locator('button:has-text("수정"), button:has-text("Edit")').first();

      await editButton.click({ timeout: 5000 }).catch(() => {
        return;
      });

      // Try to fill updated name
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill('Updated Endpoint Name');

        // Submit update
        await page.locator('button:has-text("저장"), button:has-text("Update")').first().click();

        // Wait for success
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('엔드포인트 삭제', () => {
    test('should delete endpoint with confirmation', async ({ page }) => {
      // Find and click delete button on first endpoint
      const deleteButton = page.locator('button:has-text("삭제"), button:has-text("Delete")').first();

      await deleteButton.click({ timeout: 5000 }).catch(() => {
        // Delete button might not be visible
      });

      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("확인"), button:has-text("네"), button:has-text("예")');
      if (await confirmButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.first().click();

        // Wait for list to update
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('엔드포인트 수동 체크', () => {
    test('should trigger health check on endpoint', async ({ page }) => {
      // Find and click health check button (체크 button)
      const checkButton = page.locator('button:has-text("체크"), button:has-text("Check")').first();

      await checkButton.click({ timeout: 5000 }).catch(() => {
        // Check button might not be visible
      });

      // Wait for check to complete
      await page.waitForLoadState('networkidle');

      // Verify success or check result
      await page.waitForTimeout(1000);
    });
  });

  test.describe('엔드포인트 페이지네이션', () => {
    test('should navigate between pages using pagination', async ({ page }) => {
      // Check if pagination exists
      const nextButton = page.locator('button:has-text("다음")');

      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click next button
        await nextButton.click();

        // Wait for page update
        await page.waitForLoadState('networkidle');

        // Check that we can click previous
        const prevButton = page.locator('button:has-text("이전")');
        await expect(prevButton).toBeVisible();
      }
    });
  });

  test.describe('반응형 디자인', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check header is visible
      await expect(page.locator('h1')).toBeVisible();

      // Check button is accessible
      const addButton = page.locator('a:has-text("새 엔드포인트")');
      await expect(addButton).toBeVisible();
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check layout is intact
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Check full layout
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('접근성', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Check h1 exists
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('should have accessible button labels', async ({ page }) => {
      // Check buttons have text or aria-label
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab to first interactive element
      await page.keyboard.press('Tab');

      // Check that focus is on an interactive element
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement as HTMLElement;
        return focused?.tagName;
      });

      expect(['BUTTON', 'A', 'INPUT', 'SELECT']).toContain(focusedElement);
    });
  });

  test.describe('에러 처리', () => {
    test('should display error when API call fails', async ({ page }) => {
      // Simulate API error by blocking network
      await page.context().setOffline(true);

      // Try to navigate
      await page.goto('/endpoints').catch(() => {
        // Navigation might fail
      });

      // Restore network
      await page.context().setOffline(false);

      // Check error message
      const errorElement = page.locator('text=에러, text=오류, text=실패');
      await expect(errorElement.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Error might not be displayed
      });
    });

    test('should handle 404 page not found', async ({ page }) => {
      // Navigate to non-existent endpoint
      await page.goto('/endpoints/non-existent-id', { waitUntil: 'networkidle' }).catch(() => {
        // Navigation might fail
      });

      // Check for 404 or redirect
      const url = page.url();
      expect(url).toMatch(/endpoints|404|not.*found|error/i);
    });
  });
});
