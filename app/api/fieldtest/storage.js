import {randomUUID} from 'node:crypto';
import {mkdir, writeFile, readFile, link, unlink} from 'node:fs/promises';
import path from 'node:path';

async function redis(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {Authorization: 'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN, 'Content-Type':'application/json'},
    body: JSON.stringify(command), cache:'no-store', signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw Error('Storage unavailable');
  const data = await response.json();
  if (data.error) throw Error('Storage request failed');
  return data.result;
}
function remote() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return true;
  if (process.env.VERCEL || process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN) throw Error('Configure hosted storage');
  return false;
}
function filename(key) {return path.join(process.env.FIELDWORK_DATA_DIR || '.fieldwork-data',key)}
export async function lookup(key) {
  if (remote()) {
    const value = await redis(['GET','fieldwork:'+key]);
    return value === null ? null : JSON.parse(value);
  }
  try {return JSON.parse(await readFile(filename(key),'utf8'))}
  catch(error){if(error.code==='ENOENT')return null;throw error}
}
export async function insert(key, value) {
  const json=JSON.stringify(value);
  if(remote())return (await redis(['SET','fieldwork:'+key,json,'NX']))==='OK';
  const dest=filename(key),tmp=dest+'.'+randomUUID()+'.tmp';
  await mkdir(path.dirname(dest),{recursive:true});
  await writeFile(tmp,json,{flag:'wx'});
  try{await link(tmp,dest);return true}
  catch(error){if(error.code==='EEXIST')return false;throw error}
  finally{await unlink(tmp)}
}