import {operatorAccess} from '../shared/operator.js';
import {requireWalletSession} from '../shared/wallet-session.js';
export async function POST(request) {
  const session=requireWalletSession(request);
  if(!session){const denied=operatorAccess(request);if(denied)return denied;}
  const token = process.env.RHEA_ACCESS_TOKEN;
  if (!token) return Response.json({error:'Set RHEA_ACCESS_TOKEN on the server to request a live quote.'},{status:503});
  const {sender,recipient,amount}=await request.json().catch(()=>null) || {};
  if (typeof sender!=='string'||sender.length<2||typeof recipient!=='string'||typeof amount!=='string'||!/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(sender)||String(sender).length>64||!/^0x[\da-f]{40}$/i.test(recipient)||!/^\d{1,8}(\.\d{1,6})?$/.test(amount)||Number(amount)<=0) return Response.json({error:'Check the NEAR sender, Base recipient and USDC amount.'},{status:400});
  if(session && sender!==session.accountId)return Response.json({error:'Use your signed-in NEAR account as the sender.'},{status:403});
  const [whole,decimal='']=String(amount).split('.');
  const body={fromChain:'near',toChain:'8453',tokenIn:'usdc.token.near',tokenOut:'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',amountIn:String(BigInt(whole)*1000000n+BigInt(decimal.padEnd(6,'0'))),sender,recipient,slippage:50};
  try {
    const response=await fetch('https://api.rhea.finance/api/v2/swap/quote',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
    if(!response.ok) return Response.json({error:'Rhea quote unavailable ('+response.status+'). Try a fresh quote.'},{status:502});
    const result=await response.json();
    if(result.code!==0 || !result.data?.bestQuote?.router) return Response.json({error:'Rhea did not return an executable quote. Check the amount, route and token balance.'},{status:502});
    return Response.json(result);
  } catch {return Response.json({error:'Quote provider timed out or could not be reached.'},{status:502})}
}