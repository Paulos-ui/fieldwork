import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function openConsole(hash, journal) {
  const root={insertAdjacentHTML(){}};
  const results={innerHTML:''};
  const location={hash};
  const storage=new Map([['fieldwork.journal.test.near',JSON.stringify(journal)]]);
  const context=vm.createContext({
    document:{querySelector(selector){return selector==='#screen'?root:selector==='#opportunity-results'?results:null}},
    location,addEventListener(){},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}
  });
  vm.runInContext(readFileSync(new URL('../public/console.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../public/fieldwork.js',import.meta.url),'utf8'),context);
  assert.match(root.innerHTML,/Connect NEAR wallet/);
  vm.runInContext("applyWalletSession({accountId:'test.near',network:'mainnet'})",context);
  const evaluate=source=>vm.runInContext(source,context);
  const click=attributes=>root.onclick({target:{closest:selector=>attributes[selector]||null}});
  return {root,results,location,storage,evaluate,click};
}
const emptyJournal=()=>({name:'Builder',device:'Android',campaigns:[],selected:0,identitySeed:'seed'});

test('tracker resumes a NEAR account campaign and excludes invitation credentials from exports',async()=>{
  const campaign={name:'Wallet <RC>',pitch:'Connect on Android',step:2,notes:[{agent:'Scout',note:'Assigned'}],invite:{key:'private'}};
  const journal={...emptyJournal(),campaigns:[campaign]};
  const console=openConsole('#tracker',journal);
  assert.match(console.root.innerHTML,/Campaign tracker/);
  assert.match(console.root.innerHTML,/Wallet &lt;RC&gt;/);
  assert.match(console.root.innerHTML,/data-open-campaign="0"/);
  await console.click({'[data-open-campaign]':{dataset:{openCampaign:'0'}}});
  assert.equal(console.location.hash,'workspace');
  const record=JSON.parse(console.evaluate('JSON.stringify(campaignRecord(db.campaigns[0]))'));
  assert.deepEqual(record,{project:campaign.name,pitch:campaign.pitch,status:'Reviewer',entries:campaign.notes});
});

test('opportunity search, type filters and saved listings persist only in the current account journal',async()=>{
  const console=openConsole('#opportunities',emptyJournal());
  console.root.oninput({target:{id:'opportunity-search',value:'DevHub'}});
  assert.match(console.results.innerHTML,/Contribute to NEAR DevHub/);
  assert.doesNotMatch(console.results.innerHTML,/mpDAO ecosystem grants/);
  console.root.oninput({target:{id:'opportunity-search',value:''}});
  await console.click({'[data-kind]':{dataset:{kind:'Grants'}}});
  assert.match(console.root.innerHTML,/mpDAO ecosystem grants/);
  assert.doesNotMatch(console.root.innerHTML,/Contribute to NEAR DevHub/);
  console.root.onchange({target:{id:'opportunity-skill',value:'Community'}});
  const filtered=JSON.parse(console.evaluate('JSON.stringify(filteredOpportunities().map(item=>item.id))'));
  assert.deepEqual(filtered,['pots']);
  await console.click({'[data-bookmark]':{dataset:{bookmark:'pots'}}});
  const saved=JSON.parse(console.storage.get('fieldwork.journal.test.near'));
  assert.deepEqual(saved.bookmarks,['pots']);
  assert.equal(JSON.parse(console.storage.get('fieldwork.journal')).bookmarks,undefined);
  await console.click({'[data-show-saved]':{}});
  assert.deepEqual(JSON.parse(console.evaluate('JSON.stringify(filteredOpportunities().map(item=>item.id))')),['pots']);
  await console.click({'[data-bookmark]':{dataset:{bookmark:'pots'}}});
  assert.match(console.root.innerHTML,/No matching opportunities/);
  assert.deepEqual(JSON.parse(console.storage.get('fieldwork.journal.test.near')).bookmarks,[]);
  console.evaluate("applyWalletSession({accountId:'other.near',network:'mainnet'})");
  assert.equal(console.evaluate('db.campaigns.length'),0);
  assert.deepEqual(JSON.parse(console.evaluate('JSON.stringify(savedIds())')),[]);
});

test('each of the five agents opens a dedicated signed-in assessment form',()=>{
  const console=openConsole('#modules',emptyJournal());
  const names=['Pitch Coach','Scout','Reviewer','Paymaster','Retest'];
  for(const [index,name] of names.entries()){
    assert.match(console.root.innerHTML,new RegExp('href="#agent/'+index+'"'));
    console.location.hash='#agent/'+index;
    console.evaluate('render()');
    assert.ok(console.root.innerHTML.includes('<h2>'+name+'</h2>'));
    assert.match(console.root.innerHTML,/id="agent-run"/);
    assert.match(console.root.innerHTML,/name="request"/);
    assert.match(console.root.innerHTML,/Run /);
    assert.equal(console.evaluate('activeAgent'),index);
    console.location.hash='#modules';
    console.evaluate('render()');
  }
});
