import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review/complex-motion'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const assert = (ok, message) => { if (!ok) throw new Error(message) }

try {
  for (const width of [320, 390, 768, 1440]) {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        colorScheme,
        reducedMotion: 'no-preference'
      })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(origin, { waitUntil: 'networkidle' })
      await page.locator('.platform-strip').waitFor()
      await page.waitForTimeout(250)

      const layout = await page.evaluate(() => {
        const features = [...document.querySelectorAll('.feature-section')]
        const platformItems = [...document.querySelectorAll('.platform-item')]
        const style = element => {
          const css = getComputedStyle(element)
          return {
            background: css.backgroundColor,
            radius: css.borderRadius,
            shadow: css.boxShadow,
            borderWidth: css.borderTopWidth
          }
        }
        const flatSurfaces = [
          ...document.querySelectorAll('.feature-visual, .sync-device, .tree-card, .super-document, .super-cards > div')
        ].map(style)
        return {
          featureCount: features.length,
          featureTops: features.map(element => Math.round(element.getBoundingClientRect().top + scrollY)),
          platformCount: platformItems.length,
          platformText: document.querySelector('.platform-strip')?.textContent || '',
          stackCount: document.querySelectorAll('.pj-stack, .pj-stack-active').length,
          carouselCount: document.querySelectorAll('.pj-carousel').length,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          flatSurfaces,
          platformColumns: getComputedStyle(document.querySelector('.platform-strip-list')).gridTemplateColumns
        }
      })

      assert(layout.featureCount === 3, 'expected three feature sections: ' + JSON.stringify(layout))
      assert(layout.platformCount === 5, 'expected five platform entries: ' + JSON.stringify(layout))
      assert(/Windows/.test(layout.platformText) && /macOS/.test(layout.platformText) &&
        /Android/.test(layout.platformText) && /iOS/.test(layout.platformText) &&
        /iPadOS/.test(layout.platformText), 'platform labels are incomplete')
      assert(layout.stackCount === 0, 'obsolete stacked feature cards remain')
      assert(layout.carouselCount === 0, 'obsolete platform carousel remains')
      assert(layout.overflow <= 2, 'horizontal overflow at ' + width + ': ' + layout.overflow)
      assert(layout.featureTops.every((top, index, all) => index === 0 || top > all[index - 1]),
        'feature sections are not in normal document flow: ' + JSON.stringify(layout.featureTops))
      assert(layout.flatSurfaces.length >= 10, 'feature examples are missing')
      assert(layout.flatSurfaces.every(surface =>
        surface.background === 'rgba(0, 0, 0, 0)' &&
        surface.radius === '0px' &&
        surface.shadow === 'none' &&
        surface.borderWidth === '0px'
      ), 'small feature panels are still styled as cards: ' + JSON.stringify(layout.flatSurfaces))

      await page.screenshot({
        path: path.join(output, width + '-' + colorScheme + '-home.png'),
        fullPage: true,
        animations: 'disabled'
      })
      await page.locator('.section-intro').scrollIntoViewIfNeeded()
      await page.screenshot({
        path: path.join(output, width + '-' + colorScheme + '-features.png'),
        animations: 'disabled'
      })

      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => !document.querySelector('.pj-motion-ready'))
      assert(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 2),
        'horizontal overflow after reduced motion')
      assert(errors.length === 0, 'JavaScript errors: ' + errors.join(' | '))
      await page.close()
    }
  }
  console.log('COMPLEX_MOTION_REGRESSION_PASSED')
} finally {
  await browser.close()
}
