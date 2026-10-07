import { test, expect } from '@playwright/test';
import { pagesUnderTest } from '../../pages.config.js';
import { triggerLazyImages } from '../../utils/lazy-load.js';
import { pauseSliders, stabilizePageForScreenshot } from '../../utils/flaky-elements.js';

/**
 * Accept the Complianz cookie banner so it doesn't appear in screenshots.
 * The banner is dismissed by clicking the "Accept" button.
 */
async function acceptCookieBanner(page) {
  const acceptButton = page.locator('.cmplz-accept, .cmplz-cookiebanner-container .cmplz-accept, [class*="cmplz"] button:has-text("Accept")');
  if (await acceptButton.count()) {
    await acceptButton.first().click({ timeout: 5000 }).catch(() => {
      // If the banner doesn't appear or can't be dismissed, continue anyway
    });
  }
}

test.describe('Visual regression', () => {
  for (const pageUnderTest of pagesUnderTest) {
    test(`${pageUnderTest.name} — full page matches baseline`, async ({ page }) => {
      // The site's paid webfont host (Type Network) intermittently blocks
      // its font files with a CORS error. When that happens the page
      // renders in the fallback font, and when it doesn't the page is
      // taller — same page, different screenshot height. Abort the font
      // CDN so every run uses the same fallback.
      await page.route(/typenetwork\.com/, (route) => route.abort());

      // Elementor's sticky-header JS flips the top section to
      // position:fixed once the user scrolls — converting it back to
      // relative afterwards adds ~111px to the document height depending
      // on that race, which broke full-page determinism. Inject a style
      // straight into the HTML so the header is in normal flow from the
      // very first paint, and hide the cookie banner the same way.
      await page.route('**/*', async (route) => {
        if (route.request().resourceType() !== 'document') return route.continue();
        const response = await route.fetch();
        let html = await response.text();
        const inject = `<style id="vr-defs">
          .elementor-top-section, [id*="header"], .elementor-sticky, .elementor-sticky--active, .cmplz-cookiebanner, [id^="cmplz"] {
            position: relative !important; top: auto !important; bottom: auto !important;
          }
          .elementor-top-section, [id*="header"], .elementor-sticky, .elementor-sticky--active { display: block; }
          .cmplz-cookiebanner, [id^="cmplz"] { display: none !important; }
          /* Elementor inserts a header-sized spacer clone when the sticky JS
             initialises. With the header forced into normal flow that spacer
             would double the header height (+127px) on some runs. */
          .elementor-sticky__spacer { display: none !important; }
        </style>`;
        html = html.replace(/<head([^>]*)>/i, (m) => `${m}${inject}`);
        return route.fulfill({ response, body: html, contentType: 'text/html' });
      });

      await page.goto(pageUnderTest.path, { waitUntil: 'load' });

      // Accept the cookie banner so it doesn't appear in the screenshot
      await acceptCookieBanner(page);

      // Simulate a real visitor: scroll gradually to trigger lazy-loaded images
      await triggerLazyImages(page);

      // Turn off sliders and snap them to the first slide so the leadspace
      // renders a deterministic first-image frame (no purple masking).
      await pauseSliders(page);

      // Pin the sticky header to the top only and clear leftover fixed
      // elements so the full-page capture has no extra space at the bottom
      await stabilizePageForScreenshot(page);

      // Slider JS may kick back in after stabilization; re-pause + reset
      await pauseSliders(page);
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`${pageUnderTest.name}-full.png`, {
        fullPage: true,
        // Vimeo embeds / video players are async and change frame to
        // frame — mask them so the diff only catches real page changes.
        mask: [
          page.locator('iframe[src*="vimeo" i]'),
          page.locator('iframe[src*="player.vimeo"]'),
          page.locator('iframe[srcdoc*="vimeo" i]'),
          page.locator('[class*="vimeo" i]'),
          page.locator('.elementor-widget-video'),
          page.locator('video'),
        ],
      });
    });
  }
});