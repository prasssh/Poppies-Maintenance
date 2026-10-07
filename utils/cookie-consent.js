/**
 * Clicks the Complianz cookie consent "Accept" button if it's visible.
 * This prevents the cookie banner from appearing in screenshots.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function acceptCookieConsent(page) {
  const acceptBtn = page.locator('.cmplz-btn.cmplz-accept');
  if (await acceptBtn.count() > 0 && await acceptBtn.isVisible()) {
    await acceptBtn.click();
    // Wait for the banner to dismiss
    await page.waitForTimeout(500);
  }
}
