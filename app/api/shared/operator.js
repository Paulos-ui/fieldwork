import {createHash,timingSafeEqual} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest();
export function operatorAccess(request){
 const secret=process.env.FIELDWORK_OPERATOR_TOKEN;
 if(!secret && !process.env.VERCEL)return null;
 if(!secret)return Response.json({error:'Configure the operator token on the server.'},{status:503});
 if(!timingSafeEqual(digest(request.headers.get('authorization') || ''),digest('Bearer '+secret)))
   return Response.json({error:'Operator access required.'},{status:401});
 return null;
}
