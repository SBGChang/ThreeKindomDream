import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5182',out='artifacts/recruit-farewell';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
  await page.goto(base+'/scripts/fixtures/recruit-farewell.html');
  assert.equal(await page.locator('.recruit-farewell').count(),0);
  await page.getByRole('button',{name:'確認結算 → 夢醒之際',exact:true}).click();
  await page.locator('.recruit-farewell').waitFor();
  assert.equal(await page.locator('.game-bottom').isVisible(),false,'life-end scenes hide chapter/turn chrome');
  const seen=[];
  for(let i=0;i<180;i++){
    if(await page.getByRole('heading',{name:'本世結緣完成',exact:true}).count())break;
    const region=page.locator('.recruit-farewell');
    const id=await region.getAttribute('data-notable'),number=await region.getAttribute('data-page');
    await page.waitForFunction(()=>[...document.querySelectorAll('.farewell-portrait canvas')].every(c=>c.width>300));
    if(i===2){
      await page.reload();await region.waitFor();
      assert.equal(await region.getAttribute('data-notable'),id);
      assert.equal(await region.getAttribute('data-page'),number);
      await page.waitForTimeout(750);
      await page.screenshot({path:out+'/conversation.png'});
    }
    const geometry=await page.evaluate(()=>{
      const stage=document.querySelector('.game-stage').getBoundingClientRect();
      const selectors=['.farewell-heading','.farewell-conversation','.farewell-unlock','.farewell-controls'];
      return selectors.flatMap(s=>[...document.querySelectorAll(s)]).map(el=>{const r=el.getBoundingClientRect();return {className:el.className,inside:r.left>=stage.left&&r.right<=stage.right+1&&r.top>=stage.top&&r.bottom<=stage.bottom+1,overflow:el.scrollHeight>el.clientHeight+1};});
    });
    assert(geometry.every(g=>g.inside&&!g.overflow),JSON.stringify(geometry));
    if(await page.locator('.farewell-unlock').count()){
      seen.push(id);
      if(id==='notable:nanhua'){
        for(const viewport of [{width:960,height:640},{width:1600,height:1000},{width:1280,height:800}]){
          await page.setViewportSize(viewport);
          await page.waitForTimeout(750);
          await page.screenshot({path:out+`/unlock-${viewport.width}.png`});
        }
      }
      await page.getByRole('button',{name:'收下約定 →',exact:true}).click();
    }else if(i===3){
      assert.equal(await page.getByRole('button',{name:'繼續 →',exact:true}).evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('Enter');
    }else await page.getByRole('button',{name:'繼續 →',exact:true}).click();
  }
  assert.equal(seen.length,20);assert.equal(new Set(seen).size,20);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sgd.meta.v1')),null,'fixture never writes real player keys');
  await page.reload();
  assert.equal(await page.locator('.recruit-farewell').count(),0,'completed scenes never repeat on reload');

  // Full App, in this test browser's isolated storage, including its real autosave.
  await page.evaluate(async()=>{
    const {defs,wiring,emptyMeta,startRun,saveMeta}=await import('/src/app/bootstrap.ts');
    const {Session}=await import('/src/app/session.ts');
    const {saveRun}=await import('/src/app/save.ts');
    const initial=startRun(emptyMeta()).current,e=defs.reader('ending').all().find(e=>e.endingKind==='fullDream');
    const s=Session.restore(wiring,{...initial,runId:'farewell-browser-test',earnedUnlocks:['notable:guanyu','notable:ganning'],
      story:{...initial.story,enabled:false,scenes:[],endingChoice:false},
      ending:{endingId:e.ending,titleKey:e.titleKey,bodyKey:e.bodyKey,isFullDream:true,pointsMultiplier:e.pointsMultiplier}});
    saveMeta(s.preserveUnlocks(emptyMeta()));saveRun(s,[]);
  });
  await page.goto(base+'/');
  await page.getByRole('button',{name:'確認結算 → 夢醒之際',exact:true}).click();
  await page.locator('.recruit-farewell[data-notable="notable:guanyu"]').waitFor();
  assert.equal(await page.locator('.game-bottom').isVisible(),false);
  const points=await page.evaluate(()=>JSON.parse(localStorage.getItem('sgd.meta.v1')).points);
  await page.getByRole('button',{name:'繼續 →',exact:true}).click();
  await page.reload();
  await page.locator('.recruit-farewell[data-page="1"]').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sgd.meta.v1')).points),points);
  await page.waitForTimeout(750);
  await page.screenshot({path:out+'/app-resumed.png'});
  for(let i=0;i<25&&await page.locator('.recruit-farewell').count();i++){
    await page.getByRole('button',{name:/^(繼續|收下約定) →$/}).click();
  }
  await page.waitForFunction(()=>localStorage.getItem('sgd.run.v3')===null);
  const meta=await page.evaluate(()=>JSON.parse(localStorage.getItem('sgd.meta.v1')));
  assert.deepEqual(meta.recruitFarewells.pending,[]);
  assert.deepEqual(meta.recruitFarewells.completed,['notable:guanyu','notable:ganning']);
  assert.equal(meta.points,points);
  await page.reload();assert.equal(await page.locator('.recruit-farewell').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: 20 visible scripts/cards, layout, keyboard focus, reload, isolated fixture, actual App settlement/autosave/resume and return to destiny.');
}finally{await browser.close();}
