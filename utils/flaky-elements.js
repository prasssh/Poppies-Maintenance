/**
 * Disable sliders and snap them to the first slide so the leadspace
 * renders a deterministic first-image frame. Selector for the first
 * slider image: `.elementor-slides-wrapper .swiper-slide:not(.swiper-slide-duplicate)`
 * (first match in DOM), whose background lives on its `.swiper-slide-bg`
 * child — equivalently `.elementor-slides-wrapper .swiper-slide-active
 * .swiper-slide-bg` once the slider has been parked on slide one.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function pauseSliders(page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('.swiper, .swiper-container')) {
      const swiper = element.swiper || element.querySelector('.swiper')?.swiper;
      if (!swiper) continue;

      swiper.autoplay?.stop();
      // Neutralise autoplay both in the live params object and by
      // replacing the param, so Elementor's frontend can't restart the
      // timer from either place.
      if (swiper.params) {
        if (swiper.params.autoplay && typeof swiper.params.autoplay === 'object') {
          swiper.params.autoplay.enabled = false;
        }
        swiper.params.autoplay = false;
      }
      swiper.allowTouchMove = false;
      swiper.setTransition?.(0);
      swiper.wrapperEl?.style.setProperty('transition-duration', '0ms');

      // Snap back to the first slide so the screenshot is deterministic.
      try {
        if (swiper.params?.loop) {
          swiper.slideToLoop(0, 0);
        } else {
          swiper.slideTo(0, 0);
        }
      } catch {
        // Some widget variants don't expose slideTo — the autoplay stop
        // above is enough to keep whatever frame is showing from moving.
      }
    }
  });

  // Some instances need a beat after slideTo to settle on realIndex 0;
  // nudge any that didn't land there back to the first slide. Hidden,
  // zero-size cloned sliders can't slideTo without layout — they're not
  // painted, so their stale index is invisible anyway.
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('.swiper, .swiper-container')) {
      const swiper = element.swiper || element.querySelector('.swiper')?.swiper;
      if (!swiper) continue;
      if (swiper.realIndex === 0) continue;
      if (swiper.el && swiper.el.offsetWidth === 0) continue;
      try {
        if (swiper.params?.loop) {
          swiper.slideToLoop(0, 0);
        } else {
          swiper.slideTo(0, 0);
        }
      } catch {
        /* ignore */
      }
    }
  });

  // One more pass after a paint beat so the first-slide frame has
  // actually been composited before the screenshot is taken.
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('.swiper, .swiper-container')) {
      const swiper = element.swiper || element.querySelector('.swiper')?.swiper;
      if (!swiper) continue;
      if (swiper.realIndex === 0) continue;
      if (swiper.el && swiper.el.offsetWidth === 0) continue;
      try {
        if (swiper.params?.loop) {
          swiper.slideToLoop(0, 0);
        } else {
          swiper.slideTo(0, 0);
        }
      } catch {
        /* ignore */
      }
    }
  });
}

/**
 * A full-page screenshot stitches segments captured as the page (or the
 * expanded viewport) scrolls. Elements with `position: fixed`/`sticky`
 * (the site's header) get repainted at their live viewport position, so
 * they can end up mid-page or repeated in the capture instead of once at
 * the top. Pin them into normal flow at the document top so they appear
 * exactly once, stuck to the top of the screenshot.
 *
 * It also hides dismissed cookie-consent leftovers, so nothing fixed
 * floats across the bottom of the page, and then scrolls back to the top
 * of the document so the full-page capture starts from a clean origin.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function stabilizePageForScreenshot(page) {
  // Elementor only applies its sticky/fixed positioning once its frontend
  // init has run and it has written inline styles — and for some pages only
  // after the user scrolls. Scroll through the page once so any sticky
  // header is activated before we sample positions.
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
  });

  // Then poll until fixed/sticky elements have been tagged (or it becomes
  // clear the page has none) before proceeding.
  try {
    await page.waitForFunction(() => {
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.position === 'sticky') return true;
      }
      return false;
    }, null, { timeout: 2000 });
  } catch {
    /* ok to proceed */
  }

  await page.evaluate(() => {
    // Locate everything that is currently fixed or sticky — computed style,
    // so we catch both inline-style positioning (Elementor's sticky JS) and
    // class-based positioning (`.elementor-sticky--active`).
    const targets = [];
    const hidden = [];

    // Elementor's sticky JS inserts a header-sized `.elementor-sticky__spacer`
    // clone to hold the header's place once it goes fixed. Since we pull the
    // header back into normal flow, that spacer would double the header
    // height (+~127px) on runs where the sticky JS initialised in time.
    document.querySelectorAll('.elementor-sticky__spacer').forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });

    document.querySelectorAll('*').forEach((el) => {
      if (el.classList.contains('elementor-sticky__spacer')) return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      // Off-canvas menu/panel sections that are `visibility: hidden` (e.g.
      // closed mobile nav) still occupy viewport-sized layout once they're
      // pulled into normal flow — throw a false full-page region for the
      // capture. Just display:none them.
      if (cs.visibility === 'hidden') {
        hidden.push(el);
        return;
      }
      targets.push(el);
    });

    // Force-include the site's sticky header sections even if Elementor
    // hasn't flipped them to fixed/sticky yet at sampling time. Converting
    // a still-static header to `position: relative` is layout-neutral, and
    // it guarantees the header always renders exactly once, in flow, in
    // the capture — instead of the element (or not) being fixed/sticky
    // depending on a timing race.
    document
      .querySelectorAll('.elementor-top-section, header, [id*="header"], .elementor-sticky')
      .forEach((el) => {
        if (el.classList.contains('elementor-sticky__spacer')) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden') return;
        if (!targets.includes(el)) targets.push(el);
      });

    for (const el of hidden) {
      el.style.setProperty('display', 'none', 'important');
    }

    const beforeTargets = targets.map((t) => ({ st: t.style.position, cls: String(t.className||'').slice(0, 30) }));

    // (a) Directly override with inline !important (beats class !important),
    for (const el of targets) {
      el.style.cssText = 'position: relative !important; top: auto !important; bottom: auto !important; left: auto !important; right: auto !important;';
    }

    const targetsCheck = [];
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'sticky') {
        targetsCheck.push(el);
      }
    });
    const stillFixed = targetsCheck.length;

    console.log('STAB', JSON.stringify({ before: beforeTargets, hidden: hidden.length, after: targets.map((t) => t.style.position), stillFixed, stillFixedIds: targetsCheck.map(t => String(t.className||'').slice(0,40)) }));

    // (b) Build a stylesheet keyed off the elements' current id/class so
    // that later inline-style churn by Elementor's sticky handler still
    // loses to this. Pulling the header back into normal flow makes it
    // render exactly once, stuck to the very top of the capture.
    const selectors = [
      'header',
      '.elementor-top-section',
      '.elementor-sticky',
      '[id*="header"]',
    ];
    for (const el of targets) {
      if (el.id) selectors.push(`#${CSS.escape(el.id)}`);
      if (el.classList?.length) {
        const classes = Array.from(el.classList).map((c) => `.${CSS.escape(c)}`).join('');
        selectors.push(`${el.tagName.toLowerCase()}${classes}`);
      }
    }
    if (selectors.length) {
      const style = document.createElement('style');
      style.id = 'vr-stabilize';
      style.textContent = selectors
        .map((s) => `${s} { position: relative !important; top: auto !important; bottom: auto !important; }`)
        .join('\n');
      document.head.appendChild(style);
    }

    // Dismissed Complianz banners linger with transitions — hide them
    // outright so they can't clip or overlay content in the capture.
    const hideBanner = document.createElement('style');
    hideBanner.id = 'vr-hide-cookie';
    hideBanner.textContent = `.cmplz-cookiebanner, [id^="cmplz"], .elementor-sticky__spacer { display: none !important; }`;
    document.head.appendChild(hideBanner);

    window.scrollTo(0, 0);
  });

  // Fonts/consent/banners can finish swapping in after stabilization and
  // shift the document height by a few hundred px over the next second or
  // two — that's fatal to full-page screenshots. Wait for the document
  // height to stop moving before the screenshot is taken.
  await page.waitForFunction(() => {
    if (!window.__vrLastHeight) window.__vrLastHeight = -1;
    const h = document.documentElement.scrollHeight;
    if (h === window.__vrLastHeight) {
      window.__vrStableCount = (window.__vrStableCount || 0) + 1;
      if (window.__vrStableCount >= 4) return true; // ~500ms of stability
    } else {
      window.__vrStableCount = 0;
    }
    window.__vrLastHeight = h;
    return false;
  }, null, { timeout: 10_000, polling: 125 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
}
