import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
// Disposable review sessions only; exercise the production controls without player save writes.
// PREVIEW_URL targets a running Vite server; HOVER_SCREENS optionally limits route names.
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
await mkdir('artifacts/hover-audit',{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
const out={screens:[],changes:[],errors:[],artworkFailures:[]};page.on('pageerror',e=>out.errors.push(String(e)));
// The dream opening review may be developed independently of this fix.
const hasDreamReview=existsSync(new URL('../src/ui/DreamOpeningReview.tsx',import.meta.url));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5174';
async function audit(name){
 await page.mouse.move(1279,799);await page.waitForTimeout(150);
 await page.addStyleTag({content:'*,*::before,*::after{transition:none!important}'});
 const root=await cdp.send('DOM.getDocument',{depth:-1});
 const {nodeIds}=await cdp.send('DOM.querySelectorAll',{nodeId:root.root.nodeId,selector:'button, a, [role="button"]'});
 let count=0;
 const read=`function(){const s=getComputedStyle(this),r=this.getBoundingClientRect();return {name:this.getAttribute('aria-label')||this.textContent?.trim().slice(0,50),cls:this.className,visible:!!(r.width&&r.height),image:s.backgroundImage,position:s.backgroundPosition,size:s.backgroundSize,color:s.backgroundColor,ink:s.color,border:s.borderImageSource,width:s.width,height:s.height,art:[this,...this.querySelectorAll('*')].flatMap(el=>['','::before','::after'].map(pseudo=>{const s=getComputedStyle(el,pseudo||null);return {image:s.backgroundImage,position:s.backgroundPosition,size:s.backgroundSize,border:s.borderImageSource}}))}}`;
 for(const nodeId of nodeIds){
  try{
   const {object}=await cdp.send('DOM.resolveNode',{nodeId});
   const get=async()=> (await cdp.send('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:read,returnByValue:true})).result.value;
   const before=await get();if(!before.visible)continue;count++;
   for(const state of ['hover','focus-visible','active']){
    await cdp.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[state]});const after=await get();
    const diff={};for(const k of ['image','position','size','color','ink','border','width','height'])if(before[k]!==after[k])diff[k]=[before[k],after[k]];
    for(let i=0;i<before.art.length;i++){const a=before.art[i],b=after.art[i];if(a.image.includes('url(')&&JSON.stringify(a)!==JSON.stringify(b))out.artworkFailures.push({screen:name,name:before.name,state,index:i,before:a,after:b});}
    if(after.color==='rgb(240, 240, 229)'&&after.color!==before.color)out.artworkFailures.push({screen:name,name:before.name,state,diff});
    if(Object.keys(diff).length)out.changes.push({screen:name,name:before.name,cls:before.cls,state,diff});
   }
   await cdp.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});
  }catch(e){out.errors.push(name+': '+String(e));}
 }
 out.screens.push({name,count});console.log(name,count);await writeFile(`artifacts/hover-audit/${process.argv[2]||'verified'}.json`,JSON.stringify(out,null,2));
}
try{
 for(const [name,url] of [['battle','?art=battle-demo'],['campaign','?art=campaign'],['training','?art=economy&lessons=full'],['market','?art=economy&stock=full'],['raising','?art=layout&companions=3'],['entry','?art=realms&view=entry&sample'],['notables','?art=realms&view=notables&sample'],['items','?art=realms&view=items&sample'],['shop','?art=realms&view=shop&sample'],['duel','?art=confrontation-demo'],['debate','?art=debate-demo'],['dialogue','?art=dialogue&scene=notable'],['event-battle','?art=event-challenge&mode=battle'],['event-duel','?art=event-challenge&mode=duel'],['dream','?art=dream-entry&quota=3'],['main-menu','?art=layout']].filter(([name])=>(name!=='dream'||hasDreamReview)&&(!process.env.HOVER_SCREENS||process.env.HOVER_SCREENS.split(',').includes(name)))){
  console.log('opening',name);await page.goto(base+'/'+url,{waitUntil:'domcontentloaded'});await page.waitForSelector('button:visible',{timeout:60000});await page.waitForTimeout(500);await audit(name);
  if(name==='battle'){
   await page.locator('.rt-start').click({timeout:60000});await page.waitForTimeout(1800);await audit('battle-running');
   await page.locator('.rt-battle-record>button').hover();await page.screenshot({path:`artifacts/hover-audit/${process.argv[2]||'verified'}-battle-record.png`});
   await page.locator('.rt-pause').hover();await page.screenshot({path:`artifacts/hover-audit/${process.argv[2]||'verified'}-battle-pause.png`});
   await page.locator('.rt-pause').click();await audit('battle-paused');
   await page.getByRole('button',{name:'繼續戰鬥',exact:true}).last().click();
   await page.waitForFunction(()=>document.querySelector('.rt-skill[aria-label*="鼓舞"]')?.getAttribute('aria-disabled')==='false',null,{timeout:30000});
   await page.locator('.rt-skill[aria-label*="鼓舞"]').click();await page.waitForSelector('.rt-buff');await audit('battle-buffs');
   // Exercise real keyboard focus, hover and press, in addition to forced CSS states.
   await page.locator('.rt-battle-record>button').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
   assert.equal(await page.locator('.rt-battle-record>button').evaluate(el=>el.matches(':focus-visible')),true);
   await page.locator('.rt-battle-record>button').hover();await page.mouse.down();
   assert.match(await page.locator('.rt-battle-record>button').evaluate(el=>getComputedStyle(el).backgroundImage),/command-button-v6/);await page.mouse.up();
  }
  if(name==='main-menu'){
   await page.getByRole('button',{name:'遊戲設定',exact:true}).click();await page.getByRole('button',{name:'返回主選單',exact:true}).click();await page.locator('.system-painted-button.tone-gold').click();await page.waitForSelector('.dream-menu');await audit('main-menu-controls');
  }
  if(name==='dream'){
   await page.getByRole('button',{name:'入夢',exact:true}).click();await audit('dream-introduction');
   for(let i=0;i<30&&!(await page.locator('.dream-companions').count());i++){await page.locator('.story-dialogue').focus();await page.keyboard.press('Enter');await page.waitForTimeout(60);}
   await page.waitForSelector('.dream-companions');await audit('dream-companions');
   await page.locator('.dream-replace').first().click();await audit('dream-picker');
  }
  if(name.startsWith('event-')){
   await page.getByRole('button',{name:'略過對話',exact:true}).click();await audit(name+'-choices');
   await page.locator('.dialogue-choice').nth(1).click();
   for(let i=0;i<30&&!(await page.locator('.event-challenge').count());i++){await page.locator('.event-dialogue').focus();await page.keyboard.press('Enter');await page.waitForTimeout(60);}
   await page.waitForSelector('.ec-next');await audit(name+'-opening');
   for(let i=0;i<20&&await page.locator('.ec-next').count();i++)await page.locator('.ec-next').click();
   if(name==='event-battle'){await page.waitForSelector('.ec-prep');await audit('event-battle-prep');await page.locator('.ec-depart').click();}
   await page.waitForSelector('.ec-playing');await audit(name+'-playing');
  }
  if(name==='campaign'){
   await page.locator('.prep-skill-slot').first().click();await audit('tactic-picker');await page.getByRole('button',{name:'關閉',exact:true}).click();
   await page.locator('#prep-tab-commanders').click();await audit('campaign-commanders');
   await page.locator('.prep-portrait').first().click();await audit('commander-picker');await page.getByRole('button',{name:'關閉',exact:true}).click();
   await page.locator('.prep-support').first().click();await audit('support-picker');await page.getByRole('button',{name:'關閉',exact:true}).click();
   await page.locator('#prep-tab-equipment').click();await audit('campaign-equipment');
   await page.locator('.prep-wave').first().click();await audit('wave-briefing');await page.getByRole('button',{name:'關閉',exact:true}).click();
  }
  if(name==='raising'){
   await page.getByRole('button',{name:'行旅手記',exact:true}).click();await audit('journal');await page.getByRole('button',{name:'關閉行旅手記',exact:true}).click();
   await page.locator('.participant-card').first().click();await audit('notable-detail');await page.getByRole('button',{name:'關閉名士詳情',exact:true}).click();
   await page.getByRole('button',{name:'遊戲設定',exact:true}).click();await audit('system-menu');
   await page.getByRole('button',{name:'系統設定',exact:true}).click();await audit('system-settings');await page.getByRole('button',{name:'返回選單',exact:true}).click();
   await page.getByRole('button',{name:'返回主選單',exact:true}).click();await audit('system-confirm');await page.getByRole('button',{name:'取消',exact:true}).click();await page.getByRole('button',{name:'繼續遊戲',exact:true}).click();
   await page.locator('.footer-vault').click();await audit('inventory');
  }
  if(name==='items'){await page.getByRole('tab',{name:'取得方式',exact:true}).click();await audit('item-source');await page.getByRole('tab',{name:'道具效果',exact:true}).hover();await page.screenshot({path:'artifacts/hover-audit/item-tab-hover.png'});}
  if(name==='entry'){for(const tab of ['#entry-tab-talent','#entry-tab-items']){await page.locator(tab).click();await audit(tab.slice(1));}}
  if(name==='duel'){
   await page.locator('.ct-mode-cards>button').first().click();await page.waitForSelector('.dw-node',{timeout:60000});await audit('duel-actions');
   await page.getByRole('button',{name:'查看單挑規則',exact:true}).click();await audit('duel-guide');await page.getByRole('button',{name:'關閉單挑圖解',exact:true}).click();
   await page.keyboard.press('Escape');await audit('duel-pause');
  }
  if(name==='debate'){
   await page.getByRole('dialog',{name:'輪流接牌試配',exact:true}).getByRole('button',{name:'玩法與特性',exact:true}).click();await audit('debate-guide');
   await page.getByRole('button',{name:'關閉舌戰圖解',exact:true}).click();await page.getByRole('button',{name:'開始辯論',exact:true}).click();await page.waitForSelector('.rally-hand');await audit('debate-hand');
  }
 }
 assert.deepEqual(out.errors,[],'No browser errors');
 assert.deepEqual(out.artworkFailures,[],'Painted controls and descendant sprite cells must survive hover, focus and press');
 await writeFile(`artifacts/hover-audit/${process.argv[2]||'verified'}.json`,JSON.stringify(out,null,2));
 console.log('PASS:',out.screens.length,'screen states,',out.screens.reduce((n,s)=>n+s.count,0),'control instances; hover/focus/active artwork stable, no browser errors.');
}catch(e){await page.screenshot({path:'artifacts/hover-audit/failure.png'});throw e;}finally{await writeFile(`artifacts/hover-audit/${process.argv[2]||'verified'}.json`,JSON.stringify(out,null,2));await browser.close();}
