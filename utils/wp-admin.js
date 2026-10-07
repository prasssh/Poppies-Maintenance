// import { expect } from '@playwright/test';

// /**
//  * WordPress admin helpers used to temporarily swap the Ninja Forms
//  * recipient for the duration of the contact-form suite and restore it
//  * afterwards.
//  *
//  * @param {import('@playwright/test').Page} page
//  */

// // `reauth=1` forces the login form even if a stale wp-admin session
// // cookie is already present, so beforeAll always starts from a clean
// // credentials prompt.
// export const ADMIN_LOGIN_URL = '/wp-login.php?reauth=1';

// // Ninja Forms form 1 editor.
// export const CONTACT_FORM_EDIT_URL =
//   '/wp-admin/admin.php?page=ninja-forms&form_id=1#';

// export async function createAdminContext(browser) {
//   return browser.newContext();
// }

// export async function loginAsAdmin(page) {
//   await page.goto(ADMIN_LOGIN_URL, { waitUntil: 'domcontentloaded' });
//   await page.locator('#user_login').fill(process.env.WP_ADMIN_USER);
//   await page.locator('#user_pass').fill(process.env.WP_ADMIN_PASS);
//   await page.locator('#wp-submit').click();
//   // The admin bar is only rendered for authenticated sessions.
//   await expect(page.locator('#wpadminbar')).toBeVisible();
// }

// export async function openContactFormMailTab(page) {
//   await page.goto(CONTACT_FORM_EDIT_URL, { waitUntil: 'domcontentloaded' });
//   await page.locator('.nf-edit-settings.fa.fa-cog').click();
//   await expect(page.locator('#to')).toBeVisible();
// }

// export async function setContactFormRecipient(page, email) {
//   const recipientField = page.locator('#to');
//   await recipientField.fill('');
//   await recipientField.fill(email);
//   await expect(recipientField).toHaveValue(email);

//   // "Done" only closes the settings drawer and stages the change in the
//   // form builder — it does not persist it. The change only goes live
//   // once "Publish" is clicked, so both steps are required here.
//   await closeSettingsDrawer(page);
//   await publishForm(page);
// }

// export async function getContactFormRecipient(page) {
//   const recipientField = page.locator('#to');
//   await expect(recipientField).toBeVisible();
//   return recipientField.inputValue();
// }

// export async function closeSettingsDrawer(page) {
//   await page.locator('[data-testid="nf-drawer-done"]').click();
// }

// export async function publishForm(page) {
//   const publishButton = page.locator('[data-testid="nf-publish"]');
//   await publishButton.click();

//   // After a successful publish, Ninja Forms has nothing left to save and
//   // the button reverts to its "disabled" (no pending changes) state —
//   // wait for that so beforeAll/afterAll don't race the save request.
//   await expect(publishButton).toHaveClass(/disabled/);
// }