import test from 'node:test';
import assert from 'node:assert/strict';
import {lookup,insert} from '../app/api/fieldtest/storage.js';
test('hosted storage atomically accepts only the first report',async t=>{
 process.env.UPSTASH_REDIS_REST_URL='https://storage.invalid';
 process.env.UPSTASH_REDIS_REST_TOKEN='fixture';
 t.after(()=>{delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN});
 const records=new Map();
 t.mock.method(globalThis,'fetch',async(url,request)=>{
   const [op,key,value,mode]=JSON.parse(request.body);
   if(op==='GET')return Response.json({result:records.get(key)??null});
   assert.equal(op,'SET');assert.equal(mode,'NX');
   if(records.has(key))return Response.json({result:null});
   records.set(key,value);return Response.json({result:'OK'});
 });
 assert.equal(await lookup('abc.report'),null);
 assert.deepEqual(await Promise.all([insert('abc.report',{result:'fixed'}),insert('abc.report',{result:'failed'})]),[true,false]);
 assert.deepEqual(await lookup('abc.report'),{result:'fixed'});
});