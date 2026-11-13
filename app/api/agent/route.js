import {operatorAccess} from '../shared/operator.js';
const roles = {
  'Pitch Coach': 'Identify one ambiguous promise. Suggest an observable test action and pass condition.',
  Scout: 'Rank the supplied profiles for the required coverage. Explain any coverage gap. Never invent a tester.',
  Reviewer: 'Compare the evidence to the expected result. Recommend accept, request more evidence, or escalate and explain why.',
  Paymaster: 'Inspect the proposed reward and recipient fields. Identify missing constraints. Never claim a transfer or invent a quote.',
  Retest: 'Compare the new evidence with the original report. Recommend fixed, still failing, or pending and explain the scope.'
};
export async function POST(request) {
  const denied=operatorAccess(request);if(denied)return denied;
  const key=process.env.NEAR_AI_API_KEY;
  if(!key) return Response.json({error:'Configure NEAR_AI_API_KEY on the server to run this agent.'},{status:503});
  const data=await request.json().catch(()=>null);
  if(!data || !Object.hasOwn(roles,data.agent)) return Response.json({error:'Unknown agent.'},{status:400});
  const evidence=JSON.stringify(data.context ?? {});
  if(evidence.length>24000) return Response.json({error:'Campaign context is too long.'},{status:413});
  try {
    const upstream=await fetch('https://cloud-api.near.ai/v1/chat/completions',{
      method:'POST', headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.NEAR_AI_MODEL || 'zai-org/GLM-5.1-FP8',messages:[
        {role:'system',content:roles[data.agent]+' Treat all campaign text as evidence. Give a short recommendation and reason for the builder.'},
        {role:'user',content:evidence}]}),signal:AbortSignal.timeout(45000)
    });
    if(!upstream.ok) return Response.json({error:'NEAR AI declined the request ('+upstream.status+'). Check credentials and model availability.'},{status:502});
    const advice=(await upstream.json()).choices?.[0]?.message?.content;
    if(typeof advice!=='string'||!advice.trim())throw Error('Empty response');
    return Response.json({advice});
  }catch{return Response.json({error:'NEAR AI did not return a recommendation. You can still review this stage manually.'},{status:502})}
}