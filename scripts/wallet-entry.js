import {Buffer} from 'buffer';
import {setupWalletSelector} from '@near-wallet-selector/core';
import {setupModal} from '@near-wallet-selector/modal-ui';
import {setupMyNearWallet} from '@near-wallet-selector/my-near-wallet';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import '@near-wallet-selector/modal-ui/styles.css';
globalThis.Buffer=Buffer;
let selector;
let setup;
function status(message){
 const output=document.querySelector('#wallet-status');
 if(output)output.textContent=message;
}
async function api(payload){
 const response=await fetch('/api/wallet',{method:payload?'POST':'GET',credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:undefined,body:payload?JSON.stringify(payload):undefined});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'Wallet access could not complete.');
 return result;
}
function notify(session){window.dispatchEvent(new CustomEvent('fieldwork-session',{detail:session}))}
async function getSelector(){
 if(!setup)setup=setupWalletSelector({network:'mainnet',modules:[setupMeteorWallet(),setupMyNearWallet()]}).then(value=>{
  selector=value;
  selector.store.observable.subscribe(state=>{
   if(state.accounts.length&&!window.__fieldworkAuthenticated){
    const verify=document.querySelector('#wallet-verify');
    if(verify)verify.hidden=false;
    status('Connected '+state.accounts[0].accountId+'. Sign the access message to continue.');
   }
  });
  return selector;
 }).catch(error=>{setup=null;throw error});
 return setup;
}
async function verifySigned(signed,id){
 const {session}=await api({op:'verify',id,accountId:signed.accountId,publicKey:signed.publicKey,signature:signed.signature});
 sessionStorage.removeItem('fieldwork.challenge');
 window.__fieldworkAuthenticated=true;
 notify(session);
 location.hash='opportunities';
}
async function connect(sign=false){
 const selected=await getSelector();
 const state=selected.store.getState();
 if(!state.accounts.length){
  status('Choose your NEAR wallet.');
  setupModal(selected,{theme:'light'}).show();
  return;
 }
 if(!sign){
  document.querySelector('#wallet-verify').hidden=false;
  status('Connected '+state.accounts[0].accountId+'. Sign the access message to continue.');
  return;
 }
 const challenge=await api({op:'challenge'});
 sessionStorage.setItem('fieldwork.challenge',JSON.stringify(challenge));
 status('Approve the access message in your NEAR wallet.');
 const wallet=await selected.wallet();
 const signed=await wallet.signMessage({message:challenge.message,nonce:Buffer.from(challenge.nonce,'base64'),recipient:challenge.recipient,callbackUrl:challenge.callbackUrl,state:challenge.state});
 if(signed)await verifySigned(signed,challenge.id);
}
async function logout(){
 await api({op:'logout'});
 window.__fieldworkAuthenticated=false;
 try{if(selector?.isSignedIn())await (await selector.wallet()).signOut()}catch{}
 sessionStorage.removeItem('fieldwork.challenge');
 location.hash='signin';
 notify(null);
}
async function initialize(){
 try{
  const hashParams=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search);
  const param=key=>hashParams.get(key)||query.get(key);
  const signature=param('signature'),accountId=param('accountId')||param('account_id'),publicKey=param('publicKey')||param('public_key');
  if(signature){
   const challenge=JSON.parse(sessionStorage.getItem('fieldwork.challenge')||'null');
   if(!challenge||param('state')!==challenge.state)throw Error('This wallet response has expired. Please connect again.');
   history.replaceState(null,'',location.pathname+'#signin');
   await verifySigned({accountId,publicKey,signature},challenge.id);
   return;
  }
  const {session}=await api();
  if(session){window.__fieldworkAuthenticated=true;notify(session)}
  if(!session&&location.hash==='#signin'){
   const selected=await getSelector();
   if(selected.store.getState().accounts.length){
    const verify=document.querySelector('#wallet-verify');if(verify)verify.hidden=false;
    status('Your NEAR wallet is connected. Sign the access message to continue.');
   }
  }
 }catch(error){
  if(location.hash.includes('signature=')){history.replaceState(null,'',location.pathname+'#signin');window.dispatchEvent(new Event('hashchange'))}
  status(error.message);
 }
}
window.FieldworkWallet={connect,logout};
initialize();
