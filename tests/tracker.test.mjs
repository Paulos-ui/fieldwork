import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('tracker opens a campaign and exports only its public journal fields', () => {
  const campaign={name:'Wallet <RC>',pitch:'Connect on Android',step:2,notes:[{agent:'Scout',note:'Assigned'}],invite:{key:'private'}};
  const journal={name:'Builder',device:'Android',campaigns:[campaign],selected:0,identitySeed:'seed'};
  const root={insertAdjacentHTML(){}};
  const location={hash:'#tracker'};
  const context={
    document:{querySelector:selector=>selector==='#screen'?root:null},
    location,addEventListener(){},
    sessionStorage:{getItem:()=>JSON.stringify({id:'demo'})},
    localStorage:{getItem:()=>JSON.stringify(journal),setItem(){}}
  };
  vm.runInNewContext(readFileSync(new URL('../public/fieldwork.js',import.meta.url),'utf8'),context);
  assert.match(root.innerHTML,/Campaign tracker/);
  assert.match(root.innerHTML,/Wallet &lt;RC&gt;/);
  assert.match(root.innerHTML,/data-open-campaign="0"/);
  root.onclick({target:{closest:()=>({dataset:{openCampaign:'0'}})}});
  assert.equal(location.hash,'workspace');
  const record=JSON.parse(vm.runInNewContext('JSON.stringify(campaignRecord(db.campaigns[0]))',context));
  assert.deepEqual(record,{project:campaign.name,pitch:campaign.pitch,status:'Reviewer',entries:campaign.notes});
});
