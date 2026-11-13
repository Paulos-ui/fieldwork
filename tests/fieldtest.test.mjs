import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {POST} from '../app/api/fieldtest/route.js';
test('tester can submit once and only builder can collect evidence',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'fieldwork-tests-'));
 process.env.FIELDWORK_DATA_DIR=directory;
 const post=body=>POST(new Request('http://localhost/api/fieldtest',{method:'POST',body:JSON.stringify(body)}));
 try {
   const {id,tester,owner}=await (await post({op:'invite',brief:'Connect on Android'})).json();
   assert.equal((await post({op:'open',id,key:tester})).status,200);
   const evidence={op:'submit',id,key:tester,name:'Ada',device:'Android',build:'rc1',steps:'Return to app',result:'Address visible'};
   assert.equal((await post(evidence)).status,200);
   assert.equal((await post(evidence)).status,409);
   assert.equal((await post({op:'collect',id,key:tester})).status,400);
   const {report}=await (await post({op:'collect',id,key:owner})).json();
   assert.equal(report.result,evidence.result);
 }finally{delete process.env.FIELDWORK_DATA_DIR;await rm(directory,{recursive:true,force:true})}
});