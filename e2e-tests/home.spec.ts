import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    // Check that the main page heading is present
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    // Check that the site branding is present in the header (no longer an h1)
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    // Check that the welcome message is present using more specific locator
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should display the catalog summary with totals and ratings', async ({ page }) => {
    await expect(page.getByTestId('catalog-summary')).toBeVisible();
    await expect(page.getByTestId('catalog-total-value')).toHaveText(/\d+/);
    await expect(page.getByTestId('catalog-rating-value')).toContainText(/\d+(\.\d+)?|N\/A/);
  });

  test('should navigate to the catalog page and filter by category', async ({ page }) => {
    await page.getByTestId('catalog-filter-link').click();
    await expect(page).toHaveURL('/catalog');
    await expect(page.getByRole('heading', { name: 'Browse the catalog', exact: true })).toBeVisible();

    const allGames = page.getByTestId('catalog-filter-all');
    await expect(allGames).toBeVisible();

    const categoryLink = page.getByRole('link', { name: 'Strategy', exact: true });
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();

    await expect(page).toHaveURL(/\/catalog\?category=\d+/);
    await expect(page.getByTestId('catalog-result-count')).toContainText(/\d+ game/);
    await expect(page.getByTestId('catalog-results-grid')).toBeVisible();
  });
});
