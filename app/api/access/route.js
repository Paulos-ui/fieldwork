import {createHash} from 'node:crypto';
import {insert} from '../fieldtest/storage.js';

export async function POST(request) {
  const reply = (body, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  try {
    const {op,email='',name='',role='',ecosystem='',goal=''} = await request.json();
    if(typeof email !== 'string' || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({error:'Enter a valid email address.'},400);
    const address=email.trim().toLowerCase();
    if(op==='beta'){
      const fields={name,role,ecosystem,goal};
      if(Object.values(fields).some(v=>typeof v!=='string'||v.length>600)) return reply({error:'Keep each field under 600 characters.'},400);
      const key=createHash('sha256').update(address).digest('hex');
      await insert('beta-'+key,{email:address,...fields,created:new Date().toISOString()});
      return reply({ok:true});
    }
    return reply({error:'Connect a NEAR wallet to sign in.'},400);
  }catch{return reply({error:'The access service is temporarily unavailable.'},503)}
}
