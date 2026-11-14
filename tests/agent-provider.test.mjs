import test from 'node:test';
import assert from 'node:assert/strict';
import {POST as agent} from '../app/api/agent/route.js';
import {POST as quote} from '../app/api/quote/route.js';

function request(body) {
  return new Request('http://localhost/api/agent',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-operator'},body:JSON.stringify(body)});
}
function withEnvironment(t) {
  const previous={...process.env};
  const originalFetch=globalThis.fetch;
  process.env.FIELDWORK_OPERATOR_TOKEN='test-operator';
  delete process.env.NEAR_AI_API_KEY;
  t.after(()=>{
    globalThis.fetch=originalFetch;
    for (const key of ['FIELDWORK_OPERATOR_TOKEN','NEAR_AI_API_KEY','RHEA_ACCESS_TOKEN']) {
      if(previous[key]===undefined) delete process.env[key]; else process.env[key]=previous[key];
    }
  });
}
const notes=[
  {agent:'Pitch Coach',note:'action · Approve wallet connection\nexpected · Account address appears'},
  {agent:'Reviewer',note:'build · RC1\nsteps · Return from approval\nresult · Loading screen persists'}
];

test('all five agents assess their supplied evidence and identify missing fields',async t=>{
  withEnvironment(t);
  const cases=[
    ['Pitch Coach',{pitch:'Connect wallet',fields:{action:'Approve connection',expected:'Address appears'}},/visible pass condition/],
    ['Scout',{fields:{device:'Android'},profiles:[{name:'Ada',device:'Android'}]},/Coverage match: Ada/],
    ['Reviewer',{notes,fields:{build:'RC1',steps:'Approve',result:'Loading persists'}},/compare/i],
    ['Paymaster',{fields:{amount:'5',sender:'alice.near',recipient:'0x'+'1'.repeat(40)}},/spending limit/],
    ['Retest',{notes,fields:{build:'RC2',result:'Address appears'}},/same reproduction steps/]
  ];
  for(const [name,context,expected] of cases) {
    const response=await agent(request({agent:name,context}));
    assert.equal(response.status,200,name);
    const result=await response.json();
    assert.equal(result.source,'rules');
    assert.equal(result.agent,name);
    assert.match(result.advice,expected);
    const incomplete=await (await agent(request({agent:name,context:{fields:{}}}))).json();
    assert.match(incomplete.advice,/Add|Select|Missing|Set|Collect/);
  }
  const noMatch=await (await agent(request({agent:'Scout',context:{fields:{device:'iOS'},profiles:[{name:'Ada',device:'Android'}]}}))).json();
  assert.match(noMatch.advice,/No supplied tester profile/);
  assert.doesNotMatch(noMatch.advice,/Ada/);
});

test('agent endpoint validates unknown roles and malformed campaign evidence',async t=>{
  withEnvironment(t);
  assert.equal((await agent(request({agent:'Other',context:{}}))).status,400);
  assert.equal((await agent(request({agent:'Scout',context:{profiles:[null]}}))).status,400);
  assert.equal((await agent(request({agent:'Pitch Coach',context:{pitch:'x'.repeat(24001)}}))).status,413);
  const unauthorized=new Request('http://localhost/api/agent',{method:'POST',body:'{}'});
  assert.equal((await agent(unauthorized)).status,401);
});

test('live recommendations use NEAR AI and reject provider failures or empty replies',async t=>{
  withEnvironment(t);
  process.env.NEAR_AI_API_KEY='test-provider';
  let calls=0;
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://cloud-api.near.ai/v1/chat/completions');
    const payload=JSON.parse(options.body);
    assert.match(payload.messages[0].content,/Fieldwork Agent AI/);
    calls++;
    return Response.json({choices:[{message:{content:'Check the return route before approving.'}}]});
  };
  for(const name of ['Pitch Coach','Scout','Reviewer','Paymaster','Retest']) {
    const result=await (await agent(request({agent:name,context:{pitch:'Wallet',fields:{}}}))).json();
    assert.equal(result.source,'near-ai');
  }
  assert.equal(calls,5);
  globalThis.fetch=async()=>Response.json({error:'denied'},{status:401});
  assert.equal((await agent(request({agent:'Scout',context:{}}))).status,502);
  globalThis.fetch=async()=>Response.json({choices:[]});
  assert.equal((await agent(request({agent:'Scout',context:{}}))).status,502);
});

test('Rhea quote requires successful business envelope and route, preserving USDC precision',async t=>{
  withEnvironment(t);
  process.env.RHEA_ACCESS_TOKEN='test-rhea';
  const body={sender:'alice.near',recipient:'0x'+'1'.repeat(40),amount:'1.000001'};
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://api.rhea.finance/api/v2/swap/quote');
    assert.equal(JSON.parse(options.body).amountIn,'1000001');
    return Response.json({code:0,data:{bestQuote:{router:'test-route'}}});
  };
  assert.equal((await quote(request(body))).status,200);
  globalThis.fetch=async()=>Response.json({code:1001,msg:'no route',data:{}});
  assert.equal((await quote(request(body))).status,502);
  globalThis.fetch=async()=>Response.json({code:0,data:{}});
  assert.equal((await quote(request(body))).status,502);
  assert.equal((await quote(request({...body,amount:'0'}))).status,400);
});
