const opportunitySources = [
{id:'legion-video',name:'NEAR Legion Video Content Campaign · Round 5',org:'NEAR Legion',kind:'Bounties',category:'Content',url:'https://nearn.io/nearlegion1/5/',description:'Create an original video explaining NEAR’s post-quantum security. Read the submission requirements on NEARN.',reward:'100 NEAR prize pool',label:'Check source deadline',mark:'L'},
{id:'hackathon',name:'Build Beyond Boundaries',org:'NEAR',kind:'Hackathon',category:'Development',url:'https://nearhackathon.com/',description:'Build AI agents, private applications and chain abstraction products on NEAR.',deadline:'2026-11-14T23:59:00Z',label:'Submissions',mark:'N'},
{id:'nearn',name:'NEAR ecosystem bounties',org:'NEARN',kind:'Bounties',category:'All skills',url:'https://nearn.io/',description:'Browse content, design and development tasks from NEAR ecosystem teams.',label:'Directory',mark:'↗'},
{id:'devhub',name:'Contribute to NEAR DevHub',org:'NEAR DevHub',kind:'Bounties',category:'Development',url:'https://nearn.io/devhub/',description:'Find technical contributions and ecosystem work published by DevHub.',label:'Directory',mark:'D'},
{id:'potlock',name:'Community campaigns',org:'Potlock',kind:'Campaigns',category:'Community',url:'https://app.potlock.org/campaigns',description:'Discover NEAR public goods campaigns and community-led ideas.',label:'Directory',mark:'P'},
{id:'pots',name:'Public goods matching rounds',org:'Potlock',kind:'Grants',category:'Community',url:'https://app.potlock.org/pots',description:'Explore matching rounds and check current application windows.',label:'Check current rounds',mark:'P'},
{id:'metapool',name:'mpDAO ecosystem grants',org:'Meta Pool',kind:'Grants',category:'Development',url:'https://docs.metapool.app/master/meta-pool-ecosystem/vote-governance/grants',description:'Review grant requirements for ecosystem growth and AI initiatives.',label:'Confirm current round',mark:'M'},
{id:'rewards',name:'NEAR Protocol Rewards',org:'NEAR',kind:'Grants',category:'Development',url:'https://www.nearprotocolrewards.com/',description:'Explore support for teams building applications and agents on NEAR.',label:'Confirm cohort',mark:'N'}
];
const browse={query:'',kind:'All',category:'All skills',saved:false};
function opportunityStatus(item){
 if(!item.deadline)return item.label;
 return Date.now()>Date.parse(item.deadline)?'Submissions closed':'Due '+new Date(item.deadline).toLocaleDateString(undefined,{month:'short',day:'numeric'});
}
function savedIds(){return db.bookmarks||[]}
function opportunityRow(item){
 const saved=savedIds().includes(item.id);
 return `<article class="opportunity-row"><span class="org-mark mark-${item.id}" aria-hidden="true">${item.mark}</span><div><a class="opportunity-title" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.name} ↗</a><p>${item.org}</p><div class="listing-meta"><span>${item.kind}</span><span>${opportunityStatus(item)}</span><span>${item.category}</span>${item.reward?`<span>${item.reward}</span>`:''}</div><p class="listing-description">${item.description}</p></div><button class="bookmark" data-bookmark="${item.id}" aria-label="${saved?'Unsave':'Save'} ${item.name}" aria-pressed="${saved}">${saved?'★':'☆'}</button></article>`;
}
function filteredOpportunities(){
 const query=browse.query.trim().toLowerCase();
 return opportunitySources.filter(item=>(browse.kind==='All'||item.kind===browse.kind)&&(browse.category==='All skills'||item.category===browse.category)&&(!browse.saved||savedIds().includes(item.id))&&`${item.name} ${item.org} ${item.description}`.toLowerCase().includes(query));
}
function opportunities(){
 return `<section class="desk opportunity-desk"><div class="browse-heading"><h2>Browse opportunities</h2><a href="#modules">Find your agent →</a></div><div class="browse-tabs" role="group" aria-label="Opportunity type">${['All','Bounties','Grants','Campaigns','Hackathon'].map(kind=>`<button data-kind="${kind}" aria-pressed="${browse.kind===kind}">${kind}</button>`).join('')}</div><div class="browse-controls"><label class="search-label"><span>Search NEAR opportunities</span><input type="search" id="opportunity-search" placeholder="Search by team, skill or opportunity" value="${esc(browse.query)}"></label><label><span>Skill</span><select id="opportunity-skill">${['All skills','Development','Content','Community'].map(skill=>`<option ${browse.category===skill?'selected':''}>${skill}</option>`).join('')}</select></label><button data-show-saved aria-pressed="${browse.saved}">★ Saved</button></div><div id="opportunity-results">${opportunityResults()}</div><p class="catalog-note">NEAR sources reviewed 14 Nov 2026. Directories link to current listings. Confirm individual deadlines and rewards with the organizer.</p></section>`;
}
function opportunityResults(){const items=filteredOpportunities();return items.length?items.map(opportunityRow).join(''):'<div class="empty"><h3>No matching opportunities</h3><p>Try another search or clear the saved filter.</p></div>'}
function consoleAside(){
 const saved=opportunitySources.filter(item=>savedIds().includes(item.id));
 const activity=db.campaigns.flatMap(c=>c.notes.map(note=>({title:c.name,agent:note.agent}))).slice(-5).reverse();
 return `<aside class="console-aside"><div class="console-stats"><div><strong>${db.campaigns.length}</strong><span>Your campaigns</span></div><div><strong>${db.campaigns.filter(c=>c.step===5).length}</strong><span>Verified fixes</span></div></div><section><div class="aside-heading"><h3>Saved opportunities</h3><span>${saved.length}</span></div>${saved.length?saved.map(item=>`<a class="saved-row" href="${item.url}" target="_blank" rel="noopener noreferrer"><span class="mini-mark">${item.mark}</span><span><strong>${item.name}</strong><small>${item.org}</small></span></a>`).join(''):'<p>Save a listing to keep it close to your next build.</p>'}</section><section><h3>Your recent activity</h3>${activity.length?activity.map(item=>`<div class="activity-row"><i></i><p><strong>${esc(item.title)}</strong><span>${esc(item.agent)} decision recorded</span></p></div>`).join(''):'<p>Your campaign decisions will appear here.</p>'}</section><a class="integration-note" href="https://github.com/rhea-finance/rhea-sdk-docs/blob/main/CrossChainDexAPI.md" target="_blank" rel="noopener noreferrer"><small>Integration notes</small><strong>Rhea reward routing ↗</strong><p>Prepare a cross-chain USDC quote after evidence review.</p></a></aside>`;
}
function consoleHero(page){
 const agentPage=page==='modules';
 return `<section class="console-hero"><div><small>FIELDWORK / NEAR ECOSYSTEM</small><h1>${agentPage?'Your next move.<br>Your own agent team.':'Find work. Build proof.'}</h1><p>${agentPage?'Five specialists to sharpen your pitch, coordinate testers and turn evidence into a better release.':'Discover NEAR opportunities and take your next build from a testable pitch to a verified fix.'}</p><a href="${agentPage?'#workspace':'#modules'}">${agentPage?'Start a campaign':'Explore the agents'} →</a></div><div class="network-art" aria-hidden="true"><div class="art-route route-one"></div><div class="art-route route-two"></div><span class="art-chip near-chip">N<span>NEAR</span></span><span class="art-chip rhea-chip">↔<span>RHEA</span></span><span class="art-chip field-chip">F<span>FIELDWORK</span></span><i class="route-pulse"></i><span class="art-caption">BRIEF → EVIDENCE → VERIFIED</span></div></section>`;
}
function agentMarketplace(){
 const verbs=['Sharpen your pitch','Find testing coverage','Review the evidence','Plan the reward','Verify the next build'];
 return `<section class="desk agent-desk"><div class="browse-heading"><h2>Choose your agent</h2><span>5 specialists · One campaign record</span></div><div class="agent-market">${agents.map((name,i)=>`<article class="agent-tile"><div class="agent-tile-heading"><span class="agent-symbol symbol-${i}" aria-hidden="true">${['✳','⌁','⌘','⇄','✓'][i]}</span><small>FIELDWORK AGENT ${i+1}</small></div><h3>${name}</h3><strong>${verbs[i]}</strong><p>${guide[i]}</p><a href="#agent/${i}">Open agent workspace →</a></article>`).join('')}</div></section>`;
}
let activeAgent=0;
function agentWorkspace(index){
 const c=db.campaigns[db.selected];
 const agentFields=[
 input('action','Test action','',true)+input('expected','Expected result','',true),
 choice('device','Target device',['Android','Desktop','iOS']),
 input('build','Build version','',true)+input('steps','Reproduction steps','',true)+input('expected','Expected result','',true)+input('result','Observed result','',true),
 input('amount','Reward in USDC','',true)+input('sender','NEAR sender',session?.accountId||'',true)+input('recipient','Reward destination on Base','',true),
 input('build','New build version','',true)+input('expected','Expected result','',true)+input('result','Retest result','',true)
 ][index];

 return `<section class="desk agent-workspace"><a href="#modules">← All agents</a><small>Fieldwork Agent AI</small><h2>${agents[index]}</h2><p>${guide[index]}</p><form id="agent-run">${agentFields}<label>What are you working on?<textarea name="request" required maxlength="4000" placeholder="Describe your NEAR project, question, or evidence to review."></textarea></label><label>Additional evidence<textarea name="evidence" maxlength="10000" placeholder="Expected result, device, observations, reward constraints, or retest result…"></textarea></label>${c?`<p>Using campaign context from <strong>${esc(c.name)}</strong>.</p>`:'<p>Create a campaign when you’re ready to save decisions across all five stages.</p>'}<button>Run ${agents[index]}</button><output class="agent-result" aria-live="polite"></output></form><a href="#workspace">Open campaign workflow →</a></section>`;
}
function consoleToolbar(page){
 return `<div class="console-toolbar"><nav aria-label="Console"><a href="#opportunities" ${page==='opportunities'?'aria-current="page"':''}>Opportunities</a><a href="#modules" ${page==='modules'||page.startsWith('agent/')?'aria-current="page"':''}>Agents</a><a href="#workspace" ${page==='workspace'?'aria-current="page"':''}>Campaigns</a><a href="#tracker" ${page==='tracker'?'aria-current="page"':''}>Tracker</a></nav><div class="console-account"><span class="network-indicator">NEAR</span><a href="#profile">${esc(session?.accountId||'Workspace')}</a><button id="logout">Sign out</button></div></div>`;
}
