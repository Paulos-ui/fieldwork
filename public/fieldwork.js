'use strict';
const agents=['Pitch Coach','Scout','Reviewer','Paymaster','Retest'];
const guide=['Identify the user, action and visible outcome of the pitch. Approve a testable brief.','Match a device requirement to a tester profile and keep the selection with the campaign.','Compare evidence with the brief. Return incomplete reports before approving a reward.','Prepare a reward in USDC. A configured server can request a live NEAR-to-Base quote from Rhea.','Repeat the original steps on a new build and record whether the issue is fixed.'];
const sampleHandoffs = ["Brief approved · Return from wallet approval and check for an account address.","Assignment · Android tester, RC.1, wallet already installed.","Evidence accepted · Approval succeeded. The return screen kept loading.","Reward preview · 10 USDC for the accepted report. Builder reviews the quote.","Retest passed · On RC.2 the address appears after the same approval steps."];
const root=document.querySelector('#screen');
const defaults={name:'Builder',device:'Android',campaigns:[],selected:0};
let session=null;
let journalKey='fieldwork.journal';
let db;
try{db=JSON.parse(localStorage.getItem(journalKey))||{...defaults,name:session?.email?.split("@")[0]||defaults.name}}catch{db=defaults}
if(!db.identitySeed){db.identitySeed=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);try{localStorage.setItem(journalKey,JSON.stringify(db))}catch{}}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function input(key,title,value='',optional=false){return '<label>'+title+'<input maxlength="500" name="'+key+'" value="'+esc(value)+'" '+(optional?'':'required')+'></label>'}
function choice(key,title,values){return '<label>'+title+'<select name="'+key+'">'+values.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>'}
function save(next){localStorage.setItem(journalKey,JSON.stringify(next));db=next;render()}
const nodePositions=[[12,62],[31,27],[50,55],[69,23],[88,53]];
function plot(text,offset){return [...text].map((ch,i)=>'<b aria-hidden="true" style="--i:'+(offset+i)+'">'+(ch===' '?'&nbsp;':ch)+'</b>').join('')}
const specs = [
 ['Vision','Make a release claim testable.','A working demo can still fail on the first wallet handoff. Fieldwork gives builders and testers one shared question, one expected outcome and a build number to check.'],
 ['How it works','One brief travels through five agents.','Pitch Coach clarifies the claim. Scout prepares a tester assignment. Reviewer records evidence. Paymaster previews a USDC reward. Retest repeats the original steps against a new build.'],
 ['User guide','Run your first field test.','Open Campaigns and enter a project name and pitch. Set the action and expected result, pick the device and share the tester invitation. Collect the report, review the result and invite the tester back for the fixed build.'],
 ['Features','Keep the evidence with the decision.','Your workspace holds campaign history, editable agent instructions, evidence and reward previews. Tester links accept a single report. Configured providers can supply AI advice and a cross-chain quote.']
];
function chapters(){
 return `<section class="proof-sheet" id="proof"><div><small>Reputation & ownership</small><h2>Give every fix<br>a field record.</h2><p>Carry the original claim, observed failure and retest together. Your next release review starts with evidence of what changed.</p><dl><dt>Assignment</dt><dd>Device, action and expected result</dd><dt>Evidence</dt><dd>Tester observations tied to a build</dd><dt>Verification</dt><dd>Repeatable steps and a recorded outcome</dd></dl></div><figure class="record-art"><div class="record-orbit"></div><div class="record-card"><small>Example / Android</small><strong>Wallet return</strong><p>RC.1 · Loading screen</p><p>RC.2 · Address visible</p><b>✓ Retest passed</b></div></figure></section>
 <section id="docs" class="spec-doc"><small>Field manual</small><h2>About the project</h2><div class="spec-layout"><nav aria-label="Documentation chapters">${specs.map(([label],i)=>`<a href="#spec-${i}">0${i+1} &nbsp; ${label}</a>`).join('')}</nav><div>${specs.map(([label,title,copy],i)=>`<article id="spec-${i}"><small>0${i+1} / ${label}</small><h3>${title}</h3><p>${copy}</p></article>`).join('')}</div></div></section>
 <section class="beta-sheet" id="beta"><small>Fieldwork private beta</small><h2>Put your next build<br>in a tester’s hands.</h2><p>Tell us what you’re building or which devices you can test.</p><form id="beta-request"><label>Name (optional)<input name="name" maxlength="100" autocomplete="name"></label><label>Email<input type="email" name="email" required maxlength="254" autocomplete="email"></label><label>Role (optional)<select name="role"><option value="">Select role</option><option>Builder</option><option>Tester</option><option>Both</option></select></label><label>Ecosystem (optional)<input name="ecosystem" maxlength="100" value="NEAR" readonly></label><label>What would you like to test? (optional)<textarea name="goal" maxlength="600"></textarea></label><button>Join the private beta</button><output role="status"></output></form></section>`;
}
function signIn(){
 return '<section class="access-screen"><div class="access-intro"><small>Fieldwork / NEAR workspace</small><h1>Your account.<br>Your agent team.</h1><p>Find NEAR opportunities, work with five specialists and build a record of what you ship.</p></div><div class="access-card"><small>NEAR mainnet</small><h2>Connect to Fieldwork</h2><p>Choose a NEAR wallet and sign the Fieldwork access message to open your workspace.</p><div class="wallet-options"><button id="wallet-connect">Connect NEAR wallet →</button><button id="wallet-verify" hidden>Sign access message →</button></div><output class="wallet-status" id="wallet-status" role="status"></output><p class="wallet-note">The signature proves ownership of your NEAR account. Your wallet shows the message before you approve.</p><a href="#beta">Request private beta access</a></div></section>';
}
async function submitAccess(form,fields){
 const output=form.querySelector('output'),button=form.querySelector('button');
 button.disabled=true;output.textContent='Sending…';
 try{await accessRequest({op:'beta',...fields,ecosystem:'NEAR'});form.innerHTML='<h3>Request received.</h3><p>Your beta request has been recorded.</p>'}
 catch(error){output.textContent=error.message}finally{button.disabled=false}
}
async function accessRequest(payload){
 const response=await fetch('/api/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const result=await response.json().catch(()=>({error:'The access service could not respond.'}));
 if(!response.ok)throw Error(result.error||'Request failed.');
 return result;
}

function landing(){
 const rays=Array.from({length:24},(_,i)=>{const t=i*Math.PI/12;return '<line x1="400" y1="400" x2="'+(400+380*Math.cos(t))+'" y2="'+(400+380*Math.sin(t))+'"/>'}).join('');
 return '<div class="hud" aria-hidden="true"><span id="hudStage">FIELDWORK / BRIEF</span><span id="hudPct">0%</span></div><section class="origin"><div class="origin-frame"><svg class="rays" viewBox="0 0 800 800" aria-hidden="true">'+rays+'</svg><aside class="frame-label" aria-hidden="true">NEAR ECOSYSTEM<br>BUILDER OPERATIONS</aside><aside class="frame-label right" aria-hidden="true">CAMPAIGN NETWORK<br>05 AGENT MODULES</aside><div class="scan-ring" aria-hidden="true"></div><div class="hero-foot">↓ &nbsp; SCROLL TO TRACE THE RELEASE</div><div class="origin-copy"><small>NEAR / Beta tester connect</small><h1 aria-label="Test with real builders.">'+plot('Test with',0)+'<br><span>'+plot('real builders.',9)+'</span></h1><p>Fieldwork coordinates five agents to turn your pitch into a test campaign, review real evidence and verify the fix.</p><a class="button" href="#beta">Join the private beta</a> <a href="#constellation">Explore agents ↓</a></div></div></section><section class="specimen" id="release"><div><small>Campaign walkthrough / Example</small><h2>One wallet bug.<br><em>Two builds.</em></h2><p>A builder promises that Android users can return from their wallet and see a connected account. Follow the same report through all five handoffs.</p></div><div class="case-file"><small>Test record · Android</small><h3>Wallet return flow</h3><dl><dt>Expected</dt><dd>Account address appears after approval.</dd><dt>Build RC.1</dt><dd>Tester returns to a loading screen.</dd><dt>Build RC.2</dt><dd>The same steps now show the address.</dd></dl><a href="#workspace">Create a testing brief ↗</a></div></section><section class="sky" id="constellation"><div class="sky-frame"><small>Agent system / NEAR</small><h2>From pitch review<br>to verified fix.</h2><div class="instruments"><div class="chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="'+nodePositions.map(p=>p.join(',')).join(' ')+'" pathLength="1"/></svg><i class="packet" aria-hidden="true"></i>'+agents.map((a,i)=>'<button type="button" data-node="'+i+'" aria-label="'+a+'" style="left:'+nodePositions[i][0]+'%;top:'+nodePositions[i][1]+'%"><i></i><span>'+a+'</span></button>').join('')+'</div><div class="readout"><small id="unit"></small><h3 id="agentName"></h3><p id="agentRole"></p><div class="handoff"><small>Example campaign output</small><p id="handoffText"></p></div><a href="#workspace">Open console →</a></div></div></div></section><div id="guide"></div>' + chapters()
}
let selectedNode=null;
function draw(){
 const sky=document.querySelector('.sky');if(!sky)return;
 const progress=Math.max(0,Math.min(1,-sky.getBoundingClientRect().top/Math.max(1,sky.offsetHeight-innerHeight)));
 const fraction=Math.min(1,Math.max(0,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));
 root.style.setProperty('--read',Math.round(fraction*100)+'%');
 document.querySelector('#hudPct').textContent=Math.round(fraction*100)+'%';
 const chapters=[['.origin','BRIEF'],['.specimen','TEST RECORD'],['.sky','AGENTS'],['.proof-sheet','PROOF'],['.spec-doc','DOCS'],['.beta-sheet','JOIN']];
 const chapter=chapters.filter(([selector])=>document.querySelector(selector).getBoundingClientRect().top<=innerHeight*.48).at(-1);
 document.querySelector('#hudStage').textContent='FIELDWORK / '+(chapter?.[1]||'BRIEF');
 const proof=document.querySelector('.proof-sheet');
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)proof.style.setProperty('--tilt',Math.max(-24,Math.min(24,(innerHeight/2-proof.getBoundingClientRect().top)/innerHeight*30))+'deg');
 const specIndex=[...document.querySelectorAll('.spec-layout article')].filter(el=>el.getBoundingClientRect().top<innerHeight*.6).length-1;
 document.querySelectorAll('.spec-layout nav a').forEach((link,i)=>{if(i===Math.max(0,specIndex))link.setAttribute('aria-current','step');else link.removeAttribute('aria-current')});
 const index=selectedNode??Math.round(progress*4);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 root.style.setProperty('--hero-shift',reduced?'0px':(-Math.min(innerHeight,scrollY)*.17)+'px');
 root.style.setProperty('--ray-scale',reduced?'1':String(1+Math.min(1,scrollY/innerHeight)*.25));
 const position=selectedNode ?? progress*4;
 const segment=Math.min(3,Math.floor(position));
 const t=position-segment;
 const [x,y]=nodePositions[segment], [nx,ny]=nodePositions[segment+1];
 root.style.setProperty('--packet-x',(x+(nx-x)*t)+'%');
 root.style.setProperty('--packet-y',(y+(ny-y)*t)+'%');
 const track=document.querySelector('.chart polyline');
 const lengths=nodePositions.slice(1).map(([a,b],i)=>Math.hypot(a-nodePositions[i][0],b-nodePositions[i][1]));
 const travelled=lengths.slice(0,segment).reduce((a,b)=>a+b,0)+lengths[segment]*t;
 track.style.strokeDashoffset=String(1-travelled/lengths.reduce((a,b)=>a+b,0));
 document.querySelector('#handoffText').textContent=sampleHandoffs[index];
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
 const forms=[(vague?'<p>Coach found a broad claim. Name one environment and an outcome someone can observe.</p>':'<p>Choose the action that would demonstrate this promise.</p>')+input('action','Test action')+input('expected','Expected result'),choice('device','Target environment',['Android','Desktop','iOS']),input('build','Build version')+input('steps','Reproduction steps')+input('result','Observed result')+choice('decision','Review decision',['Accept report','Request evidence']),input('amount','Reward in USDC','10')+input('sender','NEAR sender for live quote',session?.accountId||'',true)+input('recipient','Base recipient for live quote','',true)+'<p>Preview only. A quote does not transfer funds.</p><button type="button" id="quote">Request Rhea quote</button><pre id="quoteResult" aria-live="polite"></pre>',input('build','New build version')+input('result','Retest evidence')+choice('decision','Outcome',['Fixed','Still failing'])];
 return c.step===5?'<h3>Fix verified</h3>':'<form id="stage"><small>Stage '+(c.step+1)+' of 5</small><h3>'+agents[c.step]+'</h3>'+(c.step===1?'<button type="button" id="invite">Create tester invitation</button><p id="inviteLink"></p>':'')+(c.step===4?'<button type="button" id="invite">Invite tester to retest</button><p id="inviteLink"></p>':'')+((c.step===2&&c.invite)||(c.step===4)?'<button type="button" id="collect">Load tester evidence</button>':'')+forms[c.step]+input('instruction','Agent instructions (optional)',db.instructions?.[c.step]||'',true)+'<button type="button" id="askAgent">Ask '+agents[c.step]+'</button><p class="advice" aria-live="polite"></p><button>Record decision</button></form>'}
const consolePages={opportunities:'Opportunities',workspace:'Campaigns',modules:'Agent rack',tracker:'Tracker',evidence:'Evidence',rewards:'Rewards',profile:'Profile'};
function sidebar(page){
 return '<aside class="rail"><small>Work</small><nav>'+Object.entries(consolePages).filter(([key])=>key!=='profile').map(([key,label])=>'<a href="#'+key+'" '+(key===page?'aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav><small>Account</small><nav><a href="#profile" '+(page==='profile'?'aria-current="page"':'')+'>Profile</a></nav><div class="rail-id">'+esc(db.name)+'</div><button id="logout">Sign out</button></aside>'
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
function tracker(){
 const stages=[...agents,'Verified'];
 const cards=db.campaigns.map((campaign,index)=>({campaign,index}));
 const groups=stages.map((label,step)=>{
  const group=cards.filter(({campaign})=>campaign.step===step);
  return `<section class="track-stage"><header><h3>${label}</h3><span>${group.length}</span></header>${group.map(({campaign,index})=>`<button type="button" class="track-card" data-open-campaign="${index}"><strong>${esc(campaign.name)}</strong><span>${campaign.notes.length} journal entries · Open →</span></button>`).join('') || '<p>No campaigns here.</p>'}</section>`;
 }).join('');
 return `<section class="desk tracker"><small>Release operations</small><h2>Campaign tracker</h2><p>Follow each build from pitch review to verified fix. Select a card to resume its current assignment.</p><a class="button" href="#workspace">Manage campaigns →</a><div class="track-grid">${groups}</div></section>`;
}
function campaignRecord(campaign){
 return {
  project:campaign.name, pitch:campaign.pitch, status:agents[campaign.step]||'Verified',
  entries:campaign.notes.map(({agent,note})=>({agent,note}))
 };
}
function downloadRecord(index){
 const campaign=db.campaigns[index];
 if(!campaign)return;
 const blob=new Blob([JSON.stringify(campaignRecord(campaign),null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;
 a.download=(campaign.name.replace(/[^a-z0-9_-]+/gi,'-').slice(0,64)||'campaign')+'-field-record.json';
 a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function consoleScreen(page){
 const match=page.match(/^agent\/([0-4])$/);
 if(match)activeAgent=Number(match[1]);
 const content=match?agentWorkspace(activeAgent):page==='opportunities'?opportunities():page==='tracker'?tracker():page==='workspace'?workspace():page==='profile'?profileScreen():page==='modules'?agentMarketplace():ledger(page);
 const hero=['opportunities','modules'].includes(page)?consoleHero(page):'';
 return consoleToolbar(page)+hero+'<div class="console-body">'+content+consoleAside()+'</div>';
}

function workspace(){const c=db.campaigns[db.selected];return '<section class="desk"><small>'+esc(db.name)+' / Campaign operations</small><h2>Campaigns</h2><details '+(!c?'open':'')+'><summary>Create campaign</summary><form id="create">'+input('name','Project name')+input('pitch','Builder pitch')+'<button>Create campaign</button></form></details>'+(c?'<label>Open campaign<select id="switch">'+db.campaigns.map((v,i)=>'<option value="'+i+'" '+(i===db.selected?'selected':'')+'>'+esc(v.name)+'</option>').join('')+'</select></label><h3>'+esc(c.name)+'</h3><p>'+esc(c.pitch)+'</p><button class="record-download" data-export-record="'+db.selected+'">Download field record ↓</button>'+c.notes.map(n=>'<section class="log"><strong>'+esc(n.agent)+'</strong><p>'+esc(n.note)+'</p></section>').join('')+stageForm(c):'')+'</section>'}
function render(){const page=location.hash.slice(1);
 const privatePage=Object.hasOwn(consolePages,page)||/^agent\/[0-4]$/.test(page);
 const accessPage=(page==='signin'||privatePage)&&!session;
 if(typeof document.body!=='undefined'){document.body.dataset.view=accessPage?'access':privatePage||page==='signin'?'console':'public'}
 root.innerHTML=accessPage?signIn():page==='signin'?consoleScreen('opportunities'):page.startsWith('test/')?testerPage():privatePage?consoleScreen(page):landing();root.insertAdjacentHTML('beforeend','<p role="status" id="message"></p>');draw();if(page.startsWith('test/'))loadTesterBrief();if(page==='constellation')document.querySelector('.sky').scrollIntoView();if(page==='release')document.querySelector('#release').scrollIntoView();if(['guide','proof','docs','beta'].includes(page)||/^spec-[0-3]$/.test(page))document.getElementById(page==='guide'?'docs':page)?.scrollIntoView()}
root.oninput=e=>{if(e.target.id==='opportunity-search'){browse.query=e.target.value;document.querySelector('#opportunity-results').innerHTML=opportunityResults()}};
root.onchange=e=>{if(e.target.id==='opportunity-skill'){browse.category=e.target.value;render();return}if(e.target.id==='switch')save({...db,selected:Number(e.target.value)})};
root.onclick=async e=>{
 const kind=e.target.closest?.('[data-kind]');
 if(kind){browse.kind=kind.dataset.kind;render();return}
 if(e.target.closest?.('[data-show-saved]')){browse.saved=!browse.saved;render();return}
 const bookmark=e.target.closest?.('[data-bookmark]');
 if(bookmark){const id=bookmark.dataset.bookmark;const bookmarks=savedIds().includes(id)?savedIds().filter(value=>value!==id):[...savedIds(),id];save({...db,bookmarks});return}
 if(['wallet-connect','wallet-verify'].includes(e.target.id)){
  const output=document.querySelector('#wallet-status');e.target.disabled=true;
  try{if(!window.FieldworkWallet)throw Error('Wallet tools did not load. Refresh this page and try again.');await window.FieldworkWallet.connect(e.target.id==='wallet-verify')}
  catch(error){output.textContent=error.message}finally{e.target.disabled=false}return
 }

 const open=e.target.closest?.('[data-open-campaign]');
 if(open){db.selected=Number(open.dataset.openCampaign);localStorage.setItem(journalKey,JSON.stringify(db));location.hash='workspace';return}
 const record=e.target.closest?.('[data-export-record]');
 if(record){downloadRecord(Number(record.dataset.exportRecord));return}

 if(e.target.id==='logout'){await window.FieldworkWallet.logout();return}
if(e.target.id==='invite'||e.target.id==='collect'){
 const c=db.campaigns[db.selected],msg=document.querySelector('#message');try{
 const retest=c.step===4,slot=retest?'retestInvite':'invite';
 if(e.target.id==='invite'){const build=retest?e.target.form.elements.build.value.trim():'';if(retest&&!build)throw Error('Enter the fixed build version first.');if(!c[slot]||(retest&&c[slot].build!==build)){const brief=retest?'Retest build '+build+'\n'+c.notes.filter(n=>n.agent==='Reviewer').at(-1)?.note:c.name+' — '+c.pitch+'\n'+c.notes[0].note;c[slot]={...await fieldtest({op:'invite',brief}),build};localStorage.setItem(journalKey,JSON.stringify(db))}
 const link=document.createElement('a');link.href='#test/'+c[slot].id+'/'+c[slot].tester;link.textContent=link.href;document.querySelector('#inviteLink').replaceChildren(link);msg.textContent=retest?'Send this retest link to the original tester.':'Share this private link with one tester.'}
 else {if(!c[slot])throw Error('Create the tester invitation first.');const {report}=await fieldtest({op:'collect',id:c[slot].id,key:c[slot].owner});if(!report){msg.textContent='Waiting for the tester.';return}if(retest&&report.build!==c[slot].build)throw Error('Tester reported a different build. Review before recording a decision.');for(const key of (retest?['build','result']:['build','steps','result']))e.target.form.elements[key].value=report[key];msg.textContent='Evidence loaded from '+report.name+' on '+report.device+'.'}
 }catch(err){msg.textContent=err.message}return}
 if(e.target.id==='askAgent'){
 const button=e.target,display=button.form.querySelector('.advice'),campaign=db.campaigns[db.selected];
 const values=Object.fromEntries(new FormData(button.form));button.disabled=true;display.textContent='Reading campaign evidence…';
 try{const response=await providerFetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent:agents[campaign.step],context:{pitch:campaign.pitch,notes:campaign.notes,fields:values,profiles:[{name:db.name,device:db.device}]}})});
 const result=await response.json();display.textContent=result.advice?((result.source==='near-ai'?'Fieldwork Agent AI':'Evidence checks')+'\n'+result.advice):(result.error||'No recommendation returned.');if(result.advice){button.form.dataset.advice=result.advice;button.form.dataset.adviceSource=result.source;}
 }catch{display.textContent='The agent could not connect. Please try again.'}finally{button.disabled=false}return
 }if(e.target.id!=='quote')return;const target=document.querySelector('#quoteResult'),f=Object.fromEntries(new FormData(e.target.form));try{target.textContent='Requesting quote…';const res=await providerFetch('/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});const data=await res.json();target.textContent=JSON.stringify(data,null,2)}catch{target.textContent='The quote service could not be reached. Please try again.'}};
root.onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(e.target.id==='beta-request'){await submitAccess(e.target,f);return}if(e.target.id==='agent-run'){await runAgentWorkspace(e.target,f);return}const next=JSON.parse(JSON.stringify(db));try{
 if(e.target.id==='tester'){const [,id,key]=location.hash.slice(1).split('/');await fieldtest({op:'submit',id,key,...f});e.target.remove();document.querySelector('#message').textContent='Evidence delivered to the builder.';return}
 if(e.target.id==='profile'){next.name=f.name;next.device=f.device;next.role=f.role;next.handle=f.handle}
 if(e.target.id==='create'){next.selected=next.campaigns.push({name:f.name,pitch:f.pitch,step:0,notes:[]})-1}
 if(e.target.id==='stage'){const c=next.campaigns[next.selected];let note=Object.entries(f).filter(([,v])=>v).map(([k,v])=>k+' · '+v).join('\n');
 if(c.step===1){const tester=f.device.toLowerCase()===db.device.toLowerCase()?db.name:null;note+='\n'+(tester?'Available profile: '+tester+' for '+f.device:'Coverage gap: invite a tester with '+f.device)}
 if(c.step===3){if(!/^\d{1,8}(\.\d{1,6})?$/.test(f.amount)||Number(f.amount)<=0)throw Error('Enter a positive USDC amount.');note+='\nReward preview only.'}
 next.instructions={...next.instructions,[c.step]:f.instruction||''};if(e.target.dataset.advice)note+='\n'+(e.target.dataset.adviceSource==='near-ai'?'Fieldwork Agent AI':'Evidence checks')+' · '+e.target.dataset.advice;
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

async function providerFetch(url,options){
 const response=await fetch(url,{...options,credentials:'same-origin'});
 if(response.status===401){session=null;render()}
 return response;
}
async function runAgentWorkspace(form,fields){
 const button=form.querySelector('button'),display=form.querySelector('output');
 button.disabled=true;display.textContent='Reviewing your brief…';
 try{
  const c=db.campaigns[db.selected];
  const context={pitch:fields.request,notes:c?.notes||[],fields:{...fields},profiles:[{name:db.name,device:db.device}]};
  const response=await providerFetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent:agents[activeAgent],context})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'The agent could not respond.');
  display.textContent=(result.source==='near-ai'?'Fieldwork Agent AI':'Evidence checks')+'\n\n'+result.advice;
 }catch(error){display.textContent=error.message}finally{button.disabled=false}
}
function applyWalletSession(verified){
 session=verified;
 journalKey='fieldwork.journal.'+verified.accountId;
 try{db=JSON.parse(localStorage.getItem(journalKey))||{...defaults,name:verified.accountId,campaigns:[],selected:0}}catch{db={...defaults,name:verified.accountId,campaigns:[],selected:0}}
 db.identitySeed=db.identitySeed||verified.accountId;
 if(location.hash==='#signin')location.hash='opportunities';
 render();
}
if(typeof window!=='undefined')window.addEventListener('fieldwork-session',event=>{if(event.detail)applyWalletSession(event.detail);else {session=null;render()}});
