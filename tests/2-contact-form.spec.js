// import { test, expect } from '@playwright/test';
// import { contactForm } from '../utils/selectors.js';
// import {
//   createAdminContext,
//   loginAsAdmin,
//   openContactFormMailTab,
//   getContactFormRecipient,
//   setContactFormRecipient,
// } from '../utils/wp-admin.js';

// /**
//  * This suite deliberately stops at client-side validation. It never
//  * submits a fully valid entry unless RUN_HAPPY_PATH=1 is set, so
//  * re-running it after every plugin update won't spam real leads into the
//  * site's mail/CRM pipeline.
//  *
//  * The Ninja Forms recipient is swapped to WP_TEST_RECIPIENT_EMAIL for the whole
//  * file (beforeAll) and restored to whatever it was (afterAll), so both the
//  * validation tests and the optional happy-path test always send to the
//  * throwaway address. State lives in memory only — no cross-file ordering
//  * or state files needed.
//  */

// // The address typed into the form's own "email" field for the happy-path
// // submission — i.e. what a visitor would enter as *their* address. This
// // is separate from WP_TEST_RECIPIENT_EMAIL, which is the Ninja Forms "To:"
// // address the submission gets mailed to.
// const TEST_SENDER_EMAIL = process.env.WP_TEST_SENDER_EMAIL || 'test@outside.studio';

// test.describe('Contact form validation', () => {
//   let originalRecipient = '';
//   let recipientSwapped = false;

//   test.beforeAll(async ({ browser }) => {
//     const { WP_TEST_RECIPIENT_EMAIL } = process.env;
//     if (!WP_TEST_RECIPIENT_EMAIL) {
//       throw new Error(
//         'WP_TEST_RECIPIENT_EMAIL must be set in the .env file (the address to swap the form to).'
//       );
//     }

//     // beforeAll has no `page` fixture, so drive the admin swap from a
//     // throwaway context.
//     const context = await createAdminContext(browser);
//     const page = await context.newPage();
//     try {
//       await loginAsAdmin(page);
//       await openContactFormMailTab(page);
//       originalRecipient = await getContactFormRecipient(page);
//       await setContactFormRecipient(page, WP_TEST_RECIPIENT_EMAIL);
//       recipientSwapped = true;
//       console.log(`[contact-form] Swapped Ninja Forms "To:" recipient to: ${WP_TEST_RECIPIENT_EMAIL}`);
//     } finally {
//       await context.close();
//     }
//   });

//   test.afterAll(async ({ browser }) => {
//     // Only restore if a swap actually happened — a failed login in
//     // beforeAll must not clobber the live form's recipient.
//     if (!recipientSwapped) return;

//     const context = await createAdminContext(browser);
//     const page = await context.newPage();
//     try {
//       await loginAsAdmin(page);
//       await openContactFormMailTab(page);
//       await setContactFormRecipient(page, originalRecipient);
//       console.log(`[contact-form] Restored "To:" recipient to: ${originalRecipient}`);
//     } finally {
//       await context.close();
//     }
//   });

//   test.describe('Contact page', () => {
//     test.beforeEach(async ({ page }) => {
//       await page.goto('/contact-us', { waitUntil: 'domcontentloaded' });
//       await page.locator(contactForm.form).scrollIntoViewIfNeeded();
//     });

//     test('shows required-field errors when submitted empty', async ({ page }) => {
//       const form = page.locator(contactForm.form);

//       await form.locator(contactForm.submit).click();

//       // Ninja Forms marks each empty required field individually (no
//       // single form-level "invalid" class like CF7), so check each
//       // field's own error state rather than one summary message.
//       for (const field of [contactForm.name, contactForm.email, contactForm.message]) {
//         await expect(form.locator(field)).toHaveAttribute('aria-invalid', 'true');
//       }

//       // NOTE: exact copy ("This field is required." or similar) hasn't
//       // been confirmed against the live site — asserting visibility +
//       // non-empty text here; tighten to an exact string once confirmed.
//       const nameError = page.locator(contactForm.errorFor(1));
//       await expect(nameError).toBeVisible();
//       await expect(nameError).not.toHaveText('');
//     });

//     test('shows an invalid-email error for a malformed email address', async ({ page }) => {
//       const form = page.locator(contactForm.form);

//       await form.locator(contactForm.name).fill('Testing');
//       await form.locator(contactForm.email).fill('not-an-email');
//       await form.locator(contactForm.submit).click();

//       await expect(form.locator(contactForm.email)).toHaveAttribute('aria-invalid', 'true');

//       // NOTE: exact copy unconfirmed — see comment above.
//       const emailError = page.locator(contactForm.errorFor(2));
//       await expect(emailError).toBeVisible();
//       await expect(emailError).not.toHaveText('');
//     });

//     test('field-level errors clear once valid values are entered', async ({ page }) => {
//       const form = page.locator(contactForm.form);

//       // Trigger the empty-state errors first...
//       await form.locator(contactForm.submit).click();
//       await expect(form.locator(contactForm.name)).toHaveAttribute('aria-invalid', 'true');

//       // ...then confirm Ninja Forms' live validation clears them once the
//       // fields hold valid values. We stop here rather than submitting —
//       // this suite checks the form's validation behaviour survives a
//       // plugin update, not the mail-delivery pipeline.
//       await form.locator(contactForm.name).fill('Testing');
//       await form.locator(contactForm.email).fill(TEST_SENDER_EMAIL);
//       await form.locator(contactForm.message).fill('Monthly Maintenance Regression Test');

//       await expect(form.locator(contactForm.name)).toHaveAttribute('aria-invalid', 'false');
//       await expect(form.locator(contactForm.email)).toHaveAttribute('aria-invalid', 'false');
//     });
//   });

//   test.describe('Happy path', () => {
//     const runHappyPath = process.env.RUN_HAPPY_PATH === '1';
//     // Sends a real form submission to the swapped (test) recipient — off
//     // by default so a routine regression run never touches the form's real
//     // destination.
//     test.skip(
//       !runHappyPath,
//       'Enable with RUN_HAPPY_PATH=1 to submit a real form entry.'
//     );

//     test.beforeEach(async ({ page }) => {
//       await page.goto('/contact-us', { waitUntil: 'domcontentloaded' });
//       await page.locator(contactForm.form).scrollIntoViewIfNeeded();
//     });

//     test('submits successfully with valid values', async ({ page }) => {
//       const form = page.locator(contactForm.form);

//       await form.locator(contactForm.name).fill('Testing');
//       await form.locator(contactForm.email).fill(TEST_SENDER_EMAIL);
//       await form.locator(contactForm.message).fill('Monthly Maintenance Regression Test');

//       // The submit button starts disabled in the page's initial markup;
//       // Playwright's click() auto-waits for it to become enabled once
//       // Ninja Forms' client-side validation passes.
//       await form.locator(contactForm.submit).click();

//       // NOTE: exact success copy unconfirmed against the live site —
//       // tighten this to the configured success message once confirmed.
//       await expect(page.locator(contactForm.responseOutput)).toBeVisible();
//     });
//   });
// });