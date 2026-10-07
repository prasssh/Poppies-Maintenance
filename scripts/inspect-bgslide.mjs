import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route(/typenetwork\.com/, (route) => route.abort());
await page.goto('https://poppies.us', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const el = document.querySelector('.elementor-background-slideshow');
  if (!el) return { found: false };
  return {
    found: true,
    childClasses: [...el.children].map(c => c.className.split(' ')[0] + ':' + c.children.length),
    html: el.outerHTML.slice(0, 500),
    swiperSlides: el.querySelectorAll('.swiper-slide').length,
    dataAttrs: el.getAttributeNames().map(n => n + '=' + el.getAttribute(n)),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
