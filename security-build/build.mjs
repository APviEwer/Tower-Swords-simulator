import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'parse5';
import { minify } from 'terser';

// Preview only. The release HTML is never overwritten by this program.
const root=path.resolve(process.cwd());
const out=path.join(root,'security-build','protected-preview');
const originals=['index.html','TowerSwords_V2.3_Desktop_Release.html','TowerSwords_V2.3_Mobile_Release.html'];
const ensure=(v,m)=>{if(!v)throw new Error(m)};
function walk(node,callback) {callback(node);for(const child of node.childNodes||[])walk(child,callback);}
await fs.mkdir(out,{recursive:true});
const summary=[];
for(const filename of originals){
 const source=await fs.readFile(path.join(root,filename),'utf8');
 const tree=parse(source,{sourceCodeLocationInfo:true});
 const replacements=[];
 walk(tree,node=>{
   if(node.tagName!=='script'||!node.sourceCodeLocation?.startTag||!node.sourceCodeLocation?.endTag)return;
   const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
   if('src' in attrs)return;
   const type=(attrs.type||'').trim().toLowerCase();
   if(type && !['module','text/javascript','application/javascript'].includes(type))return;
   const start=node.sourceCodeLocation.startTag.endOffset,end=node.sourceCodeLocation.endTag.startOffset;
   if(end>start && source.slice(start,end).trim())replacements.push({start,end,code:source.slice(start,end),module:type==='module'});
 });
 let result=source;let changed=0;
 for(const r of replacements.sort((a,b)=>b.start-a.start)){
   const output=await minify(r.code,{
     module:r.module,
     compress:{defaults:true,passes:1},
     mangle:{toplevel:false},
     format:{comments:false,ascii_only:false},
     sourceMap:false
   });
   ensure(output.code,'Minifier yielded empty output in '+filename);
   // Do not allow an embedded JS string to prematurely close the HTML script.
   ensure(!output.code.toLowerCase().includes('</script'),'Unsafe script closing sequence in '+filename);
   result=result.slice(0,r.start)+output.code+result.slice(r.end);
   changed++;
 }
 // Never publish dev source maps, debug dumps or unminified script text as separate files.
 await fs.writeFile(path.join(out,filename),result);
 summary.push({file:filename,sourceBytes:Buffer.byteLength(source),releaseBytes:Buffer.byteLength(result),inlineScriptsProcessed:changed,sha256:crypto.createHash('sha256').update(result).digest('hex')});
}

// Release images/fonts alongside HTML, but reject executable or undocumented files.
// No source code, configuration, logs, or source maps are copied from assets/.
const allowedAssetExtensions=new Set(['.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.avif','.woff','.woff2','.ttf','.otf']);
const assetsSrc=path.join(root,'assets'),assetsDst=path.join(out,'assets');
const assetEntries=[];
async function copyPublicAssets(relative=''){
 const dir=path.join(assetsSrc,relative);
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const rel=path.join(relative,entry.name),src=path.join(assetsSrc,rel),dst=path.join(assetsDst,rel);
  if(entry.isSymbolicLink())throw new Error('Symlink not allowed in public assets: '+rel);
  if(entry.isDirectory()){await copyPublicAssets(rel);continue;}
  if(!entry.isFile())throw new Error('Unsupported asset: '+rel);
  const ext=path.extname(entry.name).toLowerCase();
  ensure(allowedAssetExtensions.has(ext),'Non-media asset may contain private source: '+rel);
  await fs.mkdir(path.dirname(dst),{recursive:true});
  await fs.copyFile(src,dst);
  const bytes=await fs.readFile(dst);
  assetEntries.push({file:rel.replaceAll(path.sep,'/'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
}
await copyPublicAssets();

await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({releaseKind:'unpublished-protected-preview',createdAt:new Date().toISOString(),files:summary,assets:assetEntries},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
console.log('Protected preview built. Official main branch was NOT changed.');
