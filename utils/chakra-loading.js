/**
 * Waits for the Chakra UI loading state to finish.
 * The `__chakra_env` span is present during loading and hidden/removed when ready.
 * We wait for it to either not exist or be hidden.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForChakraReady(page) {
  await page.waitForFunction(() => {
    const chakra = document.getElementById('__chakra_env');
    // Chakra is ready when the element doesn't exist or is hidden
    return !chakra || chakra.hidden || chakra.offsetParent === null;
  }, null, { timeout: 30000 });
}
