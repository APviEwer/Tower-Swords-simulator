import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

// Compare the original and protected builds under the same real browser engine.
// This is a startup/layout regression check, NOT an optimizer correctness proof.
const root=process.cwd();
const preview=path.join(root,'security-build','protected-preview');
const files=['TowerSwords_V2.3_Desktop_Release.html','TowerSwords_V2.3_Mobile_Release.html'];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const route=url.pathname;
    const protectedFile=route.startsWith('/preview/');
    const local=decodeURIComponent(route.replace(/^\/(preview|original)\//,''));
    if(!route.startsWith('/preview/') && !route.startsWith('/original/')){res.writeHead(404);res.end();return;}
    const base=protectedFile?preview:root;
    const file=path.resolve(base,local);
    if(!(file===base || file.startsWith(base+path.sep))){res.writeHead(403);res.end();return;}
    const bytes=await fs.readFile(file);
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
    res.end(bytes);
  }catch(e){res.writeHead(404);res.end('Not Found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try {
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const filename of files){
   const mobile=filename.includes('Mobile');
   const opts=mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1365,height:768}};
   const results=[];
   for(const version of ['original','preview']){
     const context=await browser.newContext(opts);
     const page=await context.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(String(e.message||e)));
     const address='http://127.0.0.1:'+port+'/'+version+'/'+filename;
     const response=await page.goto(address,{waitUntil:'domcontentloaded',timeout:60000});
     await page.waitForTimeout(2500);
     const data=await page.evaluate(()=>({
       title:document.title,
       textLength:document.body?.innerText?.length||0,
       buttons:document.querySelectorAll('button').length,
       inputs:document.querySelectorAll('input,select,textarea').length,
       scripts:document.querySelectorAll('script').length,
       rootChildren:document.body?.children.length||0
     }));
     results.push({...data,errors,httpStatus:response.status()});
     await context.close();
   }
   const [oldVersion,newVersion]=results;
   if(oldVersion.httpStatus!==200||newVersion.httpStatus!==200)throw Error('HTTP startup failed: '+filename);
   if(oldVersion.title!==newVersion.title)throw Error('Document title changed: '+filename);
   if(!oldVersion.textLength||!newVersion.textLength)throw Error('Missing rendered content: '+filename);
   if(newVersion.buttons!==oldVersion.buttons||newVersion.inputs!==oldVersion.inputs)throw Error('Interactive control count changed: '+filename);
   if(newVersion.rootChildren!==oldVersion.rootChildren)throw Error('Page root structure changed: '+filename);
   if(newVersion.errors.length>oldVersion.errors.length)throw Error('New JS page errors: '+filename+' '+JSON.stringify(newVersion.errors.slice(0,4)));
   console.log('BROWSER STARTUP PASS',filename,JSON.stringify({original:oldVersion,protected:newVersion}));
 }
 console.log('PASS: real Chromium startup comparison. Full formula and optimizer regression is still mandatory before live deployment.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
