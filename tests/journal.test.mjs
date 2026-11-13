import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('campaign rejects invalid reward, reopens incomplete evidence, and keeps failed retest open',()=>{
 const root={insertAdjacentHTML(){}},status={},storage=new Map();
 const context={document:{querySelector(s){return s==='#screen'?root:s==='#message'?status:null}},location:{hash:'#workspace'},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},FormData:class{constructor(form){return Object.entries(form.fields)}},addEventListener(){}};
 vm.runInNewContext(readFileSync(new URL('../public/fieldwork.js',import.meta.url),'utf8'),context);
 function submit(id,fields,stage){root.onsubmit({target:{id,fields,dataset:{}},preventDefault(){}});assert.equal(JSON.parse(storage.get('fieldwork.journal')).campaigns[0].step,stage)}
 submit('create',{name:'Wallet',pitch:'Connect a wallet'},0);
 submit('stage',{action:'Connect',expected:'Address appears'},1);
 submit('stage',{device:'Android'},2);
 submit('stage',{decision:'Request evidence'},2);
 submit('stage',{decision:'Accept report'},3);
 submit('stage',{amount:'-1'},3);
 submit('stage',{amount:'10'},4);
 submit('stage',{decision:'Still failing'},4);
 submit('stage',{decision:'Fixed'},5);
});