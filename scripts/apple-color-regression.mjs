import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const dir = 'pleasejot-visual-review/apple-colors'
mkdirSync(dir, { recursive: true })
const browser = await chromium.launch()
const assert = (ok,msg) => { if (!ok) throw new Error(msg) }
const expected = {"red":["#ff383c","#ff4245","#e9152d","#ff6165"],"orange":["#ff8d28","#ff9230","#c55300","#ffa056"],"yellow":["#ffcc00","#ffd600","#a16a00","#fedf43"],"green":["#34c759","#30d158","#008932","#4ad968"],"mint":["#00c8b3","#00dac3","#008575","#54dfcb"],"teal":["#00c3d0","#00d2e0","#008198","#3bddec"],"cyan":["#00c0e8","#3cd3fe","#007eae","#6dd9ff"],"blue":["#0088ff","#0091ff","#1e6ef4","#5cb8ff"],"indigo":["#6155f5","#6d7cff","#564ade","#a7aaff"],"purple":["#cb30e0","#db34f2","#b02fc2","#ea8dff"],"pink":["#ff2d55","#ff375f","#e7124d","#ff8ac4"],"brown":["#ac7f5e","#b78a66","#956d51","#dba679"],"gray":["#8e8e93","#8e8e93","#6c6c70","#aeaeb2"],"gray2":["#aeaeb2","#636366","#8e8e93","#7c7c80"],"gray3":["#c7c7cc","#48484a","#aeaeb2","#545456"],"gray4":["#d1d1d6","#3a3a3c","#bcbcc0","#444446"],"gray5":["#e5e5ea","#2c2c2e","#d8d8dc","#363638"],"gray6":["#f2f2f7","#1c1c1e","#ebebf0","#242426"]}
try {
 for (const width of [390,1440]) for (const scheme of ['light','dark']) {
  const page = await browser.newPage({viewport:{width,height:900},colorScheme:scheme,reducedMotion:'reduce'})
  const errors=[]; page.on('pageerror',e=>errors.push(e.message))
  const capture=async(name)=>{await page.screenshot({path:dir+'/'+name+'.png',animations:'disabled'});const b=(await page.screenshot({type:'jpeg',quality:48,animations:'disabled'})).toString('base64');console.log('HIG_IMAGE_START:'+name);for(let i=0;i<b.length;i+=1600)console.log('HIG_IMAGE_PART:'+b.slice(i,i+1600));console.log('HIG_IMAGE_END:'+name)}
  const check=async(mode)=>{
   const actual=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue('--apple-system-'+k).trim().toLowerCase()])),Object.keys(expected))
   for(const k of Object.keys(expected)) assert(actual[k]===expected[k][mode],scheme+' '+k+' '+actual[k]+' != '+expected[k][mode])
  }
  await page.goto(origin,{waitUntil:'networkidle'})
  await page.waitForFunction(d=>document.documentElement.classList.contains('dark')===d,scheme==='dark')
  await check(scheme==='dark'?1:0)
  const colors=await page.evaluate(()=>({body:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.querySelector('h1')).color,features:[...document.querySelectorAll('.feature-visual')].map(el=>getComputedStyle(el).backgroundColor),cards:[...document.querySelectorAll('.pj-carousel-card')].map(el=>getComputedStyle(el).backgroundColor)}))
  assert(new Set(colors.features).size===3,'feature colors missing '+JSON.stringify(colors))
  assert(new Set(colors.cards).size===3,'carousel colors missing '+JSON.stringify(colors))
  assert(colors.body===(scheme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)'),'background '+colors.body)
  await capture(width+'-'+scheme+'-home')
  for(const [i,el] of (await page.locator('.feature-visual').all()).entries()){await el.scrollIntoViewIfNeeded();await capture(width+'-'+scheme+'-feature-'+i)}
  await page.locator('.pj-carousel').scrollIntoViewIfNeeded();await capture(width+'-'+scheme+'-carousel')
  await page.emulateMedia({contrast:'more'});await check(scheme==='dark'?3:2)
  await page.emulateMedia({contrast:'no-preference'})
  await page.goto(new URL('download/',origin).href,{waitUntil:'networkidle'})
  const icons=await page.locator('.download-card .platform-icon').evaluateAll(els=>els.map(el=>getComputedStyle(el).color))
  assert(new Set(icons).size===4,'download icons not differentiated '+JSON.stringify(icons))
  await capture(width+'-'+scheme+'-download')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2),'horizontal overflow')
  assert(errors.length===0,errors.join(' | '))
  await page.close()
 }
 console.log('APPLE_COLOR_REGRESSION_PASSED')
} finally {await browser.close()}
