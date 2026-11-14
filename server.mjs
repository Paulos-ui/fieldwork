import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {POST as access} from './app/api/access/route.js';
import {POST as agent} from './app/api/agent/route.js';
import {POST as quote} from './app/api/quote/route.js';
import {POST as fieldtest} from './app/api/fieldtest/route.js';
import {GET as walletSession,POST as wallet} from './app/api/wallet/route.js';
const assets={'/':['fieldwork.html','text/html'],'/fieldwork.html':['fieldwork.html','text/html'],'/fieldwork.css':['fieldwork.css','text/css'],'/fieldwork.js':['fieldwork.js','text/javascript'],'/console.js':['console.js','text/javascript'],'/console.css':['console.css','text/css'],'/wallet.bundle.js':['wallet.bundle.js','text/javascript'],'/wallet-provider.bundle.js':['wallet-provider.bundle.js','text/javascript']};
const routes={'/api/access':access,'/api/agent':agent,'/api/quote':quote,'/api/fieldtest':fieldtest,'/api/wallet':wallet};
const port=Number(process.env.PORT || 4173);
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://'+req.headers.host);
  if(['GET','HEAD'].includes(req.method)&&Object.hasOwn(assets,url.pathname)){
   const [name,type]=assets[url.pathname];
   const data=await readFile(new URL('./public/'+name,import.meta.url));
   res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(req.method==='HEAD'?undefined:data);return;
  }
  const handler=req.method==='GET'&&url.pathname==='/api/wallet'?walletSession:req.method==='POST'?routes[url.pathname]:null;
  if(handler){
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.writeHead(403);res.end();return}
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>32768){res.writeHead(413);res.end();return}chunks.push(chunk)}
   const options={method:req.method,headers:req.headers};
   if(req.method==='POST')options.body=Buffer.concat(chunks);
   const response=await handler(new Request(url,options));
   const headers=Object.fromEntries(response.headers);
   const cookies=response.headers.getSetCookie();
   if(cookies.length)headers['set-cookie']=cookies;
   res.writeHead(response.status,headers);res.end(await response.text());return;
  }
  res.writeHead(404);res.end('Not found');
 }catch{res.writeHead(400);res.end('Invalid request')}
}).on('error',error=>{
 if(error.code!=='EADDRINUSE')throw error;
 console.error('Port '+port+' is already in use. Choose another PORT.');
 process.exitCode=1;
}).listen(port,'127.0.0.1',()=>console.log('Fieldwork is open at http://127.0.0.1:'+port));
