import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

// Non-destructive, side-by-side UI behavior checks: navigation, translations,
// and skill selection. This cannot prove numeric formula/optimizer equivalence.
const root=process.cwd(),preview=path.join(root,'security-build','protected-preview');
const pages=['TowerSwords_V2.3_Desktop_Release.html','TowerSwords_V2.3_Mobile_Release.html'];
const server=http.createServer(async(req,res)=>{
 try {
  const route=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const match=route.match(/^\/(original|preview)\/(.+)$/);
  if(!match){res.writeHead(404);res.end();return;}
  const base=match[1]==='preview'?preview:root;
  const file=path.resolve(base,match[2]);
  if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
  const body=await fs.readFile(file);
  const mime=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream';
  res.writeHead(200,{'content-type':mime,'cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const digest=async page=>page.evaluate(()=>{
 const normal=t=>(t||'').replace(/\s+/g,' ').trim();
 const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
 return {
   activeSteps:[...document.querySelectorAll('button.step.active')].map(e=>normal(e.textContent)),
   language:[...document.querySelectorAll('button.lang-btn.active')].map(e=>normal(e.textContent)),
   heading:[...document.querySelectorAll('h1,h2,h3')].filter(visible).slice(0,14).map(e=>normal(e.textContent)),
   visibleActions:[...document.querySelectorAll('button')].filter(visible).slice(0,20).map(e=>normal(e.textContent)),
   metricText:[...document.querySelectorAll('[id*="damage"],[id*="dmg"],[class*="damage"],[class*="dmg"],[id*="result"],[class*="result"]')].filter(visible).slice(0,30).map(e=>normal(e.textContent).slice(0,150)),
   skill:document.querySelector('select#skill')?.value??null
 };
});
async function inspect(filename,version){
 const mobile=filename.includes('Mobile');
 const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1365,height:768}});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const reports=[];
 try{
  const response=await page.goto('http://127.0.0.1:'+port+'/'+version+'/'+filename,{waitUntil:'domcontentloaded',timeout:60000});
  if(response.status()!==200)throw new Error('Navigation HTTP '+response.status());
  await page.waitForTimeout(800);
  reports.push(['start',await digest(page)]);
  // Navigation is safe; do not click reset, export, optimizer, or links.
  const steps=page.locator('button.step');
  const stepCount=await steps.count();
  if(stepCount<4)throw new Error('Missing navigation tabs');
  for(const i of [1,2,3,0]){
   await steps.nth(i).click({timeout:10000});
   await page.waitForTimeout(1400);
   reports.push(['tab-'+i,await digest(page)]);
  }
  const lang=page.locator('button.lang-btn');
  if(await lang.count()<4)throw new Error('Missing language buttons');
  for(const i of [1,2,3,0]){
   await lang.nth(i).click({timeout:10000});
   await page.waitForTimeout(1400);
   reports.push(['language-'+i,await digest(page)]);
  }
  // Skill is selected programmatically only if enabled and option present.
  const skill=page.locator('select#skill');
  if(await skill.count()){
   const options=await skill.locator('option').count();
   if(options>1 && await skill.isEnabled()){
    await skill.selectOption({index:1},{timeout:10000});
    await page.waitForTimeout(1400);
    reports.push(['skill-1',await digest(page)]);
   }
  }
  if(errors.length)throw new Error('JavaScript error(s): '+JSON.stringify(errors.slice(0,3)));
  return reports;
 }finally{await ctx.close();}
}
try{
 for(const filename of pages){
  const original=await inspect(filename,'original');
  const protectedResult=await inspect(filename,'preview');
  if(JSON.stringify(original)!==JSON.stringify(protectedResult)){
   const mismatch=original.findIndex((entry,i)=>JSON.stringify(entry)!==JSON.stringify(protectedResult[i]));
   console.error('MISMATCH ORIGINAL',JSON.stringify(original[mismatch]));
   console.error('MISMATCH PROTECTED',JSON.stringify(protectedResult[mismatch]));
   throw new Error('Behavioral parity mismatch at '+filename+' step '+mismatch);
  }
  console.log('FUNCTIONAL PARITY PASS',filename,original.map(x=>x[0]).join(','));
 }
 console.log('UI parity verified for tabs, language buttons, and skill control; numeric formula and optimizer validations remain incomplete.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
