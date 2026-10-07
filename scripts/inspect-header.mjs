import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://poppies.us', { waitUntil: 'load' });
await page.waitForTimeout(2000);

// Find ALL elements with position fixed or sticky
const fixedEls = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.position === 'sticky') {
      const r = el.getBoundingClientRect();
      out.push({
        tag: el.tagName,
        className: typeof el.className === 'string' ? el.className : '',
        id: el.id,
        position: cs.position,
        zIndex: cs.zIndex,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      });
    }
  });
  return out;
});
console.log('All fixed/sticky elements:');
console.log(JSON.stringify(fixedEls, null, 2));

// What is the header element? Look for the logo text
const headerHTML = await page.evaluate(() => {
  // Find element containing "WHERE TO BUY" nav
  const nav = Array.from(document.querySelectorAll('a')).find((a) => a.textContent.trim() === 'WHERE TO BUY');
  if (!nav) return 'nav not found';
  let el = nav;
  const chain = [];
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    chain.push({
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className : '',
      id: el.id,
      position: cs.position,
      top: cs.top,
    });
    el = el.parentElement;
  }
  return chain;
});
console.log('Ancestor chain of WHERE TO BUY nav:');
console.log(JSON.stringify(headerHTML, null, 2));

await browser.close();
