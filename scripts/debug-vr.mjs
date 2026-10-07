import { chromium } from '@playwright/test';
import { triggerLazyImages } from '../utils/lazy-load.js';
import { pauseSliders, stabilizePageForScreenshot } from '../utils/flaky-elements.js';

const url = process.argv[2] || 'https://poppies.us';
const out = process.argv[3] || 'debug1.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route(/typenetwork\.com/, (route) => route.abort());
await page.goto(url, { waitUntil: 'load' });
const acceptButton = page.locator('.cmplz-accept, [class*="cmplz"] button:has-text("Accept")');
if (await acceptButton.count()) {
  await acceptButton.first().click({ timeout: 5000 }).catch(() => {});
}
await triggerLazyImages(page);
await pauseSliders(page);
console.log('before stabilize:', await page.evaluate(() => ({
  scrollH: document.documentElement.scrollHeight,
  headerPos: [...document.querySelectorAll('header, .elementor-top-section')].map(el => getComputedStyle(el).position),
})));
await stabilizePageForScreenshot(page);
console.log('after stabilize:', await page.evaluate(() => ({
  scrollH: document.documentElement.scrollHeight,
  headerPos: [...document.querySelectorAll('header, .elementor-top-section')].map(el => getComputedStyle(el).position),
})));
await pauseSliders(page);
await page.waitForTimeout(300);
const info = await page.evaluate(() => ({
  scrollHeight: document.documentElement.scrollHeight,
  bodyHeight: document.body.scrollHeight,
  swipers: [...document.querySelectorAll('.swiper')].map(s => ({ cls: s.className.slice(0,40), realIndex: s.swiper?.realIndex, autoplay: !!s.swiper?.params?.autoplay, offsetH: s.offsetHeight })),
  fixed: [...document.querySelectorAll('*')].filter(el => ['fixed','sticky'].includes(getComputedStyle(el).position)).map(el => el.className.toString().slice(0,40)),
}));
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: out, fullPage: true });
await browser.close();
