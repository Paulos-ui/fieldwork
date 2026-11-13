import {randomBytes,createHash} from 'node:crypto';
import {insert,lookup} from './storage.js';
const digest=text=>createHash('sha256').update(text).digest('hex');
const token=()=>randomBytes(24).toString('hex');
function limited(value,max=500){return typeof value==='string'?value.trim().slice(0,max):''}
async function handle(request) {
  const input=await request.json().catch(()=>null);
  if(!input)return Response.json({error:'Invalid request.'},{status:400});

  if(input.op==='invite'){
    const brief=limited(input.brief,1800);
    if(!brief)return Response.json({error:'Approve a brief first.'},{status:400});
    const id=token(),owner=token(),tester=token();
    if(!await insert(id+'.json',{brief,owner:digest(owner),tester:digest(tester)})) throw Error('Invitation collision');
    return Response.json({id,owner,tester});
  }
  if(!/^[0-9a-f]{48}$/.test(input.id)||typeof input.key!=='string')return Response.json({error:'Invalid invitation.'},{status:400});
  const file=input.id+'.json';
  const campaign=await lookup(file);
  if(!campaign)return Response.json({error:'Invitation unavailable.'},{status:404});
  const key=digest(input.key);
  if(input.op==='collect' && key===campaign.owner){
    return Response.json({report:await lookup(file+'.report')});
  }
  if(key!==campaign.tester)return Response.json({error:'Access denied.'},{status:403});
  if(input.op==='open')return Response.json({brief:campaign.brief});
  if(input.op!=='submit')return Response.json({error:'Invalid action.'},{status:400});
  const report={};for(const k of ['name','device','build','steps','result']){
    report[k]=limited(input[k],1000);if(!report[k])return Response.json({error:'Enter '+k+'.'},{status:400});
  }
  if(!await insert(file+'.report',report)) return Response.json({error:'This tester already submitted a report.'},{status:409});
  return Response.json({accepted:true});
}
export async function POST(request){
  try{return await handle(request)}catch{return Response.json({error:'Tester storage unavailable. Check the server storage configuration.'},{status:503})}
}
