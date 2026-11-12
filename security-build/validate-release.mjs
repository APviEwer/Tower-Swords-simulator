import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'parse5';

const root=process.cwd();
const sourceDir=path.join(root,'security-build','protected-preview');
const expectedFiles=['index.html','TowerSwords_V2.3_Desktop_Release.html','TowerSwords_V2.3_Mobile_Release.html'];
const manifest=JSON.parse(await fs.readFile(path.join(sourceDir,'manifest.json'),'utf8'));
const error=(message)=>{throw new Error('SECURITY RELEASE GATE FAILED: '+message);};
if(manifest.releaseKind!=='unpublished-protected-preview')error('Unexpected release type.');
if(!Array.isArray(manifest.files)||manifest.files.length!==expectedFiles.length)error('Manifest incomplete.');
function visit(node,cb){cb(node);for(const child of node.childNodes||[])visit(child,cb);}
for(const filename of expectedFiles){
  const entry=manifest.files.find(x=>x.file===filename);
  if(!entry)error('Missing file: '+filename);
  const html=await fs.readFile(path.join(sourceDir,filename),'utf8');
  const hash=crypto.createHash('sha256').update(html).digest('hex');
  if(hash!==entry.sha256)error('File checksum changed: '+filename);
  if(html.length<100)error('Unexpectedly small HTML: '+filename);
  const document=parse(html);
  let title=false, head=false, body=false, scripts=0;
  visit(document,node=>{if(node.tagName==='title')title=true;if(node.tagName==='head')head=true;if(node.tagName==='body')body=true;if(node.tagName==='script')scripts++;});
  if(!title||!head||!body)error('Incomplete HTML document: '+filename);
  if(filename==='index.html' && !html.includes('TowerSwords_V2.3_Mobile_Release.html'))error('Mobile routing lost.');
  if(filename==='index.html' && !html.includes('TowerSwords_V2.3_Desktop_Release.html'))error('Desktop routing lost.');
  console.log('PASS',filename,entry.sourceBytes,'=>',entry.releaseBytes,'bytes, scripts',scripts);
}
console.log('CHECKSUM + STRUCTURE PASS. Browser and optimizer result testing are still required before official deployment.');
