const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.R60_ENCRYPTION_KEY='a'.repeat(64);
process.env.R60_ALLOWED_ORIGIN='https://example.org';
process.env.R60_GITHUB_APP_CLIENT_ID='test-app';
process.env.R60_CALLBACK_URL='https://service.example/api/r60/callback';
process.env.R60_ADMIN_GITHUB_USER_ID='12345';
const handler=require('./api/r60.js');
async function request(url,{method='GET',origin='https://example.org',headers={},body}={}){
 const req={url,method,headers:{origin,...headers},body};
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=value||'';}};
 await handler(req,res);
 return {status:res.statusCode,headers:res.headers,data:(res.headers['Content-Type']||'').includes('application/json')?JSON.parse(res.body):res.body};
}
(async()=>{
 const denied=await request('/api/r60/save',{method:'POST',origin:'https://bad.example',body:{}});
 assert.equal(denied.status,403);
 const noToken=await request('/api/r60/save',{method:'POST',body:{}});
 assert.equal(noToken.status,400);
 assert.match(noToken.data.error,/Login required/);
 const badNonce=await request('/api/r60/start?nonce=short');
 assert.equal(badNonce.status,400);
 const noOrigin=await request('/api/r60/start?nonce='+'0'.repeat(32),{origin:'https://evil.invalid'});
 assert.equal(noOrigin.status,403);
 const allowed=await request('/api/r60/start?nonce='+'0'.repeat(32));
 assert.equal(allowed.status,302);
 assert.match(allowed.headers.Location,/github.com\/login\/oauth\/authorize/);
 assert.match(allowed.headers.Location,/state=/);
 console.log('R60 bridge tests pass: CORS deny, no-token deny, bad nonce deny, OAuth redirect');
})().catch(e=>{console.error(e);process.exitCode=1;});
