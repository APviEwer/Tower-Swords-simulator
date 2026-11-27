// R60 minimal GitHub App user OAuth bridge. Requires private server environment; NOT deployable on GitHub Pages.
// Routes: GET /api/r60/start?nonce=<32 hex>, GET /api/r60/callback,
//         GET /api/r60/snapshot, POST /api/r60/save.
// Intended for a serverless Node host. Never publish these environment values.
const crypto = require("node:crypto");
const OWNER = "APviEwer";
const REPO = "Tower-Swords-simulator";
const BRANCH = "test/r60-one-click-authorized-save-20261127";
const PATH = "data/traits.json";
const api = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + PATH;
const byteLimit = 128000;
const expected = {max:[20,12],trait:[19,14]};
const key = () => {
  const hex = process.env.R60_ENCRYPTION_KEY || "";
  if(!/^[a-f0-9]{64}$/i.test(hex)) throw Error("R60 encryption key not configured");
  return Buffer.from(hex,"hex");
};
const origin = () => {
  const value=process.env.R60_ALLOWED_ORIGIN||"";
  if(!/^https:\/\/[^/]+$/.test(value)) throw Error("Origin not configured");
  return value;
};
const b64 = v=>Buffer.from(v).toString("base64url");
const hmac = v=>crypto.createHmac("sha256",key()).update(v).digest("base64url");
const secureEq = (a,b)=>typeof a==="string" && typeof b==="string" && a.length===b.length && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
function seal(obj) {
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);
  const body=Buffer.concat([cipher.update(JSON.stringify(obj),"utf8"),cipher.final()]);
  return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),body.toString("base64url")].join(".");
}
function unseal(str) {
  const p=String(str||"").split(".");
  if(p.length!==3) throw Error("Invalid session");
  const dec=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(p[0],"base64url"));
  dec.setAuthTag(Buffer.from(p[1],"base64url"));
  const obj=JSON.parse(Buffer.concat([dec.update(Buffer.from(p[2],"base64url")),dec.final()]).toString("utf8"));
  if(!obj.exp || Date.now()>obj.exp || typeof obj.token!=="string")throw Error("Expired session");
  return obj;
}
function validate(doc,old) {
  if(!doc||typeof doc!=="object"||Object.keys(doc).sort().join(",")!=="data,kind,schema"||doc.schema!==1||doc.kind!=="traits")throw Error("Invalid schema");
  if(!doc.data||Object.keys(doc.data).sort().join(",")!=="max,trait")throw Error("Invalid tables");
  for(const [name,[len,width]] of Object.entries(expected)) {
    const table=doc.data[name],reference=old.data[name];
    if(!table||!Array.isArray(table.cols)||table.cols.length!==width||!Array.isArray(table.rows)||table.rows.length!==len)throw Error("Invalid "+name+" shape");
    if(JSON.stringify(table.cols)!==JSON.stringify(reference.cols))throw Error("Cannot modify table columns");
    for(let i=0;i<len;i++){
      const row=table.rows[i],oldRow=reference.rows[i];
      if(!Array.isArray(row)||row.length!==width+2||row.some(v=>typeof v!=="string"||v.length>250))throw Error("Invalid "+name+" row "+i);
      if(row[0]!==oldRow[0]||row[1]!==oldRow[1])throw Error("Cannot modify table identities");
    }
  }
  if(Buffer.byteLength(JSON.stringify(doc),"utf8")>byteLimit)throw Error("Payload too large");
}
async function github(url,token,opts={}) {
  const headers={"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"TowerSwords-R60",...opts.headers};
  if(token)headers.Authorization="Bearer "+token;
  const response=await fetch(url,{...opts,headers});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=Error("GitHub API returned "+response.status);
    error.status=response.status; throw error;
  }
  return payload;
}
function json(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data));}
function allow(res){res.setHeader("Access-Control-Allow-Origin",origin());res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");res.setHeader("Vary","Origin");res.setHeader("Cache-Control","no-store");}
function callbackPage(res,nonce,grant){
  const message=JSON.stringify({type:"r60-auth",nonce,grant}).replace(/</g,"\\u003c");
  const target=JSON.stringify(origin());
  res.setHeader("Content-Type","text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
  res.end('<!doctype html><meta charset="utf-8"><title>GitHub 授權完成</title><script>if(window.opener){window.opener.postMessage('+message+','+target+');window.close()}</script><p>授權完成，可返回編輯頁。</p>');
}
module.exports = async function(req,res){
  try{
    const allowed=origin(),requestOrigin=req.headers.origin;
    if(requestOrigin && requestOrigin!==allowed){json(res,403,{error:"Origin denied"});return;}
    allow(res);
    if(req.method==="OPTIONS"){res.statusCode=204;res.end();return;}
    const u=new URL(req.url,"https://service.invalid"),action=u.pathname.split("/").pop();
    if(action==="start" && req.method==="GET"){
      const nonce=u.searchParams.get("nonce");
      if(!/^[a-f0-9]{32}$/i.test(nonce||""))throw Error("Invalid login nonce");
      const payload=b64(JSON.stringify({nonce,ts:Date.now()}));
      const state=payload+"."+hmac(payload);
      const q=new URLSearchParams({client_id:process.env.R60_GITHUB_APP_CLIENT_ID,redirect_uri:process.env.R60_CALLBACK_URL,state});
      res.statusCode=302;res.setHeader("Location","https://github.com/login/oauth/authorize?"+q);res.end();return;
    }
    if(action==="callback" && req.method==="GET"){
      const state=u.searchParams.get("state")||"",p=state.split(".");
      if(p.length!==2||!secureEq(hmac(p[0]),p[1]))throw Error("Invalid OAuth state");
      const s=JSON.parse(Buffer.from(p[0],"base64url").toString("utf8"));
      if(Date.now()-s.ts>300000||s.ts>Date.now()+30000||!/^[a-f0-9]{32}$/i.test(s.nonce))throw Error("OAuth state expired");
      const code=u.searchParams.get("code");if(!code)throw Error("Missing GitHub code");
      const exchange=await github("https://github.com/login/oauth/access_token",null,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({client_id:process.env.R60_GITHUB_APP_CLIENT_ID,client_secret:process.env.R60_GITHUB_APP_CLIENT_SECRET,code,redirect_uri:process.env.R60_CALLBACK_URL})
      });
      if(!exchange.access_token)throw Error("GitHub OAuth token unavailable");
      const user=await github("https://api.github.com/user",exchange.access_token);
      const allowedId=Number(process.env.R60_ADMIN_GITHUB_USER_ID);
      if(!Number.isSafeInteger(allowedId)||allowedId<=0||Number(user.id)!==allowedId)throw Error("Not an authorized administrator");
      callbackPage(res,s.nonce,seal({token:exchange.access_token,uid:user.id,exp:Date.now()+15*60*1000}));return;
    }
    if(action==="snapshot" && req.method==="GET"){
      const latest=await github(api+"?ref="+encodeURIComponent(BRANCH),null);
      const doc=JSON.parse(Buffer.from(latest.content,"base64").toString("utf8"));
      json(res,200,{sha:latest.sha,data:doc});return;
    }
    if(action==="save" && req.method==="POST"){
      const bearer=req.headers.authorization||"";
      if(!bearer.startsWith("Bearer "))throw Error("Login required");
      const session=unseal(bearer.slice(7));
      const allowedId=Number(process.env.R60_ADMIN_GITHUB_USER_ID);
      if(!allowedId||session.uid!==allowedId)throw Error("Admin identity denied");
      const user=await github("https://api.github.com/user",session.token);
      if(Number(user.id)!==allowedId)throw Error("Admin identity mismatch");
      const raw=typeof req.body==="string"?req.body:JSON.stringify(req.body||{});
      if(Buffer.byteLength(raw)>byteLimit+4000)throw Error("Request too large");
      const body=JSON.parse(raw);
      if(typeof body.sha!=="string"||!body.sha.match(/^[a-f0-9]{40}$/i))throw Error("Invalid base SHA");
      const latest=await github(api+"?ref="+encodeURIComponent(BRANCH),session.token);
      if(latest.sha!==body.sha){json(res,409,{error:"資料已被更新，請重新載入後再編輯"});return;}
      const previous=JSON.parse(Buffer.from(latest.content,"base64").toString("utf8"));
      validate(body.data,previous);
      const content=Buffer.from(JSON.stringify(body.data,null,2)+"\n","utf8").toString("base64");
      const done=await github(api,session.token,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        message:"data(test): save edited trait values via authorized R60 bridge",
        branch:BRANCH,sha:latest.sha,content
      })});
      json(res,200,{ok:true,sha:done.content.sha,commit:done.commit.sha});return;
    }
    json(res,404,{error:"Unknown endpoint"});
  }catch(error){
    // Never log tokens, payload, OAuth code, secrets or full request URLs.
    const status=error.status===403?403:error.status===409?409:400;
    json(res,status,{error:status===403?"沒有權限執行此操作":String(error.message||"Request failed")});
  }
};
