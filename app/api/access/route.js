import {createHash} from 'node:crypto';
import {insert} from '../fieldtest/storage.js';

export async function POST(request) {
  const reply = (body, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  try {
    const {op,email='',name='',role='',ecosystem='',goal='',code=''} = await request.json();
    if(typeof email !== 'string' || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({error:'Enter a valid email address.'},400);
    const address=email.trim().toLowerCase();
    if(op==='beta'){
      const fields={name,role,ecosystem,goal};
      if(Object.values(fields).some(v=>typeof v!=='string'||v.length>600)) return reply({error:'Keep each field under 600 characters.'},400);
      const key=createHash('sha256').update(address).digest('hex');
      await insert('beta-'+key,{email:address,...fields,created:new Date().toISOString()});
      return reply({ok:true});
    }
    if(!['send','verify'].includes(op))return reply({error:'Unknown operation.'},400);
    const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_ANON_KEY;
    if(!url||!key)return reply({error:'Email sign-in is awaiting configuration. You can explore the device demo below.'},503);
    if(op==='verify' && !/^\d{6,10}$/.test(code))return reply({error:'Enter the code from your email.'},400);
    const response=await fetch(new URL('/auth/v1/'+(op==='send'?'otp':'verify'),url),{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(op==='send'?{email:address,create_user:true}:{email:address,type:'email',token:code}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)return reply({error:response.status===429?'Please wait before requesting another code.':op==='send'?'Could not send the code. Check your email or try again later.':'The code expired or did not match.'},response.status===429?429:400);
    if(op==='send')return reply({ok:true});
    const {user,expires_in}=await response.json();
    return reply({id:user.id,email:user.email,expires:Date.now()+expires_in*1000});
  }catch{return reply({error:'The access service is temporarily unavailable.'},503)}
}
