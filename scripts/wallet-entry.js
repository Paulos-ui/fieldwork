(() => {
 const wallets=[
  {id:'hot-wallet',name:'HOT Wallet',description:'NEAR account in HOT',symbol:'H'},
  {id:'meteor-wallet',name:'Meteor Wallet',description:'NEAR browser and web wallet',symbol:'✳'},
  {id:'my-near-wallet',name:'MyNearWallet',description:'NEAR web wallet',symbol:'N'}
 ];
 const scriptUrl=document.currentScript?.src||location.href;
 const providerUrl=new URL('./wallet-provider.bundle.js?v=__WALLET_PROVIDER_VERSION__',scriptUrl).href;
 let providerPromise,selectedWallet,preparedChallenge,dialog,generation=0;
 function status(message){
  const output=document.querySelector('#wallet-status');
  if(output)output.textContent=message;
 }
 function message(error){return error instanceof Error?error.message:String(error||'The wallet request could not finish. Please try again.')}
 function timeout(promise,ms,label){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms)})]).finally(()=>clearTimeout(timer));
 }
 async function provider(){
  if(!providerPromise)providerPromise=timeout(import(providerUrl),25000,'Wallet tools could not load. Check your connection and choose the wallet again.').catch(error=>{providerPromise=null;throw error});
  return providerPromise;
 }
 async function api(payload){
  const response=await fetch('/api/wallet',{method:payload?'POST':'GET',credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:undefined,body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Wallet access could not complete.');
  return result;
 }
 function notify(session){window.dispatchEvent(new CustomEvent('fieldwork-session',{detail:session}))}
 function pickerStatus(text){dialog.querySelector('[data-picker-status]').textContent=text}
 function closePicker(){generation++;dialog.close()}
 function openPicker(){
  if(!dialog){
   dialog=document.createElement('dialog');
   dialog.id='wallet-picker';dialog.className='wallet-picker';
   dialog.setAttribute('aria-labelledby','wallet-picker-title');
   dialog.innerHTML='<div class="wallet-picker-heading"><div><small>NEAR MAINNET</small><h2 id="wallet-picker-title">Choose your wallet</h2></div><button type="button" data-close-picker aria-label="Close wallet chooser">×</button></div><p>Connect the NEAR account you use for Fieldwork.</p><div class="wallet-picker-list">'+wallets.map(wallet=>'<button type="button" data-wallet-choice="'+wallet.id+'"><span class="wallet-brand wallet-brand-'+wallet.id+'" aria-hidden="true">'+wallet.symbol+'</span><span><strong>'+wallet.name+'</strong><small>'+wallet.description+'</small></span><span aria-hidden="true">→</span></button>').join('')+'</div><output data-picker-status role="status">Select a wallet to continue.</output><button type="button" data-wallet-continue hidden>Continue</button>';
   document.body.append(dialog);
   dialog.addEventListener('cancel',()=>{generation++});
   dialog.addEventListener('click',event=>{
    if(event.target.closest('[data-close-picker]')){closePicker();return}
    const option=event.target.closest('[data-wallet-choice]');
    if(option)choose(option.dataset.walletChoice);
    if(event.target.closest('[data-wallet-continue]'))connectSelected();
   });
  }
  dialog.querySelector('[data-wallet-continue]').hidden=true;
  dialog.querySelectorAll('[data-wallet-choice]').forEach(button=>button.setAttribute('aria-pressed','false'));
  pickerStatus('Select a wallet to continue.');
  if(!dialog.open)dialog.showModal();
 }
 async function choose(id){
  if(!wallets.some(wallet=>wallet.id===id))return;
  const attempt=++generation;
  const button=dialog.querySelector('[data-wallet-continue]');
  button.hidden=false;button.disabled=true;button.textContent='Preparing wallet…';
  dialog.querySelectorAll('[data-wallet-choice]').forEach(option=>option.setAttribute('aria-pressed',String(option.dataset.walletChoice===id)));
  pickerStatus('Preparing '+wallets.find(wallet=>wallet.id===id).name+'…');
  try{
   const tools=await provider();
   await timeout(tools.prepare(id),25000,'The wallet could not initialize. Please choose it again.');
   if(attempt!==generation)return;
   selectedWallet=id;
   button.disabled=false;button.textContent='Continue with '+wallets.find(wallet=>wallet.id===id).name;
   pickerStatus('Ready. Continue to open your wallet.');
  }catch(error){
   if(attempt!==generation)return;
   pickerStatus(message(error));button.hidden=true;
  }
 }
 async function prepareChallenge(id=selectedWallet){
  preparedChallenge=await api({op:'challenge',walletId:id});
  sessionStorage.setItem('fieldwork.challenge',JSON.stringify(preparedChallenge));
 }
 async function connectSelected(){
  const button=dialog.querySelector('[data-wallet-continue]');
  const attempt=generation,id=selectedWallet;
  button.disabled=true;pickerStatus('Approve the connection in your wallet.');
  try{
   // The adapter is already prepared, so the user click opens its popup directly.
   const tools=await providerPromise;
   const accounts=await timeout(tools.connect(id),120000,'The wallet connection timed out. Choose the wallet and try again.');
   if(attempt!==generation)return;
   if(!accounts?.[0]?.accountId)throw Error('The wallet did not return a NEAR account. Please try again.');
   closePicker();
   status('Connected '+accounts[0].accountId+'. Preparing the access message…');
   await prepareChallenge(id);
   const verify=document.querySelector('#wallet-verify');
   if(verify)verify.hidden=false;
   status('Connected '+accounts[0].accountId+'. Sign the access message to continue.');
  }catch(error){
   if(dialog.open)pickerStatus(message(error));
   status(message(error));
  }finally{button.disabled=false}
 }
 async function verifySigned(signed,id){
  const {session}=await api({op:'verify',id,accountId:signed.accountId,publicKey:signed.publicKey,signature:signed.signature});
  preparedChallenge=null;sessionStorage.removeItem('fieldwork.challenge');
  notify(session);location.hash='opportunities';
 }
 async function signAccess(){
  if(!selectedWallet){openPicker();return}
  if(!preparedChallenge||preparedChallenge.walletId!==selectedWallet||preparedChallenge.expires<=Date.now()+5000){
   await prepareChallenge();
   status('The access message is ready. Select Sign access message to approve it.');
   return;
  }
  status('Approve the access message in your NEAR wallet.');
  const tools=await providerPromise;
  const signed=await timeout(tools.sign(selectedWallet,preparedChallenge),120000,'The signing request timed out. Please try signing again.');
  if(signed)await verifySigned(signed,preparedChallenge.id);
 }
 async function logout(){
  await api({op:'logout'});
  if(providerPromise)try{await (await providerPromise).disconnect()}catch{}
  selectedWallet=null;preparedChallenge=null;sessionStorage.removeItem('fieldwork.challenge');
  notify(null);location.hash='signin';
 }
 async function initialize(){
  try{
   const hash=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search);
   const param=key=>hash.get(key)||query.get(key);
   if(param('signature')){
    const challenge=JSON.parse(sessionStorage.getItem('fieldwork.challenge')||'null');
    if(!challenge||param('state')!==challenge.state)throw Error('This wallet response has expired. Please connect again.');
    history.replaceState(null,'',location.pathname+'#signin');
    await verifySigned({accountId:param('accountId')||param('account_id'),publicKey:param('publicKey')||param('public_key'),signature:param('signature')},challenge.id);
    return;
   }
   const {session}=await api();if(session)notify(session);
  }catch(error){status(message(error))}
 }
 window.FieldworkWallet={connect:sign=>sign?signAccess():openPicker(),choose,logout};
 initialize();
})();
