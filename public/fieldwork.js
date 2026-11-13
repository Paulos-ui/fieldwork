'use strict';
const agents=['Pitch Coach','Scout','Reviewer','Paymaster','Retest'];
const guide=['Identify the user, action and visible outcome of the pitch. Approve a testable brief.','Match a device requirement to a tester profile and keep the selection with the campaign.','Compare evidence with the brief. Return incomplete reports before approving a reward.','Prepare a reward in USDC. A configured server can request a live NEAR-to-Base quote from Rhea.','Repeat the original steps on a new build and record whether the issue is fixed.'];
const root=document.querySelector('#screen');
const defaults={name:'Jayking',device:'Android',campaigns:[],selected:0};
let db;
try{db=JSON.parse(localStorage.getItem('fieldwork.journal'))||defaults}catch{db=defaults}
if(!db.identitySeed){db.identitySeed=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);try{localStorage.setItem('fieldwork.journal',JSON.stringify(db))}catch{}}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function input(key,title,value='',optional=false){return '<label>'+title+'<input maxlength="500" name="'+key+'" value="'+esc(value)+'" '+(optional?'':'required')+'></label>'}
function choice(key,title,values){return '<label>'+title+'<select name="'+key+'">'+values.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>'}
function save(next){localStorage.setItem('fieldwork.journal',JSON.stringify(next));db=next;render()}
const nodePositions=[[12,62],[31,27],[50,55],[69,23],[88,53]];
function plot(text,offset){return [...text].map((ch,i)=>'<b aria-hidden="true" style="--i:'+(offset+i)+'">'+(ch===' '?'&nbsp;':ch)+'</b>').join('')}
function landing(){
 const rays=Array.from({length:24},(_,i)=>{const t=i*Math.PI/12;return '<line x1="400" y1="400" x2="'+(400+380*Math.cos(t))+'" y2="'+(400+380*Math.sin(t))+'"/>'}).join('');
 return '<section class="origin"><div class="origin-frame"><svg class="rays" viewBox="0 0 800 800" aria-hidden="true">'+rays+'</svg><div class="origin-copy"><small>NEAR / Beta tester connect</small><h1 aria-label="Test with real builders.">'+plot('Test with',0)+'<br><span>'+plot('real builders.',9)+'</span></h1><p>Fieldwork coordinates five agents to turn your pitch into a test campaign, review real evidence and verify the fix.</p><a class="button" href="#workspace">Launch console ↗</a> <a href="#constellation">Explore agents ↓</a></div></div></section><section class="sky" id="constellation"><div class="sky-frame"><small>Agent system / NEAR</small><h2>From pitch review<br>to verified fix.</h2><div class="instruments"><div class="chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="'+nodePositions.map(p=>p.join(',')).join(' ')+'" pathLength="1"/></svg>'+agents.map((a,i)=>'<button type="button" data-node="'+i+'" aria-label="'+a+'" style="left:'+nodePositions[i][0]+'%;top:'+nodePositions[i][1]+'%"><i></i><span>'+a+'</span></button>').join('')+'</div><div class="readout"><small id="unit"></small><h3 id="agentName"></h3><p id="agentRole"></p><a href="#workspace">Open console →</a></div></div></div></section><section class="guide" id="guide"><aside><small>System documentation</small><h2>Release pipeline</h2><p>Follow one campaign from the builder’s pitch through the tester’s evidence to the verified fix.</p></aside><div>'+agents.map((a,i)=>'<article><small>Stage 0'+(i+1)+'</small><h3>'+a+'</h3><p>'+guide[i]+'</p></article>').join('')+'</div></section>'
}
let selectedNode=null;
function draw(){
 const sky=document.querySelector('.sky');if(!sky)return;
 const progress=Math.max(0,Math.min(1,-sky.getBoundingClientRect().top/Math.max(1,sky.offsetHeight-innerHeight)));
 const index=selectedNode??Math.min(4,Math.floor(progress*5));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 root.style.setProperty('--hero-shift',reduced?'0px':(-Math.min(innerHeight,scrollY)*.17)+'px');
 root.style.setProperty('--ray-scale',reduced?'1':String(1+Math.min(1,scrollY/innerHeight)*.25));
 root.style.setProperty('--trace',String(1-Math.max(progress,index/4)));
 document.querySelectorAll('[data-node]').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===index)));
 document.querySelector('#unit').textContent='Module 0'+(index+1)+' / 05';
 document.querySelector('#agentName').textContent=agents[index];document.querySelector('#agentRole').textContent=guide[index];
}
function focusNode(event){const node=event.target.closest?.('[data-node]');if(node){selectedNode=Number(node.dataset.node);draw()}}
root.addEventListener?.('pointerover',focusNode);root.addEventListener?.('focusin',focusNode);root.addEventListener?.('click',focusNode);
function releaseNode(event){if(event.target.closest?.('[data-node]')&&!event.relatedTarget?.closest?.('[data-node]')){selectedNode=null;draw()}}
root.addEventListener?.('pointerout',releaseNode);root.addEventListener?.('focusout',releaseNode);
function rack(){return '<aside class="rack"><small>Agent rack</small>'+agents.map((a,i)=>'<details style="--i:'+i+'"><summary><i></i><code>0'+(i+1)+'</code> '+a+'</summary><p>'+guide[i]+'</p></details>').join('')+'<a href="#profile">Builder profile →</a></aside>'}
function stageForm(c){
 const vague=/any chain|seamless|easy|fast|all users/i.test(c.pitch);
 const forms=[(vague?'<p>Coach found a broad claim. Name one environment and an outcome someone can observe.</p>':'<p>Choose the action that would demonstrate this promise.</p>')+input('action','Test action')+input('expected','Expected result'),choice('device','Target environment',['Android','Desktop','iOS']),input('build','Build version')+input('steps','Reproduction steps')+input('result','Observed result')+choice('decision','Review decision',['Accept report','Request evidence']),input('amount','Reward in USDC','10')+input('sender','NEAR sender for live quote','',true)+input('recipient','Base recipient for live quote','',true)+'<p>Preview only. A quote does not transfer funds.</p><button type="button" id="quote">Request Rhea quote</button><pre id="quoteResult" aria-live="polite"></pre>',input('build','New build version')+input('result','Retest evidence')+choice('decision','Outcome',['Fixed','Still failing'])];
 return c.step===5?'<h3>Fix verified</h3>':'<form id="stage"><small>Stage '+(c.step+1)+' of 5</small><h3>'+agents[c.step]+'</h3>'+(c.step===1?'<button type="button" id="invite">Create tester invitation</button><p id="inviteLink"></p>':'')+(c.step===4?'<button type="button" id="invite">Invite tester to retest</button><p id="inviteLink"></p>':'')+((c.step===2&&c.invite)||(c.step===4)?'<button type="button" id="collect">Load tester evidence</button>':'')+forms[c.step]+input('instruction','Agent instructions (optional)',db.instructions?.[c.step]||'',true)+'<button type="button" id="askAgent">Ask '+agents[c.step]+'</button><p class="advice" aria-live="polite"></p><button>Record decision</button></form>'}
const consolePages={workspace:'Campaigns',modules:'Agent rack',evidence:'Evidence',rewards:'Rewards',profile:'Profile'};
function sidebar(page){
 return '<aside class="rail"><small>Fieldwork console</small><nav>'+Object.entries(consolePages).map(([key,label])=>'<a href="#'+key+'" '+(key===page?'aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav><div class="rail-id"><i></i>'+esc(db.name)+'</div></aside>'
}
function identityMark(seed){
 let hash=2166136261;
 for(const char of seed)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 let pixels='';
 for(let y=0;y<5;y++)for(let x=0;x<3;x++){hash=Math.imul(hash,1664525)+1013904223|0;if(hash<0){for(const col of new Set([x,4-x]))pixels+='<rect x="'+(col+1)+'" y="'+(y+1)+'" width="1" height="1"/>'}}
 return '<svg class="ident" aria-hidden="true" viewBox="0 0 7 7">'+pixels+'</svg>'
}
function profileScreen(){
 const closed=db.campaigns.filter(c=>c.step===5).length;
 return '<section class="desk"><div class="identity">'+identityMark(db.identitySeed||'fieldwork-default')+'<div><small>Builder profile</small><h2>'+esc(db.name)+'</h2><span>'+esc(db.role||'Builder')+' · '+esc(db.device)+'</span></div></div><div class="metrics"><div><small>Campaigns</small><strong>'+db.campaigns.length+'</strong></div><div><small>Verified fixes</small><strong>'+closed+'</strong></div></div><form id="profile"><small>Account / local profile</small><h3>Identity & coverage</h3>'+input('name','Display name',db.name)+input('role','Campaign role',db.role||'Builder')+input('device','Testing device',db.device)+input('handle','GitHub handle',db.handle||'',true)+'<button>Save profile</button></form></section>'
}
function ledger(page){
 const rewards=page==='rewards',title=rewards?'Reward ledger':'Evidence ledger';
 const rows=db.campaigns.flatMap(c=>c.notes.filter(n=>rewards?n.agent==='Paymaster':['Reviewer','Retest'].includes(n.agent)).map(n=>'<article><small>'+esc(n.agent)+'</small><h3>'+esc(c.name)+'</h3><p>'+esc(n.note)+'</p></article>'));
 return '<section class="desk ledger"><small>Campaign records</small><h2>'+title+'</h2>'+(rows.join('')||'<div class="empty"><p>'+ (rewards?'Recorded reward previews appear here after Paymaster review.':'Accepted reports, evidence requests and retest results appear here as you review a campaign.')+'</p><a href="#workspace">Open campaigns →</a></div>')+'</section>'
}
function consoleScreen(page){const content=page==='workspace'?workspace():page==='profile'?profileScreen():page==='modules'?'<section class="desk"><small>Operations</small><h2>Agent rack</h2>'+rack()+'</section>':ledger(page);return '<div class="console-shell">'+sidebar(page)+content+'</div>'}

function workspace(){const c=db.campaigns[db.selected];return '<section class="desk"><small>'+esc(db.name)+' / Campaign operations</small><h2>Campaigns</h2><details '+(!c?'open':'')+'><summary>Create campaign</summary><form id="create">'+input('name','Project name')+input('pitch','Builder pitch')+'<button>Create campaign</button></form></details>'+(c?'<label>Open campaign<select id="switch">'+db.campaigns.map((v,i)=>'<option value="'+i+'" '+(i===db.selected?'selected':'')+'>'+esc(v.name)+'</option>').join('')+'</select></label><h3>'+esc(c.name)+'</h3><p>'+esc(c.pitch)+'</p>'+c.notes.map(n=>'<section class="log"><strong>'+esc(n.agent)+'</strong><p>'+esc(n.note)+'</p></section>').join('')+stageForm(c):'')+'</section>'}
function render(){const page=location.hash.slice(1);root.innerHTML=page.startsWith('test/')?testerPage():Object.hasOwn(consolePages,page)?consoleScreen(page):landing();root.insertAdjacentHTML('beforeend','<p role="status" id="message"></p>');draw();if(page.startsWith('test/'))loadTesterBrief();if(page==='constellation')document.querySelector('.sky').scrollIntoView();if(page==='guide')document.querySelector('#guide').scrollIntoView()}
root.onchange=e=>{if(e.target.id==='switch')save({...db,selected:Number(e.target.value)})};
root.onclick=async e=>{if(e.target.id==='invite'||e.target.id==='collect'){
 const c=db.campaigns[db.selected],msg=document.querySelector('#message');try{
 const retest=c.step===4,slot=retest?'retestInvite':'invite';
 if(e.target.id==='invite'){const build=retest?e.target.form.elements.build.value.trim():'';if(retest&&!build)throw Error('Enter the fixed build version first.');if(!c[slot]||(retest&&c[slot].build!==build)){const brief=retest?'Retest build '+build+'\n'+c.notes.filter(n=>n.agent==='Reviewer').at(-1)?.note:c.name+' — '+c.pitch+'\n'+c.notes[0].note;c[slot]={...await fieldtest({op:'invite',brief}),build};localStorage.setItem('fieldwork.journal',JSON.stringify(db))}
 const link=document.createElement('a');link.href='#test/'+c[slot].id+'/'+c[slot].tester;link.textContent=link.href;document.querySelector('#inviteLink').replaceChildren(link);msg.textContent=retest?'Send this retest link to the original tester.':'Share this private link with one tester.'}
 else {if(!c[slot])throw Error('Create the tester invitation first.');const {report}=await fieldtest({op:'collect',id:c[slot].id,key:c[slot].owner});if(!report){msg.textContent='Waiting for the tester.';return}if(retest&&report.build!==c[slot].build)throw Error('Tester reported a different build. Review before recording a decision.');for(const key of (retest?['build','result']:['build','steps','result']))e.target.form.elements[key].value=report[key];msg.textContent='Evidence loaded from '+report.name+' on '+report.device+'.'}
 }catch(err){msg.textContent=err.message}return}
 if(e.target.id==='askAgent'){
 const button=e.target,display=button.form.querySelector('.advice'),campaign=db.campaigns[db.selected];
 const values=Object.fromEntries(new FormData(button.form));button.disabled=true;display.textContent='Reading campaign evidence…';
 try{const response=await providerFetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent:agents[campaign.step],context:{pitch:campaign.pitch,notes:campaign.notes,fields:values,profiles:[{name:db.name,device:db.device}]}})});
 const result=await response.json();display.textContent=result.advice||result.error||'No recommendation returned.';if(result.advice)button.form.dataset.advice=result.advice;
 }catch{display.textContent='Run the server with NEAR_AI_API_KEY to get an agent recommendation.'}finally{button.disabled=false}return
 }if(e.target.id!=='quote')return;const target=document.querySelector('#quoteResult'),f=Object.fromEntries(new FormData(e.target.form));try{target.textContent='Requesting quote…';const res=await providerFetch('/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});const data=await res.json();target.textContent=JSON.stringify(data,null,2)}catch{target.textContent='Run the Next.js server with a Rhea access token for live quotes.'}};
root.onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const next=JSON.parse(JSON.stringify(db));try{
 if(e.target.id==='tester'){const [,id,key]=location.hash.slice(1).split('/');await fieldtest({op:'submit',id,key,...f});e.target.remove();document.querySelector('#message').textContent='Evidence delivered to the builder.';return}
 if(e.target.id==='profile'){next.name=f.name;next.device=f.device;next.role=f.role;next.handle=f.handle}
 if(e.target.id==='create'){next.selected=next.campaigns.push({name:f.name,pitch:f.pitch,step:0,notes:[]})-1}
 if(e.target.id==='stage'){const c=next.campaigns[next.selected];let note=Object.entries(f).filter(([,v])=>v).map(([k,v])=>k+' · '+v).join('\n');
 if(c.step===1){const tester=f.device.toLowerCase()===db.device.toLowerCase()?db.name:({Android:'Ada (sample)',Desktop:'Mika (sample)',iOS:'Sol (sample)'})[f.device];note+='\nMatched '+tester+' for '+f.device}
 if(c.step===3){if(!/^\d{1,8}(\.\d{1,6})?$/.test(f.amount)||Number(f.amount)<=0)throw Error('Enter a positive USDC amount.');note+='\nReward preview only.'}
 next.instructions={...next.instructions,[c.step]:f.instruction||''};if(e.target.dataset.advice)note+='\nAgent recommendation · '+e.target.dataset.advice;
 c.notes.push({agent:agents[c.step],note});if(c.step===4&&f.decision==='Still failing')delete c.retestInvite;if(!['Still failing','Request evidence'].includes(f.decision))c.step++}
 save(next);document.querySelector('#message').textContent='Saved to this browser.';
 }catch(err){document.querySelector('#message').textContent=err.message}};
addEventListener('hashchange',()=>{scrollTo(0,0);render()});addEventListener('scroll',draw,{passive:true});render();
async function fieldtest(payload){
 let response;try{response=await fetch('/api/fieldtest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}catch{throw Error('Start the local server to exchange reports.')}
 const data=await response.json().catch(()=>({error:'Open the app through the local server.'}));if(data.error||!response.ok)throw Error(data.error||'Request failed');return data;
}
function testerPage(){return '<section class="desk"><small>Private tester invitation</small><h2>Field assignment</h2><p id="testerBrief">Loading brief…</p><form hidden id="tester">'+input('name','Tester name',db.name)+input('device','Device',db.device)+input('build','Build version')+input('steps','Steps taken')+input('result','Observed result')+'<button>Send evidence</button></form></section>'}
async function loadTesterBrief(){const [,id,key]=location.hash.slice(1).split('/');const target=document.querySelector('#testerBrief'),form=document.querySelector('#tester');try{const result=await fieldtest({op:'open',id,key});target.textContent=result.brief;form.hidden=false}catch(err){target.textContent=err.message}}

let operatorToken='';
async function providerFetch(url,options){
 const send=()=>fetch(url,{...options,headers:{...options.headers,...(operatorToken?{Authorization:'Bearer '+operatorToken}:{})}});
 let response=await send();
 if(response.status===401){operatorToken=prompt('Enter the Fieldwork operator token to use this provider.')?.trim()||'';if(operatorToken)response=await send()}
 return response;
}
