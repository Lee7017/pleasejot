import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review/motion'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }
try {
  for (const width of [320, 390, 768, 1440]) {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme, reducedMotion: 'no-preference' })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(origin, { waitUntil: 'networkidle' })
      await page.locator('.pj-motion-ready').waitFor()
      assert(await page.locator('h1').innerText().then(t => t.replace(/\s/g,'').includes('让每份记录，成为自己的资产')), 'title text missing')
      assert(await page.locator('.pj-title-char').first().evaluate(el => getComputedStyle(el).animationName === 'pj-char-in'), 'title animation missing')
      await page.waitForTimeout(1200)
      await page.screenshot({ path: output + '/' + width + '-' + colorScheme + '-home.png', animations: 'disabled' })
      for (const feature of await page.locator('.feature-visual').all()) {
        await feature.scrollIntoViewIfNeeded()
        await feature.evaluate(el => el.scrollIntoView({block:'center',behavior:'instant'}))
        await feature.locator('xpath=self::*[contains(@class,"pj-entered")]').waitFor()
        await page.waitForTimeout(800)
      }
      await page.screenshot({ path: output + '/' + width + '-' + colorScheme + '-feature.png', animations: 'disabled' })
      assert(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 2), 'horizontal overflow ' + width)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => !document.querySelector('.pj-motion-ready'))
      assert(await page.locator('.pj-title-char').first().evaluate(el => getComputedStyle(el).opacity === '1' && getComputedStyle(el).animationName === 'none'), 'reduced motion did not stop animation')
      assert(errors.length === 0, errors.join(' | '))
      await page.close()
    }
  }
  console.log('MOTION_REGRESSION_PASSED')
} finally { await browser.close() }
