import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out='artifacts/duel-guide';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:5182')+'/?art=confrontation-demo&seed=17092026');
 await page.locator('.ct-mode-cards>button').first().click({timeout:60000});
 await page.waitForFunction(()=>document.querySelector('.ct-battle')?.getAttribute('data-contest-phase')==='read',null,{timeout:60000});
 await page.screenshot({path:out+'/entry.png'});
 await page.getByRole('button',{name:'查看單挑規則',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'單挑規則',exact:true});await dialog.waitFor();
 assert.equal(await page.locator('.ct-battle').getAttribute('data-status'),'paused');
 assert.equal(await dialog.getByRole('tab').count(),3);
 const backPath=await dialog.locator('.rg-close svg path').getAttribute('d');
 assert.equal(await dialog.locator('.rg-close').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
 assert(!/我方選|看對手出什麼|同招不升變|對手機率升變|同招連用|特性另計|回體有上限/.test(await dialog.textContent()));
 for(const name of ['攻擊','防守','休養']){
  await dialog.getByRole('tab',{name,exact:true}).click();
  assert.equal(await dialog.getByRole('tab',{name,exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await dialog.locator('.dg-matchup').count(),3);
  assert.equal(await dialog.locator('.dg-evolution').count(),1);
  await page.screenshot({path:`${out}/${name}.png`});
  for(const size of [{width:960,height:640},{width:1600,height:1000},{width:1280,height:720}]){
   await page.setViewportSize(size);
   const layout=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,overflow:el.scrollHeight>el.clientHeight+1,children:[...el.querySelectorAll('.dg-matchup,.dg-bottom')].every(c=>c.getBoundingClientRect().bottom<=r.bottom)};});
   assert(layout.inside&&!layout.overflow&&layout.children,JSON.stringify({name,size,layout}));
  }
 }
 await dialog.getByRole('tab',{name:'攻擊',exact:true}).focus();
 await page.keyboard.press('ArrowRight');assert.equal(await dialog.getByRole('tab',{name:'防守',exact:true}).getAttribute('aria-selected'),'true');
 await page.keyboard.press('End');assert.equal(await dialog.getByRole('tab',{name:'休養',exact:true}).getAttribute('aria-selected'),'true');
 for(let i=0;i<8;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));}
 await page.keyboard.press('1');assert.equal(await page.locator('.ct-battle').getAttribute('data-contest-phase'),'read');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
 await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='查看單挑規則');
 assert.equal(await page.locator('.ct-battle').getAttribute('data-status'),'running');
 await page.keyboard.press('h');await dialog.waitFor();
 await page.mouse.click(640,360,{button:'right'});await dialog.waitFor({state:'detached'});
 assert.equal(await page.locator('.ct-battle').getAttribute('data-status'),'running','closing rules must not also open pause');
 await page.keyboard.press('1');
 await page.waitForFunction(()=>document.querySelector('.ct-battle')?.getAttribute('data-contest-phase')==='clash');
 await page.waitForFunction(()=>document.querySelector('.ct-battle')?.getAttribute('data-contest-phase')==='read',null,{timeout:30000});
 await page.keyboard.press('h');await dialog.waitFor();
 assert.equal(await dialog.locator('.dx-history-turn').count(),1);
 await page.screenshot({path:out+'/with-history.png'});
 await dialog.getByRole('button',{name:'關閉單挑圖解',exact:true}).click();await dialog.waitFor({state:'detached'});
 await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:5182')+'/?art=debate-demo');
 await page.getByRole('dialog',{name:'輪流接牌試配',exact:true}).getByRole('button',{name:'玩法與特性',exact:true}).click({timeout:60000});
 const debate=page.getByRole('dialog',{name:'舌戰圖解',exact:true});await debate.waitFor();
 assert.equal(await debate.locator('.rg-close svg path').getAttribute('d'),backPath,'both rulebooks use the same back arrow');
 assert.equal(await debate.locator('.rg-close').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
 await page.screenshot({path:out+'/debate-shared-back.png'});
 await debate.getByRole('button',{name:'關閉舌戰圖解',exact:true}).click();await debate.waitFor({state:'detached'});
 assert.deepEqual(errors,[]);
 console.log('PASS: visible help entry, three tabs/nine matchups, real pause/resume, keyboard tabs/focus trap, H/Escape/right-click, no action while open, retained history, 960/1280/1600 layouts and no browser errors.');
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error(errors);throw e;}finally{await browser.close();}
