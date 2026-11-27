import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review/complex-motion'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch()
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }
async function capture(page, name) {
  await page.screenshot({ path: output + '/' + name + '.png', animations: 'disabled' })
  const jpg = await page.screenshot({ type: 'jpeg', quality: 48, animations: 'disabled' })
  const data = jpg.toString('base64')
  console.log('COMPLEX_IMAGE_START:' + name)
  for (let i = 0; i < data.length; i += 1600) console.log('COMPLEX_IMAGE_PART:' + data.slice(i, i+1600))
  console.log('COMPLEX_IMAGE_END:' + name)
}
try {
  for (const width of [390, 1440]) for (const colorScheme of ['light','dark']) {
    const page = await browser.newPage({viewport:{width,height:900},colorScheme,reducedMotion:'no-preference'})
    const errors=[]
    page.on('pageerror', e=>errors.push(e.message))
    await page.goto(origin,{waitUntil:'networkidle'})
    await page.locator('.pj-carousel-viewport.is-ready').waitFor()
    await page.waitForTimeout(1100)
    await capture(page, width+'-'+colorScheme+'-home')
    if (width >= 1100) {
      await page.locator('.pj-stack-active').waitFor()
      const metrics = async () => page.locator('.pj-stack').evaluate(el=>({
        top:el.getBoundingClientRect().top+scrollY-96,
        y:[...el.querySelectorAll('.feature-section')].map(c=>new DOMMatrixReadOnly(getComputedStyle(c).transform).m42),
        sticky:el.querySelector('.pj-stack-stage').getBoundingClientRect().top
      }))
      const start=await metrics()
      for (const [name,travel,expected] of [['first',0,[0,524,1048]],['middle',484,[0,40,564]],['last',968,[0,40,80]]]) {
        await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),start.top+travel)
        await page.waitForTimeout(200)
        const m=await metrics()
        assert(m.y.every((v,i)=>Math.abs(v-expected[i])<3), 'stack '+name+': '+JSON.stringify(m))
        assert(Math.abs(m.sticky-96)<3, 'sticky position '+JSON.stringify(m))
        await capture(page,width+'-'+colorScheme+'-stack-'+name)
      }
    } else {
      assert(await page.locator('.pj-stack-active').count()===0,'mobile must not pin stack')
      await page.locator('.feature-section').last().scrollIntoViewIfNeeded()
      await capture(page,width+'-'+colorScheme+'-static-feature')
    }
    const carousel=page.locator('.pj-carousel')
    await carousel.scrollIntoViewIfNeeded()
    await page.getByRole('button',{name:'暂停自动轮播'}).click()
    const current=Number(await carousel.getAttribute('data-active-index'))
    await page.getByRole('button',{name:'下一张卡片'}).click()
    await page.waitForTimeout(1950)
    assert(Number(await carousel.getAttribute('data-active-index'))===(current+1)%3,'next carousel card incorrect')
    await capture(page,width+'-'+colorScheme+'-carousel')
    await page.getByRole('button',{name:'上一张卡片'}).click()
    await page.waitForTimeout(1950)
    assert(Number(await carousel.getAttribute('data-active-index'))===current,'previous carousel card incorrect')
    assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2),'horizontal overflow')
    await page.emulateMedia({reducedMotion:'reduce'})
    await page.waitForFunction(()=>!document.querySelector('.pj-stack-active'))
    assert(await page.getByRole('button',{name:'继续自动轮播'}).count()===0,'reduced motion autoplay control visible')
    assert(errors.length===0,errors.join(' | '))
    await page.close()
  }
  console.log('COMPLEX_MOTION_REGRESSION_PASSED')
} finally { await browser.close() }
