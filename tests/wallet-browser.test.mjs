import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

function bootstrap(){
 const controls=new Map();
 const control=key=>{
  if(!controls.has(key))controls.set(key,{hidden:false,disabled:false,textContent:'',setAttribute(){}});
  return controls.get(key);
 };
 let dialog;
 const context={
  URL,URLSearchParams,AbortSignal,Error,Promise,setTimeout,clearTimeout,
  location:{href:'https://fieldwork.test/fieldwork.html#signin',hash:'#signin',search:'',pathname:'/fieldwork.html'},
  history:{replaceState(){}},
  sessionStorage:{removeItem(){},getItem(){return null},setItem(){}},
  CustomEvent:class{constructor(type,data){this.type=type;Object.assign(this,data)}},
  fetch:async()=>Response.json({session:null})
 };
 context.document={
  currentScript:{src:'https://fieldwork.test/wallet.bundle.js'},
  querySelector:control,
  createElement(){
   dialog={open:false,innerHTML:'',setAttribute(){},addEventListener(){},querySelector:control,querySelectorAll:()=>[],showModal(){this.open=true},close(){this.open=false}};
   return dialog;
  },
  body:{append(){}}
 };
 context.window={dispatchEvent(){}};
 vm.createContext(context);
 vm.runInContext(readFileSync(new URL('../public/wallet.bundle.js',import.meta.url),'utf8'),context);
 return {context,control,get dialog(){return dialog}};
}

test('wallet chooser registers without an SDK and immediately offers compatible NEAR wallets',()=>{
 const page=bootstrap();
 assert.equal(typeof page.context.window.FieldworkWallet.connect,'function');
 page.context.window.FieldworkWallet.connect(false);
 assert.equal(page.dialog.open,true);
 for(const id of ['hot-wallet','meteor-wallet','my-near-wallet'])assert.match(page.dialog.innerHTML,new RegExp('data-wallet-choice="'+id+'"'));
 assert.doesNotMatch(page.dialog.innerHTML,/MetaMask|Solana|Ethereum/);
});

test('failed adapter loading leaves a retryable chooser and exposes an error',async()=>{
 const page=bootstrap();
 page.context.window.FieldworkWallet.connect(false);
 await page.context.window.FieldworkWallet.choose('hot-wallet');
 assert.equal(page.dialog.open,true);
 assert.equal(page.control('[data-wallet-continue]').hidden,true);
 assert.ok(page.control('[data-picker-status]').textContent.length>0);
 // A second attempt completes with another visible error, rather than hanging.
 await page.context.window.FieldworkWallet.choose('meteor-wallet');
 assert.equal(page.control('[data-wallet-continue]').hidden,true);
});

test('compiled NEAR provider evaluates in a browser context without Node process or Buffer globals',()=>{
 const script=`
 import vm from 'node:vm';
 import {readFileSync} from 'node:fs';
 import {webcrypto} from 'node:crypto';
 const storage={getItem(){return null},setItem(){},removeItem(){}};
 const context=vm.createContext({
  console,URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,ArrayBuffer,DataView,
  setTimeout,clearTimeout,setInterval,clearInterval,queueMicrotask,AbortController,AbortSignal,crypto:webcrypto,
  fetch:async()=>{throw Error('Unexpected network request during module evaluation')},
  location:{href:'https://fieldwork.test/',origin:'https://fieldwork.test',protocol:'https:',hostname:'fieldwork.test'},
  navigator:{userAgent:'Mozilla/5.0',language:'en'},localStorage:storage,sessionStorage:storage,
  document:{cookie:'',addEventListener(){},removeEventListener(){},querySelector(){return null},createElement(){return {style:{},setAttribute(){},appendChild(){}}}},
  addEventListener(){},removeEventListener(){},dispatchEvent(){},
  atob:value=>Buffer.from(value,'base64').toString('binary'),
  btoa:value=>Buffer.from(value,'binary').toString('base64')
 });
 vm.runInContext('window=globalThis;self=globalThis;',context);
 const module=new vm.SourceTextModule(readFileSync('public/wallet-provider.bundle.js','utf8'),{context});
 await module.link(()=>{throw Error('Unexpected unbundled provider dependency')});
 await module.evaluate();
 for(const key of ['prepare','connect','sign','disconnect'])if(typeof module.namespace[key]!=='function')throw Error('Missing '+key);
 `;
 execFileSync(process.execPath,['--experimental-vm-modules','--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),stdio:'pipe',timeout:15000});
});
