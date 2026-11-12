import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';

// Examine ONLY the generated artifact, never mutate working sources.
// A static website must send its runtime code to visitors. This gate reduces
// accidental source disclosure; it is not copy protection or encryption.
const root=path.resolve('security-build/protected-preview');
const expectedHtml=new Set(['index.html','TowerSwords_V2.3_Desktop_Release.html','TowerSwords_V2.3_Mobile_Release.html']);
const allowedMedia=new Set(['.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.avif','.woff','.woff2','.ttf','.otf']);
const files=[];
async function walk(dir,relative=''){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const rel=path.posix.join(relative,entry.name);
  if(entry.isSymbolicLink())throw new Error('FAIL symlink in web output: '+rel);
  if(entry.isDirectory()){await walk(path.join(dir,entry.name),rel);continue;}
  if(!entry.isFile())throw new Error('FAIL unusual file in web output: '+rel);
  files.push(rel);
 }
}
await walk(root);
function assert(condition,message){if(!condition)throw new Error('PUBLIC BUNDLE AUDIT FAILED: '+message);}
const actualHtml=new Set(files.filter(x=>x.endsWith('.html')));
assert([...expectedHtml].every(x=>actualHtml.has(x)) && actualHtml.size===expectedHtml.size,'Missing or unexpected HTML files');
for(const file of files){
 if(expectedHtml.has(file)||file==='manifest.json')continue;
 assert(file.startsWith('assets/'),'Unexpected non-media file: '+file);
 assert(allowedMedia.has(path.extname(file).toLowerCase()),'Forbidden media file type: '+file);
}
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
const bundleAssets=files.filter(x=>x.startsWith('assets/'));
assert(bundleAssets.length===manifest.assets.length,'Manifest media count mismatch');
for(const entry of manifest.assets)assert(bundleAssets.includes('assets/'+entry.file),'Unlisted asset in manifest: '+entry.file);
for(const name of expectedHtml){
 const html=await fs.readFile(path.join(root,name),'utf8');
 assert(!/sourceMappingURL\s*=|sourcesContent\s*:/.test(html),'Source map marker in '+name);
 const doc=parse(html);
 let scriptCount=0,externalScripts=0;
 function visit(node){
  if(node.tagName==='script'){
   scriptCount++;
   if((node.attrs||[]).some(a=>a.name==='src'))externalScripts++;
  }
  for(const c of node.childNodes||[])visit(c);
 }
 visit(doc);
 assert(scriptCount>0,'No scripts in '+name);
 console.log('AUDIT PASS',name,'scripts',scriptCount,'external',externalScripts);
}
console.log('PUBLIC BUNDLE FILE ALLOWLIST PASS',files.length,'files (including media + manifest)');
console.log('NOTE: compiled/minified JS is still downloadable by website visitors.');
