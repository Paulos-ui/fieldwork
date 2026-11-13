import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {POST as agent} from './app/api/agent/route.js';
import {POST as quote} from './app/api/quote/route.js';
import {POST as fieldtest} from './app/api/fieldtest/route.js';
const assets={'/':['fieldwork.html','text/html'],'/fieldwork.html':['fieldwork.html','text/html'],'/fieldwork.css':['fieldwork.css','text/css'],'/fieldwork.js':['fieldwork.js','text/javascript']};
const routes={'/api/agent':agent,'/api/quote':quote,'/api/fieldtest':fieldtest};
const port=Number(process.env.PORT || 4173);
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(['GET','HEAD'].includes(req.method) && Object.hasOwn(assets,url.pathname)){
      const [name,type]=assets[url.pathname];
      const data=await readFile(new URL('./public/'+name,import.meta.url));
      res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(req.method==='HEAD'?undefined:data);return;
    }
    if(req.method==='POST' && Object.hasOwn(routes,url.pathname)){
      if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host){res.writeHead(403);res.end();return}
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>32768){res.writeHead(413);res.end();return}chunks.push(chunk)}
      const response=await routes[url.pathname](new Request(url,{method:'POST',body:Buffer.concat(chunks)}));
      res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());return;
    }
    res.writeHead(404);res.end('Not found');
  } catch {res.writeHead(400);res.end('Invalid request')}
}).on('error',error=>{
  if(error.code!=='EADDRINUSE') throw error;
  console.error('Port '+port+' is already in use. Open http://127.0.0.1:'+port+' or choose a different PORT.');
  process.exitCode=1;
}).listen(port,'127.0.0.1',()=>console.log('Fieldwork is open at http://127.0.0.1:'+port));
