// Discover every Markdown page from source; no manually maintained route count.
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review/all-pages'
mkdirSync(output,{recursive:true})
const failures = [], results = []
function discover(dir, prefix='') {
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name==='public') return []
    const rel = prefix + entry.name
    if (entry.isDirectory()) return discover(join(dir,entry.name),rel+'/')
    return entry.isFile() && entry.name.endsWith('.md') ? [rel] : []
  })
}
const routes = discover('docs').sort().map(file=>({
  file,
  route:file.endsWith('index.md') ? file.slice(0,-'index.md'.length) : file.replace(/\.md$/,'.html'),
  slug:file.replace(/\.md$/,'').replaceAll('/','--')
}))
const expectedReleases=routes.filter(x=>x.file.startsWith('changelog/releases/')).length
const staticDocs=route=>/^(guide\/|changelog\/|about\/|acknowledgements\/|licenses\/|support-setup\.md$)/.test(route.file)
const variants = [
  { width:390, height:844, mobile:true, scheme:'light' },
  { width:390, height:844, mobile:true, scheme:'dark' },
  { width:768, height:1024, mobile:true, scheme:'light' },
  { width:768, height:1024, mobile:true, scheme:'dark' },
  { width:1440, height:900, mobile:false, scheme:'light' },
  { width:1440, height:900, mobile:false, scheme:'dark' }
]
const browser=await chromium.launch({headless:true})
const mockFeedback='<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px/1.6 system-ui;margin:0;padding:20px;background:white;color:#111"><h1 style="font-size:22px">用户反馈（截图测试问卷）</h1><p>仅用于自动化截图，不是真实腾讯问卷。</p><label>反馈类型<br><select><option>问题反馈</option><option>功能建议</option></select></label><p><label>反馈标题<br><input></label></p><p><label>详细描述<br><textarea rows="5"></textarea></label></p></body></html>'
function recordFailure(id,error) { failures.push(id+': '+String(error?.message||error)) }
function check(ok,message) { if(!ok)throw new Error(message) }
function htmlEscape(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')}
async function contactSheet(v,shots) {
  const label=v.width+'-'+v.scheme
  const columns=v.width===390?6:4
  const sheet=join(output,'contact-'+label+'.html')
  const cells=shots.map(s=>'<figure><img src="'+htmlEscape(s.filename)+'"><figcaption>'+htmlEscape(s.route.file)+'</figcaption></figure>').join('')
  writeFileSync(sheet,'<!doctype html><html><meta charset="utf-8"><style>body{font:13px system-ui;background:#e6e6e6;color:#111;margin:0;padding:14px}h1{font-size:19px}main{display:grid;grid-template-columns:repeat('+columns+',minmax(0,1fr));gap:10px}figure{margin:0;background:#fff;border:1px solid #bbb;border-radius:5px;overflow:hidden}img{display:block;width:100%;height:'+ (v.width===390?290:165)+'px;object-fit:cover;object-position:top}figcaption{padding:6px;overflow-wrap:anywhere;font-size:11px;min-height:27px}</style><h1>PleaseJot '+label+' · '+shots.length+' pages</h1><main>'+cells+'</main></html>')
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1})
  try{
    await page.goto(pathToFileURL(resolve(sheet)).href,{waitUntil:'load'})
    await page.screenshot({path:join(output,'contact-'+label+'.png'),fullPage:true})
    const data=(await page.screenshot({type:'jpeg',quality:50,fullPage:true})).toString('base64')
    console.log('ALLPAGE_IMAGE_START:'+label)
    for(let i=0;i<data.length;i+=1600)console.log('ALLPAGE_IMAGE_PART:'+data.slice(i,i+1600))
    console.log('ALLPAGE_IMAGE_END:'+label)
  }finally{await page.close()}
}
async function reviewVariant(v){
 const label=v.width+'-'+v.scheme, shots=[]
 const context=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,isMobile:v.mobile,hasTouch:v.mobile,colorScheme:v.scheme,reducedMotion:'reduce'})
 try{
   // Test only the outer website; the third-party survey has its own design
   // and is never submitted during screenshots.
   await context.route(/^https:\/\/wj\.qq\.com\//,r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:mockFeedback}))
   const page=await context.newPage()
   let errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   for(const route of routes){
     errors=[]
     const id=label+'/'+route.file
     const filename=label+'-'+route.slug+(route.file==='feedback/index.md'?'-survey-fixture':'')+'.png'
     try{
       const response=await page.goto(new URL(route.route,origin).href,{waitUntil:'domcontentloaded',timeout:45000})
       check(response?.ok(),'HTTP '+response?.status())
       await page.locator('h1').first().waitFor({state:'visible',timeout:10000})
       await page.waitForFunction(d=>document.documentElement.classList.contains('dark')===d,v.scheme==='dark',{timeout:10000})
       await page.evaluate(()=>document.fonts.ready)
       await page.waitForTimeout(150)
       const metrics=await page.evaluate(()=>{
         const headings=[...document.querySelectorAll('h1')].filter(el=>el.getClientRects().length>0)
         const heading=headings[0]
         return { heading:heading?.textContent?.trim(),headingCount:headings.length,headingOpacity:heading?getComputedStyle(heading).opacity:null,
           overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
           body:getComputedStyle(document.body).backgroundColor,
           header:document.querySelector('.pj-doc-header')?.getAttribute('data-pj-doc-kind'),
           nav:!!document.querySelector('.VPNavBar'),
           links:document.querySelectorAll('.pj-doc-link-card').length,
           releaseLinks:document.querySelectorAll('.pj-release-latest,.pj-release-row').length,
           demoHref:document.querySelector('.pj-demo-open')?.getAttribute('href'),
           screenshotSlots:document.querySelectorAll('.pj-shot-frame').length,
           form:!!document.querySelector('#invite-phone'),
           feedback:!!document.querySelector('.feedback-frame iframe')
         }
       })
       // Archive full-page evidence plus viewport thumbnail before reporting
       // a layout assertion; failed pages must still leave screenshots.
       await page.screenshot({path:join(output,filename),fullPage:true,animations:'disabled',timeout:20000})
       const top='top-'+filename
       await page.screenshot({path:join(output,top),animations:'disabled',timeout:20000})
       shots.push({filename:top,route})
       results.push({id,...metrics,errors:[...errors]})
       check(metrics.heading,'missing H1')
       check(metrics.headingOpacity==='1','heading obscured')
       check(metrics.nav,'missing VitePress navbar')
       check(metrics.overflow<=2,'horizontal overflow '+metrics.overflow)
       check(metrics.body===(v.scheme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)'),'unexpected base color '+metrics.body)
       if(staticDocs(route))check(metrics.header,'document design header missing')
       if(route.file.startsWith('changelog/releases/'))check(metrics.headingCount===1,'duplicate H1')
       if(route.file==='guide/index.md')check(metrics.links===8,'guide entry cards missing')
       if(route.file==='about/index.md')check(metrics.links===4,'about link cards missing')
       if(route.file==='changelog/index.md')check(metrics.releaseLinks===expectedReleases,'release timeline not in sync '+metrics.releaseLinks+'/'+expectedReleases)
       if(route.file==='screenshots/index.md')check(metrics.screenshotSlots===3,'screenshot slots missing')
       if(route.file==='invite/index.md')check(metrics.form,'invite form missing')
       if(route.file==='feedback/index.md')check(metrics.feedback,'feedback iframe missing')
       if(route.file==='demo/index.md')check(metrics.demoHref?.endsWith('/demo/app.html'),'React launcher missing')
       check(errors.length===0,'JS errors '+errors.join(' | '))
     }catch(e){recordFailure(id,e)}
   }
 }finally{await context.close()}
 try{await contactSheet(v,shots)}catch(e){recordFailure(label+'/contact-sheet',e)}
}
try{
 console.log('ALL_PAGES_DISCOVERED '+JSON.stringify(routes.map(r=>r.file)))
 // Run two independent viewports at a time; avoid exhausting Chromium memory.
 for(let i=0;i<variants.length;i+=2)await Promise.all(variants.slice(i,i+2).map(reviewVariant))
 for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'})
   const errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   try{
     const response=await page.goto(new URL('demo/app.html',origin).href,{waitUntil:'domcontentloaded',timeout:45000})
     check(response?.ok(),'React HTML '+response?.status())
     await page.waitForFunction(()=>!!document.querySelector('#root')?.children.length,{timeout:20000})
     check(await page.locator('.VPNavBar').count()===0,'Vue navigation leaked into React')
     const info=await page.request.get(new URL('demo/pleasejot-build.json',origin).href)
     check(info.ok(),'missing mock metadata')
     const metadata=await info.json()
     check(metadata.backend==='mock'&&metadata.demo===true,'not Web Mock build')
     await page.screenshot({path:join(output,'react-mock-'+width+'.png'),animations:'disabled'})
     check(errors.length===0,'React JS errors '+errors.join(' | '))
   }catch(e){recordFailure('React-'+width,e)}
   finally{await page.close()}
 }
}finally{
 await browser.close()
 writeFileSync(join(output,'results.json'),JSON.stringify({pages:routes.length,variants:variants.length,results,failures},null,2))
}
console.log('ALL_PAGES_RESULTS '+JSON.stringify({pages:routes.length,variants:variants.length,screenshots:results.length,failures}))
if(failures.length)process.exitCode=1
else console.log('ALL_PAGES_REGRESSION_PASSED')
