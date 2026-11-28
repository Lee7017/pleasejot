import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const failures = []
const findings = []

async function capture(page, filename, fullPage = true) {
  await page.screenshot({ path: path.join(output, filename), fullPage, animations: 'disabled' })
}

// Export compact desktop/mobile reference frames into log for remote visual review.
// The full-resolution PNG screenshots are retained separately as downloadable artifacts.
async function printReference(page, label) {
  const data = await page.screenshot({ type: 'jpeg', quality: 52, fullPage: false, animations: 'disabled' })
  const base64 = data.toString('base64')
  console.log('VISUAL_START:' + label)
  for (let i = 0; i < base64.length; i += 1600) console.log('VISUAL_PART:' + base64.slice(i, i + 1600))
  console.log('VISUAL_END:' + label)
}

for (const c of [
  { label: 'home-desktop', url: '', width: 1440, height: 900, mobile: false },
  { label: 'downloads-desktop', url: 'download/', width: 1440, height: 900, mobile: false },
  { label: 'home-mobile', url: '', width: 390, height: 844, mobile: true },
  { label: 'downloads-mobile', url: 'download/', width: 390, height: 844, mobile: true }
]) {
  const context = await browser.newContext({
    viewport: { width: c.width, height: c.height },
    deviceScaleFactor: 1,
    isMobile: c.mobile,
    hasTouch: c.mobile,
    reducedMotion: 'no-preference'
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', err => pageErrors.push(err.message))
  const response = await page.goto(new URL(c.url, origin).href, { waitUntil: 'networkidle', timeout: 45000 })
  await page.screenshot({ path: path.join(output, c.label + '.png'), fullPage: true, animations: 'disabled' })
  const check = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.textContent?.trim(),
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    pageOpacity: getComputedStyle(document.querySelector('.VPContent') || document.body).opacity,
    hiddenReveal: document.querySelectorAll('.motion-reveal:not(.is-revealed)').length,
    navCount: document.querySelectorAll('.VPNavBarMenuLink').length
  }))
  if (!response?.ok()) failures.push(c.label + ': HTTP ' + response?.status())
  if (!check.heading) failures.push(c.label + ': missing h1')
  if (check.overflow > 2) failures.push(c.label + ': horizontal overflow ' + check.overflow + 'px')
  if (check.hiddenReveal) failures.push(c.label + ': content hidden by reveal animation')
  if (pageErrors.length) failures.push(c.label + ': JS exceptions ' + pageErrors.join(' | '))
  findings.push({ page: c.label, ...check, pageErrors })
  if (c.label === 'home-desktop') {
    const button = page.locator('.landing-hero .xs-button.primary').first()
    const before = await button.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, transform: getComputedStyle(el).transform }))
    await button.hover()
    await page.waitForTimeout(220)
    const after = await button.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, transform: getComputedStyle(el).transform }))
    if (before.background === after.background) failures.push('primary button hover has no visible color change')
    if (after.transform !== 'none') failures.push('primary button hover unexpectedly moves')
    await capture(page, 'home-hover-desktop.png')
    findings.push({ component: 'primary-hover', before, after })
  }
  if (c.label === 'downloads-desktop' || c.label === 'downloads-mobile') {
    const iosCard = await page.evaluate(() => ({
      cardCount: document.querySelectorAll('.download-grid > .download-card').length,
      inlineSupport: !!document.querySelector('.download-grid > .ios-support-card'),
      supportCount: document.querySelectorAll('#ios-support').length,
      supportTitle: document.querySelector('.download-grid > .ios-support-card h2')?.textContent?.trim(),
      supportLink: document.querySelector('.download-grid > .ios-support-card a.ios-support-link')?.getAttribute('href'),
      linkInHeader: !!document.querySelector('.download-grid > .ios-support-card .ios-card-heading > a.ios-support-link'),
      supporterArea: !!document.querySelector('.download-grid > .ios-support-card .ios-carousel'),
      progressArea: !!document.querySelector('.download-grid > .ios-support-card .ios-progress-track'),
      refreshButtonCount: document.querySelectorAll('.download-grid > .ios-support-card .ios-refresh').length,
      removedCopyPresent: /已确认支持|手动刷新仅获取已发布的数据|自愿公开/.test(
        document.querySelector('.download-grid > .ios-support-card')?.textContent || ''),
      schedule: document.querySelector('.download-grid > .ios-support-card .ios-sync-line')?.textContent?.trim(),
      danmakuArea: !!document.querySelector('.download-grid > .ios-support-card .ios-danmaku-panel'),
      danmakuHeadingRemoved: !document.querySelector('.download-grid > .ios-support-card .ios-carousel h3'),
      linkIcon: !!document.querySelector('.download-grid > .ios-support-card .ios-support-link-arrow'),
      supportActionHeight: Math.round(document.querySelector('.download-grid > .ios-support-card .ios-support-link')?.getBoundingClientRect().height ?? 0),
      supportActionRadius: getComputedStyle(document.querySelector('.download-grid > .ios-support-card .ios-support-link')).borderRadius
    }))
    if (iosCard.cardCount !== 4 || !iosCard.inlineSupport || iosCard.supportCount !== 1)
      failures.push(c.label + ': iOS support must replace the fourth download card without an extra block')
    if (iosCard.supportTitle !== 'iOS 开发者支持计划' || !iosCard.supporterArea ||
        !iosCard.progressArea || !iosCard.danmakuArea || !iosCard.danmakuHeadingRemoved ||
        !iosCard.linkIcon || iosCard.supportActionHeight !== 32 || !iosCard.schedule?.includes('每隔数小时更新') ||
        !iosCard.linkInHeader || iosCard.refreshButtonCount !== 0 || iosCard.removedCopyPresent)
      failures.push(c.label + ': iOS support card is missing its required content')
    if (iosCard.supportLink !== 'https://afdian.com/item/d9aa8642e2b411f181af52540025c377')
      failures.push(c.label + ': iOS support link is incorrect')
    findings.push({ test: 'ios-support-in-grid-' + c.label, ...iosCard })
  }
  // 回归场景：OTA GitHub Raw 不可访问时，仍可经 OTA 仓库 Contents API 读取
  // 显示真实同步时间，而非误显示“尚未同步”。
  if (c.label === 'downloads-desktop' || c.label === 'downloads-mobile') {
    const fallbackContext = await browser.newContext({
      viewport: { width: c.width, height: c.height },
      isMobile: c.mobile, hasTouch: c.mobile
    })
    const fallbackPage = await fallbackContext.newPage()
    const sample = {
      status: 'live', target: 750, raised: 0, supporterCount: 0,
      syncedAt: '2026-11-19T08:32:36.729Z', supportUrl: null, supporters: []
    }
    await fallbackPage.route('**/raw.githubusercontent.com/Lee7017/pleasejot-ota/main/support/ios.json*',
      route => route.fulfill({ status: 503, body: 'Raw unavailable' }))
    await fallbackPage.route('**/api.github.com/repos/Lee7017/pleasejot-ota/contents/support/ios.json*',
      route => route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ encoding: 'base64', content: Buffer.from(JSON.stringify(sample)).toString('base64') })
      }))
    await fallbackPage.goto(new URL('download/', origin).href, { waitUntil: 'networkidle', timeout: 45000 })
    const fallbackText = await fallbackPage.locator('.ios-sync-line').innerText()
    const fallbackPercent = await fallbackPage.locator('.ios-funding-row strong').innerText()
    const fallbackError = await fallbackPage.locator('.ios-error').count()
    if (!fallbackText.includes('11/19 16:32') || !fallbackText.includes('每隔数小时更新') ||
        fallbackPercent !== '0.0%' || fallbackError !== 0)
      failures.push(c.label + ': GitHub API fallback failed: ' + JSON.stringify({
        fallbackText, fallbackPercent, fallbackError
      }))
    findings.push({ test: 'ios-api-fallback-' + c.label, fallbackText, fallbackPercent, fallbackError })
    await capture(fallbackPage, 'ios-api-fallback-' + (c.mobile ? 'mobile' : 'desktop') + '.png')
    await fallbackContext.close()

    if (!c.mobile) {
      const failedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const failedPage = await failedContext.newPage()
      await failedPage.route('**/raw.githubusercontent.com/Lee7017/pleasejot-ota/main/support/ios.json*',
        route => route.fulfill({ status: 503, body: 'Raw unavailable' }))
      await failedPage.route('**/api.github.com/repos/Lee7017/pleasejot-ota/contents/support/ios.json*',
        route => route.fulfill({ status: 503, body: 'API unavailable' }))
      await failedPage.goto(new URL('download/', origin).href, { waitUntil: 'networkidle', timeout: 45000 })
      const failureText = await failedPage.locator('.ios-sync').innerText()
      if (!failureText.includes('读取失败') || failureText.includes('最近同步：尚未同步'))
        failures.push('ios-support: unreadable data must show a real error: ' + failureText)
      findings.push({ test: 'ios-both-sources-unavailable', failureText })
      await capture(failedPage, 'ios-support-data-unavailable.png')
      await failedContext.close()
    }
  }
  // 仅在 Playwright 内模拟已授权公示的测试数据；不写入公开 JSON。
  // 检查桌面三行、手机两行，且同一轨道的弹幕不会叠在一起。
  if (c.label === 'downloads-desktop' || c.label === 'downloads-mobile') {
    const mock = {
      status: 'live', target: 750, raised: 99, supporterCount: 9,
      syncedAt: '2026-11-18T00:00:00.000Z', supportUrl: null,
      supporters: Array.from({ length: 9 }, (_, i) => ({
        name: '界面测试支持者' + (i + 1), amount: (i + 1) * 2.5
      }))
    }
    const preview = await browser.newContext({
      viewport: { width: c.width, height: c.height },
      deviceScaleFactor: 1,
      isMobile: c.mobile,
      hasTouch: c.mobile,
      colorScheme: c.mobile ? 'light' : 'dark'
    })
    const demoPage = await preview.newPage()
    await demoPage.route('**/api.github.com/repos/Lee7017/pleasejot-ota/contents/support/ios.json*',
      route => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ encoding: 'base64', content: Buffer.from(JSON.stringify(mock)).toString('base64') })
      }))
    await demoPage.goto(new URL('download/', origin).href, { waitUntil: 'networkidle', timeout: 45000 })
    const layoutSelector = c.mobile ? '.ios-danmaku-layout--mobile' : '.ios-danmaku-layout--desktop'
    const tracks = demoPage.locator(layoutSelector + ' .ios-danmaku-track')
    await tracks.first().waitFor({ timeout: 8000 })
    const geometry = await demoPage.evaluate((selector) => {
      const panel = document.querySelector('.ios-danmaku-panel')
      const tracks = [...document.querySelectorAll(selector + ' .ios-danmaku-track')]
      const items = [...document.querySelectorAll(selector + ' .ios-danmaku-batch:first-child .ios-danmaku-chip')]
      const groups = [...document.querySelectorAll(selector + ' .ios-danmaku-batch')]
      return {
        count: items.length,
        laneCount: tracks.length,
        panelHeight: Math.round(panel.getBoundingClientRect().height),
        animations: tracks.map(el => getComputedStyle(el).animationName),
        duplicateGroups: groups.length,
        titleRemoved: !document.querySelector('.ios-carousel h3'),
        supportLinkInHeader: !!document.querySelector('.ios-card-heading .ios-support-link'),
        supportActionHeight: Math.round(document.querySelector('.ios-support-link').getBoundingClientRect().height),
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        minGap: Math.min(...tracks.map(track => {
          const visibleChips = [...track.querySelectorAll('.ios-danmaku-chip')].map(x => x.getBoundingClientRect())
          return Math.min(...visibleChips.slice(1).map((r, index) => r.left - visibleChips[index].right))
        }))
      }
    }, layoutSelector)
    const firstTrack = tracks.first()
    const startX = (await firstTrack.boundingBox())?.x
    await demoPage.waitForTimeout(350)
    const endX = (await firstTrack.boundingBox())?.x
    if (geometry.count !== 9 || geometry.laneCount !== (c.mobile ? 2 : 3) ||
      !geometry.titleRemoved || !geometry.supportLinkInHeader ||
      geometry.supportActionHeight !== 32 || geometry.horizontalOverflow > 2 ||
      geometry.minGap < 6 || geometry.animations.some(name => !name.includes('ios-danmaku-flow')) ||
      !(typeof startX === 'number' && typeof endX === 'number' && endX < startX))
      failures.push(c.label + ': supporter danmaku failed horizontal layout, spacing, or movement')
    await demoPage.locator('.ios-support-card').screenshot({
      path: path.join(output, 'ios-danmaku-' + (c.mobile ? 'mobile' : 'desktop') + '.png'),
      animations: 'allow'
    })
    findings.push({ test: 'horizontal-supporter-danmaku-' + c.label, ...geometry, startX, endX })
    await preview.close()
  }
  if (c.label === 'downloads-desktop') {
    const expectedRepository = process.env.GITHUB_REPOSITORY || 'Lee7017/pleasejot'
    if (await page.getByText('下载链路测试 · PNG 图片').count()) failures.push('removed test-download block is still visible')
    if (await page.getByRole('link', { name: /下载测试图片/ }).count()) failures.push('removed test-download link is still visible')
    const releasesLink = page.getByRole('link', { name: /查看所有历史版本/ })
    if (await releasesLink.getAttribute('href') !== `https://github.com/${expectedRepository}/releases`)
      failures.push('releases link does not match current repository')
    const card = page.locator('.download-card').first()
    const transformBefore = await card.evaluate(el => getComputedStyle(el).transform)
    await card.hover()
    await page.waitForTimeout(220)
    const transformAfter = await card.evaluate(el => getComputedStyle(el).transform)
    if (transformBefore !== transformAfter) failures.push('non-clickable download card moves on hover')
    findings.push({ component: 'download-card', transformBefore, transformAfter })
    await capture(page, 'downloads-hover-desktop.png')
  }
  // 删除搜索后，不应出现搜索按钮、搜索弹窗或有宽度的搜索占位。
  const searchState = await page.evaluate(() => {
    const slot = document.querySelector('.VPNavBarSearch')
    return {
      buttonCount: document.querySelectorAll('.VPNavBarSearch button, .DocSearch-Button').length,
      dialogCount: document.querySelectorAll('.VPLocalSearchBox').length,
      slotVisible: !!slot && getComputedStyle(slot).display !== 'none',
      slotWidth: slot ? slot.getBoundingClientRect().width : 0
    }
  })
  if (searchState.buttonCount || searchState.dialogCount || searchState.slotVisible || searchState.slotWidth > 0)
    failures.push(c.label + ': search UI was not fully removed')
  findings.push({ test: 'search-removed-' + c.label, ...searchState })
  if (c.label === 'home-desktop') {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(180)
    if (await page.locator('.VPLocalSearchBox').count()) failures.push('desktop: Ctrl+K still opens search')
  }
  if (c.label === 'home-desktop') {
    // “关于”必须是链接，不能是悬浮即展开的下拉按钮。
    const about = page.locator('.VPNavBarMenu').getByRole('link', { name: '关于', exact: true })
    if (await about.count() !== 1) failures.push('desktop: 关于 is not a single link')
    else {
      await about.hover()
      await page.waitForTimeout(250)
      const groupCount = await page.locator('.VPNavBarMenuGroup').count()
      if (groupCount !== 0) failures.push('desktop: hovering about still opens a nav dropdown')
      await capture(page, 'about-nav-desktop-before-click.png', false)
      await about.click()
      await page.waitForURL(url => url.pathname.startsWith(new URL('about', origin).pathname), { timeout: 6000 })
      await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('关于 PleaseJot'), null, { timeout: 8000 })
      const heading = await page.locator('h1').first().textContent()
      const acknowledgements = await page.getByRole('link', { name: '开源致谢' }).count()
      const licenses = await page.getByRole('link', { name: '第三方许可证' }).count()
      if (!heading?.includes('关于 PleaseJot')) failures.push('desktop: about page heading is wrong')
      if (!acknowledgements || !licenses) failures.push('desktop: about page is missing related links')
      await capture(page, 'about-page-desktop.png')
      findings.push({ test: 'about-desktop', heading, acknowledgements, licenses, dropdownCount: groupCount })
    }
  }
  if (c.label === 'home-mobile') {
    const toggle = page.locator('.VPNavBarHamburger').first()
    await toggle.click()
    const link = page.locator('.VPNavScreen').getByRole('link', { name: '关于', exact: true })
    if (await link.count() !== 1) failures.push('mobile: 关于 is not a single link')
    else {
      await capture(page, 'about-nav-mobile-open.png', false)
      await link.click()
      await page.waitForURL(url => url.pathname.startsWith(new URL('about', origin).pathname), { timeout: 6000 })
      await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('关于 PleaseJot'), null, { timeout: 8000 })
      const heading = await page.locator('h1').first().textContent()
      if (!heading?.includes('关于 PleaseJot')) failures.push('mobile: about did not navigate')
      await capture(page, 'about-page-mobile.png')
      findings.push({ test: 'about-mobile', heading })
    }
  }
  if (c.label === 'home-desktop' || c.label === 'home-mobile') await printReference(page, c.label)
  if (c.label === 'downloads-desktop') await printReference(page, c.label)
  await context.close()
}

// 320/360/390px 真正检查左右文案保持同一行且都位于容器内。
for (const width of [320, 360, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: 800 }, isMobile: true, hasTouch: true
  })
  const page = await context.newPage()
  const sample = {
    status: 'live', target: 750, raised: 0, supporterCount: 0,
    syncedAt: '2026-11-19T08:32:36.729Z', supportUrl: null, supporters: []
  }
  await page.route('**/api.github.com/repos/Lee7017/pleasejot-ota/contents/support/ios.json*',
    route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ encoding: 'base64', content: Buffer.from(JSON.stringify(sample)).toString('base64') })
    }))
  await page.goto(new URL('download/', origin).href, { waitUntil: 'networkidle', timeout: 45000 })
  const metrics = await page.evaluate(() => {
    const row = document.querySelector('.ios-sync-line')
    if (!row) return null
    const left = row.querySelector('span')
    const right = row.querySelectorAll('span')[1]
    if (!left || !right) return null
    const outer = row.getBoundingClientRect()
    const a = left.getBoundingClientRect()
    const b = right.getBoundingClientRect()
    return {
      left: left.textContent?.trim(), right: right.textContent?.trim(),
      // 左右文案需保持同一行，比较垂直中心检查位置。
      sameRow: Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) < 2,
      fitsWithinCard: a.left >= outer.left - 1 && b.right <= outer.right + 1,
      documentOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      rowWidth: Math.round(outer.width), contentWidth: Math.round(a.width + b.width),
      nowrap: getComputedStyle(row).flexWrap === 'nowrap'
    }
  })
  if (!metrics || metrics.left !== '最近同步：11/19 16:32' ||
      metrics.right !== '每隔数小时更新' || !metrics.sameRow ||
      !metrics.fitsWithinCard || metrics.documentOverflow > 2 || !metrics.nowrap)
    failures.push('ios-sync-' + width + ': must stay on one line: ' + JSON.stringify(metrics))
  findings.push({ test: 'ios-sync-single-line-' + width, ...metrics })
  await capture(page, 'ios-sync-single-line-' + width + '.png')
  await context.close()
}

// 全站一致性检查：包括深/浅色、首页/下载/演示/截图/文档/日志/关于/许可证，
// 以及三项不同操作在桌面和手机上是否具有相同的尺寸、圆角和对齐方式。
for (const c of [
  { label: 'home-dark-desktop', url: '', width: 1440, height: 900, theme: 'dark' },
  { label: 'home-light-desktop', url: '', width: 1440, height: 900, theme: 'light' },
  { label: 'home-dark-mobile', url: '', width: 390, height: 844, theme: 'dark' },
  { label: 'home-light-mobile', url: '', width: 390, height: 844, theme: 'light' },
  { label: 'home-light-tablet', url: '', width: 768, height: 1024, theme: 'light' },
  { label: 'download-dark-desktop', url: 'download/', width: 1440, height: 900, theme: 'dark' },
  { label: 'download-light-mobile', url: 'download/', width: 390, height: 844, theme: 'light' },
  { label: 'demo-dark-desktop', url: 'demo/', width: 1440, height: 900, theme: 'dark' },
  { label: 'demo-light-mobile', url: 'demo/', width: 390, height: 844, theme: 'light' },
  { label: 'screenshots-dark-desktop', url: 'screenshots/', width: 1440, height: 900, theme: 'dark' },
  { label: 'screenshots-light-mobile', url: 'screenshots/', width: 390, height: 844, theme: 'light' },
  { label: 'guide-dark-desktop', url: 'guide/', width: 1440, height: 900, theme: 'dark' },
  { label: 'guide-light-mobile', url: 'guide/', width: 390, height: 844, theme: 'light' },
  { label: 'changelog-dark-desktop', url: 'changelog/', width: 1440, height: 900, theme: 'dark' },
  { label: 'about-light-desktop', url: 'about/', width: 1440, height: 900, theme: 'light' },
  { label: 'acknowledgements-light-desktop', url: 'acknowledgements/', width: 1440, height: 900, theme: 'light' },
  { label: 'licenses-dark-desktop', url: 'licenses/', width: 1440, height: 900, theme: 'dark' },
  { label: 'faq-light-mobile', url: 'guide/faq.html', width: 390, height: 844, theme: 'light' }
]) {
  const context = await browser.newContext({
    viewport: { width: c.width, height: c.height },
    colorScheme: c.theme,
    deviceScaleFactor: 1,
    isMobile: c.width <= 390,
    hasTouch: c.width <= 390
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const response = await page.goto(new URL(c.url, origin).href, { waitUntil: 'networkidle', timeout: 45000 })
  const metrics = await page.evaluate(() => {
    const el = document.documentElement
    const buttons = [...document.querySelectorAll('.xs-button')]
      .map(x => ({ text: x.textContent.trim(), width: x.getBoundingClientRect().width,
        height: x.getBoundingClientRect().height, radius: getComputedStyle(x).borderRadius }))
    return { title: document.title, heading: document.querySelector('h1')?.textContent?.trim(),
      overflow: Math.max(0, el.scrollWidth - window.innerWidth),
      buttons, theme: el.classList.contains('dark') ? 'dark' : 'light',
      searchVisible: !!document.querySelector('.VPNavBarSearch') && getComputedStyle(document.querySelector('.VPNavBarSearch')).display !== 'none',
      copyright: document.querySelector('.VPFooter .copyright')?.textContent?.trim() ?? '',
      footerVisible: !!document.querySelector('.VPFooter') && getComputedStyle(document.querySelector('.VPFooter')).display !== 'none',
      brandTitle: document.querySelector('.VPNavBarTitle')?.textContent?.trim() ?? '',
      metaDescription: document.querySelector('meta[name="description"]')?.content ?? ''

    }
  })
  if (!response?.ok()) failures.push(c.label + ': HTTP ' + response?.status())
  if (!metrics.heading) failures.push(c.label + ': missing page title')
  if (metrics.overflow > 2) failures.push(c.label + ': horizontal overflow ' + metrics.overflow)
  if (metrics.searchVisible) failures.push(c.label + ': removed search is visible')
  if (!metrics.brandTitle.includes('PleaseJot') || !metrics.title.includes('PleaseJot'))
    failures.push(c.label + ': missing PleaseJot branding in header or title')
  if (!metrics.footerVisible || metrics.copyright !== 'Copyright © 2026 PleaseJot. All rights reserved.')
    failures.push(c.label + ': copyright footer missing, hidden, or incorrect')
  if (metrics.theme !== c.theme) failures.push(c.label + ': mismatched color theme ' + metrics.theme)
  if (errors.length) failures.push(c.label + ': JS errors ' + errors.join(' | '))
  for (const b of metrics.buttons) {
    if (b.height < 45 || b.height > 49) failures.push(c.label + ': button height inconsistent: ' + b.text + '=' + b.height)
    if (b.radius !== '12px') failures.push(c.label + ': button corner radius inconsistent: ' + b.text + '=' + b.radius)
  }
  if (c.label.startsWith('home')) {
    if (await page.locator('.final-cta').count())
      failures.push(c.label + ': obsolete home final CTA still exists')
    if (await page.getByText('开始使用 PleaseJot', { exact: true }).count())
      failures.push(c.label + ': obsolete bottom CTA heading still exists')
    if (await page.locator('.landing-hero .hero-actions a').count() !== 2)
      failures.push(c.label + ': primary home download/demo links are missing')
  }
  if (c.label === 'download-dark-desktop') {
    const rows = await page.evaluate(() => {
      const grid = document.querySelector('.download-grid')
      const items = [...(grid?.querySelectorAll(':scope > .download-card:not(.ios-support-card)') || [])]
      return {
        display: grid ? getComputedStyle(grid).display : '',
        direction: grid ? getComputedStyle(grid).flexDirection : '',
        count: items.length,
        rows: items.map(el => ({
          background: getComputedStyle(el).backgroundColor,
          radius: getComputedStyle(el).borderRadius,
          actionCount: el.querySelectorAll('.download-action').length,
          actionHeight: Math.round(el.querySelector('.download-action')?.getBoundingClientRect().height || 0),
          borderBottom: getComputedStyle(el).borderBottomStyle
        }))
      }
    })
    if (rows.display !== 'flex' || rows.direction !== 'column' || rows.count !== 3 ||
        rows.rows.some(row => row.background !== 'rgba(0, 0, 0, 0)' ||
          row.radius !== '0px' || row.actionCount !== 1 || row.borderBottom !== 'solid'))
      failures.push('download-desktop: platform downloads are not displayed as flat list rows ' + JSON.stringify(rows))
    findings.push({ page: c.label, test: 'download-row-layout', ...rows })
  }
  if (['home-dark-desktop','home-light-mobile','download-dark-desktop','demo-dark-desktop',
    'screenshots-dark-desktop','guide-dark-desktop','changelog-dark-desktop'].includes(c.label))
    await capture(page, 'site-' + c.label + '.png', true)
  findings.push({ page: c.label, test: 'layout-review', heading: metrics.heading, overflow: metrics.overflow,
    buttons: metrics.buttons.length, theme: metrics.theme, footerVisible: metrics.footerVisible,
    copyright: metrics.copyright, brandTitle: metrics.brandTitle, pageErrors: errors })
  await context.close()
}

// 内测邀请码：精简界面，不显示操作步骤/短信预览/复制号码，保留短信正文复制和发送链接。
for (const item of [
  { label: 'invite-desktop-light', width: 1440, height: 900, theme: 'light' },
  { label: 'invite-desktop-dark', width: 1440, height: 900, theme: 'dark' },
  { label: 'invite-mobile-320-light', width: 320, height: 720, theme: 'light' },
  { label: 'invite-mobile-360-light', width: 360, height: 780, theme: 'light' },
  { label: 'invite-mobile-light', width: 390, height: 844, theme: 'light' },
  { label: 'invite-mobile-dark', width: 390, height: 844, theme: 'dark' },
  { label: 'invite-mobile-430-light', width: 430, height: 932, theme: 'light' }
]) {
  const ctx = await browser.newContext({
    viewport: { width: item.width, height: item.height }, colorScheme: item.theme,
    isMobile: item.width < 500, hasTouch: item.width < 500,
    permissions: ['clipboard-read', 'clipboard-write']
  })
  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', err => pageErrors.push(err.message))
  const response = await page.goto(new URL('invite/', origin).href, { waitUntil: 'networkidle' })
  if (!response?.ok()) failures.push(item.label + ': invite page HTTP ' + response?.status())
  const instructions = page.locator('.invite-panel')
  const content = await instructions.textContent()
  const desktopHint = page.locator('.invite-desktop-hint')
  if (item.width > 680) {
    if (!(await desktopHint.isVisible()) ||
        !(await desktopHint.textContent())?.includes('请在手机上打开本页面'))
      failures.push(item.label + ': desktop must show SMS-on-phone advice before actions')
  } else if (await desktopHint.isVisible()) {
    failures.push(item.label + ': desktop-only SMS hint appears on mobile')
  }
  if (await instructions.getByText('通过短信申请', { exact: true }).count() ||
      await instructions.getByText('短信由你本人确认发送').count())
    failures.push(item.label + ': removed explanatory heading remains')
  if (await page.locator('.invite-page .page-intro .eyebrow, .invite-panel-icon').count())
    failures.push(item.label + ': removed invitation label or heading icon remains')
  if (await page.getByText('填写手机号和昵称，通过手机短信向 PleaseJot 申请邀请码；可选填一段说明。').count())
    failures.push(item.label + ': removed top explanatory text remains')
  for (const word of ['昵称', '手机号', '13231226535', '可选说明']) {
    if (!content?.includes(word)) failures.push(item.label + ': missing instruction ' + word)
  }
  if (await instructions.locator('[data-mailto], a[href^="mailto:"], input[type="email"]').count())
    failures.push(item.label + ': obsolete email entry remains')
  if (await instructions.getByText('系统支持时会尝试带入短信内容').count() ||
      await instructions.getByText('官网不保存手机号、昵称或说明').count() ||
      await instructions.locator('.invite-privacy').count())
    failures.push(item.label + ': removed explanatory text remains')
  const smsButton = page.locator('.invite-sms-actions a')
  if ((await smsButton.getAttribute('href')) !== null)
    failures.push(item.label + ': SMS action should be disabled before required fields')
  if (await page.locator('.invite-steps, .invite-sms-preview').count())
    failures.push(item.label + ': removed instructions or SMS preview still exists')
  if (await page.getByText('短信内容预览', { exact: true }).count())
    failures.push(item.label + ': removed SMS preview heading still exists')
  if (await page.getByRole('button', { name: '复制号码' }).count())
    failures.push(item.label + ': removed phone copy button still exists')
  if (!(await instructions.getByText('13231226535').count()))
    failures.push(item.label + ': recipient number must remain visible')

  if (item.width < 500) await capture(page, item.label + '-empty.png', true)
  await page.getByLabel('手机号 必填').fill('13800123456')
  await page.getByLabel('昵称 必填').fill('测试用户')
  const expectedBasic = 'PleaseJot 内测邀请码申请\\n手机号：13800123456\\n昵称：测试用户'.replaceAll('\\n', '\n')
  const hrefBasic = await smsButton.getAttribute('href')
  if (!hrefBasic?.startsWith('sms:13231226535?body=') ||
    decodeURIComponent((hrefBasic.split('?body=')[1] || '')) !== expectedBasic)
    failures.push(item.label + ': generated SMS recipient/body mismatch')
  await page.getByLabel('可选说明').fill('希望优先体验局域网同步')
  const fullBody = expectedBasic + '\n说明：希望优先体验局域网同步'
  await page.getByRole('button', { name: '复制短信内容' }).click()
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== fullBody)
    failures.push(item.label + ': SMS content copy mismatch')
  await page.getByLabel('手机号 必填').fill('13900001111')
  if (!(await page.getByRole('button', { name: '复制短信内容' }).count()))
    failures.push(item.label + ': copy state not reset on input')
  await page.getByRole('button', { name: '复制短信内容' }).click()
  const updatedBody = fullBody.replace('13800123456', '13900001111')
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== updatedBody)
    failures.push(item.label + ': copied SMS message failed to refresh')
  const layout = await page.evaluate(() => ({
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    title: document.querySelector('h1')?.textContent?.trim(),
    buttons: [...document.querySelectorAll('.invite-panel .xs-button')].map(el => ({
      height: Math.round(el.getBoundingClientRect().height), corners: getComputedStyle(el).borderRadius
    })),
    footer: document.querySelector('.VPFooter .copyright')?.textContent?.trim(),
    mobileGeometry: (() => {
      const rect = el => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }
      }
      const h1 = document.querySelector('.invite-page h1')
      const phoneInput = document.querySelector('#invite-phone')
      const nicknameInput = document.querySelector('#invite-nickname')
      const textarea = document.querySelector('#invite-explanation')
      return {
        h1: rect(h1), h1FontSize: parseFloat(getComputedStyle(h1).fontSize),
        phone: rect(phoneInput), nickname: rect(nicknameInput),
        explanation: rect(textarea),
        actions: [...document.querySelectorAll('.invite-sms-actions .xs-button')].map(rect)
      }
    })(),
    panel: (() => {
      const el = document.querySelector('.invite-panel')
      const heading = document.querySelector('.invite-page h1')
      const rect = el.getBoundingClientRect()
      return {
        width: rect.width, x: rect.x, h1x: heading.getBoundingClientRect().x,
        borderWidth: getComputedStyle(el).borderTopWidth,
        boxShadow: getComputedStyle(el).boxShadow,
        backgroundColor: getComputedStyle(el).backgroundColor
      }
    })()
  }))
  if (layout.overflow > 1) failures.push(item.label + ': horizontal overflow')
  if (layout.panel.width > 562 || Math.abs(layout.panel.x - layout.panel.h1x) > 1)
    failures.push(item.label + ': form and heading are not aligned')
  if (layout.panel.borderWidth !== '0px' || layout.panel.boxShadow !== 'none' ||
      !['rgba(0, 0, 0, 0)', 'transparent'].includes(layout.panel.backgroundColor))
    failures.push(item.label + ': oversized glass card styling was not removed')
  const expectedButtonHeight = item.width < 500 ? 44 : 46
  const expectedButtonRadius = item.width < 500 ? '10px' : '12px'
  if (layout.buttons.length !== 2 ||
      layout.buttons.some(b => b.height !== expectedButtonHeight || b.corners !== expectedButtonRadius))
    failures.push(item.label + ': button styling inconsistent')
  if (item.width < 500) {
    const m = layout.mobileGeometry
    if (m.h1FontSize > 25 || m.phone.height > 45 || m.nickname.height > 45 ||
        m.explanation.height > 82)
      failures.push(item.label + ': mobile typography or fields are still oversized: ' + JSON.stringify(m))
    if (m.actions.length !== 2 || Math.abs(m.actions[0].y - m.actions[1].y) > 1 ||
        m.actions[0].bottom - m.h1.y > 535)
      failures.push(item.label + ': mobile actions do not fit compactly on one row: ' + JSON.stringify(m))
    if (m.actions.some(a => a.x < 0 || a.x + a.width > item.width))
      failures.push(item.label + ': mobile buttons outside viewport: ' + JSON.stringify(m.actions))
  }
  if (layout.footer !== 'Copyright © 2026 PleaseJot. All rights reserved.') failures.push(item.label + ': footer missing')
  if (pageErrors.length) failures.push(item.label + ': JS exceptions ' + pageErrors.join(' | '))
  findings.push({ test: 'invite-sms', variant: item.label, bodyCopied: true, ...layout })
  await capture(page, item.label + '.png', true)
  if (item.label === 'invite-desktop-light' || item.label === 'invite-mobile-light' ||
      item.label === 'invite-mobile-320-light')
    await printReference(page, item.label)
  await ctx.close()
}
// Apple 官方 sms: 协议只保障打开短信并指定收件人：iPhone 应提示先复制内容。
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  })
  const page = await ctx.newPage()
  await page.goto(new URL('invite/', origin).href, { waitUntil: 'networkidle' })
  await page.getByLabel('手机号 必填').fill('13800123456')
  await page.getByLabel('昵称 必填').fill('测试用户')
  const smsHref = await page.locator('.invite-sms-actions a').getAttribute('href')
  if (smsHref !== 'sms:13231226535') failures.push('invite-iOS: SMS URL should only contain recipient')
  if (!(await page.locator('.invite-hint:not(.invite-desktop-hint)').textContent())?.includes('iPhone / iPad'))
    failures.push('invite-iOS: paste instructions missing')
  await ctx.close()
}
for (const entry of [{label:'home',url:''},{label:'download',url:'download/'}]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(new URL(entry.url,origin).href, { waitUntil: 'networkidle' })
  const links = page.getByRole('link', { name: /申请邀请码/ })
  if (await links.count() === 0) failures.push(entry.label + ': no invite entry')
  else if (!(await links.first().getAttribute('href'))?.includes(new URL('invite/', origin).pathname))
    failures.push(entry.label + ': invite entry has wrong URL')
  await ctx.close()
}

// 文档右侧目录：检查活动标记必须留在卡片内，并与当前小标题居中对齐。
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const response = await page.goto(new URL('guide/faq.html', origin).href, { waitUntil: 'networkidle' })
  if (!response?.ok()) failures.push('faq: page did not load')
  const links = page.locator('.VPDocAsideOutline.has-outline .outline-link')
  if (await links.count() === 0) {
    failures.push('faq: outline links not found')
  } else {
    await links.last().click()
    await page.waitForTimeout(750)
    const geometry = await page.evaluate(() => {
      const aside = document.querySelector('.VPDocAsideOutline.has-outline')
      const marker = aside?.querySelector('.outline-marker')
      const selected = aside?.querySelector('.outline-link.active')
      if (!aside || !marker || !selected) return null
      const a = aside.getBoundingClientRect()
      const m = marker.getBoundingClientRect()
      const l = selected.getBoundingClientRect()
      return {
        activeText: selected.textContent?.trim(),
        opacity: getComputedStyle(marker).opacity,
        markerInside: m.left >= a.left + 8 && m.right < l.left,
        centerDifference: Math.round(Math.abs((m.top + m.height / 2) - (l.top + l.height / 2)) * 10) / 10,
        markerX: Math.round(m.left - a.left),
        linkX: Math.round(l.left - a.left),
        cardWidth: Math.round(a.width)
      }
    })
    if (!geometry) failures.push('faq: active outline marker missing')
    else {
      if (geometry.opacity === '0') failures.push('faq: active marker invisible')
      if (!geometry.markerInside) failures.push('faq: active marker outside card or after text')
      if (geometry.centerDifference > 4) failures.push('faq: outline marker misaligned by ' + geometry.centerDifference + 'px')
    }
    findings.push({ test: 'faq-outline-alignment', ...geometry })
    await capture(page, 'faq-outline-desktop.png', false)
    const aside = page.locator('.VPDocAsideOutline.has-outline').first()
    await aside.screenshot({ path: path.join(output, 'faq-outline-detail.png'), animations: 'disabled' })

    // 回归案例：从最后一项点回倒数第二项，不能仍高亮最后一项。
    const penultimate = links.nth((await links.count()) - 2)
    const penultimateHref = await penultimate.getAttribute('href')
    await penultimate.click()
    await page.waitForTimeout(900)
    const penultimateState = await page.evaluate(() => {
      const entries = [...document.querySelectorAll('.VPDocAsideOutline .outline-link')]
      const active = entries.findIndex(x => x.classList.contains('active'))
      const targetLink = entries[entries.length - 2]
      const id = targetLink?.getAttribute('href')?.slice(1)
      const target = id ? document.getElementById(decodeURIComponent(id)) : null
      const vpDoc = document.querySelector('.VPDoc')
      return {
        hash: decodeURIComponent(location.hash),
        activeIndex: active,
        expectedIndex: entries.length - 2,
        activeText: entries[active]?.textContent?.trim(),
        scrollY: Math.round(window.scrollY),
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
        headingTop: target ? Math.round(target.getBoundingClientRect().top) : null,
        docBottom: vpDoc ? Math.round(vpDoc.getBoundingClientRect().bottom) : null,
        viewportHeight: innerHeight
      }
    })
    findings.push({ test: 'faq-penultimate-after-last', ...penultimateState })
    await capture(page, 'faq-after-penultimate-click.png', false)
    if (penultimateState.hash !== decodeURIComponent(penultimateHref)) failures.push('faq: penultimate link failed to change URL hash')
    if (penultimateState.activeIndex !== penultimateState.expectedIndex) failures.push('faq: penultimate heading is not highlighted after click')

  }
  if (errors.length) failures.push('faq: JS exceptions: ' + errors.join(' | '))
  await context.close()
}

// 手机端文档两种目录：检查导航/侧栏/下拉内容使用统一不透明颜色，
// 并验证原生菜单仍可正常开关。额外检查全站返回顶部按钮。
for (const width of [320, 390, 768]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({
      viewport: { width, height: 844 }, isMobile: width < 500,
      hasTouch: width < 500, colorScheme: theme
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(new URL('guide/', origin).href, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const localNav = page.locator('.VPLocalNav')
    const sidebar = page.locator('.VPSidebar')
    const menu = localNav.locator('button.menu')
    const outline = page.locator('.VPLocalNavOutlineDropdown > button')
    if (!(await menu.isVisible()) || !(await outline.isVisible()))
      failures.push(width + '/' + theme + ': directory or page-outline toggle not visible')
    const colors = await page.evaluate(() => {
      const color = selector => {
        const el = document.querySelector(selector)
        return el && getComputedStyle(el).backgroundColor
      }
      return {
        navbar: color('.VPNavBar.has-sidebar'),
        localNav: color('.VPLocalNav'),
        sidebar: color('.VPSidebar'),
        text: getComputedStyle(document.querySelector('.VPLocalNav button.menu')).color,
        overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth)
      }
    })
    if (new Set([colors.navbar, colors.localNav, colors.sidebar]).size !== 1 ||
        !colors.localNav?.startsWith('rgb('))
      failures.push(width + '/' + theme + ': mobile document nav colors differ or transparent ' + JSON.stringify(colors))
    if (colors.overflow > 1) failures.push(width + '/' + theme + ': horizontal overflow ' + colors.overflow)
    await outline.click()
    const items = page.locator('.VPLocalNavOutlineDropdown .items')
    await items.waitFor({ state: 'visible' })
    const dropdownColors = await items.evaluate(el => {
      const color = node => getComputedStyle(node).backgroundColor
      return { outer: color(el), header: color(el.querySelector('.header')),
        outline: color(el.querySelector('.outline')) }
    })
    if (new Set(Object.values(dropdownColors).concat(colors.localNav)).size !== 1)
      failures.push(width + '/' + theme + ': outline menu surfaces do not match ' + JSON.stringify(dropdownColors))
    await capture(page, 'doc-nav-outline-' + theme + '-' + width + '.png', false)
    if (width === 390) await printReference(page, 'doc-nav-outline-' + theme + '-390')
    await outline.click()
    await menu.click()
    if (!(await sidebar.evaluate(el => el.classList.contains('open'))))
      failures.push(width + '/' + theme + ': sidebar did not open')
    await page.waitForTimeout(300)
    await capture(page, 'doc-nav-sidebar-' + theme + '-' + width + '.png', false)
    if (width === 390 && theme === 'light') await printReference(page, 'doc-nav-sidebar-light-390')
    // 移动目录抽屉会覆盖顶部按钮：使用 VitePress 原生 Esc 交互关闭。
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.VPSidebar')?.classList.contains('open'))
    // 首页文档内容较短，不应勉强显示返回顶部；转到真实长文档验证。
    await page.goto(new URL('guide/faq.html', origin).href, { waitUntil: 'networkidle' })
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    if (maxScroll <= 560) failures.push(width + '/' + theme + ': FAQ is too short for back-to-top test')
    await page.evaluate(() => window.scrollTo({ top: 1100, behavior: 'instant' }))
    await page.waitForTimeout(250)
    const back = page.locator('.xs-back-to-top')
    if (!(await back.isVisible())) failures.push(width + '/' + theme + ': missing back-to-top arrow after scroll')
    else {
      await back.click()
      await page.waitForFunction(() => window.scrollY < 5, null, { timeout: 7000 })
      await back.waitFor({ state: 'detached', timeout: 3000 })
    }
    if (errors.length) failures.push(width + '/' + theme + ': JS errors ' + errors.join(' | '))
    findings.push({ test: 'doc-mobile-menu-and-top', width, theme, colors, dropdownColors })
    await ctx.close()
  }
}
// 首页也应能使用返回顶部按钮；删除底部 CTA 后检查首页跳转动作保持有效。
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await page.goto(origin, { waitUntil: 'networkidle' })
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(250)
  const back = page.locator('.xs-back-to-top')
  if (!(await back.isVisible())) failures.push('home: back-to-top arrow missing at bottom')
  else {
    const overlapsFooter = await page.evaluate(() => {
      const a = document.querySelector('.xs-back-to-top')?.getBoundingClientRect()
      const b = document.querySelector('.VPFooter .copyright')?.getBoundingClientRect()
      return a && b && a.left < b.right && a.right > b.left &&
        a.top < b.bottom && a.bottom > b.top
    })
    if (overlapsFooter) failures.push('home: floating arrow obscures copyright')
    await capture(page, 'home-bottom-with-back-to-top-mobile.png', false)
    await printReference(page, 'home-bottom-back-to-top-390')
    await back.click()
    await page.waitForFunction(() => window.scrollY < 5, null, { timeout: 7000 })
  }
  await ctx.close()
}

// 官网只跟随系统深浅色；即使 localStorage 里留着过去的手动选择，也不能覆盖系统。
// 测试 VitePress 首屏、手机展开菜单和 Android/Chromium 强制深色网页渲染。
const forcedBrowser = await chromium.launch({
  headless: true,
  args: ['--enable-features=WebContentsForceDark', '--force-dark-mode']
})
try {
  const systemModes = [
    { label: 'system-light', forced: false, preference: 'light', legacy: 'dark' },
    { label: 'system-dark', forced: false, preference: 'dark', legacy: 'light' },
    { label: 'forced-dark-system-light', forced: true, preference: 'light', legacy: 'dark' },
    { label: 'forced-dark-system-dark', forced: true, preference: 'dark', legacy: 'light' }
  ]
  const pages = [
    { slug: 'home', url: '' },
    { slug: 'download', url: 'download/' },
    { slug: 'guide', url: 'guide/' },
    { slug: 'demo', url: 'demo/' },
    { slug: 'changelog', url: 'changelog/' },
    { slug: 'about', url: 'about/' },
    { slug: 'invite', url: 'invite/' }
  ]
  const switchSelector = '.VPNavScreenAppearance, .VPNavBarAppearance, .VPSwitchAppearance'
  for (const variant of systemModes) {
    const testBrowser = variant.forced ? forcedBrowser : browser
    for (const route of pages) {
      const ctx = await testBrowser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true, hasTouch: true,
        colorScheme: variant.preference,
        deviceScaleFactor: 1
      })
      await ctx.addInitScript(stale => {
        localStorage.setItem('vitepress-theme-appearance', stale)
      }, variant.legacy)
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const response = await page.goto(new URL(route.url, origin).href, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const state = await page.evaluate(() => {
        const root = document.documentElement
        const heading = document.querySelector('h1')
        const h1 = heading && getComputedStyle(heading)
        const meta = [...document.querySelectorAll('meta[name="theme-color"]')].map(el => ({
          media: el.media, color: el.content
        }))
        return {
          systemDark: matchMedia('(prefers-color-scheme: dark)').matches,
          theme: root.classList.contains('dark') ? 'dark' : 'light',
          scheme: getComputedStyle(root).colorScheme,
          heading: heading?.textContent?.trim() ?? '',
          headingColor: h1?.color ?? '',
          headingOpacity: h1?.opacity ?? '',
          overflow: Math.max(0, root.scrollWidth - innerWidth),
          switches: document.querySelectorAll('.VPNavScreenAppearance, .VPNavBarAppearance, .VPSwitchAppearance').length,
          themeColors: meta
        }
      })
      const label = variant.label + '/' + route.slug
      const expected = variant.preference
      if (!response?.ok()) failures.push(label + ': HTTP ' + response?.status())
      if (state.theme !== expected || state.systemDark !== (expected === 'dark'))
        failures.push(label + ': system theme failed to override old preference ' + JSON.stringify(state))
      if (state.scheme !== (expected + ' only'))
        failures.push(label + ': CSS color scheme mismatch ' + state.scheme)
      if (state.switches) failures.push(label + ': manual appearance switch still exists')
      if (!state.heading || Number(state.headingOpacity) < .9)
        failures.push(label + ': heading missing or too transparent')
      if (state.overflow > 1) failures.push(label + ': horizontal overflow ' + state.overflow)
      if (state.themeColors.length !== 2 ||
          !state.themeColors.some(x => x.media === '(prefers-color-scheme: light)') ||
          !state.themeColors.some(x => x.media === '(prefers-color-scheme: dark)'))
        failures.push(label + ': system color-scheme browser toolbar metadata missing')
      if (errors.length) failures.push(label + ': JS errors ' + errors.join(' | '))

      // 以前只测试菜单展开后的 X，没有测试三横线本身是否能被看见。
      // 现在针对闭合/展开两种 SVG 图标检查真正绘制的背景图、尺寸与颜色。
      await capture(page, variant.label + '-' + route.slug + '.png', false)
      if (route.slug === 'guide' || route.slug === 'home') {
        const hamburger = page.locator('.VPNavBarHamburger')
        const closedIcon = await hamburger.evaluate(button => {
          const rect = button.getBoundingClientRect()
          const style = getComputedStyle(button)
          const icon = getComputedStyle(button, '::after')
          return {
            x: rect.x, y: rect.y, w: rect.width, h: rect.height,
            background: style.backgroundColor, border: style.borderTopColor,
            image: icon.backgroundImage, iconWidth: icon.width, iconHeight: icon.height,
            iconVisibility: icon.visibility, ariaExpanded: button.getAttribute('aria-expanded')
          }
        })
        const expectedIconColor = variant.preference === 'dark' ? 'f1f3f5' : '17191d'
        if (!(await hamburger.isVisible()) || closedIcon.x < 0 ||
            closedIcon.x + closedIcon.w > 392 || Math.abs(closedIcon.w - 44) > 1 ||
            Math.abs(closedIcon.h - 44) > 1 || closedIcon.y < 5 || closedIcon.y > 20 ||
            closedIcon.iconWidth !== '21px' || closedIcon.iconHeight !== '21px' ||
            !closedIcon.image.includes(expectedIconColor) || !(/M4(?:%20| )6h16/.test(closedIcon.image)) ||
            closedIcon.iconVisibility !== 'visible' || closedIcon.ariaExpanded !== 'false')
          failures.push(label + ': closed hamburger icon is missing or invisible ' + JSON.stringify(closedIcon))
        // 截图要在展开菜单之前拍摄，这正是用户反馈的问题状态。
        await capture(page, variant.label + '-' + route.slug + '-hamburger-closed.png', false)
        if (route.slug === 'guide' && variant.label !== 'forced-dark-system-light')
          await printReference(page, variant.label + '-guide-hamburger-closed')
        await hamburger.click()
        const openedIcon = await hamburger.evaluate(button => ({
          image: getComputedStyle(button, '::after').backgroundImage,
          ariaExpanded: button.getAttribute('aria-expanded')
        }))
        if (!(/M5(?:%20| )5L19(?:%20| )19/.test(openedIcon.image)) || openedIcon.ariaExpanded !== 'true')
          failures.push(label + ': open hamburger icon did not change to a visible X ' + JSON.stringify(openedIcon))
        const screen = page.locator('.VPNavScreen')
        await screen.waitFor({ state: 'visible' })
        await page.waitForTimeout(300)
        const menu = await page.evaluate(() => {
          const root = document.documentElement
          const navbar = document.querySelector('.VPNavBar')
          const menu = document.querySelector('.VPNavScreen')
          const close = document.querySelector('.VPNavBarHamburger')
          const link = document.querySelector('.VPNavScreenMenuLink')
          const style = el => el && getComputedStyle(el)
          return {
            systemDark: matchMedia('(prefers-color-scheme: dark)').matches,
            dark: root.classList.contains('dark'),
            background: style(menu)?.backgroundColor,
            navbarBackground: style(navbar)?.backgroundColor,
            closeColor: close && getComputedStyle(close, '::after').backgroundImage,
            menuColor: style(link)?.color,
            brandColor: style(document.querySelector('.VPNavBarTitle .title'))?.color,
            linkCount: document.querySelectorAll('.VPNavScreenMenuLink').length,
            appearanceCount: document.querySelectorAll('.VPNavScreenAppearance, .VPSwitchAppearance').length,
            panelRadius: style(menu)?.borderRadius,
            overflow: Math.max(0, root.scrollWidth - innerWidth)
          }
        })
        if (menu.appearanceCount || menu.linkCount !== 7)
          failures.push(label + ': old appearance control or missing menu links ' + JSON.stringify(menu))
        const expectedOpenColor = variant.preference === 'dark' ? 'f1f3f5' : '17191d'
        if (!menu.closeColor?.includes(expectedOpenColor) || !menu.menuColor)
          failures.push(label + ': mobile close X or text icon invisible ' + JSON.stringify(menu))
        if (!menu.background?.startsWith('rgb(') || menu.panelRadius !== '0px')
          failures.push(label + ': mobile menu background is translucent/rounded ' + JSON.stringify(menu))
        if (menu.overflow > 1) failures.push(label + ': mobile menu horizontal overflow')
        await capture(page, variant.label + '-' + route.slug + '-menu-open.png', false)
        if (route.slug === 'guide' && variant.label !== 'forced-dark-system-light')
          await printReference(page, variant.label + '-guide-menu')
        await hamburger.click()
        await screen.waitFor({ state: 'detached', timeout: 4500 })
        findings.push({ test: 'system-only-menu', label, ...menu })
      }
      findings.push({ test: 'system-only-theme', label, ...state })
      await ctx.close()
    }
  }

  // 在同一页面直接更改系统偏好：不刷新、不点击开关，配色和菜单仍应更新。
  for (const initial of ['light', 'dark']) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      colorScheme: initial
    })
    const page = await ctx.newPage()
    await page.goto(new URL('guide/', origin).href, { waitUntil: 'networkidle' })
    const flipped = initial === 'dark' ? 'light' : 'dark'
    await page.emulateMedia({ colorScheme: flipped })
    await page.waitForFunction(expected => (
      document.documentElement.classList.contains('dark') === (expected === 'dark')
    ), flipped, { timeout: 7000 })
    const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
    if (scheme !== flipped + ' only')
      failures.push('system-toggle/' + initial + ': HTML class changed but color scheme did not')
    if (await page.locator(switchSelector).count())
      failures.push('system-toggle/' + initial + ': manual appearance control appeared')
    await capture(page, 'system-changed-' + initial + '-to-' + flipped + '.png', false)
    await ctx.close()
  }
} finally {
  await forcedBrowser.close()
}

const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
const rmPage = await reduced.newPage()
await rmPage.goto(origin, { waitUntil: 'networkidle' })
const animation = await rmPage.locator('.VPMenu').count()
findings.push({ test: 'prefers-reduced-motion', menuCount: animation })
await capture(rmPage, 'home-reduced-motion.png')
await reduced.close()
await browser.close()
console.log('VISUAL_FINDINGS ' + JSON.stringify(findings))
if (failures.length) {
  console.error('VISUAL_FAILURES ' + JSON.stringify(failures))
  process.exitCode = 1
} else console.log('VISUAL_REVIEW_PASSED')
