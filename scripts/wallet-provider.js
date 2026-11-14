import {Buffer} from 'buffer';
import {setupWalletSelector} from '@near-wallet-selector/core';
import {setupMyNearWallet} from '@near-wallet-selector/my-near-wallet';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import {setupHotWallet} from '@near-wallet-selector/hot-wallet';
let selectorPromise;
const adapters=new Map();
function selector(){
 if(!selectorPromise)selectorPromise=setupWalletSelector({network:'mainnet',modules:[setupHotWallet(),setupMeteorWallet(),setupMyNearWallet()]}).catch(error=>{selectorPromise=null;throw error});
 return selectorPromise;
}
export async function prepare(id){
 const selected=await selector();
 if(!adapters.has(id))adapters.set(id,await selected.wallet(id));
}
export function connect(id){return adapters.get(id).signIn({})}
export function sign(id,challenge){
 return adapters.get(id).signMessage({message:challenge.message,nonce:Buffer.from(challenge.nonce,'base64'),recipient:challenge.recipient,...(challenge.callbackUrl?{callbackUrl:challenge.callbackUrl}:{}),state:challenge.state});
}
export async function disconnect(){
 if(!selectorPromise)return;
 const selected=await selectorPromise;
 if(selected.isSignedIn())await (await selected.wallet()).signOut();
 adapters.clear();
}
