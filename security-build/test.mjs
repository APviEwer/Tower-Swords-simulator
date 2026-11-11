import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
const root=process.cwd();
const out=path.join(root,'security-build','protected-preview');
const originals=['index.html','TowerSwords_V2.3_Desktop_Release.html','TowerSwords_V2.3_Mobile_Release.html'];
let failed=false;
for(const filename of originals){
 const before=await fs.readFile(path.join(root,filename),'utf8');
 const after=await fs.readFile(path.join(out,filename),'utf8');
 const a=parse(before),b=parse(after);
 const count=node=>Number(node.tagName==='script')+(node.childNodes||[]).reduce((s,c)=>s+count(c),0);
 const scriptsBefore=count(a),scriptsAfter=count(b);
 const ok=scriptsBefore===scriptsAfter && after.length>0 && /<html/i.test(after);
 console.log(filename,ok?'STRUCTURE PASS':'STRUCTURE FAIL',scriptsBefore,scriptsAfter);
 if(!ok)failed=true;
}
console.log('NOTE: Structure checks alone cannot verify calculation, UI, languages or optimizer. Browser regression is REQUIRED before release.');
if(failed)process.exitCode=1;
