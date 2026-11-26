// Browser smoke test of the actual desktop/mobile HTML, not a mocked optimizer.
// Run with: npm install --no-save playwright && node tests/browser-smoke.cjs
'use strict';
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server = http.createServer((req,res)=>{
  const requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const local = path.resolve(root,'.'+requested);
  if (local !== root && !local.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  const file = requested === '/' ? path.join(root,'index.html') : local;
  fs.readFile(file,(error,data)=>{
    if (error) {res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  });
});
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  let failed=false;
  for (const platform of ['desktop','mobile']) {
    const context=await browser.newContext(platform==='mobile'
      ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
      :{viewport:{width:1440,height:900}});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    const url=base+'/index.html?view='+platform;
    const started=Date.now();
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForFunction(()=>!document.documentElement.classList.contains('p10-first-paint')
        && Boolean(document.querySelector('main .screen.active')),null,{timeout:25000});
      const readyMs=Date.now()-started;
      const launch=await page.evaluate(()=>({
        title:document.title,
        firstPage:document.querySelector('main .screen.active h2')?.textContent,
        optimizerFunction:typeof optimizeMax,
        outputFields:['autoStatus','autoDamage','autoEquipmentGrid'].every(id=>!!document.getElementById(id))
      }));
      if (!launch.firstPage?.includes('01') || !launch.outputFields || launch.optimizerFunction!=='function')
        throw Error('First page or optimizer missing: '+JSON.stringify(launch));
      // Test language click handlers without relying on invisible desktop/mobile duplicates.
      let langCount=0;
      for (const lang of ['en','ko','ja','zh-Hant']) {
        await page.evaluate(lang=>{
          const buttons=[...document.querySelectorAll('.lang-btn[data-lang="'+lang+'"]')];
          const visible=buttons.find(b=>b.getClientRects().length>0)||buttons[0];
          if(!visible)throw Error('Missing language '+lang);
          visible.click();
        },lang);
        await sleep(160);
        langCount++;
      }
      // Select one valid skill so the production optimizer has a real damage target.
      const selectedSkill=await page.evaluate(()=>{
        const select=document.querySelector('#skill');
        if(!select)throw Error('Missing skill selection');
        const candidate=[...select.options].find(o=>o.value!=='' && !o.disabled);
        if(!candidate)throw Error('No valid selectable skill');
        select.value=candidate.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        return candidate.value;
      });
      await page.waitForTimeout(200);
      // Navigate to equipment configuration and switch to optimizer mode.
      await page.evaluate(()=>{
        const button=document.querySelectorAll('nav.steps button.step')[2];
        if(!button)throw Error('Missing page 03 navigation');
        button.click();
        const mode=document.querySelector('button.mode[data-mode="auto"]');
        if(!mode)throw Error('Missing optimizer mode');
        mode.click();
      });
      await page.waitForTimeout(450);
      const mode=await page.evaluate(()=>({
        autoPaneVisible:!!document.querySelector('#autoPane')&&!document.querySelector('#autoPane').hidden,
        activePage:(document.querySelector('main .screen.active h2')?.textContent||'').trim(),
        status:(document.querySelector('#autoStatus')?.textContent||'').trim(),
        damage:(document.querySelector('#autoDamage')?.textContent||'').trim()
      }));
      if(!mode.activePage.includes('03')||!mode.autoPaneVisible)
        throw Error('Unable to enter optimizer UI: '+JSON.stringify(mode));
      // Trigger the real app's Start Optimization button and wait for a calculated outcome.
      const searchStart=Date.now();
      await page.locator('#p10-r43-run').click({timeout:8000,force:true});
      await page.waitForFunction(()=>{
        const text=(document.querySelector('#autoStatus')?.textContent||'').trim();
        const damage=(document.querySelector('#autoDamage')?.textContent||'').trim();
        return (damage!=='' && damage!=='—') || /搜尋失敗|請先選擇|搜尋未執行/.test(text);
      },null,{timeout:45000});
      const searchMs=Date.now()-searchStart;
      const result=await page.evaluate(()=>({
        status:(document.querySelector('#autoStatus')?.textContent||'').trim(),
        damage:(document.querySelector('#autoDamage')?.textContent||'').trim(),
        equipmentCards:document.querySelector('#autoEquipmentGrid')?.children.length||0,
        failureMessage:/(搜尋失敗|請先選擇|搜尋未執行)/.test(document.querySelector('#autoStatus')?.textContent||'')
      }));
      console.log(JSON.stringify({platform,readyMs,launch,langCount,selectedSkill,mode,searchMs,result,pageErrors:errors.slice(0,8)}));
      if (result.failureMessage || result.damage==='—' || result.damage==='' || errors.length)
        throw Error('Optimizer did not return valid damage: '+JSON.stringify({result,errors:errors.slice(0,4)}));
    }catch(error){
      failed=true;
      console.error(platform+' FAIL '+error.stack);
      const dir=path.join(root,'test-results');fs.mkdirSync(dir,{recursive:true});
      try{await page.screenshot({path:path.join(dir,platform+'-failure.png'),fullPage:true,timeout:4000});}catch(_){}
      fs.writeFileSync(path.join(dir,platform+'-errors.json'),JSON.stringify({message:String(error),errors},null,2));
    }finally{await context.close();}
  }
  await browser.close();
  server.close();
  if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1});
