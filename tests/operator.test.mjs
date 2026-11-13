import test from 'node:test';
import assert from 'node:assert/strict';
import {operatorAccess} from '../app/api/shared/operator.js';
test('hosted providers require a configured operator credential',()=>{
 process.env.VERCEL='1';delete process.env.FIELDWORK_OPERATOR_TOKEN;
 try{
  const req=token=>new Request('http://localhost',{headers:{Authorization:'Bearer '+token}});
  assert.equal(operatorAccess(req('')).status,503);
  process.env.FIELDWORK_OPERATOR_TOKEN='test-only';
  assert.equal(operatorAccess(req('wrong')).status,401);
  assert.equal(operatorAccess(req('test-only')),null);
 }finally{delete process.env.VERCEL;delete process.env.FIELDWORK_OPERATOR_TOKEN}
});
