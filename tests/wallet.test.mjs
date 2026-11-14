import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign, createHash} from 'node:crypto';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {GET, POST} from '../app/api/wallet/route.js';
import {nep413Digest} from '../app/api/wallet/verify.js';
import {sealWalletValue, requireWalletSession} from '../app/api/shared/wallet-session.js';

function base58(bytes) {
  const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let number=BigInt('0x'+bytes.toString('hex'));
  let text='';
  while(number){text=alphabet[Number(number%58n)]+text;number/=58n}
  for(const byte of bytes){if(byte!==0)break;text='1'+text}
  return text;
}

test('NEAR sign-in verifies NEP413, key ownership, origin, expiry, replay and session cookie', async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'fieldwork-wallet-'));
  const oldFetch=globalThis.fetch;
  process.env.FIELDWORK_SESSION_SECRET='test-only-wallet-secret-with-more-than-32-characters';
  process.env.FIELDWORK_DATA_DIR=directory;
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  const key='ed25519:'+base58(publicKey.export({type:'spki',format:'der'}).subarray(-32));
  let access='FullAccess',queries=0;
  globalThis.fetch=async (url,options)=>{
    queries++;
    const body=JSON.parse(options.body);
    assert.equal(body.params.account_id,'builder.near');
    assert.equal(body.params.public_key,key);
    return Response.json({result:{permission:access}});
  };
  const request=(data,cookie='',origin='https://fieldwork.test')=>new Request('https://fieldwork.test/api/wallet',{method:'POST',headers:{origin,cookie},body:JSON.stringify(data)});
  const issue=async()=>{
    const response=await POST(request({op:'challenge'}));
    assert.equal(response.status,200);
    return {challenge:await response.json(),cookie:response.headers.get('set-cookie').split(';')[0]};
  };
  const signed=challenge=>({op:'verify',id:challenge.id,accountId:'builder.near',publicKey:key,signature:sign(null,nep413Digest(challenge),privateKey).toString('base64')});
  try{
    assert.equal((await POST(request({op:'challenge'},'','https://evil.test'))).status,403);
    const {challenge,cookie}=await issue();
    assert.equal(Buffer.from(challenge.nonce,'base64').length,32);
    assert.equal((await POST(request(signed(challenge),'') )).status,401);
    const badSignature=signed(challenge);badSignature.signature=Buffer.alloc(64).toString('base64');
    assert.equal((await POST(request(badSignature,cookie))).status,401);
    assert.equal(queries,0);
    const verified=await POST(request(signed(challenge),cookie));
    assert.equal(verified.status,200);
    const sessionCookie=verified.headers.get('set-cookie');
    assert.match(sessionCookie,/HttpOnly/);assert.match(sessionCookie,/Secure/);
    const getRequest=new Request('https://fieldwork.test/api/wallet',{headers:{cookie:sessionCookie.split(';')[0]}});
    assert.equal((await (await GET(getRequest)).json()).session.accountId,'builder.near');
    assert.equal(requireWalletSession(new Request('https://fieldwork.test',{headers:{cookie:sessionCookie.split(';')[0],origin:'https://evil.test'}})),null);
    assert.equal((await POST(request(signed(challenge),cookie))).status,409);
    const second=await issue();access={FunctionCall:{receiver_id:'evil.near'}};
    assert.equal((await POST(request(signed(second.challenge),second.cookie))).status,401);
    const expired={...second.challenge,expires:Date.now()-1};
    assert.equal((await POST(request(signed(second.challenge),'fieldwork_challenge='+sealWalletValue(expired)))).status,401);
    const logout=await POST(request({op:'logout'},sessionCookie));
    assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
  }finally{
    globalThis.fetch=oldFetch;
    delete process.env.FIELDWORK_SESSION_SECRET;delete process.env.FIELDWORK_DATA_DIR;
    await rm(directory,{recursive:true,force:true});
  }
});

test('each NEAR adapter verifies its exact optional callback payload',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'fieldwork-wallet-modes-'));
 const previous={secret:process.env.FIELDWORK_SESSION_SECRET,data:process.env.FIELDWORK_DATA_DIR,fetch:globalThis.fetch};
 process.env.FIELDWORK_SESSION_SECRET='wallet-adapter-test-secret-more-than-32-characters';
 process.env.FIELDWORK_DATA_DIR=directory;
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');
 const key='ed25519:'+base58(publicKey.export({type:'spki',format:'der'}).subarray(-32));
 const request=(data,cookie='')=>new Request('https://fieldwork.test/api/wallet',{method:'POST',headers:{origin:'https://fieldwork.test',cookie},body:JSON.stringify(data)});
 globalThis.fetch=async()=>Response.json({result:{permission:'FullAccess'}});
 function independentPayload(challenge,callback){
  const tag=Buffer.alloc(4);tag.writeUInt32LE(2147484061);
  const string=value=>{const data=Buffer.from(value);const size=Buffer.alloc(4);size.writeUInt32LE(data.length);return Buffer.concat([size,data])};
  return createHash('sha256').update(Buffer.concat([tag,string(challenge.message),Buffer.from(challenge.nonce,'base64'),string(challenge.recipient),Buffer.from([callback?1:0]),...(callback?[string(callback)]:[])])).digest();
 }
 try{
  assert.equal((await POST(request({op:'challenge',walletId:'ethereum'}))).status,400);
  for(const walletId of ['my-near-wallet','meteor-wallet','hot-wallet']){
   const response=await POST(request({op:'challenge',walletId}));
   const challenge=await response.json(),cookie=response.headers.get('set-cookie').split(';')[0];
   const callback=walletId==='my-near-wallet'?'https://fieldwork.test/fieldwork.html':null;
   assert.equal(challenge.callbackUrl,callback);
   assert.equal(challenge.walletId,walletId);
   const data={op:'verify',id:challenge.id,accountId:'builder.near',publicKey:key};
   const wrongCallback=callback?null:'https://fieldwork.test/fieldwork.html';
   const wrong=sign(null,independentPayload(challenge,wrongCallback),privateKey).toString('base64');
   assert.equal((await POST(request({...data,walletId:'my-near-wallet',signature:wrong},cookie))).status,401);
   const signature=sign(null,independentPayload(challenge,callback),privateKey).toString('base64');
   assert.equal((await POST(request({...data,signature},cookie))).status,200);
  }
 }finally{
  globalThis.fetch=previous.fetch;
  if(previous.secret===undefined)delete process.env.FIELDWORK_SESSION_SECRET;else process.env.FIELDWORK_SESSION_SECRET=previous.secret;
  if(previous.data===undefined)delete process.env.FIELDWORK_DATA_DIR;else process.env.FIELDWORK_DATA_DIR=previous.data;
  await rm(directory,{recursive:true,force:true});
 }
});
