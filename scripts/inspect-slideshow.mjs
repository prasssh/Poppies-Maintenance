import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route(/typenetwork\.com/, (route) => route.abort());
await page.goto('https://poppies.us', { waitUntil: 'load' });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.elementor-background-slideshow')) {
    const slides = [...el.querySelectorAll('.swiper-slide')];
    const active = el.querySelectorAll('.swiper-slide-active');
    out.push({
      cls: el.className, slides: slides.length,
      activeIdx: slides.indexOf(active[0]),
      bg: active[0] ? getComputedStyle(active[0].querySelector('.swiper-slide-bg') || active[0]).backgroundImage.slice(0,80) : null,
      rect: el.getBoundingClientRect().toJSON(),
      hasSwiperProp: !!el.swiper,
      keys: Object.keys(el).filter(k => k.includes('swiper') || k.includes('elementor')),
    });
  }
  // hero section
  const hero = document.querySelector('.elementor-section, section');
  return { slideshows: out, heroRect: hero?.getBoundingClientRect().toJSON(), scrollH: document.documentElement.scrollHeight };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
